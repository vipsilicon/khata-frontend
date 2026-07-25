import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ArrowDown, ArrowUp, ArrowUpDown, LucideAngularModule } from 'lucide-angular';

// Services
import { ApiServices } from '../../services/api/api.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../core/config/api.config';

export interface Investment {
  id: number;
  referenceId: string;
  investmentType: string;
  investmentName: string;
  amount: string;
  quantity: string;
  transactionDateTime: string;
  createdAt: string;
  updatedAt: string;
}

type SortKey = keyof Investment;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-investments.components',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './investments.components.html',
  styleUrl: './investments.components.css',
})
export class InvestmentsComponents implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);

  readonly arrowUp = ArrowUp;
  readonly arrowDown = ArrowDown;
  readonly arrowUpDown = ArrowUpDown;
  readonly limit = 10;

  investments = signal<Investment[]>([]);
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  page = signal<number>(1);
  lastPage = signal<number>(1);
  total = signal<number>(0);

  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');

  sortedInvestments = computed(() => {
    const list = [...this.investments()];
    const key = this.sortKey();
    const dir = this.sortDir();

    return list.sort((a, b) => {
      let av: string | number = a[key] ?? '';
      let bv: string | number = b[key] ?? '';

      if (key === 'amount' || key === 'quantity' || key === 'id') {
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
    this.loadInvestments(true);
  }

  loadInvestments(reset = false): void {
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
      .get(`${API_CONFIG.INVESTMENT.LIST}`, {
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
          const data: Investment[] = (body.data ?? []).map((item: any) => ({
            id: item.id,
            referenceId: item.referenceId,
            investmentType: item.investmentType,
            investmentName: item.investmentName,
            amount: item.amount,
            quantity: item.quantity,
            transactionDateTime: item.transactionDateTime,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          if (reset) {
            this.investments.set(data);
          } else {
            this.investments.update((prev) => [...prev, ...data]);
          }

          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error('Failed to load investments');
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
    this.loadInvestments(false);
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
}
