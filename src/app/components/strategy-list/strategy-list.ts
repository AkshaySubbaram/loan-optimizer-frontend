import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-strategy-list',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './strategy-list.html',
  styleUrls: ['./strategy-list.css']
})
export class StrategyList {

  strategies: any[] = [];
  request: any;

  // ✅ FIX: important for proper chart rendering
  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    const state = history.state;

    this.strategies = Array.isArray(state?.strategies)
      ? state.strategies
      : state?.strategies ? [state.strategies] : [];

    this.request = state?.request;

    console.log("Strategies:", this.strategies);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  downloadReport() {
    this.http.post('http://localhost:9898/loan/download', this.request, { responseType: 'blob' })
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'loan_report.txt';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  viewAmortizationAll() {
    const payload = { ...this.request, includeAmortization: true };

    this.http.post('http://localhost:9898/loan/amortization', payload)
      .subscribe((res: any) => {
        this.router.navigate(['/amortization'], {
          state: { data: res }
        });
      });
  }

  // ✅ Pie chart data per strategy
  getPieChartData(strategy: any) {
  const principal = this.request?.loanAmount || 0;
  const interest = strategy?.totalInterestWithExtra || 0;

  return {
    labels: ['Principal', 'Interest'],
    datasets: [
      {
        data: [principal, interest],
        backgroundColor: ['#2ecc71', '#e74c3c'] // green + red (better contrast)
      }
    ]
  };
}

}