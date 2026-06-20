import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { AuthStorageServices } from '../../services/auth-storage/auth-storage.services';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  console.log('Inside a auth guard');
  const platformId = inject(PLATFORM_ID);
  const authStorage = inject(AuthStorageServices);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  console.log(authStorage.isLoggedIn());
  console.log(authStorage.getAccessToken());

  if (authStorage.isLoggedIn()) {
    console.log('Alloed to loggin');
    return true;
  }

  console.log('end');

  return router.createUrlTree(['/auth/login']);
};
