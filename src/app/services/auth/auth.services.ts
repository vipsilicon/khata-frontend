import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthStorageServices } from '../auth-storage/auth-storage.services';

interface UserLogin {
  email: string;
  password: string;
}

interface UserRegister {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  password: string;
}

interface UserResetPasword {
  email: string;
  password: string;
}

interface UserRefreshToken {
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthServices {
  private http = inject(HttpClient);
  private authStoragService = inject(AuthStorageServices);
  private apiUrl = 'http://localhost:3000/auth';

  userLogin(body: UserLogin): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/user`, body);
  }

  userRegister(body: UserRegister): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/user`, body);
  }

  userResetPassword(body: UserResetPasword): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, body);
  }

  userRefreshToken(): Observable<any> {
    const body: UserRefreshToken = {
      refreshToken: this.authStoragService.getRefreshToken() ?? '',
    };
    return this.http.post(`${this.apiUrl}/refresh-token`, body);
  }
}
