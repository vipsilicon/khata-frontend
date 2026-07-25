import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
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

let isRefreshing = false;
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

/** Nest-style auth failures often come as 401 Unauthorized or 403 Forbidden resource. */
function isAuthFailure(error: HttpErrorResponse): boolean {
  if (error.status === 401) {
    return true;
  }

  if (error.status === 403) {
    const message = String(error.error?.message ?? error.message ?? '').toLowerCase();
    const err = String(error.error?.error ?? '').toLowerCase();
    return (
      message.includes('forbidden') ||
      message.includes('token') ||
      message.includes('unauthorized') ||
      err.includes('forbidden')
    );
  }

  return false;
}

function extractTokens(response: any): { accessToken: string; refreshToken: string } {
  const body = response?.body ?? response ?? {};
  const accessToken = body.accessToken ?? body.access_token ?? '';
  const refreshToken = body.refreshToken ?? body.refresh_token ?? '';
  return { accessToken, refreshToken };
}

export const refreshInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authStorageService = inject(AuthStorageServices);
  const authService = inject(AuthServices);
  const router = inject(Router);
  const toasterMessageService = inject(ToasterMessageUtils);

  // Never attach Bearer / never enter refresh loop for auth endpoints
  if (isPublicRequest(req.url)) {
    return next(req);
  }

  const accessToken = authStorageService.getAccessToken();
  const authReq = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isAuthFailure(error)) {
        return throwError(() => error);
      }

      return handleAuthFailure(
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

function handleAuthFailure(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authStorageService: AuthStorageServices,
  authServices: AuthServices,
  router: Router,
  toasterMessage: ToasterMessageUtils,
): Observable<any> {
  const refreshToken = authStorageService.getRefreshToken();

  if (!refreshToken) {
    forceLogout(authStorageService, router, toasterMessage, 'Session expired. Please login again');
    return throwError(() => new Error('Refresh token not found'));
  }

  // Another request already refreshing — wait for the new access token, then retry
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null && token.length > 0),
      take(1),
      switchMap((token) =>
        next(
          req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ),
      ),
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return authServices.userRefreshToken().pipe(
    switchMap((response) => {
      const { accessToken, refreshToken: newRefreshToken } = extractTokens(response);

      if (!accessToken) {
        forceLogout(
          authStorageService,
          router,
          toasterMessage,
          'Session expired. Please login again',
        );
        return throwError(() => new Error('No access token in refresh response'));
      }

      authStorageService.saveTokens(accessToken, newRefreshToken || refreshToken);
      refreshTokenSubject.next(accessToken);

      return next(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
    }),
    catchError((refreshError: HttpErrorResponse) => {
      // Refresh itself failed (often 401/403 Forbidden resource) → clear session
      let message = 'Session expired. Please login again';

      switch (refreshError.status) {
        case 401:
          message = 'Session expired. Please login again';
          break;
        case 403:
          message = 'Refresh token is invalid or forbidden. Please login again';
          break;
        case 500:
          message = 'Internal server error while refreshing session';
          break;
        default:
          message = 'Could not refresh session. Please login again';
      }

      forceLogout(authStorageService, router, toasterMessage, message);
      return throwError(() => refreshError);
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
  refreshTokenSubject.next(null);
  toasterMessage.warning(message);
  router.navigate(['/auth/login']);
}
