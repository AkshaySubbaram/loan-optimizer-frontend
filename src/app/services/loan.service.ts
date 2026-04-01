import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoanRequest } from '../models/loan-request';
import { LoanResponse } from '../models/loan-response';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private baseUrl = `${environment.apiBaseUrl}`;

  constructor(private http: HttpClient) {}

  getSummary(req: LoanRequest): Observable<LoanResponse[]> {
    return this.http.post<LoanResponse[]>(`${this.baseUrl}/summary`, req);
  }

  getExpenseStrategy(req: LoanRequest): Observable<any> {
    // Backend should handle `useIncomeStrategy` + `expenseRequest` payload.
    return this.http.post<any>(`${this.baseUrl}/strategy`, req);
  }

  getAmortization(req: LoanRequest): Observable<LoanResponse[]> {
    return this.http.post<LoanResponse[]>(`${this.baseUrl}/amortization`, req);
  }

  downloadReport(req: LoanRequest) {
    return this.http.post(`${this.baseUrl}/download`, req, {
      responseType: 'blob'
    });
  }
}