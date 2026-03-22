export interface AmortizationEntry {
  month: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

export interface LoanResponse {
  emi: number;
  interestSaved: number;
  strategy: string;
  tenureReducedMonths: number;
  totalInterestNormal: number;
  totalInterestWithExtra: number;
  amortization?: AmortizationEntry[];
}