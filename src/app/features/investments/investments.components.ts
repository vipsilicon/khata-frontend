import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

// Services
import { ApiServices } from '../../services/api/api.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../core/config/api.config';

// Constants
import { INVESTMENTS_CONST } from '../../core/constants/investments.constants';

// Components
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';
import { DataTableComponent } from '../../components/data-table/data-table.component';
import { DataTableColumn } from '../../components/data-table/data-table.types';
import { FormInputComponent } from '../../components/form-input/form-input.component';

// Utils
import { isNearBottom, nextSortState, sortRows, SortDir } from '../../utils/table.utils';

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

@Component({
  selector: 'app-investments.components',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
  ],
  templateUrl: './investments.components.html',
  styleUrl: './investments.components.css',
})
export class InvestmentsComponents implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  readonly INVESTMENTS_C = INVESTMENTS_CONST;
  readonly limit = 10;

  readonly columns: DataTableColumn<Investment>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
    {
      key: 'investmentType',
      label: 'Investment Type',
      type: 'badge',
      sortable: true,
      badgeClass: () => 'bg-amber-100 text-amber-800',
    },
    { key: 'investmentName', label: 'Investment Name', type: 'text', sortable: true },
    { key: 'quantity', label: 'Quantity', type: 'number', sortable: true },
    { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
    { key: 'actions', label: 'Action', type: 'actions', align: 'center' },
  ];

  investments = signal<Investment[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  saving = signal(false);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');
  amount = signal(0);

  showEditModal = signal(false);
  showDeleteModal = signal(false);
  editInvestment = signal<Investment | null>(null);
  deleteInvestment = signal<Investment | null>(null);

  editForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    investmentType: ['', Validators.required],
    investmentName: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0)]],
    amount: [0, [Validators.required, Validators.min(0)]],
  });

  sortedInvestments = computed(() =>
    sortRows(this.investments(), this.sortKey(), this.sortDir()),
  );

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

          this.investments.update((prev) => (reset ? data : [...prev, ...data]));
          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error(this.INVESTMENTS_C.TOASTER_MESSAGE.LOAD.FAILED);
        },
      });
  }

  onScroll(event: Event): void {
    if (isNearBottom(event.target as HTMLElement)) {
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

  toggleSort(key: string): void {
    const next = nextSortState(this.sortKey(), this.sortDir(), key);
    this.sortKey.set(next.key as SortKey);
    this.sortDir.set(next.dir);
  }

  onEditInvestment(item: Investment): void {
    this.editInvestment.set(item);
    this.editForm.reset({
      transactionDateTime: this.toDateTimeLocal(item.transactionDateTime),
      investmentType: item.investmentType,
      investmentName: item.investmentName,
      quantity: Number(item.quantity) || 0,
      amount: Number(item.amount) || 0,
    });
    this.showEditModal.set(true);
  }

  cancelEditModal(): void {
    this.showEditModal.set(false);
    this.editInvestment.set(null);
    this.editForm.reset({
      transactionDateTime: '',
      investmentType: '',
      investmentName: '',
      quantity: 0,
      amount: 0,
    });
  }

  confirmEditModal(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toasterMessageService.warning(this.INVESTMENTS_C.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    const current = this.editInvestment();
    if (!current || this.saving()) {
      return;
    }

    const formValue = this.editForm.getRawValue();
    const body = {
      id: current.id,
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      investmentType: formValue.investmentType.trim(),
      investmentName: formValue.investmentName.trim(),
      quantity: Number(formValue.quantity).toFixed(2),
      amount: Number(formValue.amount).toFixed(2),
    };

    this.saving.set(true);

    this.apiService
      .patch(`${API_CONFIG.INVESTMENT.UPDATE}/${current.id}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const updatedBody = response?.body ?? response ?? {};
          const updated: Investment = {
            ...current,
            transactionDateTime: updatedBody.transactionDateTime ?? body.transactionDateTime,
            investmentType: updatedBody.investmentType ?? body.investmentType,
            investmentName: updatedBody.investmentName ?? body.investmentName,
            quantity: updatedBody.quantity ?? body.quantity,
            amount: updatedBody.amount ?? body.amount,
          };

          this.investments.update((list) =>
            list.map((item) => (item.id === current.id ? updated : item)),
          );
          this.toasterMessageService.success(this.INVESTMENTS_C.TOASTER_MESSAGE.UPDATE.SUCCESS);
          this.cancelEditModal();
        },
        error: () => {
          this.toasterMessageService.error(this.INVESTMENTS_C.TOASTER_MESSAGE.UPDATE.FAILED);
        },
      });
  }

  onDeleteInvestment(item: Investment): void {
    this.deleteInvestment.set(item);
    this.showDeleteModal.set(true);
  }

  cancelDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteInvestment.set(null);
  }

  confirmDeleteModal(): void {
    const current = this.deleteInvestment();
    if (!current || this.saving()) {
      return;
    }

    this.saving.set(true);

    this.apiService
      .delete(`${API_CONFIG.INVESTMENT.DELETE}/${current.id}`)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.investments.update((list) => list.filter((item) => item.id !== current.id));
          this.total.update((t) => Math.max(0, t - 1));
          this.toasterMessageService.success(this.INVESTMENTS_C.TOASTER_MESSAGE.DELETE.SUCCESS);
          this.cancelDeleteModal();
        },
        error: () => {
          this.toasterMessageService.error(this.INVESTMENTS_C.TOASTER_MESSAGE.DELETE.FAILED);
        },
      });
  }

  private toDateTimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private fromDateTimeLocal(local: string): string {
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) {
      return local;
    }
    return d.toISOString();
  }
}
