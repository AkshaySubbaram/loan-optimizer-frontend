import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../services/loan.service';
import { LoanRequest, ExpenseRequest } from '../../models/loan-request';
import { Router } from '@angular/router';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan-form.html',
  styleUrls: ['./loan-form.css']
})
export class LoanForm {
  hasTriedSubmit = false;

  request: LoanRequest = {
    loanAmount: null,
    interestRate: null,
    tenureMonths: null,
    extraEmi: 0,
    partPayments: [],
    partPaymentMonths: [],
    useIncomeStrategy: false
  };

  expenseRequest: ExpenseRequest = {
    monthlyIncome: null,
    expenses: [],
    loans: [],
    riskProfile: 'medium',
    goal: 'LOW_EMI',
    emergencyFund: null,
    emergencyFundTarget: null,
    emergencyFundMonths: null
  };

  useIncomeStrategy = false;

  partPaymentsUI: { amount: number | null; month: number | null }[] = [];
  expenseItems: { name: string; amount: number | null }[] = [{ name: '', amount: null }];
  loanItems: { loanName: string; loanAmount: number | null; interestRate: number | null; tenureMonths: number | null }[] = [
    { loanName: '', loanAmount: null, interestRate: null, tenureMonths: null }
  ];

  constructor(private loanService: LoanService, private router: Router) {}

  // ➕ Add row
  addRow() {
    this.partPaymentsUI.push({ amount: null, month: null });
  }

  // ❌ Remove row
  removeRow(index: number) {
    this.partPaymentsUI.splice(index, 1);
  }

  // 🔄 Convert UI → Backend format
  buildRequest(): LoanRequest {
    const basicPart = {
      loanAmount: this.request.loanAmount ?? 0,
      interestRate: this.request.interestRate ?? 0,
      tenureMonths: this.request.tenureMonths ?? 0,
      extraEmi: this.request.extraEmi ?? 0,
      partPayments: this.partPaymentsUI
        .map(p => p.amount)
        .filter(v => v !== null) as number[],
      partPaymentMonths: this.partPaymentsUI
        .map(p => p.month)
        .filter(v => v !== null) as number[]
    };

    if (!this.useIncomeStrategy) {
      return {
        ...basicPart,
        useIncomeStrategy: false
      };
    }

    // For expense/income strategy mode, send only required advanced data
    const expenseRequestPayload = {
      monthlyIncome: this.expenseRequest.monthlyIncome,
      expenses: this.expenseItems
        .filter(e => e.name && e.amount !== null)
        .map(e => ({ name: e.name, amount: Number(e.amount) })),
      loans: this.loanItems
        .filter(l => l.loanName && l.loanAmount !== null && l.interestRate !== null && l.tenureMonths !== null)
        .map(l => ({
          loanName: l.loanName,
          loanAmount: Number(l.loanAmount),
          interestRate: Number(l.interestRate),
          tenureMonths: Number(l.tenureMonths)
        })),
      riskProfile: this.normalizeRiskProfileForApi(this.expenseRequest.riskProfile),
      goal: this.expenseRequest.goal,
      emergencyFund: this.expenseRequest.emergencyFund,
      emergencyFundTarget: this.expenseRequest.emergencyFundTarget ?? 0,
      emergencyFundMonths: this.expenseRequest.emergencyFundMonths ?? 12
    };

    const payload: LoanRequest = {
      useIncomeStrategy: true,
      expenseRequest: expenseRequestPayload
    };

    return payload;
  }

  calculate() {
    this.hasTriedSubmit = true;

    if (this.useIncomeStrategy && !this.isExpenseStrategyValid()) {
      return;
    }

    const payload = this.buildRequest();

    const serviceCall = this.useIncomeStrategy
      ? this.loanService.getExpenseStrategy(payload)
      : this.loanService.getSummary(payload);

    serviceCall.subscribe({
      next: res => {
        console.log('API RESPONSE:', res, 'PAYLOAD:', payload);

        this.router.navigate(['/results'], {
          state: { strategies: res, request: payload }
        });
      },
      error: (error) => {
        console.error('Loan strategies fetch error:', error, 'PAYLOAD:', payload);
        const serverMessage = error?.error?.message || error?.error?.error || error?.message;
        alert(serverMessage ? `Error fetching loan strategies: ${serverMessage}` : 'Error fetching loan strategies. Check console network tab/response.');
      }
    });
  }

  private normalizeRiskProfileForApi(riskProfile: ExpenseRequest['riskProfile']) {
    return String(riskProfile || 'MEDIUM').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH';
  }

  isExpenseFieldInvalid(value: string | number | null | undefined) {
    if (!this.hasTriedSubmit || !this.useIncomeStrategy) {
      return false;
    }

    return value === null || value === undefined || value === '';
  }

  isExpenseItemInvalid(index: number) {
    if (!this.hasTriedSubmit || !this.useIncomeStrategy) {
      return false;
    }

    const item = this.expenseItems[index];
    return !item?.name || item.amount === null || item.amount === undefined;
  }

  isLoanItemInvalid(index: number) {
    if (!this.hasTriedSubmit || !this.useIncomeStrategy) {
      return false;
    }

    const loan = this.loanItems[index];
    return !loan?.loanName
      || loan.loanAmount === null || loan.loanAmount === undefined
      || loan.interestRate === null || loan.interestRate === undefined
      || loan.tenureMonths === null || loan.tenureMonths === undefined;
  }

  private isExpenseStrategyValid() {
    const basicFieldsValid = this.expenseRequest.monthlyIncome !== null
      && this.expenseRequest.monthlyIncome !== undefined
      && this.expenseRequest.emergencyFund !== null
      && this.expenseRequest.emergencyFund !== undefined
      && this.expenseRequest.emergencyFundTarget !== null
      && this.expenseRequest.emergencyFundTarget !== undefined
      && this.expenseRequest.emergencyFundMonths !== null
      && this.expenseRequest.emergencyFundMonths !== undefined
      && !!this.expenseRequest.riskProfile
      && !!this.expenseRequest.goal;

    const expensesValid = this.expenseItems.every(item =>
      (!item.name && (item.amount === null || item.amount === undefined))
      || (!!item.name && item.amount !== null && item.amount !== undefined)
    );

    const loansValid = this.loanItems.length > 0 && this.loanItems.every(loan =>
      !!loan.loanName
      && loan.loanAmount !== null && loan.loanAmount !== undefined
      && loan.interestRate !== null && loan.interestRate !== undefined
      && loan.tenureMonths !== null && loan.tenureMonths !== undefined
    );

    return basicFieldsValid && expensesValid && loansValid;
  }
}
