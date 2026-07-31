import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

// Services
import { ApiServices } from '../../../services/api/api.services';
import { ToasterMessageUtils } from '../../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../../core/config/api.config';

// Constants
import { INVESTMENTS_CONST } from '../../../core/constants/investments.constants';

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
import { isNearBottom, nextSortState, sortRows, SortDir } from '../../../utils/table.utils';

export interface Investment {
  id: number;
  referenceId: string;
  investmentType: string;
  investmentName: string;
  amount: string;
  quantity: string;
  transactionDateTime: string;
  paymentMode: string;
  userBankId: number | null;
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

type SortKey = keyof Investment;

@Component({
  selector: 'app-investment-passbook',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './investment-passbook.component.html',
  styleUrl: './investment-passbook.component.css',
})
export class InvestmentPassbookComponent implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  readonly INVESTMENTS_C = INVESTMENTS_CONST;
  readonly limit = 10;

  readonly paymentModeOptions: FormSelectOption[] = [
    { value: 'BANK', label: 'BANK' },
    { value: 'CASH', label: 'CASH' },
  ];

  readonly columns: DataTableColumn<Investment>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
    { key: 'investmentName', label: 'Investment Name', type: 'text', sortable: true },
    {
      key: 'payeeName',
      label: 'Payee',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    {
      key: 'categoryName',
      label: 'Category',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    {
      key: 'subCategoryName',
      label: 'Sub Category',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    {
      key: 'paymentMode',
      label: 'Payment Mode',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    {
      key: 'investmentType',
      label: 'Investment Type',
      type: 'badge',
      sortable: true,
      badgeClass: () => 'bg-amber-100 text-amber-800',
    },
    { key: 'quantity', label: 'Quantity', type: 'number', sortable: true },
    { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
    { key: 'actions', label: 'Action', type: 'actions', align: 'center' },
  ];

  investments = signal<Investment[]>([]);
  bankOptions = signal<FormSelectOption[]>([]);
  investmentTypeOptions = signal<FormSelectOption[]>([]);
  payeeOptions = signal<FormSelectOption[]>([]);
  categories = signal<NamedOption[]>([]);
  subCategories = signal<NamedOption[]>([]);
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
  showAddBankSelect = signal(false);
  showEditBankSelect = signal(false);
  editInvestment = signal<Investment | null>(null);
  deleteInvestment = signal<Investment | null>(null);

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
    investmentName: ['', Validators.required],
    paymentMode: ['', Validators.required],
    userBankId: [0],
    investmentType: ['', Validators.required],
    payeeId: [0, [Validators.required, Validators.min(1)]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    subCategoryId: [0, [Validators.required, Validators.min(1)]],
    quantity: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  editForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    investmentName: ['', Validators.required],
    paymentMode: ['', Validators.required],
    userBankId: [0],
    investmentType: ['', Validators.required],
    payeeId: [0, [Validators.required, Validators.min(1)]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    subCategoryId: [0, [Validators.required, Validators.min(1)]],
    quantity: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  sortedInvestments = computed(() =>
    sortRows(this.investments(), this.sortKey(), this.sortDir()),
  );

  hasMore = computed(() => this.page() < this.lastPage());

  ngOnInit(): void {
    this.loadInvestments(true);
    this.loadUserBanks();
    this.loadInvestmentTypes();
    this.loadPayees();
    this.loadCategories();

    this.addForm.controls.paymentMode.valueChanges.subscribe((mode) => {
      this.syncBankField('add', mode);
    });
    this.editForm.controls.paymentMode.valueChanges.subscribe((mode) => {
      this.syncBankField('edit', mode);
    });

    this.addForm.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.onCategoryChange(Number(categoryId), 'add');
    });
    this.editForm.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.onCategoryChange(Number(categoryId), 'edit');
    });
  }

  private syncBankField(form: 'add' | 'edit', mode: string): void {
    const control =
      form === 'add' ? this.addForm.controls.userBankId : this.editForm.controls.userBankId;
    if (form === 'add') {
      this.showAddBankSelect.set(mode === 'BANK');
    } else {
      this.showEditBankSelect.set(mode === 'BANK');
    }

    if (mode === 'BANK') {
      control.setValidators([Validators.required, Validators.min(1)]);
    } else {
      control.clearValidators();
      control.setValue(0, { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private onCategoryChange(categoryId: number, form: 'add' | 'edit'): void {
    if (form === 'add') {
      this.addForm.controls.subCategoryId.setValue(0, { emitEvent: false });
    } else {
      this.editForm.controls.subCategoryId.setValue(0, { emitEvent: false });
    }
    this.loadSubCategories(categoryId);
  }

  private toNumber(value: number | string | null | undefined, decimals = 2): number {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return 0;
    }
    const factor = 10 ** decimals;
    return Math.round(n * factor) / factor;
  }

  private resolveName(options: NamedOption[], id: number): string {
    return options.find((o) => o.id === id)?.name ?? '';
  }

  private resolvePayeeName(payeeId: number): string {
    return this.payeeOptions().find((p) => Number(p.value) === payeeId)?.label ?? '';
  }

  loadUserBanks(): void {
    this.apiService.get(`${API_CONFIG.USER_BANK.LIST}`, {}).subscribe({
      next: (response: any) => {
        const list = response?.body?.data ?? [];
        this.bankOptions.set(
          list.map((item: any) => ({
            id: item.id,
            value: item.id,
            label: item.bankName ?? item.name ?? `Bank #${item.id}`,
          })),
        );
      },
      error: () => {
        this.bankOptions.set([]);
      },
    });
  }

  loadInvestmentTypes(): void {
    this.apiService.get(`${API_CONFIG.INVESTMENT.TYPE_LIST}`, {}).subscribe({
      next: (response: any) => {
        const list = response?.body ?? [];
        this.investmentTypeOptions.set(
          (Array.isArray(list) ? list : []).map((item: any) => ({
            id: item.id,
            value: item.name,
            label: item.name,
          })),
        );
      },
      error: () => {
        this.investmentTypeOptions.set([]);
      },
    });
  }

  loadPayees(): void {
    this.apiService.get(`${API_CONFIG.PAYEE.LIST}`, {}).subscribe({
      next: (response: any) => {
        const body = response?.body ?? {};
        const list = body.data ?? body ?? [];
        this.payeeOptions.set(
          (Array.isArray(list) ? list : []).map((item: any) => ({
            id: item.id,
            value: item.id,
            label: item.name,
          })),
        );
      },
      error: () => {
        this.payeeOptions.set([]);
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

  private mapInvestment(item: any): Investment {
    const linked = item.transaction ?? {};
    return {
      id: item.id,
      referenceId: item.referenceId ?? '',
      investmentType: item.investmentType,
      investmentName: item.investmentName,
      amount: item.amount,
      quantity: item.quantity,
      transactionDateTime: item.transactionDateTime,
      paymentMode: item.paymentMode ?? linked.paymentMode ?? '',
      userBankId: item.userBankId ?? null,
      categoryId: item.categoryId ?? linked.categoryId ?? null,
      categoryName: item.categoryName ?? linked.categoryName ?? '',
      subCategoryId: item.subCategoryId ?? linked.subCategoryId ?? null,
      subCategoryName: item.subCategoryName ?? linked.subCategoryName ?? '',
      payeeId: item.payeeId ?? linked.payeeId ?? null,
      payeeName: item.payeeName ?? linked.payeeName ?? '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
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
          const data: Investment[] = (body.data ?? []).map((item: any) =>
            this.mapInvestment(item),
          );

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

  private emptyFormValue() {
    return {
      transactionDateTime: '',
      investmentName: '',
      paymentMode: '',
      userBankId: 0,
      investmentType: '',
      payeeId: 0,
      categoryId: 0,
      subCategoryId: 0,
      quantity: null as number | null,
      amount: null as number | null,
    };
  }

  /** API whitelist — numbers only, no name fields. */
  private buildMutationBody(formValue: {
    transactionDateTime: string;
    investmentName: string;
    paymentMode: string;
    userBankId: number;
    investmentType: string;
    payeeId: number;
    categoryId: number;
    subCategoryId: number;
    quantity: number | null;
    amount: number | null;
  }): Record<string, unknown> {
    const body: Record<string, unknown> = {
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      investmentName: formValue.investmentName.trim(),
      paymentMode: formValue.paymentMode,
      investmentType: formValue.investmentType.trim(),
      payeeId: Number(formValue.payeeId),
      categoryId: Number(formValue.categoryId),
      subCategoryId: Number(formValue.subCategoryId),
      quantity: this.toNumber(formValue.quantity, 4),
      amount: this.toNumber(formValue.amount, 2),
    };

    if (formValue.paymentMode === 'BANK') {
      body['userBankId'] = Number(formValue.userBankId);
    }

    return body;
  }

  onAddInvestment(): void {
    this.subCategories.set([]);
    this.addForm.reset({
      ...this.emptyFormValue(),
      transactionDateTime: this.toDateTimeLocal(new Date().toISOString()),
    });
    this.syncBankField('add', '');
    this.showAddModal.set(true);
  }

  cancelAddModal(): void {
    this.showAddModal.set(false);
    this.subCategories.set([]);
    this.addForm.reset(this.emptyFormValue());
    this.syncBankField('add', '');
  }

  confirmAddModal(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.toasterMessageService.warning(this.INVESTMENTS_C.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    if (this.saving()) {
      return;
    }

    const formValue = this.addForm.getRawValue();
    const payeeId = Number(formValue.payeeId);
    const categoryId = Number(formValue.categoryId);
    const subCategoryId = Number(formValue.subCategoryId);
    const body = this.buildMutationBody(formValue);

    this.saving.set(true);

    this.apiService
      .post(`${API_CONFIG.INVESTMENT.CREATE}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const payload = response?.body ?? response ?? {};
          const created = payload.investment ?? payload.data?.investment ?? payload;
          const linked = payload.transaction ?? {};
          const id = created?.id ?? payload?.id;

          if (id == null) {
            this.toasterMessageService.error(this.INVESTMENTS_C.TOASTER_MESSAGE.CREATE.FAILED);
            return;
          }

          const newItem: Investment = {
            id: Number(id),
            referenceId: created.referenceId ?? '',
            investmentType: created.investmentType ?? formValue.investmentType,
            investmentName: created.investmentName ?? formValue.investmentName,
            amount: String(created.amount ?? body['amount']),
            quantity: String(created.quantity ?? body['quantity']),
            transactionDateTime:
              created.transactionDateTime ?? String(body['transactionDateTime']),
            paymentMode: created.paymentMode ?? linked.paymentMode ?? formValue.paymentMode,
            userBankId:
              created.userBankId ??
              (formValue.paymentMode === 'BANK' ? Number(formValue.userBankId) : null),
            categoryId: linked.categoryId ?? categoryId,
            categoryName: this.resolveName(this.categories(), categoryId),
            subCategoryId: linked.subCategoryId ?? subCategoryId,
            subCategoryName: this.resolveName(this.subCategories(), subCategoryId),
            payeeId: linked.payeeId ?? payeeId,
            payeeName: this.resolvePayeeName(payeeId),
            createdAt: created.createdAt ?? new Date().toISOString(),
            updatedAt: created.updatedAt ?? new Date().toISOString(),
          };

          this.investments.update((list) => [newItem, ...list]);
          this.total.update((t) => t + 1);
          this.toasterMessageService.success(this.INVESTMENTS_C.TOASTER_MESSAGE.CREATE.SUCCESS);
          this.cancelAddModal();
        },
        error: () => {
          this.toasterMessageService.error(this.INVESTMENTS_C.TOASTER_MESSAGE.CREATE.FAILED);
        },
      });
  }

  onEditInvestment(item: Investment): void {
    this.editInvestment.set(item);
    const categoryId = item.categoryId && item.categoryId > 0 ? item.categoryId : 0;

    this.editForm.reset(
      {
        transactionDateTime: this.toDateTimeLocal(item.transactionDateTime),
        investmentName: item.investmentName,
        paymentMode: item.paymentMode || '',
        userBankId: item.userBankId ?? 0,
        investmentType: item.investmentType,
        payeeId: item.payeeId ?? 0,
        categoryId,
        subCategoryId: 0,
        quantity: this.toNumber(item.quantity, 4) || null,
        amount: this.toNumber(item.amount, 2) || null,
      },
      { emitEvent: false },
    );
    this.syncBankField('edit', item.paymentMode || '');
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
              list.map((sub: any) => ({
                id: sub.id,
                name: sub.name,
              })),
            );
            const subId =
              item.subCategoryId && item.subCategoryId > 0
                ? item.subCategoryId
                : this.subCategories().find((s) => s.name === item.subCategoryName)?.id ?? 0;
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
    this.editInvestment.set(null);
    this.subCategories.set([]);
    this.editForm.reset(this.emptyFormValue());
    this.syncBankField('edit', '');
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
    const payeeId = Number(formValue.payeeId);
    const categoryId = Number(formValue.categoryId);
    const subCategoryId = Number(formValue.subCategoryId);
    const body = this.buildMutationBody(formValue);

    this.saving.set(true);

    this.apiService
      .patch(`${API_CONFIG.INVESTMENT.UPDATE}/${current.id}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const payload = response?.body ?? response ?? {};
          const updatedBody = payload.investment ?? payload.data?.investment ?? payload;
          const linked = payload.transaction ?? {};

          const updated: Investment = {
            ...current,
            transactionDateTime:
              updatedBody.transactionDateTime ?? String(body['transactionDateTime']),
            investmentType: updatedBody.investmentType ?? formValue.investmentType,
            investmentName: updatedBody.investmentName ?? formValue.investmentName,
            quantity: String(updatedBody.quantity ?? body['quantity']),
            amount: String(updatedBody.amount ?? body['amount']),
            paymentMode: updatedBody.paymentMode ?? formValue.paymentMode,
            userBankId:
              updatedBody.userBankId ??
              (formValue.paymentMode === 'BANK' ? Number(formValue.userBankId) : null),
            categoryId: linked.categoryId ?? categoryId,
            categoryName: this.resolveName(this.categories(), categoryId),
            subCategoryId: linked.subCategoryId ?? subCategoryId,
            subCategoryName: this.resolveName(this.subCategories(), subCategoryId),
            payeeId: linked.payeeId ?? payeeId,
            payeeName: this.resolvePayeeName(payeeId),
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
