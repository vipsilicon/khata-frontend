import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

// Services
import { ApiServices } from '../../../services/api/api.services';
import { ToasterMessageUtils } from '../../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../../core/config/api.config';

// Constants
import { BANKS_CONST } from '../../../core/constants/banks.constants';

// Components
import { ConfirmModalComponent } from '../../../components/confirm-modal/confirm-modal.component';
import { DataTableComponent } from '../../../components/data-table/data-table.component';
import { DataTableColumn } from '../../../components/data-table/data-table.types';
import { FormInputComponent } from '../../../components/form-input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../components/form-select/form-select.component';
import { BankCardData } from '../../../components/bank-card/bank-card.component';

// Utils
import {
  creditDebitBadgeClass,
  nextSortState,
  sortRows,
  SortDir,
} from '../../../utils/table.utils';

export type BankAccount = BankCardData;

export interface BankTransaction {
  id: number;
  referenceId: string;
  userBankId: number;
  transactionType: string;
  amount: string;
  transactionDateTime: string;
  payeeId: number | null;
  payeeName: string;
  createdAt: string;
  updatedAt: string;
}

type BankTxSortKey = keyof BankTransaction;

@Component({
  selector: 'app-bank-passbook',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './bank-passbook.component.html',
  styleUrl: './bank-passbook.component.css',
})
export class BankPassbookComponent implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  /** Multiple user bank accounts (parent loads these). */
  readonly banks = input.required<BankAccount[]>();
  /** Currently selected user-bank id for the transaction list. */
  readonly selectedUserBankId = input<number | null>(null);
  /**
   * When bank cards above are visible they take vertical space.
   * Parent passes false when cards are hidden so the table can grow.
   */
  readonly cardsVisible = input(true);

  readonly selectBank = output<BankAccount>();
  /** Emit after tx edit/delete so parent can refresh bank balances. */
  readonly banksRefresh = output<void>();

  /** Taller table when bank cards are collapsed. */
  readonly tableMaxHeightClass = computed(() =>
    this.cardsVisible() ? 'max-h-[calc(100vh-22rem)]' : 'max-h-[calc(100vh-12rem)]',
  );

  readonly BANKS_C = BANKS_CONST;
  readonly txLimit = 10;

  readonly transactionTypeOptions: FormSelectOption[] = [
    { value: 'CREDIT', label: 'CREDIT' },
    { value: 'DEBIT', label: 'DEBIT' },
  ];

  readonly bankTxColumns: DataTableColumn<BankTransaction>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
    {
      key: 'payeeName',
      label: 'Payee Name',
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

  bankTransactions = signal<BankTransaction[]>([]);
  txLoading = signal(false);
  savingTx = signal(false);
  txPage = signal(1);
  txLastPage = signal(1);
  txTotal = signal(0);
  txSortKey = signal<BankTxSortKey>('transactionDateTime');
  txSortDir = signal<SortDir>('desc');

  showEditTxModal = signal(false);
  showDeleteTxModal = signal(false);
  editBankTransaction = signal<BankTransaction | null>(null);
  deleteBankTransaction = signal<BankTransaction | null>(null);

  private lastLoadedBankId: number | null = null;

  editTxForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    transactionType: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
  });

  sortedBankTransactions = computed(() =>
    sortRows(this.bankTransactions(), this.txSortKey(), this.txSortDir()),
  );

  constructor() {
    // Reload transactions when parent changes the selected bank
    effect(() => {
      const bankId = this.selectedUserBankId();
      if (bankId === this.lastLoadedBankId) {
        return;
      }
      this.lastLoadedBankId = bankId;
      if (bankId == null) {
        this.bankTransactions.set([]);
        this.txTotal.set(0);
        this.txPage.set(1);
        this.txLastPage.set(1);
        return;
      }
      this.loadBankTransactions(true);
    });
  }

  ngOnInit(): void {
    // Initial load handled by effect when selectedUserBankId is set
  }

  onSelectBank(bank: BankAccount): void {
    this.selectBank.emit(bank);
  }

  loadBankTransactions(reset = false): void {
    const userBankId = this.selectedUserBankId();
    if (userBankId == null || this.txLoading()) {
      return;
    }

    if (reset) {
      this.txPage.set(1);
      this.bankTransactions.set([]);
    }

    this.txLoading.set(true);
    const currentPage = this.txPage();

    this.apiService
      .get(`${API_CONFIG.BANK_TRANSACTION.LIST}`, {
        page: currentPage,
        limit: this.txLimit,
        userBankId,
      })
      .pipe(
        finalize(() => {
          this.txLoading.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          if (this.selectedUserBankId() !== userBankId) {
            return;
          }

          const body = response?.body ?? {};
          const data: BankTransaction[] = (body.data ?? []).map((item: any) => ({
            id: item.id,
            referenceId: item.referenceId,
            userBankId: item.userBankId,
            transactionType: item.transactionType,
            amount: item.amount,
            transactionDateTime: item.transactionDateTime,
            payeeId: item.payeeId ?? null,
            payeeName: item.payeeName ?? '',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          const total = Number(body.total ?? data.length) || 0;
          const current =
            Number(body.page ?? body.currentPage ?? currentPage) || currentPage;
          const lastPage =
            Number(body.lastPage ?? body.lastpage) ||
            Math.max(1, Math.ceil(total / this.txLimit) || 1);

          this.bankTransactions.set(data);
          this.txTotal.set(total);
          this.txPage.set(current);
          this.txLastPage.set(lastPage);
        },
        error: () => {
          this.toasterMessageService.error(this.BANKS_C.TOASTER_MESSAGE.TX.LOAD_FAILED);
        },
      });
  }

  onTxPageChange(page: number): void {
    if (page === this.txPage() || this.txLoading()) {
      return;
    }
    this.txPage.set(page);
    this.loadBankTransactions(false);
  }

  toggleTxSort(key: string): void {
    const next = nextSortState(this.txSortKey(), this.txSortDir(), key);
    this.txSortKey.set(next.key as BankTxSortKey);
    this.txSortDir.set(next.dir);
  }

  onEditBankTransaction(tx: BankTransaction): void {
    this.editBankTransaction.set(tx);
    this.editTxForm.reset({
      transactionDateTime: this.toDateTimeLocal(tx.transactionDateTime),
      transactionType: tx.transactionType,
      amount: Number(tx.amount) || 0,
    });
    this.showEditTxModal.set(true);
  }

  cancelEditTxModal(): void {
    this.showEditTxModal.set(false);
    this.editBankTransaction.set(null);
    this.editTxForm.reset({
      transactionDateTime: '',
      transactionType: '',
      amount: 0,
    });
  }

  confirmEditTxModal(): void {
    if (this.editTxForm.invalid) {
      this.editTxForm.markAllAsTouched();
      this.toasterMessageService.warning(this.BANKS_C.TOASTER_MESSAGE.TX.REQUIRED_FIELD);
      return;
    }

    const current = this.editBankTransaction();
    if (!current || this.savingTx()) {
      return;
    }

    const formValue = this.editTxForm.getRawValue();
    const body = {
      id: current.id,
      userBankId: current.userBankId,
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      transactionType: formValue.transactionType,
      amount: Number(formValue.amount).toFixed(2),
    };

    this.savingTx.set(true);

    this.apiService
      .patch(`${API_CONFIG.BANK_TRANSACTION.UPDATE}/${current.id}`, body)
      .pipe(finalize(() => this.savingTx.set(false)))
      .subscribe({
        next: (response: any) => {
          const updatedBody = response?.body ?? response ?? {};
          const updated: BankTransaction = {
            ...current,
            transactionDateTime: updatedBody.transactionDateTime ?? body.transactionDateTime,
            transactionType: updatedBody.transactionType ?? body.transactionType,
            amount: updatedBody.amount ?? body.amount,
          };

          this.bankTransactions.update((list) =>
            list.map((item) => (item.id === current.id ? updated : item)),
          );
          this.banksRefresh.emit();
          this.toasterMessageService.success(this.BANKS_C.TOASTER_MESSAGE.TX.UPDATE_SUCCESS);
          this.cancelEditTxModal();
        },
        error: () => {
          this.toasterMessageService.error(this.BANKS_C.TOASTER_MESSAGE.TX.UPDATE_FAILED);
        },
      });
  }

  onDeleteBankTransaction(tx: BankTransaction): void {
    this.deleteBankTransaction.set(tx);
    this.showDeleteTxModal.set(true);
  }

  cancelDeleteTxModal(): void {
    this.showDeleteTxModal.set(false);
    this.deleteBankTransaction.set(null);
  }

  confirmDeleteTxModal(): void {
    const current = this.deleteBankTransaction();
    if (!current || this.savingTx()) {
      return;
    }

    this.savingTx.set(true);

    this.apiService
      .delete(`${API_CONFIG.BANK_TRANSACTION.DELETE}/${current.id}`)
      .pipe(finalize(() => this.savingTx.set(false)))
      .subscribe({
        next: () => {
          this.bankTransactions.update((list) => list.filter((item) => item.id !== current.id));
          this.txTotal.update((t) => Math.max(0, t - 1));
          this.banksRefresh.emit();
          this.toasterMessageService.success(this.BANKS_C.TOASTER_MESSAGE.TX.DELETE_SUCCESS);
          this.cancelDeleteTxModal();
        },
        error: () => {
          this.toasterMessageService.error(this.BANKS_C.TOASTER_MESSAGE.TX.DELETE_FAILED);
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
