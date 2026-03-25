import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-amortization',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './amortization-table.html'
})
export class AmortizationTable implements OnInit {

  data: any[] = [];

   constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    console.log("STATE:", history.state);
    this.data = history.state?.data || [];

    if (!this.data.length) {
      alert("No amortization data found");
    }
  }

}