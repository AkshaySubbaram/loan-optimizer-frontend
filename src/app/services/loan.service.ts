import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoanRequest } from '../models/loan-request';
import { LoanResponse } from '../models/loan-response';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private baseUrl = 'http://localhost:9898/loan';

  constructor(private http: HttpClient) {}

  getSummary(req: LoanRequest): Observable<LoanResponse[]> {
    return this.http.post<LoanResponse[]>(`${this.baseUrl}/summary`, req);
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