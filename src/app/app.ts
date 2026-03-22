import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoanForm } from './components/loan-form/loan-form';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoanForm],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('loan-frontend');

  constructor(private router: Router) {}
  
  goHome() {
  this.router.navigate(['/']);
}

}
