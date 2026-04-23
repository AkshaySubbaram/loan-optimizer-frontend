import { LoanRequest } from '../models/loan-request';
import { LoanResponse } from '../models/loan-response';

type NormalLoanStrategy = LoanResponse & {
  amortization: Array<{
    month: number;
    principalPaid: number;
    interestPaid: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
};

type StrategyConfig = {
  strategy: string;
  extraEmi: number;
  usePartPayments: boolean;
};

export type NormalLoanCalculationResult = {
  recommendedStrategy: NormalLoanStrategy | null;
  strategies: NormalLoanStrategy[];
  summary: string;
};

export function calculateNormalLoanStrategies(request: LoanRequest): NormalLoanCalculationResult {
  const principal = Number(request.loanAmount || 0);
  const annualRate = Number(request.interestRate || 0);
  const tenureMonths = Number(request.tenureMonths || 0);
  const extraEmi = Number(request.extraEmi || 0);
  const partPayments = request.partPayments || [];
  const partPaymentMonths = request.partPaymentMonths || [];

  const baseSimulation = simulateLoan({
    principal,
    annualRate,
    tenureMonths,
    emi: calculateEmi(principal, annualRate, tenureMonths),
    extraEmi: 0,
    partPayments: [],
    partPaymentMonths: []
  });

  const strategies: NormalLoanStrategy[] = [
    buildStrategy('Normal EMI', baseSimulation, baseSimulation)
  ];

  if (extraEmi > 0) {
    const extraEmiSimulation = simulateLoan({
      principal,
      annualRate,
      tenureMonths,
      emi: baseSimulation.emi,
      extraEmi,
      partPayments: [],
      partPaymentMonths: []
    });

    strategies.push(buildStrategy('Extra EMI Strategy', extraEmiSimulation, baseSimulation));
  }

  if (partPayments.length > 0 && partPaymentMonths.length > 0) {
    const partPaymentSimulation = simulateLoan({
      principal,
      annualRate,
      tenureMonths,
      emi: baseSimulation.emi,
      extraEmi: 0,
      partPayments,
      partPaymentMonths
    });

    strategies.push(buildStrategy('Part Payment Strategy', partPaymentSimulation, baseSimulation));
  }

  if (extraEmi > 0 && partPayments.length > 0 && partPaymentMonths.length > 0) {
    const combinedSimulation = simulateLoan({
      principal,
      annualRate,
      tenureMonths,
      emi: baseSimulation.emi,
      extraEmi,
      partPayments,
      partPaymentMonths
    });

    strategies.push(buildStrategy('Combined Prepayment Strategy', combinedSimulation, baseSimulation));
  }

  const recommendedStrategy = [...strategies]
    .sort((left, right) => {
      if (right.interestSaved !== left.interestSaved) {
        return right.interestSaved - left.interestSaved;
      }

      return right.tenureReducedMonths - left.tenureReducedMonths;
    })[0] || null;

  const summary = recommendedStrategy
    ? buildSummary(recommendedStrategy)
    : 'Enter your loan details to see a live payoff preview.';

  return {
    recommendedStrategy,
    strategies,
    summary
  };
}

function calculateEmi(principal: number, annualRate: number, tenureMonths: number) {
  if (!principal || !tenureMonths) {
    return 0;
  }

  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) {
    return principal / tenureMonths;
  }

  const growthFactor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * growthFactor) / (growthFactor - 1);
}

function simulateLoan(config: {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  emi: number;
  extraEmi: number;
  partPayments: number[];
  partPaymentMonths: number[];
}) {
  const monthlyRate = config.annualRate / 12 / 100;
  const partPaymentMap = new Map<number, number>();
  const amortization: Array<{
    month: number;
    principalPaid: number;
    interestPaid: number;
    principal: number;
    interest: number;
    balance: number;
  }> = [];

  config.partPaymentMonths.forEach((month, index) => {
    const amount = Number(config.partPayments[index] || 0);
    if (!month || !amount) {
      return;
    }

    partPaymentMap.set(month, (partPaymentMap.get(month) || 0) + amount);
  });

  let balance = config.principal;
  let totalInterest = 0;
  let month = 0;
  const emi = config.emi;
  const maxMonths = Math.max(config.tenureMonths * 2, 1200);

  while (balance > 0.01 && month < maxMonths) {
    month += 1;

    const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
    const scheduledPayment = Math.min(balance + interest, emi + config.extraEmi);
    const scheduledPrincipal = Math.max(0, scheduledPayment - interest);
    const partPayment = Math.min(balance - scheduledPrincipal, partPaymentMap.get(month) || 0);
    const principalPaid = Math.min(balance, scheduledPrincipal + Math.max(0, partPayment));

    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    amortization.push({
      month,
      principalPaid: roundCurrency(principalPaid),
      interestPaid: roundCurrency(interest),
      principal: roundCurrency(principalPaid),
      interest: roundCurrency(interest),
      balance: roundCurrency(balance)
    });

    if (scheduledPayment <= interest && partPayment <= 0) {
      break;
    }
  }

  return {
    emi: roundCurrency(emi),
    totalInterest: roundCurrency(totalInterest),
    monthsTaken: amortization.length,
    amortization
  };
}

function buildStrategy(
  strategy: string,
  simulation: ReturnType<typeof simulateLoan>,
  baseSimulation: ReturnType<typeof simulateLoan>
): NormalLoanStrategy {
  return {
    strategy,
    emi: simulation.emi,
    interestSaved: roundCurrency(baseSimulation.totalInterest - simulation.totalInterest),
    tenureReducedMonths: Math.max(0, baseSimulation.monthsTaken - simulation.monthsTaken),
    totalInterestNormal: baseSimulation.totalInterest,
    totalInterestWithExtra: simulation.totalInterest,
    amortization: simulation.amortization
  };
}

function buildSummary(recommendedStrategy: NormalLoanStrategy) {
  if (recommendedStrategy.strategy === 'Normal EMI') {
    return 'Your current setup does not use extra prepayments yet, so the normal EMI plan remains the baseline view.';
  }

  return `${recommendedStrategy.strategy} currently looks best, with interest savings of Rs ${recommendedStrategy.interestSaved.toLocaleString('en-IN')} and a tenure reduction of ${recommendedStrategy.tenureReducedMonths} month(s).`;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}
