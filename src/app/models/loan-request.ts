export interface LoanRequest {
  loanAmount: number | null;
  interestRate: number | null;
  tenureMonths: number | null;
  extraEmi: number;
  partPayments: number[];
  partPaymentMonths: number[];
}