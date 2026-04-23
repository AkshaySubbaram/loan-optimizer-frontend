import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { LoanService } from '../../services/loan.service';
import { LoanRequest, ExpenseRequest } from '../../models/loan-request';
import { Router } from '@angular/router';
import { mapToUserFacingError } from '../../utils/app-error';
import { calculateNormalLoanStrategies } from '../../utils/normal-loan-calculator';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './loan-form.html',
  styleUrls: ['./loan-form.css']
})
export class LoanForm {
  readonly maxWholeDigits = 10;
  readonly maxDecimalDigits = 3;
  readonly loanAmountSliderBaseMax = 10000000;
  readonly loanAmountSliderMin = 0;
  readonly monthlyIncomeSliderBaseMax = 1000000;
  readonly monthlyIncomeSliderMin = 0;

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

  useIncomeStrategy: boolean | null = null;

  partPaymentsUI: { amount: number | null; month: number | null }[] = [];
  expenseItems: { name: string; amount: number | null }[] = [{ name: '', amount: null }];
  loanItems: { loanName: string; loanAmount: number | null; interestRate: number | null; tenureMonths: number | null; sanctionDate: string | null }[] = [
    { loanName: '', loanAmount: null, interestRate: null, tenureMonths: null, sanctionDate: null }
  ];
  liveNormalStrategies: any[] = [];
  liveNormalSummary = '';
  liveRecommendedNormalStrategy: any = null;
  normalPieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  constructor(private loanService: LoanService, private router: Router) {}

  get hasSelectedMode() {
    return this.useIncomeStrategy !== null;
  }

  selectMode(useIncomeStrategy: boolean) {
    this.useIncomeStrategy = useIncomeStrategy;
    this.refreshNormalPreviewIfNeeded();
  }

  addRow() {
    this.partPaymentsUI.push({ amount: null, month: null });
    this.refreshNormalPreviewIfNeeded();
  }

  removeRow(index: number) {
    this.partPaymentsUI.splice(index, 1);
    this.refreshNormalPreviewIfNeeded();
  }

