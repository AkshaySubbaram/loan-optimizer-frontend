export interface ExpenseItem {
  name: string;
  amount: number;
}

export interface ExistingLoanItem {
  loanName: string;
  loanAmount: number | null;
  interestRate: number | null;
  tenureMonths: number | null;
  sanctionDate?: string | null;
}

export interface ExpenseRequest {
  monthlyIncome: number | null;
  expenses: ExpenseItem[];
  loans: ExistingLoanItem[];
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH' | 'low' | 'medium' | 'high';
  goal: 'LOW_EMI' | 'MIN_INTEREST' | 'SHORT_TENURE';
  emergencyFund: number | null;
  emergencyFundTarget?: number | null;
  emergencyFundMonths?: number | null;
}

export interface LoanRequest {
  loanAmount?: number | null;
  interestRate?: number | null;
  tenureMonths?: number | null;
  extraEmi?: number;
  partPayments?: number[];
  partPaymentMonths?: number[];
  useIncomeStrategy?: boolean;
  expenseRequest?: ExpenseRequest;
}
