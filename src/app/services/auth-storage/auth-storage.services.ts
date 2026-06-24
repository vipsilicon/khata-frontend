import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Constants
import { AUTH_STORAGE } from '../../core/constants/auth-storage.constants';

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
    return localStorage.getItem(`${AUTH_STORAGE.ACCESS_TOKEN}`);
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(`${AUTH_STORAGE.REFRESH_TOKEN}`);
  }

  logout() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(`${AUTH_STORAGE.ACCESS_TOKEN}`);
    localStorage.removeItem(`${AUTH_STORAGE.REFRESH_TOKEN}`);
    localStorage.removeItem(`${AUTH_STORAGE.USER}`);
  }

  getUserName(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const user = localStorage.getItem(`${AUTH_STORAGE.USER}`);

    if (user) {
      return JSON.parse(user).firstName;
    }

    return null;
  }

  saveUserDetails(user: string): void {
    localStorage.setItem(`${AUTH_STORAGE.USER}`, user);
  }

  saveTokens(accessToken: string, refreshToken: string): void {
    if (typeof accessToken == 'string' && accessToken.length > 0) {
      localStorage.setItem(`${AUTH_STORAGE.ACCESS_TOKEN}`, accessToken);
    }
    if (typeof refreshToken == 'string' && refreshToken.length > 0) {
      localStorage.setItem(`${AUTH_STORAGE.REFRESH_TOKEN}`, refreshToken);
    }
  }
}
