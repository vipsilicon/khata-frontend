import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

import {
  catchError,
  switchMap,
  throwError,
  BehaviorSubject,
  filter,
  finalize,
  Observable,
  take,
} from 'rxjs';
import { AuthStorageServices } from '../../services/auth-storage/auth-storage.services';
import { AuthServices } from '../../services/auth/auth.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

/**
 * Session flow:
 * 1. Attach access token to every protected request
 * 2. If access token is expired (401 or 403 from this API) → call refresh-token once
 * 3. If refresh succeeds → save new tokens → retry the original request
 * 4. If refresh fails (invalid/expired refresh token) → logout
 *
 * Note: this backend returns statusCode 403 when the access token is expired/invalid.
 */

let isRefreshing = false;

/** null = refresh in progress; non-empty = new access token; '' = refresh failed */
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const PUBLIC_ROUTE_MARKERS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/forget-password',
  '/auth/reset-password',
];

function isPublicRequest(url: string): boolean {
  return PUBLIC_ROUTE_MARKERS.some((route) => url.includes(route));
}

/**
 * Access token expired / unauthorized — start refresh flow.
 * Backend uses 403 (and sometimes 401) when the access token is invalid/expired.
 */
function shouldAttemptRefresh(error: HttpErrorResponse): boolean {
  return error.status === 401 || error.status === 403;
}

function extractTokens(response: any): { accessToken: string; refreshToken: string } {
  // Support: { body: { accessToken } }, { data: { accessToken } }, or flat { accessToken }
  const root = response ?? {};
  const layer = root.body ?? root.data ?? root;
  const tokens = layer.body ?? layer.data ?? layer;

  const accessToken =
    tokens.accessToken ?? tokens.access_token ?? layer.accessToken ?? root.accessToken ?? '';
  const refreshToken =
    tokens.refreshToken ?? tokens.refresh_token ?? layer.refreshToken ?? root.refreshToken ?? '';

  return {
    accessToken: typeof accessToken === 'string' ? accessToken : '',
    refreshToken: typeof refreshToken === 'string' ? refreshToken : '',
  };
}

function withBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export const refreshInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authStorageService = inject(AuthStorageServices);
  const authService = inject(AuthServices);
  const router = inject(Router);
  const toasterMessageService = inject(ToasterMessageUtils);
  const platformId = inject(PLATFORM_ID);

  if (isPublicRequest(req.url)) {
    return next(req);
  }

  // SSR: no localStorage — pass through without auth / logout side effects
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const accessToken = authStorageService.getAccessToken();
  const authReq = accessToken ? withBearer(req, accessToken) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!shouldAttemptRefresh(error)) {
        return throwError(() => error);
      }

      // Already logged out
      if (!authStorageService.getAccessToken() && !authStorageService.getRefreshToken()) {
        return throwError(() => error);
      }

      return handleExpiredAccessToken(
        authReq,
        next,
        authStorageService,
        authService,
        router,
        toasterMessageService,
      );
    }),
  );
};

/**
 * Access token expired → refresh → retry OR logout if refresh fails.
 */
function handleExpiredAccessToken(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authStorageService: AuthStorageServices,
  authServices: AuthServices,
  router: Router,
  toasterMessage: ToasterMessageUtils,
): Observable<any> {
  const storedRefreshToken = authStorageService.getRefreshToken();

  if (!storedRefreshToken) {
    forceLogout(authStorageService, router, toasterMessage, 'Session expired. Please login again');
    return throwError(() => new Error('Refresh token not found'));
  }

  // Parallel 401s: wait for the in-flight refresh, then retry once
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => {
        if (!token) {
          return throwError(() => new Error('Session refresh failed'));
        }
        return next(withBearer(req, token));
      }),
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return authServices.userRefreshToken().pipe(
    // Only refresh-API errors land here (not the retried business request)
    catchError((refreshError: HttpErrorResponse | Error) => {
      refreshTokenSubject.next('');

      const status = refreshError instanceof HttpErrorResponse ? refreshError.status : undefined;

      // Refresh token rejected / invalid → logout
      if (status === 401 || status === 403) {
        forceLogout(
          authStorageService,
          router,
          toasterMessage,
          'Session expired. Please login again',
        );
        return throwError(() => refreshError);
      }

      // Network / server down — keep tokens so a page reload can recover
      if (status === 0 || status === undefined) {
        toasterMessage.warning(
          'Cannot reach server to refresh session. Check if the API is running.',
        );
        return throwError(() => refreshError);
      }

      // Other refresh failures (5xx, etc.) — treat as session failure → logout
      forceLogout(
        authStorageService,
        router,
        toasterMessage,
        'Could not refresh session. Please login again',
      );
      return throwError(() => refreshError);
    }),
    switchMap((response) => {
      const { accessToken, refreshToken: newRefreshToken } = extractTokens(response);

      // Refresh API returned 2xx but no tokens → treat as failed refresh → logout
      if (!accessToken) {
        refreshTokenSubject.next('');
        forceLogout(
          authStorageService,
          router,
          toasterMessage,
          'Session expired. Please login again',
        );
        return throwError(() => new Error('No access token in refresh response'));
      }

      // Persist new tokens (keep old refresh if API did not rotate)
      authStorageService.saveTokens(accessToken, newRefreshToken || storedRefreshToken);
      refreshTokenSubject.next(accessToken);

      // Retry original request with new access token (errors here do NOT logout)
      return next(withBearer(req, accessToken));
    }),
    finalize(() => {
      isRefreshing = false;
    }),
  );
}

function forceLogout(
  authStorageService: AuthStorageServices,
  router: Router,
  toasterMessage: ToasterMessageUtils,
  message: string,
): void {
  authStorageService.logout();
  refreshTokenSubject.next('');
  isRefreshing = false;
  toasterMessage.warning(message);
  router.navigate(['/auth/login']);
}
