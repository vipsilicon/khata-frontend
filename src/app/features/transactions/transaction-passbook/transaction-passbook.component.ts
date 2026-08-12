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
import { TRANSACTIONS_CONST } from '../../../core/constants/transactions.constants';

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
  nextSortState,
  sortRows,
  SortDir,
} from '../../../utils/table.utils';

export interface Transaction {
  id: number;
  transactionType: string;
  paymentMode: string;
  purpose: string;
  amount: string;
  transactionDateTime: string;
  categoryId: number | null;
  categoryName: string;
  subCategoryId: number | null;
  subCategoryName: string;
  payeeId: number | null;
  payeeName: string;
  payeeCategory: string;
  userBankId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PayeeOption {
  id: number;
  name: string;
  payeeCategory: string;
}

interface NamedOption {
  id: number;
  name: string;
}

type SortKey = keyof Transaction;

@Component({
  selector: 'app-transaction-passbook',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './transaction-passbook.component.html',
  styleUrl: './transaction-passbook.component.css',
})
export class TransactionPassbookComponent implements OnInit {

  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  readonly TX_C = TRANSACTIONS_CONST;
  readonly limit = 10;

  readonly transactionTypeOptions: FormSelectOption[] = [
    { value: 'CREDIT', label: 'CREDIT' },
    { value: 'DEBIT', label: 'DEBIT' },
  ];

  readonly paymentModeOptions: FormSelectOption[] = [
    { value: 'BANK', label: 'BANK' },
    { value: 'CASH', label: 'CASH' },
  ];

  readonly columns: DataTableColumn<Transaction>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
    {
      key: 'payeeName',
      label: 'Payee Name',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    {
      key: 'payeeCategory',
      label: 'Payee Category',
      type: 'text',
      sortable: true,
      emptyValue: '—',
    },
    { key: 'paymentMode', label: 'Payment Mode', type: 'text', sortable: true },
    { key: 'purpose', label: 'Purpose', type: 'text', sortable: true },
    { key: 'categoryName', label: 'Category', type: 'text', sortable: true },
    { key: 'subCategoryName', label: 'Sub Category', type: 'text', sortable: true },
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

  transactions = signal<Transaction[]>([]);
  payees = signal<PayeeOption[]>([]);
  categories = signal<NamedOption[]>([]);
  subCategories = signal<NamedOption[]>([]);
  purposeOptions = signal<FormSelectOption[]>([]);
  bankOptions = signal<FormSelectOption[]>([]);
  investmentTypeOptions = signal<FormSelectOption[]>([]);
  loading = signal(false);
  saving = signal(false);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  showAddModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  showAddBankSelect = signal(false);
  showEditBankSelect = signal(false);
  showAddInvestmentFields = signal(false);
  showEditInvestmentFields = signal(false);
  editTransaction = signal<Transaction | null>(null);
  deleteTransaction = signal<Transaction | null>(null);
  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');

  payeeOptions = computed<FormSelectOption[]>(() =>
    this.payees().map((p) => ({
      id: p.id,
      value: p.id,
      label: p.name,
    })),
  );

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
    paymentMode: ['', Validators.required],
    userBankId: [0],
    purpose: ['', Validators.required],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    subCategoryId: [0, [Validators.required, Validators.min(1)]],
    transactionType: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    investmentType: [''],
    investmentName: [''],
    quantity: [null as number | null],
  });

  editForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    payeeId: [0, [Validators.required, Validators.min(1)]],
    paymentMode: ['', Validators.required],
    userBankId: [0],
    purpose: ['', Validators.required],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    subCategoryId: [0, [Validators.required, Validators.min(1)]],
    transactionType: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    investmentType: [''],
    investmentName: [''],
    quantity: [null as number | null],
  });

  sortedTransactions = computed(() =>
    sortRows(this.transactions(), this.sortKey(), this.sortDir()),
  );

  ngOnInit(): void {
    this.loadTransactions(true);
    this.loadPayees();
    this.loadPurposeTypes();
    this.loadCategories();
    this.loadUserBanks();
    this.loadInvestmentTypes();

    this.addForm.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.onCategoryChange(Number(categoryId), 'add');
    });
    this.editForm.controls.categoryId.valueChanges.subscribe((categoryId) => {
      this.onCategoryChange(Number(categoryId), 'edit');
    });

    this.addForm.controls.paymentMode.valueChanges.subscribe((mode) => {
      this.syncBankField('add', mode);
    });
    this.editForm.controls.paymentMode.valueChanges.subscribe((mode) => {
      this.syncBankField('edit', mode);
    });

    this.addForm.controls.purpose.valueChanges.subscribe((purpose) => {
      this.syncInvestmentFields('add', purpose);
    });
    this.editForm.controls.purpose.valueChanges.subscribe((purpose) => {
      this.syncInvestmentFields('edit', purpose);
    });
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

  private syncInvestmentFields(form: 'add' | 'edit', purpose: string): void {
    const group = form === 'add' ? this.addForm : this.editForm;
    if (form === 'add') {
      this.showAddInvestmentFields.set(purpose === 'INVESTMENT');
    } else {
      this.showEditInvestmentFields.set(purpose === 'INVESTMENT');
    }

    if (purpose === 'INVESTMENT') {
      group.controls.investmentType.setValidators([Validators.required]);
      group.controls.investmentName.setValidators([Validators.required]);
      group.controls.quantity.setValidators([Validators.required, Validators.min(0.0001)]);
    } else {
      group.controls.investmentType.clearValidators();
      group.controls.investmentName.clearValidators();
      group.controls.quantity.clearValidators();
      group.controls.investmentType.setValue('', { emitEvent: false });
      group.controls.investmentName.setValue('', { emitEvent: false });
      group.controls.quantity.setValue(null, { emitEvent: false });
    }
    group.controls.investmentType.updateValueAndValidity({ emitEvent: false });
    group.controls.investmentName.updateValueAndValidity({ emitEvent: false });
    group.controls.quantity.updateValueAndValidity({ emitEvent: false });
  }

  /** API expects a number, not a string from toFixed. */
  private toAmountNumber(value: number | string | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }

  loadPayees(): void {
    this.apiService.get(`${API_CONFIG.PAYEE.LIST}`, {}).subscribe({
      next: (response: any) => {
        const body = response?.body ?? {};
        const list = body.data ?? body ?? [];
        this.payees.set(
          (Array.isArray(list) ? list : []).map((item: any) => ({
            id: item.id,
            name: item.name,
            payeeCategory: item.payeeCategory ?? '',
          })),
        );
      },
      error: () => {
        this.payees.set([]);
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
        this.purposeOptions.set([]);
      },
    });
  }

  loadCategories(): void {
    this.apiService
      .get(`${API_CONFIG.CATEGORY.LIST}`, { page: 1, limit: 100 })
      .subscribe({
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

  private resolvePayee(payeeId: number): PayeeOption | undefined {
    return this.payees().find((p) => p.id === payeeId);
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

  loadTransactions(reset = false): void {
    if (this.loading()) {
      return;
    }

    if (reset) {
      this.page.set(1);
    }

    this.loading.set(true);
    const currentPage = this.page();

    this.apiService
      .get(`${API_CONFIG.TRANSACTION.LIST}`, {
        page: currentPage,
        limit: this.limit,
      })
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const body = response?.body ?? {};
          const data: Transaction[] = (body.data ?? []).map((item: any) => ({
            id: item.id,
            transactionType: item.transactionType,
            paymentMode: item.paymentMode,
            purpose: item.purpose,
            amount: item.amount,
            transactionDateTime: item.transactionDateTime,
            categoryId: item.categoryId ?? null,
            categoryName: item.categoryName ?? '',
            subCategoryId: item.subCategoryId ?? null,
            subCategoryName: item.subCategoryName ?? '',
            payeeId: item.payeeId ?? null,
            payeeName: item.payeeName ?? '',
            payeeCategory: item.payeeCategory ?? '',
            userBankId: item.userBankId ?? null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          const total = Number(body.total ?? data.length) || 0;
          const current =
            Number(body.page ?? body.currentPage ?? currentPage) || currentPage;
          const lastPage =
            Number(body.lastPage ?? body.lastpage) ||
            Math.max(1, Math.ceil(total / this.limit) || 1);

          this.transactions.set(data);
          this.total.set(total);
          this.page.set(current);
          this.lastPage.set(lastPage);
        },
        error: () => {
          this.toasterMessageService.error(this.TX_C.TOASTER_MESSAGE.LOAD.FAILED);
        },
      });
  }

  onPageChange(page: number): void {
    if (page === this.page() || this.loading()) {
      return;
    }
    this.page.set(page);
    this.loadTransactions(false);
  }

  toggleSort(key: string): void {
    const next = nextSortState(this.sortKey(), this.sortDir(), key);
    this.sortKey.set(next.key as SortKey);
    this.sortDir.set(next.dir);
  }

  private emptyFormValue() {
    return {
      transactionDateTime: '',
      payeeId: 0,
      paymentMode: '',
      userBankId: 0,
      purpose: '',
      categoryId: 0,
      subCategoryId: 0,
      transactionType: '',
      amount: null as number | null,
      investmentType: '',
      investmentName: '',
      quantity: null as number | null,
    };
  }

  /** Payload shape accepted by create/update API (no *Name / id fields). */
  private buildMutationBody(formValue: {
    transactionDateTime: string;
    payeeId: number;
    paymentMode: string;
    userBankId: number;
    purpose: string;
    categoryId: number;
    subCategoryId: number;
    transactionType: string;
    amount: number | null;
    investmentType: string;
    investmentName: string;
    quantity: number | null;
  }): Record<string, unknown> {
    const body: Record<string, unknown> = {
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      payeeId: Number(formValue.payeeId),
      paymentMode: formValue.paymentMode,
      purpose: formValue.purpose,
      categoryId: Number(formValue.categoryId),
      subCategoryId: Number(formValue.subCategoryId),
      transactionType: formValue.transactionType,
      amount: this.toAmountNumber(formValue.amount),
    };

    if (formValue.paymentMode === 'BANK') {
      body['userBankId'] = Number(formValue.userBankId);
    }

    if (formValue.purpose === 'INVESTMENT') {
      body['investmentType'] = formValue.investmentType;
      body['investmentName'] = formValue.investmentName;
      body['quantity'] = Number(formValue.quantity);
    }

    return body;
  }

  onAddTransaction(): void {
    this.subCategories.set([]);
    this.showAddBankSelect.set(false);
    this.showAddInvestmentFields.set(false);
    this.addForm.reset({
      ...this.emptyFormValue(),
      transactionDateTime: this.toDateTimeLocal(new Date().toISOString()),
    });
    this.syncBankField('add', '');
    this.syncInvestmentFields('add', '');
    this.showAddModal.set(true);
  }

  cancelAddModal(): void {
    this.showAddModal.set(false);
    this.subCategories.set([]);
    this.showAddBankSelect.set(false);
    this.showAddInvestmentFields.set(false);
    this.addForm.reset(this.emptyFormValue());
    this.syncBankField('add', '');
    this.syncInvestmentFields('add', '');
  }

  confirmAddModal(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.toasterMessageService.warning(this.TX_C.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    if (this.saving()) {
      return;
    }

    const formValue = this.addForm.getRawValue();
    const payeeId = Number(formValue.payeeId);
    const categoryId = Number(formValue.categoryId);
    const subCategoryId = Number(formValue.subCategoryId);
    const payee = this.resolvePayee(payeeId);
    const categoryName = this.resolveCategoryName(categoryId);
    const subCategoryName = this.resolveSubCategoryName(subCategoryId);
    const body = this.buildMutationBody(formValue);

    this.saving.set(true);

    this.apiService
      .post(`${API_CONFIG.TRANSACTION.CREATE}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const payload = response?.body ?? response ?? {};
          const created = payload.transaction ?? payload.data?.transaction ?? payload;
          const id = created?.id ?? payload?.id;

          if (id == null) {
            this.toasterMessageService.error(this.TX_C.TOASTER_MESSAGE.CREATE.FAILED);
            return;
          }

          const newTx: Transaction = {
            id: Number(id),
            transactionType: created.transactionType ?? formValue.transactionType,
            paymentMode: created.paymentMode ?? formValue.paymentMode,
            purpose: created.purpose ?? formValue.purpose,
            amount: String(created.amount ?? body['amount']),
            transactionDateTime:
              created.transactionDateTime ?? String(body['transactionDateTime']),
            categoryId: created.categoryId ?? categoryId,
            categoryName: created.categoryName ?? categoryName,
            subCategoryId: created.subCategoryId ?? subCategoryId,
            subCategoryName: created.subCategoryName ?? subCategoryName,
            payeeId: created.payeeId ?? payeeId,
            payeeName: created.payeeName ?? payee?.name ?? '',
            payeeCategory: created.payeeCategory ?? payee?.payeeCategory ?? '',
            userBankId:
              created.userBankId ??
              (formValue.paymentMode === 'BANK' ? Number(formValue.userBankId) : null),
            createdAt: created.createdAt ?? new Date().toISOString(),
            updatedAt: created.updatedAt ?? new Date().toISOString(),
          };

          this.transactions.update((list) => [newTx, ...list]);
          this.total.update((t) => t + 1);
          this.toasterMessageService.success(this.TX_C.TOASTER_MESSAGE.CREATE.SUCCESS);
          this.cancelAddModal();
        },
        error: () => {
          this.toasterMessageService.error(this.TX_C.TOASTER_MESSAGE.CREATE.FAILED);
        },
      });
  }

  onEditTransaction(tx: Transaction): void {
    this.editTransaction.set(tx);
    const categoryId =
      tx.categoryId && tx.categoryId > 0
        ? tx.categoryId
        : this.findCategoryIdByName(tx.categoryName);

    this.editForm.reset(
      {
        transactionDateTime: this.toDateTimeLocal(tx.transactionDateTime),
        payeeId: tx.payeeId ?? 0,
        paymentMode: tx.paymentMode,
        userBankId: tx.userBankId ?? 0,
        purpose: tx.purpose,
        categoryId,
        subCategoryId: 0,
        transactionType: tx.transactionType,
        amount: this.toAmountNumber(tx.amount) || null,
        investmentType: '',
        investmentName: '',
        quantity: null,
      },
      { emitEvent: false },
    );
    this.syncBankField('edit', tx.paymentMode);
    this.syncInvestmentFields('edit', tx.purpose);
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
    this.showEditBankSelect.set(false);
    this.showEditInvestmentFields.set(false);
    this.editForm.reset(this.emptyFormValue());
    this.syncBankField('edit', '');
    this.syncInvestmentFields('edit', '');
  }

  confirmEditModal(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toasterMessageService.warning(this.TX_C.TOASTER_MESSAGE.REQUIRED_FIELD);
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
    const payee = this.resolvePayee(payeeId);
    const categoryName = this.resolveCategoryName(categoryId);
    const subCategoryName = this.resolveSubCategoryName(subCategoryId);
    const body = this.buildMutationBody(formValue);

    this.saving.set(true);

    this.apiService
      .patch(`${API_CONFIG.TRANSACTION.UPDATE}/${current.id}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const payload = response?.body ?? response ?? {};
          const updatedBody = payload.transaction ?? payload.data?.transaction ?? payload;
          const updated: Transaction = {
            ...current,
            transactionDateTime:
              updatedBody.transactionDateTime ?? String(body['transactionDateTime']),
            transactionType: updatedBody.transactionType ?? formValue.transactionType,
            paymentMode: updatedBody.paymentMode ?? formValue.paymentMode,
            purpose: updatedBody.purpose ?? formValue.purpose,
            categoryId: updatedBody.categoryId ?? categoryId,
            categoryName: updatedBody.categoryName ?? categoryName,
            subCategoryId: updatedBody.subCategoryId ?? subCategoryId,
            subCategoryName: updatedBody.subCategoryName ?? subCategoryName,
            amount: String(updatedBody.amount ?? body['amount']),
            payeeId: updatedBody.payeeId ?? payeeId,
            payeeName: updatedBody.payeeName ?? payee?.name ?? current.payeeName,
            payeeCategory:
              updatedBody.payeeCategory ?? payee?.payeeCategory ?? current.payeeCategory,
            userBankId:
              updatedBody.userBankId ??
              (formValue.paymentMode === 'BANK' ? Number(formValue.userBankId) : null),
          };

          this.transactions.update((list) =>
            list.map((item) => (item.id === current.id ? updated : item)),
          );
          this.toasterMessageService.success(this.TX_C.TOASTER_MESSAGE.UPDATE.SUCCESS);
          this.cancelEditModal();
        },
        error: () => {
          this.toasterMessageService.error(this.TX_C.TOASTER_MESSAGE.UPDATE.FAILED);
        },
      });
  }

  onDeleteTransaction(tx: Transaction): void {
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
      .delete(`${API_CONFIG.TRANSACTION.DELETE}/${current.id}`)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.transactions.update((list) => list.filter((item) => item.id !== current.id));
          this.total.update((t) => Math.max(0, t - 1));
          this.toasterMessageService.success(this.TX_C.TOASTER_MESSAGE.DELETE.SUCCESS);
          this.cancelDeleteModal();
        },
        error: () => {
          this.toasterMessageService.error(this.TX_C.TOASTER_MESSAGE.DELETE.FAILED);
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
