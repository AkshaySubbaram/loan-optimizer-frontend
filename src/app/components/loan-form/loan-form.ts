import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../services/loan.service';
import { LoanRequest } from '../../models/loan-request';
import { Router } from '@angular/router';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan-form.html',
  styleUrls: ['./loan-form.css']
})
export class LoanForm {

  request: LoanRequest = {
    loanAmount: null,
    interestRate: null,
    tenureMonths: null,
    extraEmi: 0,
    partPayments: [],
    partPaymentMonths: []
  };

  // ✅ NEW STRUCTURE (UI FRIENDLY)
  partPaymentsUI: { amount: number | null; month: number | null }[] = [];

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
  mapToRequest() {
    this.request.partPayments = this.partPaymentsUI
      .map(p => p.amount)
      .filter(v => v !== null) as number[];

    this.request.partPaymentMonths = this.partPaymentsUI
      .map(p => p.month)
      .filter(v => v !== null) as number[];
  }

  calculate() {

    this.mapToRequest();

    this.loanService.getSummary(this.request).subscribe({
      next: res => {
        console.log("API RESPONSE:", res);

        this.router.navigate(['/results'], {
          state: { strategies: res, request: this.request }
        });
      },
      error: (error) => {
        console.error('Loan strategies fetch error:', error);
        alert('Error fetching loan strategies. Check console network tab/response.');
      }
    });
  }
}