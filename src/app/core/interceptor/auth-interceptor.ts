import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStorageServices } from '../../services/auth-storage/auth-storage.services';
import { AuthServices } from '../../services/auth/auth.services';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStorage = inject(AuthStorageServices);
  const authService = inject(AuthServices);
  const router = inject(Router);
  const toasterMessageService = inject(ToasterMessageUtils);

  if (
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh-token') ||
    req.url.includes('/auth/register  ')
  ) {
    return next(req);
  }

  const accessToken = authStorage.getAccessToken();

  if (accessToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      const refreshToken = authStorage.getRefreshToken();

      if (!refreshToken) {
        authStorage.logout();
        toasterMessageService.warning('Session Expired. Please Login Again.');
        router.navigate(['/auth/login']);

        return throwError(() => error);
      }

      return authService.userRefreshToken().pipe(
        switchMap((response) => {
          authStorage.saveTokens(response.accessToken, response.refreshToken);

          const retryRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${response.accessToken}`,
            },
          });

          return next(retryRequest);
        }),
        catchError((refreshError: HttpErrorResponse) => {
          authStorage.logout();

          switch (refreshError.status) {
            case 401:
              toasterMessageService.warning('Session Expired. Please Login Again.');
              break;

            case 403:
              toasterMessageService.warning('Refresh Token Invalid.');
              break;

            case 500:
              toasterMessageService.warning('Server Error');
              break;

            default:
              toasterMessageService.warning('Something Went Wrong.');
              break;
          }

          router.navigate(['/auth/login']);

          return throwError(() => error);
        }),
      );
    }),
  );
};
