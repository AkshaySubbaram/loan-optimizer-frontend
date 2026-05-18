import { Component, signal, OnInit, effect, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  protected readonly title = signal('loan-frontend');
  isDarkMode = signal<boolean>(true);
  showFaq = signal<boolean>(false);
  readonly faqItems = [
    {
      question: 'What does AyRaSh help me calculate?',
      answer: 'AyRaSh helps you compare repayment strategies for loans, including EMI impact, interest saved, tenure reduction, extra EMI, and part-payment scenarios.'
    },
    {
      question: 'When should I use Direct Strategy?',
      answer: 'Use Direct Strategy when you want a quick calculation for one loan using loan amount, interest rate, tenure, optional extra EMI, and optional part payments.'
    },
    {
      question: 'When should I use Expense-Based Strategy?',
      answer: 'Use Expense-Based Strategy when you want advice based on your monthly income, recurring expenses, emergency fund, risk profile, goal, and multiple active loans.'
    },
    {
      question: 'What is extra EMI?',
      answer: 'Extra EMI is an additional amount you can pay every month above your regular EMI. It can reduce interest and close the loan faster.'
    },
    {
      question: 'What are part payments?',
      answer: 'Part payments are lump-sum payments made in specific months. They reduce the outstanding principal and can lower total interest.'
    },
    {
      question: 'Can I compare multiple loans?',
      answer: 'Yes. Choose Expense-Based Strategy and add each active loan with its loan name, amount, interest rate, tenure, and optional sanction date.'
    },
    {
      question: 'Why does the app ask for expenses?',
      answer: 'Expenses help estimate your disposable income, so the recommendation does not become too aggressive for your real monthly cash flow.'
    },
    {
      question: 'How is risk profile used?',
      answer: 'Risk profile guides how aggressive the repayment advice should be. Low risk favors comfort and safety, while high risk can allow more aggressive payoff suggestions.'
    },
    {
      question: 'What does the goal selection change?',
      answer: 'Lower EMI focuses on reducing monthly pressure, Minimize Interest focuses on saving money, and Close Faster focuses on reducing tenure.'
    },
    {
      question: 'Why does emergency fund matter?',
      answer: 'The app considers your emergency fund so it does not recommend using too much cash for loan repayment when you still need a safety buffer.'
    },
    {
      question: 'Can I edit my inputs after seeing results?',
      answer: 'Yes. On the results screen, use Edit Inputs or Go Back to return to the expense-based form with your entered data restored.'
    },
    {
      question: 'What do TXT and PDF downloads include?',
      answer: 'Downloads include your input summary, recommendation, loan priority, repayment advice, and strategy comparison details.'
    },
    {
      question: 'Why might results differ from my bank statement?',
      answer: 'Banks may use specific daily interest, fees, reset rules, or rounding methods. AyRaSh gives planning estimates, not an official lender schedule.'
    },
    {
      question: 'Is my entered data saved permanently?',
      answer: 'The app stores form data locally in your browser only to support editing and back navigation. Use Reset All or the AyRaSh logo to clear the saved form state.'
    },
    {
      question: 'What should I do if calculation fails?',
      answer: 'Check that required fields are filled correctly. If the backend is unavailable or returns an error, try again after confirming the API service is running.'
    }
  ];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Sync dark mode changes to DOM (only on browser)
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const isDark = this.isDarkMode();
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      }
    });
  }

  ngOnInit() {
    // Load saved theme preference (only on browser)
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (prefersDark ? 'dark' : 'light');
      this.isDarkMode.set(theme === 'dark');
    }
  }

  toggleTheme() {
    this.isDarkMode.set(!this.isDarkMode());
  }

  goHome() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('ayrashLoanFormState');
    }

    this.router.navigate(['/']);
  }

  openFaq() {
    this.showFaq.set(true);
  }

  closeFaq() {
    this.showFaq.set(false);
  }

  openChat() {
    alert('Hi! I\'m AyRaSh. Tell me your loan goal and I\'ll help you choose the best repayment path.');
  }
}
