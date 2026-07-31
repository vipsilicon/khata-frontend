import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  signal,
  inject,
  computed,
} from '@angular/core';
import { finalize } from 'rxjs';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

// Services
import { ApiServices } from '../../services/api/api.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../core/config/api.config';

// Components
import { AddCardComponent } from '../../components/add-card/add-card.component';
import { BankCardComponent, BankCardData } from '../../components/bank-card/bank-card.component';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';
import { DataTableComponent } from '../../components/data-table/data-table.component';
import { DataTableColumn } from '../../components/data-table/data-table.types';
import { FormInputComponent } from '../../components/form-input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../components/form-select/form-select.component';

// Constants
import { BANKS_CONST } from '../../core/constants/banks.constants';

// Utils
import {
  creditDebitBadgeClass,
  isNearBottom,
  nextSortState,
  sortRows,
  SortDir,
} from '../../utils/table.utils';

type Bank = BankCardData;

interface BankList {
  id: number;
  name: string;
}

interface CreateUserBank {
  bankId: number;
  initialAmount: number;
}

interface BankTransaction {
  id: number;
  referenceId: string;
  userBankId: number;
  transactionType: string;
  amount: string;
  transactionDateTime: string;
  createdAt: string;
  updatedAt: string;
}

type BankTxSortKey = keyof BankTransaction;

