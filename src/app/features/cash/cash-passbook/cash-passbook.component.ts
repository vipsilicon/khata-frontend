import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

// Services
import { ApiServices } from '../../../services/api/api.services';
import { ToasterMessageUtils } from '../../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../../core/config/api.config';

// Constants
import { CASH_CONST } from '../../../core/constants/cash.constants';

// Components
import { ConfirmModalComponent } from '../../../components/confirm-modal/confirm-modal.component';
import { DataTableComponent } from '../../../components/data-table/data-table.component';
import { DataTableColumn } from '../../../components/data-table/data-table.types';
import { FormInputComponent } from '../../../components/form-input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../components/form-select/form-select.component';

// Utils
import {
  creditDebitBadgeClass,
  isNearBottom,
  nextSortState,
  sortRows,
  SortDir,
} from '../../../utils/table.utils';

export interface CashTransaction {
  id: number;
  referenceId: string;
  transactionType: string;
  purpose: string;
  amount: string;
  transactionDateTime: string;
  categoryId: number | null;
  categoryName: string;
  subCategoryId: number | null;
  subCategoryName: string;
  payeeId: number | null;
  payeeName: string;
  createdAt: string;
  updatedAt: string;
}

interface NamedOption {
  id: number;
  name: string;
}

type SortKey = keyof CashTransaction;

