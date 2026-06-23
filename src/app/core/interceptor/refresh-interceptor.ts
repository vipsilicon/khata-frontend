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

let isRefreshing: boolean = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const refreshInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authStorageService = inject(AuthStorageServices);
  const authService = inject(AuthServices);
  const router = inject(Router);
  const toasterMessageService = inject(ToasterMessageUtils);

  const publicRoutes = ['/auth/login', 'auth/register', 'auth/refresh-token'];

  const isPublic = publicRoutes.some((route) => req.url.includes(route));

  if (isPublic) {
    return next(req);
  }

  const accessToken = authStorageService.getAccessToken();

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

      return handle401(req, next, authStorageService, authService, router, toasterMessageService);
    }),
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authStorageService: AuthStorageServices,
  authServices: AuthServices,
  router: Router,
  toasterMessage: ToasterMessageUtils,
): Observable<any> {
  const refreshToken = authStorageService.getRefreshToken();

  if (!refreshToken) {
    authStorageService.logout();
    router.navigate(['/auth/login']);
    toasterMessage.warning('Session expired. Please Login Again');

    return throwError(() => new Error('Refresh Token Not Found'));
  }

  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => {
        const retryRequest = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });

        return next(retryRequest);
      }),
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return authServices.userRefreshToken().pipe(
    switchMap((response) => {
      authStorageService.saveTokens(response.body.accessToken, response.body.refreshToken);

      refreshTokenSubject.next(response.accessToken);

      const retryRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });

      return next(retryRequest);
    }),

    catchError((refreshError: HttpErrorResponse) => {
      // authStorageService.logout();
      // router.navigate(['/auth/login']);

      switch (refreshError.status) {
        case 401:
          toasterMessage.warning('Session Expired.');
          break;

        case 403:
          toasterMessage.warning('Refresh Token is invalid');
          break;

        case 500:
          toasterMessage.warning('Internal Server Error');
          break;

        default:
          toasterMessage.warning('Something Went Wrong');
      }

      return throwError(() => refreshError);
    }),
    finalize(() => {
      isRefreshing = false;
    }),
  );
}
