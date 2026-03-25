import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { LoanService } from '../../services/loan.service';

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

  constructor(private router: Router, private loanService: LoanService, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

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
    this.loanService.downloadReport(this.request).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loan_report.txt';
      a.click();
      window.URL.revokeObjectURL(url);
    }, error => {
      console.error('Download error:', error);
      alert('Download failed. See console for details.');
    });
  }

  viewAmortizationAll() {
    const payload = { ...this.request, includeAmortization: true };

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