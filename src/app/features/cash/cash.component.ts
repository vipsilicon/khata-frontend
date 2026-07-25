import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ArrowDown, ArrowUp, ArrowUpDown, LucideAngularModule } from 'lucide-angular';

// Services
import { ApiServices } from '../../services/api/api.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../core/config/api.config';

export interface CashTransaction {
  id: number;
  referenceId: string;
  transactionType: string;
  amount: string;
  transactionDateTime: string;
  createdAt: string;
  updatedAt: string;
}

type SortKey = keyof CashTransaction;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-cash.component',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './cash.component.html',
  styleUrl: './cash.component.css',
})
export class CashComponent implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);

  readonly arrowUp = ArrowUp;
  readonly arrowDown = ArrowDown;
  readonly arrowUpDown = ArrowUpDown;
  readonly limit = 10;

  cashTransactions = signal<CashTransaction[]>([]);
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  page = signal<number>(1);
  lastPage = signal<number>(1);
  total = signal<number>(0);

  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');

  sortedCashTransactions = computed(() => {
    const list = [...this.cashTransactions()];
    const key = this.sortKey();
    const dir = this.sortDir();

    return list.sort((a, b) => {
      let av: string | number = a[key] ?? '';
      let bv: string | number = b[key] ?? '';

      if (key === 'amount' || key === 'id') {
        av = Number(av);
        bv = Number(bv);
      } else if (key === 'transactionDateTime' || key === 'createdAt' || key === 'updatedAt') {
        av = new Date(String(av)).getTime();
        bv = new Date(String(bv)).getTime();
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }

      if (av < bv) {
        return dir === 'asc' ? -1 : 1;
      }
      if (av > bv) {
        return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
  });

  hasMore = computed(() => this.page() < this.lastPage());

  ngOnInit(): void {
    this.loadCashTransactions(true);
  }

  loadCashTransactions(reset = false): void {
    if (this.loading() || this.loadingMore()) {
      return;
    }

    if (!reset && this.page() > this.lastPage()) {
      return;
    }

    if (reset) {
      this.page.set(1);
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }

    const currentPage = this.page();

    this.apiService
      .get(`${API_CONFIG.CASH_TRANSACTION.LIST}`, {
        page: currentPage,
        limit: this.limit,
      })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loadingMore.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const body = response?.body ?? {};
          const data: CashTransaction[] = (body.data ?? []).map((item: any) => ({
            id: item.id,
            referenceId: item.referenceId,
            transactionType: item.transactionType,
            amount: item.amount,
            transactionDateTime: item.transactionDateTime,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          if (reset) {
            this.cashTransactions.set(data);
          } else {
            this.cashTransactions.update((prev) => [...prev, ...data]);
          }

          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error('Failed to load cash transactions');
        },
      });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const threshold = 80;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      this.loadMore();
    }
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.page.update((p) => p + 1);
    this.loadCashTransactions(false);
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  sortIcon(key: SortKey) {
    if (this.sortKey() !== key) {
      return this.arrowUpDown;
    }
    return this.sortDir() === 'asc' ? this.arrowUp : this.arrowDown;
  }

  typeBadgeClass(type: string): string {
    return type === 'CREDIT'
      ? 'bg-emerald-100 text-emerald-700'
      : type === 'DEBIT'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-gray-100 text-gray-700';
  }
}
