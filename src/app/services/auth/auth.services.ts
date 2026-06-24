import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

// Services
import { AuthStorageServices } from '../auth-storage/auth-storage.services';

// Configs
import { API_CONFIG } from '../../core/config/api.config';

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
  private apiBaseUrl = environment.apiBaseUrl;

  userLogin(body: UserLogin): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_CONFIG.AUTH.LOGIN}`, body);
  }

  userRegister(body: UserRegister): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_CONFIG.AUTH.REGISTER}`, body);
  }

  userResetPassword(body: UserResetPasword): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${API_CONFIG.AUTH.RESET_PASSWORD}`, body);
  }

  userRefreshToken(): Observable<any> {
    const body: UserRefreshToken = {
      refreshToken: this.authStoragService.getRefreshToken() ?? '',
    };
    return this.http.post(`${this.apiBaseUrl}${API_CONFIG.AUTH.REFRESH_TOKEN}`, body);
  }
}
