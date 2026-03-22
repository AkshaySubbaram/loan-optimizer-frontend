import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-amortization',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './amortization-table.html'
})
export class AmortizationTable {

  data: any[] = [];

   constructor(private router: Router) {}

  ngOnInit() {
    console.log("STATE:", history.state);

    this.data = history.state?.data || [];

    if (!this.data.length) {
      alert("No amortization data found");
    }
  }

}