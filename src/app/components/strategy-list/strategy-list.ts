import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { LoanService } from '../../services/loan.service';
import { LoanRequest } from '../../models/loan-request';

@Component({
  selector: 'app-strategy-list',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './strategy-list.html',
  styleUrls: ['./strategy-list.css']
})
export class StrategyList implements OnInit {
  strategies: any[] = [];
  request: any;
  advice: any;
  recommendedStrategy: any;
  reason = '';
  loanPriority: string[] = [];
  adviceSteps: string[] = [];
  adviceContext: string[] = [];
  paymentPlan: string[] = [];

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  constructor(
    private router: Router,
    private loanService: LoanService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const state = history.state;
    this.request = state?.request;

    if (state?.strategies?.allStrategies) {
      this.strategies = state.strategies.allStrategies;
      this.advice = state.strategies.advice;
      this.recommendedStrategy = state.strategies.recommendedStrategy;
      this.reason = state.strategies.reason || '';
      this.loanPriority = state.strategies.loanPriority || [];
    } else if (Array.isArray(state?.strategies)) {
      this.strategies = state.strategies;
    } else if (state?.strategies) {
      this.strategies = [state.strategies];
    }

    this.buildAdviceViewModel();
  }

  goBack() {
    this.router.navigate(['/']);
  }

  downloadReport() {
    if (this.request?.useIncomeStrategy && this.request?.expenseRequest) {
      const report = this.buildExpenseStrategyReport();
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      this.triggerDownload(blob, 'expense_based_loan_report.txt');
      return;
    }

    const payload = this.buildActionPayload();

    this.loanService.downloadReport(payload).subscribe(blob => {
      this.triggerDownload(blob, 'loan_report.txt');
    }, error => {
      console.error('Download error:', error);
      alert('Download failed. See console for details.');
    });
  }

  viewAmortizationAll() {
    if (this.request?.useIncomeStrategy) {
      return;
    }

    const payload = {
      ...this.buildActionPayload(),
      includeAmortization: true
    };

    this.loanService.getAmortization(payload)
      .subscribe((res: any) => {
        this.router.navigate(['/amortization'], {
          state: { data: res }
        });
      }, error => {
        console.error('Amortization fetch error:', error);
        alert('Amortization fetch failed. See console for details.');
      });
  }

  getPieChartData(strategy: any) {
    const principal = this.getPrincipalAmount();
    const interest = strategy?.totalInterestWithExtra || 0;

    return {
      labels: ['Principal', 'Interest'],
      datasets: [
        {
          data: [principal, interest],
          backgroundColor: ['#2ecc71', '#e74c3c']
        }
      ]
    };
  }

  getPrincipalAmount() {
    if (this.request?.loanAmount) {
      return this.request.loanAmount;
    }

    return this.request?.expenseRequest?.loans?.reduce(
      (sum: number, loan: any) => sum + (loan.loanAmount || 0),
      0
    ) || 0;
  }

  getLoanCount() {
    return this.request?.expenseRequest?.loans?.length || 0;
  }

  getGoalLabel() {
    switch (this.request?.expenseRequest?.goal) {
      case 'LOW_EMI':
        return 'keep your monthly EMI burden lower';
      case 'MIN_INTEREST':
        return 'save the most total interest';
      case 'SHORT_TENURE':
        return 'close your loans faster';
      default:
        return 'improve your repayment plan';
    }
  }

  getRiskLabel() {
    const riskProfile = this.request?.expenseRequest?.riskProfile;
    if (!riskProfile) {
      return '';
    }

    return `${riskProfile.charAt(0).toUpperCase()}${riskProfile.slice(1)} risk profile`;
  }

  getPriorityTitle(priority: string) {
    return priority.replace(/^\d+\.\s*/, '').split('→')[0].trim();
  }

  getPriorityNote(priority: string) {
    const parts = priority.split('→');
    return parts[1]?.trim() || 'Priority loan';
  }

