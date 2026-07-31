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
  ChevronDown,
  ChevronUp,
} from 'lucide-angular';
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
import { FormInputComponent } from '../../components/form-input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../components/form-select/form-select.component';
import { BankAnalysisComponent } from './bank-analysis/bank-analysis.component';
import {
  BankAccount,
  BankPassbookComponent,
} from './bank-passbook/bank-passbook.component';

// Constants
import { BANKS_CONST } from '../../core/constants/banks.constants';

type Bank = BankCardData;
type BanksTab = 'passbook' | 'analysis';

interface BankList {
  id: number;
  name: string;
}

interface CreateUserBank {
  bankId: number;
  initialAmount: number;
}

@Component({
  selector: 'app-banks.component',
  imports: [
    LucideAngularModule,
    CommonModule,
    ReactiveFormsModule,
    AddCardComponent,
    BankCardComponent,
    ConfirmModalComponent,
    FormInputComponent,
    FormSelectComponent,
    BankPassbookComponent,
    BankAnalysisComponent,
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
  readonly chevronDownIcon = ChevronDown;
  readonly chevronUpIcon = ChevronUp;

  loading = signal(true);
  uploading = signal(false);
  showAddBankModal = signal(false);
  showDeleteModal = signal(false);
  showEditModal = signal(false);
  /** Collapse bank cards to free vertical space for Passbook / Analysis. */
  showBankCards = signal(true);
  selectedTab = signal<BanksTab>('passbook');

  banks = signal<Bank[]>([]);
  bankList = signal<BankList[]>([]);
  editBank = signal<Bank | null>(null);
  deleteBank = signal<Bank | null>(null);
  selectedUserBankId = signal<number | null>(null);

  bankSelectOptions = computed<FormSelectOption[]>(() =>
    this.bankList().map((bank) => ({
      id: bank.id,
      value: bank.id,
      label: bank.name,
    })),
  );

  addBankForm = this.fb.nonNullable.group({
    bankId: [0, [Validators.required, Validators.min(1)]],
    initialAmount: [0, [Validators.required, Validators.min(0)]],
  });

  editBankForm = this.fb.nonNullable.group({
    initialAmount: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadUserBanks();
    this.loadBankLists();
  }

  selectTab(tab: BanksTab): void {
    this.selectedTab.set(tab);
  }

  toggleBankCards(): void {
    this.showBankCards.update((v) => !v);
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
            return;
          }

          const current = this.selectedUserBankId();
          const stillExists = mapped.some((b) => b.id === current);
          this.selectedUserBankId.set(stillExists && current != null ? current : mapped[0].id);
        },
        error: () => {},
      });
  }

  onSelectBank(bank: BankAccount): void {
    if (this.selectedUserBankId() === bank.id) {
      return;
    }
    this.selectedUserBankId.set(bank.id);
  }

  scrollLeft(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: -320, behavior: 'smooth' });
  }

  scrollRight(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: 320, behavior: 'smooth' });
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
