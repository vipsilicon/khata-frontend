import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, Settings, UserPen } from 'lucide-angular';

// Constants
import { ROUTES_CONST } from '../../core/constants/routes.constants';
@Component({
  selector: 'app-side-bar',
  imports: [LucideAngularModule],
  standalone: true,
  templateUrl: './side-bar.component.html',
  styleUrl: './side-bar.component.css',
})
export class SideBarComponent {
  router = inject(Router);

  settings = Settings;
  userPen = UserPen;

  dashboardPage() {
    this.router.navigate([`${ROUTES_CONST.DASHBOARD.MAIN_PAGE}`]);
  }

  banksPage() {
    this.router.navigate([`${ROUTES_CONST.BANKS.MAIN_PAGE}`]);
  }

  cashPage() {
    this.router.navigate([`${ROUTES_CONST.CASH.MAIN_PAGE}`]);
  }

  investmentsPage() {
    this.router.navigate([`${ROUTES_CONST.INVESTMENTS.MAIN_PAGE}`]);
  }

  profilePage() {
    this.router.navigate([`${ROUTES_CONST.PROFILE.MAIN_PAGE}`]);
  }

  transactionsPage() {
    this.router.navigate([`${ROUTES_CONST.TRANSACTIONS.MAIN_PAGE}`]);
  }

  settingsPage() {
    this.router.navigate([`${ROUTES_CONST.SETTINGS.MAIN_PAGE}`]);
  }

  debtPage() {
    this.router.navigate([`${ROUTES_CONST.DEBT.MAIN_PAGE}`]);
  }
}
