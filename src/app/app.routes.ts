import { Routes } from '@angular/router';
import { LoanForm } from './components/loan-form/loan-form';
import { StrategyList } from './components/strategy-list/strategy-list';
import { AmortizationTable } from './components/amortization-table/amortization-table';

export const routes: Routes = [
  { path: '', component: LoanForm },
  { path: 'results', component: StrategyList },
   { path: 'amortization', component: AmortizationTable },
  { path: '**', redirectTo: '' } // fallback
];