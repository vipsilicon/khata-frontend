import { CommonModule } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { finalize } from 'rxjs';
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  Plus,
  SquarePen,
  Trash2,
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

  loading = signal<boolean>(true);
  uploading = signal<boolean>(false);

  showAddBankModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);

  banks = signal<Bank[]>([]);
  bankList = signal<BankList[]>([]);
  editBank = signal<Bank | null>(null);
  deleteBank = signal<Bank | null>(null);

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
          this.banks.set(
            response.body.data.map((item: any) => {
              return {
                id: item.id,
                name: item.bankName,
                code: item.bankCode,
                icon: item.bankIcon,
                initialAmount: item.initialAmount,
                balance: item.balance,
              };
            }),
          );
        },
        error: (error) => {},
      });
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
