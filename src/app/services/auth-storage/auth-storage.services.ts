import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthStorageServices {
  private platformId = inject(PLATFORM_ID);

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('refreshToken');
  }

  logout() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getUserName(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const user = localStorage.getItem('user');

    if (user) {
      return JSON.parse(user).firstName;
    }

    return null;
  }

  saveUserDetails(user: string): void {
    localStorage.setItem('user', user);
  }

  saveTokens(accessToken: string, refreshToken: string): void {
    if (typeof accessToken == 'string' && accessToken.length > 0) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (typeof refreshToken == 'string' && refreshToken.length > 0) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }
}
