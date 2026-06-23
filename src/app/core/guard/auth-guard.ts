import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Services
import { AuthStorageServices } from '../../services/auth-storage/auth-storage.services';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const authStorage = inject(AuthStorageServices);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authStorage.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