  private buildActionPayload(): LoanRequest {
    if (!this.request?.useIncomeStrategy || !this.request?.expenseRequest) {
      return this.request;
    }

    const loans = this.request.expenseRequest.loans || [];
    const totalLoanAmount = loans.reduce((sum: number, loan: any) => sum + (loan.loanAmount || 0), 0);
    const weightedInterestRate = totalLoanAmount
      ? loans.reduce(
          (sum: number, loan: any) => sum + ((loan.loanAmount || 0) * (loan.interestRate || 0)),
          0
        ) / totalLoanAmount
      : 0;
    const maxTenureMonths = loans.reduce(
      (max: number, loan: any) => Math.max(max, loan.tenureMonths || 0),
      0
    );
    const parsedPartPayment = this.parsePartPaymentPlan(this.advice?.partPaymentPlan, maxTenureMonths);

    return {
      ...this.request,
      loanAmount: totalLoanAmount,
      interestRate: Number(weightedInterestRate.toFixed(2)),
      tenureMonths: maxTenureMonths,
      extraEmi: Number(this.advice?.extraEmiRecommended || 0),
      partPayments: parsedPartPayment.partPayments,
      partPaymentMonths: parsedPartPayment.partPaymentMonths
    };
  }

  private parsePartPaymentPlan(plan: string | undefined, maxTenureMonths: number) {
    if (!plan || !maxTenureMonths) {
      return {
        partPayments: [] as number[],
        partPaymentMonths: [] as number[]
      };
    }

    const amountMatch = plan.match(/part payment of [^\d]*(\d[\d,]*)/i);
    const everyMonthsMatch = plan.match(/every\s+(\d+)\s+months?/i);

    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;
    const everyMonths = everyMonthsMatch ? Number(everyMonthsMatch[1]) : 0;

    if (!amount || !everyMonths) {
      return {
        partPayments: [] as number[],
        partPaymentMonths: [] as number[]
      };
    }

    const partPaymentMonths: number[] = [];
    const partPayments: number[] = [];

    for (let month = everyMonths; month <= maxTenureMonths; month += everyMonths) {
      partPaymentMonths.push(month);
      partPayments.push(amount);
    }

    return { partPayments, partPaymentMonths };
  }