  preventInvalidNumberInput(event: KeyboardEvent) {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  sanitizeNumericField(event: Event) {
    this.applyNumericConstraint(event, { integerOnly: false, maxWholeDigits: this.maxWholeDigits, maxDecimalDigits: this.maxDecimalDigits });
  }

  sanitizeIntegerField(event: Event) {
    this.applyNumericConstraint(event, { integerOnly: true, maxWholeDigits: this.maxWholeDigits });
  }

  sanitizeInterestField(event: Event) {
    this.applyNumericConstraint(event, { integerOnly: false, maxWholeDigits: this.maxWholeDigits, maxDecimalDigits: this.maxDecimalDigits });
  }

  updateLoanAmountFromSlider(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const nextValue = Number(input.value);
    this.request.loanAmount = Number.isFinite(nextValue) ? nextValue : 0;
    this.onNormalInputChange();
  }

  updateMonthlyIncomeFromSlider(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const nextValue = Number(input.value);
    this.expenseRequest.monthlyIncome = Number.isFinite(nextValue) ? nextValue : 0;
  }

  get loanAmountSliderMax() {
    const currentAmount = this.request.loanAmount ?? 0;
    const safeAmount = Number.isFinite(currentAmount) ? currentAmount : 0;
    const paddedAmount = Math.ceil(Math.max(safeAmount, this.loanAmountSliderBaseMax) / 100000) * 100000;
    return Math.min(paddedAmount, 9999999999);
  }

  get loanAmountSliderStep() {
    const sliderMax = this.loanAmountSliderMax;

    if (sliderMax <= 1000000) {
      return 1000;
    }

    if (sliderMax <= 10000000) {
      return 10000;
    }

    return 100000;
  }

  get monthlyIncomeSliderMax() {
    const currentIncome = this.expenseRequest.monthlyIncome ?? 0;
    const safeIncome = Number.isFinite(currentIncome) ? currentIncome : 0;
    const paddedIncome = Math.ceil(Math.max(safeIncome, this.monthlyIncomeSliderBaseMax) / 10000) * 10000;
    return Math.min(paddedIncome, 9999999999);
  }

  get monthlyIncomeSliderStep() {
    const sliderMax = this.monthlyIncomeSliderMax;

    if (sliderMax <= 100000) {
      return 1000;
    }

    if (sliderMax <= 1000000) {
      return 5000;
    }

    return 10000;
  }

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
          tenureMonths: Number(l.tenureMonths),
          sanctionDate: this.formatSanctionDateForApi(l.sanctionDate)
        })),
      riskProfile: this.normalizeRiskProfileForApi(this.expenseRequest.riskProfile),
      goal: this.expenseRequest.goal,
      emergencyFund: this.expenseRequest.emergencyFund,
      emergencyFundTarget: this.expenseRequest.emergencyFundTarget ?? 0,
      emergencyFundMonths: this.expenseRequest.emergencyFundMonths ?? 12
    };

    return {
      useIncomeStrategy: true,
      expenseRequest: expenseRequestPayload
    };
  }

  calculate() {
    if (!this.hasSelectedMode) {
      return;
    }

    this.hasTriedSubmit = true;

    if (this.useIncomeStrategy === false && !this.isNormalStrategyValid()) {
      this.liveNormalStrategies = [];
      this.liveRecommendedNormalStrategy = null;
      this.liveNormalSummary = '';
      return;
    }

    if (this.useIncomeStrategy && !this.isExpenseStrategyValid()) {
      return;
    }

    if (this.useIncomeStrategy === false) {
      this.refreshNormalPreviewIfNeeded();
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
      error: error => {
        console.error('Loan strategies fetch error:', error, 'PAYLOAD:', payload);
        const userError = mapToUserFacingError(error, 'loan-strategy');
        alert(userError.message);
      }
    });
  }

  private normalizeRiskProfileForApi(riskProfile: ExpenseRequest['riskProfile']) {
    return String(riskProfile || 'MEDIUM').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH';
  }

  isExpenseFieldInvalid(value: string | number | null | undefined) {
    if (!this.hasTriedSubmit || this.useIncomeStrategy !== true) {
      return false;
    }

    return value === null || value === undefined || value === '';
  }

  isNormalFieldInvalid(value: number | null | undefined) {
    if (!this.hasTriedSubmit || this.useIncomeStrategy !== false) {
      return false;
    }

    return value === null || value === undefined;
  }

  isPartPaymentInvalid(index: number) {
    if (!this.hasTriedSubmit || this.useIncomeStrategy !== false) {
      return false;
    }

    const item = this.partPaymentsUI[index];
    const hasAmount = item?.amount !== null && item?.amount !== undefined;
    const hasMonth = item?.month !== null && item?.month !== undefined;

    return hasAmount !== hasMonth;
  }

  hasInvalidPartPayments() {
    if (this.useIncomeStrategy !== false) {
      return false;
    }

    return this.partPaymentsUI.some((_, index) => this.isPartPaymentInvalid(index));
  }

  onNormalInputChange() {
    this.refreshNormalPreviewIfNeeded();
  }

  getNormalPieChartData(strategy: any) {
    const principal = Number(this.request.loanAmount || 0);
    const interest = Number(strategy?.totalInterestWithExtra || 0);

    return {
      labels: ['Principal', 'Interest'],
      datasets: [
        {
          data: [principal, interest],
          backgroundColor: ['#2ecc71', '#e67e22']
        }
      ]
    };
  }

  isExpenseItemInvalid(index: number) {
    if (!this.hasTriedSubmit || this.useIncomeStrategy !== true) {
      return false;
    }

    const item = this.expenseItems[index];
    return !item?.name || item.amount === null || item.amount === undefined;
  }

  isLoanItemInvalid(index: number) {
    if (!this.hasTriedSubmit || this.useIncomeStrategy !== true) {
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

  private isNormalStrategyValid() {
    const basicFieldsValid = this.request.loanAmount !== null
      && this.request.loanAmount !== undefined
      && this.request.interestRate !== null
      && this.request.interestRate !== undefined
      && this.request.tenureMonths !== null
      && this.request.tenureMonths !== undefined;

    const partPaymentsValid = this.partPaymentsUI.every(item => {
      const hasAmount = item.amount !== null && item.amount !== undefined;
      const hasMonth = item.month !== null && item.month !== undefined;
      return hasAmount === hasMonth;
    });

    return basicFieldsValid && partPaymentsValid;
  }

  private refreshNormalPreviewIfNeeded() {
    if (this.useIncomeStrategy !== false) {
      this.liveNormalStrategies = [];
      this.liveRecommendedNormalStrategy = null;
      this.liveNormalSummary = '';
      return;
    }

    if (!this.isNormalStrategyValid()) {
      this.liveNormalStrategies = [];
      this.liveRecommendedNormalStrategy = null;
      this.liveNormalSummary = 'Fill in the required normal loan inputs to see live results.';
      return;
    }

    const result = calculateNormalLoanStrategies(this.buildRequest());
    this.liveNormalStrategies = result.strategies;
    this.liveRecommendedNormalStrategy = result.recommendedStrategy;
    this.liveNormalSummary = result.summary;
  }

  private formatSanctionDateForApi(value: string | null) {
    if (!value) {
      return null;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
      return value;
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}-${month}-${year}`;
  }

  private applyNumericConstraint(
    event: Event,
    options: { integerOnly: boolean; maxWholeDigits: number; maxDecimalDigits?: number }
  ) {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const originalValue = input.value;
    const sanitizedValue = this.sanitizeNumericString(originalValue, options);

    if (sanitizedValue === originalValue) {
      return;
    }

    input.value = sanitizedValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private sanitizeNumericString(
    value: string,
    options: { integerOnly: boolean; maxWholeDigits: number; maxDecimalDigits?: number }
  ) {
    const strippedValue = value.replace(/[^\d.]/g, '');
    const [wholePartRaw = '', ...decimalParts] = strippedValue.split('.');
    const wholePart = wholePartRaw.slice(0, options.maxWholeDigits);

    if (options.integerOnly) {
      return wholePart;
    }

    const hasDecimal = strippedValue.includes('.');
    const decimalPart = decimalParts.join('').slice(0, options.maxDecimalDigits ?? 0);

    if (!hasDecimal) {
      return wholePart;
    }

    return `${wholePart}.${decimalPart}`;
  }
}
