# Loan Frontend

Angular 21 frontend for a loan planning application with two separate calculation flows:

- `Normal Loan`: runs fully on the frontend and updates live on the same page.
- `Expense-Based Strategy`: keeps the existing backend-driven flow and navigates to the results screen after calculation.

## What The App Does

The application helps users compare loan repayment strategies using:

- loan amount
- interest rate
- tenure in months
- extra EMI per month
- part payments
- monthly income
- recurring expenses
- multiple existing loans
- emergency fund details
- goal and risk profile

The UI supports two planning modes so users can either do a quick single-loan simulation or a broader expense-based repayment strategy.

## Current Behavior

### Normal Loan

This mode is now a single-page experience.

- No backend call is made for the normal loan calculation.
- Results update live as the user changes inputs.
- The page shows:
  - recommended strategy
  - strategy comparison cards
  - principal vs interest pie charts
  - EMI
  - interest saved
  - tenure reduction
  - total interest for each strategy

The frontend calculator currently compares:

- `Normal EMI`
- `Extra EMI Strategy`
- `Part Payment Strategy`
- `Combined Prepayment Strategy`

The calculation logic lives in [src/app/utils/normal-loan-calculator.ts](src/app/utils/normal-loan-calculator.ts).

### Expense-Based Strategy

This mode is intentionally unchanged in functional behavior.

- It still validates the expense-based form fields.
- It still builds the same `expenseRequest` payload.
- It still calls the backend through `LoanService.getExpenseStrategy(...)`.
- It still navigates to the results page after calculation.

Relevant files:

- [src/app/components/loan-form/loan-form.ts](src/app/components/loan-form/loan-form.ts)
- [src/app/services/loan.service.ts](src/app/services/loan.service.ts)
- [src/app/components/strategy-list/strategy-list.ts](src/app/components/strategy-list/strategy-list.ts)

## Main Screens

### 1. Loan Form

File:

- [src/app/components/loan-form/loan-form.html](src/app/components/loan-form/loan-form.html)
- [src/app/components/loan-form/loan-form.ts](src/app/components/loan-form/loan-form.ts)
- [src/app/components/loan-form/loan-form.css](src/app/components/loan-form/loan-form.css)

Responsibilities:

- mode selection
- form rendering
- numeric input sanitizing
- frontend validation
- live normal-loan calculation
- expense-based backend request preparation

### 2. Strategy Results

Files:

- [src/app/components/strategy-list/strategy-list.html](src/app/components/strategy-list/strategy-list.html)
- [src/app/components/strategy-list/strategy-list.ts](src/app/components/strategy-list/strategy-list.ts)

Responsibilities:

- displays backend expense-based results
- renders recommended strategy details
- renders charts
- supports report download
- supports amortization navigation

### 3. Amortization View

Files:

- [src/app/components/amortization-table/amortization-table.html](src/app/components/amortization-table/amortization-table.html)
- [src/app/components/amortization-table/amortization-table.ts](src/app/components/amortization-table/amortization-table.ts)

Responsibilities:

- displays amortization rows for returned strategy data

## Project Structure

Key files:

- [src/app/app.html](src/app/app.html): application shell/header
- [src/app/app.css](src/app/app.css): app-level styling
- [src/app/app.routes.ts](src/app/app.routes.ts): route configuration
- [src/app/services/loan.service.ts](src/app/services/loan.service.ts): backend API calls
- [src/app/utils/normal-loan-calculator.ts](src/app/utils/normal-loan-calculator.ts): frontend normal-loan calculator
- [src/app/utils/app-error.ts](src/app/utils/app-error.ts): user-friendly error mapping
- [src/app/models/loan-request.ts](src/app/models/loan-request.ts): request contracts
- [src/app/models/loan-response.ts](src/app/models/loan-response.ts): response contracts

## Validation And Error Handling

The application now includes clearer frontend validation and user-facing error messages.

- numeric inputs are sanitized
- normal loan required fields are validated before calculation
- incomplete part-payment rows are flagged
- expense-based required fields are validated before backend submission
- backend and network errors are mapped to more understandable messages

Error mapping lives in:

- [src/app/utils/app-error.ts](src/app/utils/app-error.ts)

## Running The Project

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Build the project:

```bash
npm run build
```

Run unit tests:

```bash
npm test
```

## Backend Notes

The frontend still expects the backend for:

- expense-based strategy calculation
- amortization endpoint
- text report download
- PDF report download

The normal-loan mode no longer depends on the backend for strategy calculation itself.

## Build Notes

The project currently builds successfully, but there are still warning-level budget notices for:

- initial bundle size
- `strategy-list.css`
- `loan-form.css`

These warnings do not block the build at the moment.

## Summary

At this point:

- `Normal Loan` is frontend-only and live on the same page
- `Expense-Based Strategy` remains backend-driven
- the expense-based flow was not changed in functional behavior
- the UI includes sliders, validation improvements, clearer error messages, and richer live visual feedback for normal-loan strategies
