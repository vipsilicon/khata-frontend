import { Routes } from '@angular/router';

// Guards
import { authGuard } from './core/guard/auth-guard';

// Components
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: DashboardLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((c) => c.DashboardComponent),
      },
      {
        path: 'banks',
        loadComponent: () =>
          import('./features/banks/banks.component').then((c) => c.BanksComponent),
      },
      {
        path: 'investments',
        loadComponent: () =>
          import('./features/investments/investments.components').then(
            (c) => c.InvestmentsComponents,
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/transactions/transactions.components').then(
            (c) => c.TransactionsComponents,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.components').then((c) => c.SettingsComponents),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((c) => c.ProfileComponent),
      },
      {
        path: 'cash',
        loadComponent: () => import('./features/cash/cash.component').then((c) => c.CashComponent),
      },
      {
        path: 'debt',
        loadComponent: () => import('./features/debt/debt.component').then((c) => c.DebtComponent),
      },
      {
        path: 'groceries',
        loadComponent: () =>
          import('./features/groceries/groceries.component').then((c) => c.GroceriesComponent),
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(
        (m) => m.AUTH_ROUTES as unknown as import('@angular/router').Routes,
      ),
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
