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
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  Plus,
  SquarePen,
  Trash2,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

// Services
import { ApiServices } from '../../services/api/api.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../core/config/api.config';

// Components
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';

// Constants
import { BANKS_CONST } from '../../core/constants/banks.constants';

interface Bank {
  id: number;
  name: string;
  code: string;
  icon: string | null;
  initialAmount: number;
  balance: number;
}

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
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-banks.component',
  imports: [LucideAngularModule, CommonModule, ReactiveFormsModule, ConfirmModalComponent],
  templateUrl: './banks.component.html',
  styleUrl: './banks.component.css',
})
export class BanksComponent implements OnInit {
  private apiService = inject(ApiServices);
  private fb = inject(FormBuilder);
  private toasterMessageService = inject(ToasterMessageUtils);

  readonly BANKS_C = BANKS_CONST;

  chevronLeftIcon = ChevronLeft;
  chevronRightIcon = ChevronRight;
  plus = Plus;
  squarePen = SquarePen;
  trash = Trash2;
  arrowUp = ArrowUp;
  arrowDown = ArrowDown;
  arrowUpDown = ArrowUpDown;

  loading = signal<boolean>(true);
  uploading = signal<boolean>(false);

  showAddBankModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);

  banks = signal<Bank[]>([]);
  bankList = signal<BankList[]>([]);
  editBank = signal<Bank | null>(null);
  deleteBank = signal<Bank | null>(null);

  // Bank transactions
  readonly txLimit = 10;
  selectedUserBankId = signal<number | null>(null);
  bankTransactions = signal<BankTransaction[]>([]);
  txLoading = signal<boolean>(false);
  txLoadingMore = signal<boolean>(false);
  txPage = signal<number>(1);
  txLastPage = signal<number>(1);
  txTotal = signal<number>(0);
  txSortKey = signal<BankTxSortKey>('transactionDateTime');
  txSortDir = signal<SortDir>('desc');

  sortedBankTransactions = computed(() => {
    const list = [...this.bankTransactions()];
    const key = this.txSortKey();
    const dir = this.txSortDir();

    return list.sort((a, b) => {
      let av: string | number = a[key] ?? '';
      let bv: string | number = b[key] ?? '';

      if (key === 'amount' || key === 'id' || key === 'userBankId') {
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

  txHasMore = computed(() => this.txPage() < this.txLastPage());

  ngOnInit(): void {
    this.loadUserBanks();
    this.loadBankLists();
  }

  addBankForm = this.fb.nonNullable.group({
    bankId: [0, [Validators.required, Validators.min(1)]],
    initialAmount: [0, [Validators.required, Validators.min(0)]],
  });

  editBankForm = this.fb.nonNullable.group({
    initialAmount: [0, [Validators.required, Validators.min(0)]],
  });

  loadBankLists(): void {
    this.apiService
      .get(`${API_CONFIG.BANK.LIST}`, { page: 1, limit: 10 })
      .pipe(finalize(() => {}))
      .subscribe({
        next: (response: any) => {
          const existingBankNames = new Set(this.banks().map((bank) => bank.name));
          this.bankList.set(
            response.body.data
              .filter((bank: any) => {
                return !existingBankNames.has(bank.name);
              })
              .map((b: any) => {
                return {
                  id: b.id,
                  name: b.name,
                };
              }),
          );
        },
        error: (error) => {},
      });
  }

  loadUserBanks(): void {
    this.loading.set(true);

    this.apiService
      .get(`${API_CONFIG.USER_BANK.LIST}`, {})
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const mapped: Bank[] = response.body.data.map((item: any) => {
            return {
              id: item.id,
              name: item.bankName,
              code: item.bankCode,
              icon: item.bankIcon,
              initialAmount: item.initialAmount,
              balance: item.balance,
            };
          });

          this.banks.set(mapped);

          if (mapped.length > 0) {
            const current = this.selectedUserBankId();
            const stillExists = mapped.some((b) => b.id === current);
            const nextId = stillExists && current != null ? current : mapped[0].id;
            this.selectedUserBankId.set(nextId);
            this.loadBankTransactions(true);
          } else {
            this.selectedUserBankId.set(null);
            this.bankTransactions.set([]);
            this.txTotal.set(0);
            this.txPage.set(1);
            this.txLastPage.set(1);
          }
        },
        error: (error) => {},
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
    if (userBankId == null) {
      return;
    }

    if (this.txLoading() || this.txLoadingMore()) {
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
          // Ignore stale responses if tab changed while request was in flight
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

          if (reset) {
            this.bankTransactions.set(data);
          } else {
            this.bankTransactions.update((prev) => [...prev, ...data]);
          }

          this.txTotal.set(body.total ?? data.length);
          this.txLastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error('Failed to load bank transactions');
        },
      });
  }

  onTxScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const threshold = 80;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
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

  toggleTxSort(key: BankTxSortKey): void {
    if (this.txSortKey() === key) {
      this.txSortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.txSortKey.set(key);
    this.txSortDir.set('asc');
  }

  txSortIcon(key: BankTxSortKey) {
    if (this.txSortKey() !== key) {
      return this.arrowUpDown;
    }
    return this.txSortDir() === 'asc' ? this.arrowUp : this.arrowDown;
  }

  typeBadgeClass(type: string): string {
    return type === 'CREDIT'
      ? 'bg-emerald-100 text-emerald-700'
      : type === 'DEBIT'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-gray-100 text-gray-700';
  }

  @ViewChild('scrollContainer')
  scrollContainer!: ElementRef<HTMLDivElement>;

  scrollLeft() {
    this.scrollContainer.nativeElement.scrollBy({
      left: -320,
      behavior: 'smooth',
    });
  }

  scrollRight() {
    this.scrollContainer.nativeElement.scrollBy({
      left: 320,
      behavior: 'smooth',
    });
  }

  openModal() {
    this.showAddBankModal.set(true);

    this.addBankForm.reset({
      bankId: 0,
      initialAmount: 0,
    });
  }

  cancelAddUserBankModal() {
    this.showAddBankModal.set(false);
  }

  confirmAddUserBankModal() {
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
        next: (response: any) => {
          console.log(response);
        },
        error: (error) => {},
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

  openDeleteModal(bank: Bank) {
    this.deleteBank.set(bank);
    this.showDeleteModal.set(true);
  }

  confirmDeleteModal() {
    this.showDeleteModal.set(false);
  }

  cancelDeleteModal() {
    this.showDeleteModal.set(false);
  }

  openEditModal(bank: Bank) {
    this.editBank.set(bank);
    this.showEditModal.set(true);
  }

  confirmEditModal() {
    this.showEditModal.set(false);
  }

  cancelEditModal() {
    this.showEditModal.set(false);
  }
}
