import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiServices {
  private http = inject(HttpClient);
  private apiBaseUrl = environment.apiBaseUrl;

  private createParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    Object.keys(params).forEach((key) => {
      const value = params[key];

      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value);
      }
    });

    return httpParams;
  }

  get<T>(url: string, params?: Record<string, any>): Observable<T> {
    return this.http.get<T>(`${this.apiBaseUrl}${url}`, { params: this.createParams(params) });
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiBaseUrl}${url}`, body, {});
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiBaseUrl}${url}`, body, {});
  }
}
