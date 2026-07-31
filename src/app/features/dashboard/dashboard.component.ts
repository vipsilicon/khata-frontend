import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  LucideAngularModule,
  LucideIconData,
  Menu,
  Landmark,
  PiggyBank,
  HandCoins,
  Wallet,
  ChartCandlestick,
} from 'lucide-angular';
import { DashCardComponent } from '../../components/dash-card/dash-card.component';
import { AgendaComponent } from '../../components/agenda/agenda.component';

// Services
import { ApiServices } from '../../services/api/api.services';

// Config
import { API_CONFIG } from '../../core/config/api.config';

interface DashboardCard {
  id: number;
  title: string;
  icon: LucideIconData;
  balance: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [LucideAngularModule, DashCardComponent, CommonModule, AgendaComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly apiService = inject(ApiServices);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly menu = Menu;
  readonly landmark = Landmark;
  readonly piggyBank = PiggyBank;
  readonly handCoins = HandCoins;
  readonly wallet = Wallet;
  readonly chartCandlestick = ChartCandlestick;

  /** Bank id:1 ← /user-banks/total · Cash id:2 ← /cash-transaction/total */
  list = signal<DashboardCard[]>([
    {
      id: 1,
      title: 'Bank',
      icon: this.landmark,
      balance: 0,
    },
    {
      id: 2,
      title: 'Cash',
      icon: this.wallet,
      balance: 0,
    },
    {
      id: 3,
      title: 'Assets',
      icon: this.handCoins,
      balance: 3000,
    },
    {
      id: 4,
      title: 'Shares',
      icon: this.chartCandlestick,
      balance: 4000,
    },
    {
      id: 5,
      title: 'Loans',
      icon: this.piggyBank,
      balance: 0,
    },
  ]);

  ngOnInit(): void {
    this.refreshDashboardTotals();

    // Re-fetch when user navigates back to dashboard (e.g. after credit/debit elsewhere)
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects.includes('/dashboard')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.refreshDashboardTotals();
      });

    // Re-fetch when tab/window becomes visible again
    if (typeof document !== 'undefined') {
      const onVisibility = () => {
        if (document.visibilityState === 'visible' && this.router.url.includes('/dashboard')) {
          this.refreshDashboardTotals();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('visibilitychange', onVisibility);
      });
    }
  }

  /** Refresh Bank + Cash balances together. */
  refreshDashboardTotals(): void {
    this.loadBankTotal();
    this.loadCashTotal();
  }

  /**
   * Fetches total bank balance from API and updates the Bank card in the list.
   * Call again after bank-related credits/debits so the UI stays in sync.
   */
  loadBankTotal(): void {
    this.apiService.get(`${API_CONFIG.USER_BANK.TOTAL}`).subscribe({
      next: (response: any) => {
        const amount = Number(response?.body?.amount ?? 0);

        this.list.update((cards) =>
          cards.map((card) => (card.id === 1 ? { ...card, balance: amount } : card)),
        );
      },
      error: () => {
        // Keep last known balance on failure
      },
    });
  }

  /**
   * Fetches total cash balance from API and updates the Cash card in the list.
   * Call again after cash-related credits/debits so the UI stays in sync.
   */
  loadCashTotal(): void {
    this.apiService.get(`${API_CONFIG.CASH_TRANSACTION.TOTAL}`).subscribe({
      next: (response: any) => {
        const amount = Number(response?.body?.amount ?? 0);

        this.list.update((cards) =>
          cards.map((card) => (card.id === 2 ? { ...card, balance: amount } : card)),
        );
      },
      error: () => {
        // Keep last known balance on failure
      },
    });
  }
}
