import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStorageServices } from '../../services/auth-storage/auth-storage.services';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authStorageService = inject(AuthStorageServices);

  const publicRoutes = [
    '/auth/login',
    '/auth/refresh-token',
    '/auth/register',
    '/auth/forget-password',
  ];

  const isPublic = publicRoutes.some((route) => req.url.includes(route));

  if (isPublic) {
    return next(req);
  }

  const accessToken = authStorageService.getAccessToken();

  if (!accessToken) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return next(authReq);
};
