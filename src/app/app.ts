import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('loan-frontend');

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }

  openFaq() {
    alert('AyRaSh FAQ:\n\n- Use Direct Strategy for single-loan quick planning.\n- Use Expense-Based Strategy for multiple loans and cashflow-aware planning.\n- Enter your loan details and extra EMI to compare repayment impact.');
  }

  openChat() {
    alert('Hi! I\'m AyRaSh. Tell me your loan goal and I\'ll help you choose the best repayment path.');
  }
}