@Component({
  selector: 'app-banks.component',
  imports: [
    LucideAngularModule,
    CommonModule,
    ReactiveFormsModule,
    AddCardComponent,
    BankCardComponent,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './banks.component.html',
  styleUrl: './banks.component.css',
})
export class BanksComponent implements OnInit {
  private apiService = inject(ApiServices);
  private fb = inject(FormBuilder);
  private toasterMessageService = inject(ToasterMessageUtils);

  @ViewChild('scrollContainer')
  scrollContainer!: ElementRef<HTMLDivElement>;

  readonly BANKS_C = BANKS_CONST;
  readonly chevronLeftIcon = ChevronLeft;
  readonly chevronRightIcon = ChevronRight;
  readonly txLimit = 10;

  readonly transactionTypeOptions: FormSelectOption[] = [
    { value: 'CREDIT', label: 'CREDIT' },
    { value: 'DEBIT', label: 'DEBIT' },
  ];

  readonly bankTxColumns: DataTableColumn<BankTransaction>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
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

  loading = signal(true);
  uploading = signal(false);
  savingTx = signal(false);
  showAddBankModal = signal(false);
  showDeleteModal = signal(false);
  showEditModal = signal(false);
  showEditTxModal = signal(false);
  showDeleteTxModal = signal(false);

  banks = signal<Bank[]>([]);
  bankList = signal<BankList[]>([]);
  editBank = signal<Bank | null>(null);
  deleteBank = signal<Bank | null>(null);
  editBankTransaction = signal<BankTransaction | null>(null);
  deleteBankTransaction = signal<BankTransaction | null>(null);

  selectedUserBankId = signal<number | null>(null);
  bankTransactions = signal<BankTransaction[]>([]);
  txLoading = signal(false);
  txLoadingMore = signal(false);
  txPage = signal(1);
  txLastPage = signal(1);
  txTotal = signal(0);
  txSortKey = signal<BankTxSortKey>('transactionDateTime');
  txSortDir = signal<SortDir>('desc');

  bankSelectOptions = computed<FormSelectOption[]>(() =>
    this.bankList().map((bank) => ({
      id: bank.id,
      value: bank.id,
      label: bank.name,
    })),
  );

  sortedBankTransactions = computed(() =>
    sortRows(this.bankTransactions(), this.txSortKey(), this.txSortDir()),
  );

  txHasMore = computed(() => this.txPage() < this.txLastPage());

  addBankForm = this.fb.nonNullable.group({
    bankId: [0, [Validators.required, Validators.min(1)]],
    initialAmount: [0, [Validators.required, Validators.min(0)]],
  });

  editBankForm = this.fb.nonNullable.group({
    initialAmount: [0, [Validators.required, Validators.min(0)]],
  });

  editTxForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    transactionType: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadUserBanks();
    this.loadBankLists();
  }

  loadBankLists(): void {
    this.apiService.get(`${API_CONFIG.BANK.LIST}`, { page: 1, limit: 10 }).subscribe({
      next: (response: any) => {
        const existingBankNames = new Set(this.banks().map((bank) => bank.name));
        this.bankList.set(
          (response?.body?.data ?? [])
            .filter((bank: any) => !existingBankNames.has(bank.name))
            .map((b: any) => ({ id: b.id, name: b.name })),
        );
      },
      error: () => {},
    });
  }

  loadUserBanks(): void {
    this.loading.set(true);

    this.apiService
      .get(`${API_CONFIG.USER_BANK.LIST}`, {})
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: any) => {
          const mapped: Bank[] = (response?.body?.data ?? []).map((item: any) => ({
            id: item.id,
            name: item.bankName,
            code: item.bankCode,
            icon: item.bankIcon,
            initialAmount: item.initialAmount,
            balance: item.balance,
          }));

          this.banks.set(mapped);

          if (mapped.length === 0) {
            this.selectedUserBankId.set(null);
            this.bankTransactions.set([]);
            this.txTotal.set(0);
            this.txPage.set(1);
            this.txLastPage.set(1);
            return;
          }

          const current = this.selectedUserBankId();
          const stillExists = mapped.some((b) => b.id === current);
          this.selectedUserBankId.set(stillExists && current != null ? current : mapped[0].id);
          this.loadBankTransactions(true);
        },
        error: () => {},
      });
  }

  selectBankTab(bank: Bank): void {
    if (this.selectedUserBankId() === bank.id) {
      return;
    }
    this.selectedUserBankId.set(bank.id);
    this.loadBankTransactions(true);
  }

  loadBankTransactions(reset = false): void {
    const userBankId = this.selectedUserBankId();
    if (userBankId == null || this.txLoading() || this.txLoadingMore()) {
      return;
    }
    if (!reset && this.txPage() > this.txLastPage()) {
      return;
    }

    if (reset) {
      this.txPage.set(1);
      this.txLoading.set(true);
      this.bankTransactions.set([]);
    } else {
      this.txLoadingMore.set(true);
    }

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
          this.txLoadingMore.set(false);
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
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          this.bankTransactions.update((prev) => (reset ? data : [...prev, ...data]));
          this.txTotal.set(body.total ?? data.length);
          this.txLastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error(this.BANKS_C.TOASTER_MESSAGE.TX.LOAD_FAILED);
        },
      });
  }

  onTxScroll(event: Event): void {
    if (isNearBottom(event.target as HTMLElement)) {
      this.loadMoreBankTransactions();
    }
  }

  loadMoreBankTransactions(): void {
    if (this.txLoading() || this.txLoadingMore() || !this.txHasMore()) {
      return;
    }
    this.txPage.update((p) => p + 1);
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
          this.loadUserBanks();
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
          this.loadUserBanks();
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

  scrollLeft(): void {
    this.scrollContainer.nativeElement.scrollBy({ left: -320, behavior: 'smooth' });
  }

  scrollRight(): void {
    this.scrollContainer.nativeElement.scrollBy({ left: 320, behavior: 'smooth' });
  }

  openModal(): void {
    this.addBankForm.reset({ bankId: 0, initialAmount: 0 });
    this.showAddBankModal.set(true);
  }

  cancelAddUserBankModal(): void {
    this.showAddBankModal.set(false);
  }

  confirmAddUserBankModal(): void {
    if (this.addBankForm.invalid) {
      this.addBankForm.markAllAsTouched();
      this.toasterMessageService.warning(this.BANKS_C.TOASTER_MESSAGE.INVALID_DATA);
      return;
    }

    this.uploading.set(true);
    const body: CreateUserBank = {
      bankId: this.addBankForm.controls.bankId.value,
      initialAmount: this.addBankForm.controls.initialAmount.value,
    };

    this.apiService
      .post(`${API_CONFIG.USER_BANK.CREATE}`, body)
      .pipe(
        finalize(() => {
          this.uploading.set(false);
          this.showAddBankModal.set(false);
          this.loadUserBanks();
          this.loadBankLists();
        }),
      )
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  get bankId_addBankForm() {
    return this.addBankForm.controls.bankId;
  }

  get initialAmount_addBankForm() {
    return this.addBankForm.controls.initialAmount;
  }

  get initialAmount_editBankForm() {
    return this.editBankForm.controls.initialAmount;
  }

  openDeleteModal(bank: Bank): void {
    this.deleteBank.set(bank);
    this.showDeleteModal.set(true);
  }

  confirmDeleteModal(): void {
    this.showDeleteModal.set(false);
  }

  cancelDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteBank.set(null);
  }

  openEditModal(bank: Bank): void {
    this.editBank.set(bank);
    this.editBankForm.reset({ initialAmount: bank.initialAmount });
    this.showEditModal.set(true);
  }

  confirmEditModal(): void {
    this.showEditModal.set(false);
  }

  cancelEditModal(): void {
    this.showEditModal.set(false);
    this.editBank.set(null);
  }
}