  private buildExpenseStrategyReport() {
    const expenseRequest = this.request?.expenseRequest;
    const expenses = expenseRequest?.expenses || [];
    const loans = expenseRequest?.loans || [];
    const lines: string[] = [];

    lines.push('=== Expense-Based Loan Strategy Report ===');
    lines.push('');
    lines.push('--- User Inputs ---');
    lines.push(`Calculation Mode: Expense-Based Strategy`);
    lines.push(`Monthly Income: ${this.formatCurrency(expenseRequest?.monthlyIncome)}`);
    lines.push(`Risk Profile: ${expenseRequest?.riskProfile || '-'}`);
    lines.push(`Goal: ${expenseRequest?.goal || '-'}`);
    lines.push(`Emergency Fund: ${this.formatCurrency(expenseRequest?.emergencyFund)}`);
    lines.push(`Emergency Fund Target: ${this.formatCurrency(expenseRequest?.emergencyFundTarget)}`);
    lines.push(`Emergency Fund Months: ${expenseRequest?.emergencyFundMonths ?? '-'}`);
    lines.push('');

    lines.push('--- Expenses ---');
    if (expenses.length) {
      expenses.forEach((expense: any, index: number) => {
        lines.push(`${index + 1}. ${expense.name}: ${this.formatCurrency(expense.amount)}`);
      });
    } else {
      lines.push('No expenses provided.');
    }
    lines.push('');

    lines.push('--- Loans ---');
    if (loans.length) {
      loans.forEach((loan: any, index: number) => {
        lines.push(`${index + 1}. ${loan.loanName}`);
        lines.push(`   Loan Amount: ${this.formatCurrency(loan.loanAmount)}`);
        lines.push(`   Interest Rate: ${loan.interestRate ?? '-'}%`);
        lines.push(`   Tenure (Months): ${loan.tenureMonths ?? '-'}`);
      });
    } else {
      lines.push('No loans provided.');
    }
    lines.push('');

    lines.push('--- Advice ---');
    lines.push(`Summary: ${this.advice?.summary || '-'}`);
    lines.push(`Extra EMI Recommended: ${this.formatCurrency(this.advice?.extraEmiRecommended)}`);
    lines.push(`Part Payment Plan: ${this.advice?.partPaymentPlan || '-'}`);
    lines.push(`Reason: ${this.reason || '-'}`);
    lines.push('');

    lines.push('--- Loan Priority ---');
    if (this.loanPriority.length) {
      this.loanPriority.forEach((priority, index) => {
        lines.push(`${index + 1}. ${priority}`);
      });
    } else {
      lines.push('No loan priority returned.');
    }
    lines.push('');

    lines.push('--- Recommended Strategy ---');
    if (this.recommendedStrategy) {
      lines.push(`Strategy: ${this.recommendedStrategy.strategy}`);
      lines.push(`EMI: ${this.formatCurrency(this.recommendedStrategy.emi)}`);
      lines.push(`Interest Saved: ${this.formatCurrency(this.recommendedStrategy.interestSaved)}`);
      lines.push(`Tenure Reduced: ${this.recommendedStrategy.tenureReducedMonths ?? '-'} months`);
      lines.push(`Total Interest Normal: ${this.formatCurrency(this.recommendedStrategy.totalInterestNormal)}`);
      lines.push(`Total Interest With Strategy: ${this.formatCurrency(this.recommendedStrategy.totalInterestWithExtra)}`);
    } else {
      lines.push('No recommended strategy returned.');
    }
    lines.push('');

    lines.push('--- All Strategies ---');
    if (this.strategies.length) {
      this.strategies.forEach((strategy, index) => {
        lines.push(`${index + 1}. ${strategy.strategy}`);
        lines.push(`   EMI: ${this.formatCurrency(strategy.emi)}`);
        lines.push(`   Interest Saved: ${this.formatCurrency(strategy.interestSaved)}`);
        lines.push(`   Tenure Reduced: ${strategy.tenureReducedMonths ?? '-'} months`);
        lines.push(`   Total Interest Normal: ${this.formatCurrency(strategy.totalInterestNormal)}`);
        lines.push(`   Total Interest With Strategy: ${this.formatCurrency(strategy.totalInterestWithExtra)}`);
      });
    } else {
      lines.push('No strategies returned.');
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatCurrency(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '-';
    }

    return `Rs ${Number(value).toLocaleString('en-IN')}`;
  }

  private triggerDownload(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private buildAdviceViewModel() {
    const loans = this.request?.expenseRequest?.loans || [];
    const expenseRequest = this.request?.expenseRequest;
    const emergencyFundGap = Math.max(
      (expenseRequest?.emergencyFundTarget || 0) - (expenseRequest?.emergencyFund || 0),
      0
    );

    this.adviceContext = [];
    this.paymentPlan = [];
    this.adviceSteps = [];

    if (loans.length) {
      this.adviceContext.push(
        `You are managing ${loans.length} loan${loans.length > 1 ? 's' : ''} with a combined principal of Rs ${this.getPrincipalAmount().toLocaleString('en-IN')}.`
      );
    }

    if (expenseRequest?.monthlyIncome) {
      this.adviceContext.push(
        `This recommendation is aligned to your goal to ${this.getGoalLabel()} using your monthly income of Rs ${expenseRequest.monthlyIncome.toLocaleString('en-IN')}.`
      );
    }

    if (this.getRiskLabel()) {
      this.adviceContext.push(`The plan is designed for a ${this.getRiskLabel()}.`);
    }

    if (emergencyFundGap > 0 && expenseRequest?.emergencyFundMonths) {
      this.adviceContext.push(
        `You still need Rs ${emergencyFundGap.toLocaleString('en-IN')} to reach your emergency fund target over ${expenseRequest.emergencyFundMonths} month(s), so the repayment advice stays balanced instead of too aggressive.`
      );
    }

    if (this.recommendedStrategy) {
      this.adviceSteps.push(
        `Follow the ${this.recommendedStrategy.strategy} plan first, because it can save about Rs ${Number(this.recommendedStrategy.interestSaved || 0).toLocaleString('en-IN')} in interest and reduce tenure by ${this.recommendedStrategy.tenureReducedMonths || 0} month(s).`
      );
    }

    if (this.advice?.extraEmiRecommended) {
      this.paymentPlan.push(
        `Add an extra EMI payment of Rs ${Number(this.advice.extraEmiRecommended).toLocaleString('en-IN')} each month on top of your regular EMI.`
      );
    }

    if (this.advice?.partPaymentPlan) {
      this.paymentPlan.push(this.advice.partPaymentPlan);
    }

    if (this.loanPriority.length) {
      this.adviceSteps.push(
        `Start prepaying in this order: ${this.loanPriority.map(item => item.replace(/^\d+\.\s*/, '')).join(' Then focus on ')}.`
      );
    }

    if (loans.length && !this.loanPriority.length) {
      const sortedLoans = [...loans].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
      this.adviceSteps.push(
        `Prioritize the loan with the higher interest rate first: ${sortedLoans.map((loan: any) => `${loan.loanName} (${loan.interestRate}%)`).join(', ')}.`
      );
    }

    this.adviceSteps.push(
      `Keep paying the normal EMI for every loan on time, and direct any extra payment only to the current priority loan until it becomes less expensive than the next loan.`
    );
  }
}