@Component({
  selector: 'app-cash-passbook',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './cash-passbook.component.html',
  styleUrl: './cash-passbook.component.css',
})
export class CashPassbookComponent implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  /** Emits latest cash balance after load / mutations. */
  readonly balanceChange = output<number>();

  readonly CASH_C = CASH_CONST;
  readonly limit = 10;

  readonly transactionTypeOptions: FormSelectOption[] = [
    { value: 'CREDIT', label: 'CREDIT' },
    { value: 'DEBIT', label: 'DEBIT' },
  ];

  readonly columns: DataTableColumn<CashTransaction>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
    {
      key: 'payeeName',
      label: 'Payee Name',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    { key: 'purpose', label: 'Purpose', type: 'text', sortable: true, emptyValue: '—' },
    { key: 'categoryName', label: 'Category', type: 'text', sortable: true, emptyValue: '—' },
    {
      key: 'subCategoryName',
      label: 'Sub Category',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    {
      key: 'transactionType',
      label: 'Type',
      type: 'badge',
      sortable: true,
      badgeClass: (value) => creditDebitBadgeClass(String(value ?? '')),
    },
    { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
    { key: 'actions', label: 'Action', type: 'actions', align: 'center' },
  ];

  cashTransactions = signal<CashTransaction[]>([]);
  payeeOptions = signal<FormSelectOption[]>([]);
  categories = signal<NamedOption[]>([]);
  subCategories = signal<NamedOption[]>([]);
  purposeOptions = signal<FormSelectOption[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  saving = signal(false);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');

  showAddModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  editTransaction = signal<CashTransaction | null>(null);
  deleteTransaction = signal<CashTransaction | null>(null);

  categoryOptions = computed<FormSelectOption[]>(() =>
    this.categories().map((c) => ({
      id: c.id,
      value: c.id,
      label: c.name,
    })),
  );

  subCategoryOptions = computed<FormSelectOption[]>(() =>
    this.subCategories().map((s) => ({
      id: s.id,
      value: s.id,
      label: s.name,
    })),
  );

  addForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    payeeId: [0, [Validators.required, Validators.min(1)]],
    purpose: ['', Validators.required],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    subCategoryId: [0, [Validators.required, Validators.min(1)]],
    transactionType: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  editForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    payeeId: [0, [Validators.required, Validators.min(1)]],
    purpose: ['', Validators.required],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    subCategoryId: [0, [Validators.required, Validators.min(1)]],
    transactionType: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  sortedCashTransactions = computed(() =>
    sortRows(this.cashTransactions(), this.sortKey(), this.sortDir()),
  );

  hasMore = computed(() => this.page() < this.lastPage());

  ngOnInit(): void {
    this.loadCashTransactions(true);
    this.loadCashTotal();
    this.loadPayees();
    this.loadPurposeTypes();
    this.loadCategories();

    this.addForm.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.onCategoryChange(Number(categoryId), 'add');
    });
    this.editForm.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.onCategoryChange(Number(categoryId), 'edit');
    });
  }

  loadPayees(): void {
    this.apiService.get(`${API_CONFIG.PAYEE.LIST}`, {}).subscribe({
      next: (response: any) => {
        const body = response?.body ?? {};
        const list = body.data ?? body ?? [];
        const options: FormSelectOption[] = (Array.isArray(list) ? list : []).map((item: any) => ({
          id: item.id,
          value: item.id,
          label: item.name,
        }));
        this.payeeOptions.set(options);
      },
      error: () => {
        this.payeeOptions.set([]);
      },
    });
  }

  loadPurposeTypes(): void {
    this.apiService.get(`${API_CONFIG.TRANSACTION.PURPOSE_TYPE_LIST}`, {}).subscribe({
      next: (response: any) => {
        const list = response?.body ?? [];
        this.purposeOptions.set(
          (Array.isArray(list) ? list : []).map((item: any) => ({
            id: item.id,
            value: item.name,
            label: item.name,
          })),
        );
      },
      error: () => {
        // Fallback to known API values if purpose list fails
        this.purposeOptions.set([
          { value: 'INCOME', label: 'INCOME' },
          { value: 'EXPENSE', label: 'EXPENSE' },
          { value: 'INVESTMENT', label: 'INVESTMENT' },
        ]);
      },
    });
  }

  loadCategories(): void {
    this.apiService.get(`${API_CONFIG.CATEGORY.LIST}`, { page: 1, limit: 100 }).subscribe({
      next: (response: any) => {
        const list = response?.body?.data ?? [];
        this.categories.set(
          list.map((item: any) => ({
            id: item.id,
            name: item.name,
          })),
        );
      },
      error: () => {
        this.categories.set([]);
      },
    });
  }

  loadSubCategories(categoryId: number): void {
    if (!categoryId || categoryId < 1) {
      this.subCategories.set([]);
      return;
    }

    this.apiService
      .get(`${API_CONFIG.SUB_CATEGORY.LIST}`, {
        page: 1,
        limit: 100,
        categoryid: categoryId,
      })
      .subscribe({
        next: (response: any) => {
          const list = response?.body?.data ?? [];
          this.subCategories.set(
            list.map((item: any) => ({
              id: item.id,
              name: item.name,
            })),
          );
        },
        error: () => {
          this.subCategories.set([]);
        },
      });
  }

  private onCategoryChange(categoryId: number, form: 'add' | 'edit'): void {
    if (form === 'add') {
      this.addForm.controls.subCategoryId.setValue(0, { emitEvent: false });
    } else {
      this.editForm.controls.subCategoryId.setValue(0, { emitEvent: false });
    }
    this.loadSubCategories(categoryId);
  }

  private resolveCategoryName(categoryId: number): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '';
  }

  private resolveSubCategoryName(subCategoryId: number): string {
    return this.subCategories().find((s) => s.id === subCategoryId)?.name ?? '';
  }

  private findCategoryIdByName(name: string): number {
    return this.categories().find((c) => c.name === name)?.id ?? 0;
  }

  private findSubCategoryIdByName(name: string): number {
    return this.subCategories().find((s) => s.name === name)?.id ?? 0;
  }

  /** API expects a number (not a string from toFixed). */
  private toAmountNumber(value: number | string | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }

  loadCashTotal(): void {
    this.apiService.get(`${API_CONFIG.CASH_TRANSACTION.TOTAL}`).subscribe({
      next: (response: any) => {
        const body = response?.body ?? response ?? {};
        const balance = Number(
          body.amount ?? body.balance ?? body.userCash?.balance ?? 0,
        );
        this.balanceChange.emit(balance);
      },
      error: () => {},
    });
  }

  /** Prefer balance from create/update payload when API returns userCash. */
  private emitBalanceFromResponse(body: any): void {
    const balance = body?.userCash?.balance ?? body?.balance ?? body?.amount;
    if (balance != null && Number.isFinite(Number(balance))) {
      this.balanceChange.emit(Number(balance));
      return;
    }
    this.loadCashTotal();
  }

  /**
   * Create/update responses nest data as:
   * { cashTransaction, transaction, userCash }
   * Fall back to a flat body for older shapes.
   */
  private parseCashMutationResponse(response: any): {
    cashTx: any;
    linkedTx: any;
    userCash: any;
  } {
    const body = response?.body ?? response ?? {};
    const cashTx = body.cashTransaction ?? body.data?.cashTransaction ?? body;
    const linkedTx = body.transaction ?? body.data?.transaction ?? {};
    const userCash = body.userCash ?? body.data?.userCash ?? {};
    return { cashTx, linkedTx, userCash };
  }

  private mapCashTx(item: any): CashTransaction {
    // List may be flat, or nest details under `transaction` (create-style shape).
    const linked = item.transaction ?? item.masterTransaction ?? {};
    const purpose = item.purpose ?? linked.purpose ?? '';
    const categoryId = item.categoryId ?? linked.categoryId ?? null;
    const subCategoryId = item.subCategoryId ?? linked.subCategoryId ?? null;
    const categoryName =
      item.categoryName ??
      linked.categoryName ??
      item.category?.name ??
      linked.category?.name ??
      '';
    const subCategoryName =
      item.subCategoryName ??
      linked.subCategoryName ??
      item.subCategory?.name ??
      linked.subCategory?.name ??
      '';

    return {
      id: item.id,
      referenceId: item.referenceId ?? '',
      transactionType: item.transactionType,
      purpose: purpose ?? '',
      amount: item.amount,
      transactionDateTime: item.transactionDateTime,
      categoryId: categoryId != null ? Number(categoryId) : null,
      categoryName: categoryName || '',
      subCategoryId: subCategoryId != null ? Number(subCategoryId) : null,
      subCategoryName: subCategoryName || '',
      payeeId: item.payeeId ?? linked.payeeId ?? null,
      payeeName: item.payeeName ?? linked.payeeName ?? item.payee?.name ?? '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
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
          const data: CashTransaction[] = (body.data ?? []).map((item: any) =>
            this.mapCashTx(item),
          );

          this.cashTransactions.update((prev) => (reset ? data : [...prev, ...data]));
          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.LOAD.FAILED);
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
    this.loadCashTransactions(false);
  }

  toggleSort(key: string): void {
    const next = nextSortState(this.sortKey(), this.sortDir(), key);
    this.sortKey.set(next.key as SortKey);
    this.sortDir.set(next.dir);
  }

  onAddCashTransaction(): void {
    this.subCategories.set([]);
    this.addForm.reset({
      transactionDateTime: this.toDateTimeLocal(new Date().toISOString()),
      payeeId: 0,
      purpose: '',
      categoryId: 0,
      subCategoryId: 0,
      transactionType: '',
      amount: null,
    });
    this.showAddModal.set(true);
  }

  cancelAddModal(): void {
    this.showAddModal.set(false);
    this.subCategories.set([]);
    this.addForm.reset({
      transactionDateTime: '',
      payeeId: 0,
      purpose: '',
      categoryId: 0,
      subCategoryId: 0,
      transactionType: '',
      amount: null,
    });
  }

  confirmAddModal(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.toasterMessageService.warning(this.CASH_C.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    if (this.saving()) {
      return;
    }

    const formValue = this.addForm.getRawValue();
    const payeeId = Number(formValue.payeeId);
    const categoryId = Number(formValue.categoryId);
    const subCategoryId = Number(formValue.subCategoryId);
    const payeeName =
      this.payeeOptions().find((p) => Number(p.value) === payeeId)?.label ?? '';
    const categoryName = this.resolveCategoryName(categoryId);
    const subCategoryName = this.resolveSubCategoryName(subCategoryId);
    const amount = this.toAmountNumber(formValue.amount);

    // API whitelist: do not send categoryName / subCategoryName
    const body = {
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      transactionType: formValue.transactionType,
      purpose: formValue.purpose,
      categoryId,
      subCategoryId,
      amount,
      payeeId,
    };

    this.saving.set(true);

    this.apiService
      .post(`${API_CONFIG.CASH_TRANSACTION.CREATE}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const { cashTx, linkedTx, userCash } = this.parseCashMutationResponse(response);
          const id = cashTx?.id ?? linkedTx?.id;

          if (id == null) {
            this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.CREATE.FAILED);
            return;
          }

          const newTx: CashTransaction = {
            id: Number(cashTx.id ?? id),
            referenceId: cashTx.referenceId ?? linkedTx.referenceId ?? '',
            transactionType:
              cashTx.transactionType ?? linkedTx.transactionType ?? body.transactionType,
            purpose: linkedTx.purpose ?? body.purpose,
            amount: String(cashTx.amount ?? linkedTx.amount ?? body.amount),
            transactionDateTime:
              cashTx.transactionDateTime ??
              linkedTx.transactionDateTime ??
              body.transactionDateTime,
            categoryId: linkedTx.categoryId ?? categoryId,
            categoryName,
            subCategoryId: linkedTx.subCategoryId ?? subCategoryId,
            subCategoryName,
            payeeId: linkedTx.payeeId ?? payeeId,
            payeeName: linkedTx.payeeName ?? payeeName,
            createdAt: cashTx.createdAt ?? linkedTx.createdAt ?? new Date().toISOString(),
            updatedAt: cashTx.updatedAt ?? linkedTx.updatedAt ?? new Date().toISOString(),
          };

          this.cashTransactions.update((list) => [newTx, ...list]);
          this.total.update((t) => t + 1);
          this.emitBalanceFromResponse({ userCash });
          this.toasterMessageService.success(this.CASH_C.TOASTER_MESSAGE.CREATE.SUCCESS);
          this.cancelAddModal();
        },
        error: () => {
          this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.CREATE.FAILED);
        },
      });
  }

  onEditCashTransaction(tx: CashTransaction): void {
    this.editTransaction.set(tx);

    const categoryId =
      tx.categoryId && tx.categoryId > 0
        ? tx.categoryId
        : this.findCategoryIdByName(tx.categoryName);

    this.editForm.reset(
      {
        transactionDateTime: this.toDateTimeLocal(tx.transactionDateTime),
        payeeId: tx.payeeId ?? 0,
        purpose: tx.purpose ?? '',
        categoryId,
        subCategoryId: 0,
        transactionType: tx.transactionType,
        amount: this.toAmountNumber(tx.amount) || null,
      },
      { emitEvent: false },
    );
    this.showEditModal.set(true);

    if (categoryId > 0) {
      this.apiService
        .get(`${API_CONFIG.SUB_CATEGORY.LIST}`, {
          page: 1,
          limit: 100,
          categoryid: categoryId,
        })
        .subscribe({
          next: (response: any) => {
            const list = response?.body?.data ?? [];
            this.subCategories.set(
              list.map((item: any) => ({
                id: item.id,
                name: item.name,
              })),
            );
            const subId =
              tx.subCategoryId && tx.subCategoryId > 0
                ? tx.subCategoryId
                : this.findSubCategoryIdByName(tx.subCategoryName ?? '');
            this.editForm.controls.subCategoryId.setValue(subId, { emitEvent: false });
          },
          error: () => {
            this.subCategories.set([]);
          },
        });
    } else {
      this.subCategories.set([]);
    }
  }

  cancelEditModal(): void {
    this.showEditModal.set(false);
    this.editTransaction.set(null);
    this.subCategories.set([]);
    this.editForm.reset({
      transactionDateTime: '',
      payeeId: 0,
      purpose: '',
      categoryId: 0,
      subCategoryId: 0,
      transactionType: '',
      amount: null,
    });
  }

  confirmEditModal(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toasterMessageService.warning(this.CASH_C.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    const current = this.editTransaction();
    if (!current || this.saving()) {
      return;
    }

    const formValue = this.editForm.getRawValue();
    const payeeId = Number(formValue.payeeId);
    const categoryId = Number(formValue.categoryId);
    const subCategoryId = Number(formValue.subCategoryId);
    const payeeName =
      this.payeeOptions().find((p) => Number(p.value) === payeeId)?.label ?? current.payeeName;
    const categoryName = this.resolveCategoryName(categoryId);
    const subCategoryName = this.resolveSubCategoryName(subCategoryId);
    const amount = this.toAmountNumber(formValue.amount);

    // API whitelist: do not send categoryName / subCategoryName
    const body = {
      id: current.id,
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      transactionType: formValue.transactionType,
      purpose: formValue.purpose,
      categoryId,
      subCategoryId,
      amount,
      payeeId,
    };

    this.saving.set(true);

    this.apiService
      .patch(`${API_CONFIG.CASH_TRANSACTION.UPDATE}/${current.id}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const { cashTx, linkedTx, userCash } = this.parseCashMutationResponse(response);
          const updated: CashTransaction = {
            ...current,
            transactionDateTime:
              cashTx.transactionDateTime ??
              linkedTx.transactionDateTime ??
              body.transactionDateTime,
            transactionType:
              cashTx.transactionType ?? linkedTx.transactionType ?? body.transactionType,
            purpose: linkedTx.purpose ?? body.purpose,
            amount: String(cashTx.amount ?? linkedTx.amount ?? body.amount),
            categoryId: linkedTx.categoryId ?? categoryId,
            categoryName,
            subCategoryId: linkedTx.subCategoryId ?? subCategoryId,
            subCategoryName,
            payeeId: linkedTx.payeeId ?? payeeId,
            payeeName: linkedTx.payeeName ?? payeeName,
            updatedAt:
              cashTx.updatedAt ?? linkedTx.updatedAt ?? current.updatedAt,
          };

          this.cashTransactions.update((list) =>
            list.map((item) => (item.id === current.id ? updated : item)),
          );
          this.emitBalanceFromResponse({ userCash });
          this.toasterMessageService.success(this.CASH_C.TOASTER_MESSAGE.UPDATE.SUCCESS);
          this.cancelEditModal();
        },
        error: () => {
          this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.UPDATE.FAILED);
        },
      });
  }

  onDeleteCashTransaction(tx: CashTransaction): void {
    this.deleteTransaction.set(tx);
    this.showDeleteModal.set(true);
  }

  cancelDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTransaction.set(null);
  }

  confirmDeleteModal(): void {
    const current = this.deleteTransaction();
    if (!current || this.saving()) {
      return;
    }

    this.saving.set(true);

    this.apiService
      .delete(`${API_CONFIG.CASH_TRANSACTION.DELETE}/${current.id}`)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.cashTransactions.update((list) => list.filter((item) => item.id !== current.id));
          this.total.update((t) => Math.max(0, t - 1));
          this.loadCashTotal();
          this.toasterMessageService.success(this.CASH_C.TOASTER_MESSAGE.DELETE.SUCCESS);
          this.cancelDeleteModal();
        },
        error: () => {
          this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.DELETE.FAILED);
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
