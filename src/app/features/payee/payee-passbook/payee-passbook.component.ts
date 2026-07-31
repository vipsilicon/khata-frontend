import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

// Components
import { ConfirmModalComponent } from '../../../components/confirm-modal/confirm-modal.component';
import { DataTableComponent } from '../../../components/data-table/data-table.component';
import { DataTableColumn } from '../../../components/data-table/data-table.types';
import { FormInputComponent } from '../../../components/form-input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../components/form-select/form-select.component';

// Constants
import { PAYEE_CONST } from '../../../core/constants/payee.constants';

// Services
import { ApiServices } from '../../../services/api/api.services';
import { API_CONFIG } from '../../../core/config/api.config';
import { ToasterMessageUtils } from '../../../utils/toaster-message/toaster-message.utils';

// Utils
import { nextSortState, sortRows, SortDir } from '../../../utils/table.utils';

interface IPAYEE_CATEGORY_LIST {
  id: number;
  name: string;
}

interface IPAYEE {
  id: number;
  name: string;
  payeeCategory: string;
}

type PayeeSortKey = keyof IPAYEE;

@Component({
  selector: 'app-payee-passbook',
  standalone: true,
  imports: [
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './payee-passbook.component.html',
  styleUrl: './payee-passbook.component.css',
})
export class PayeePassbookComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);

  readonly PAYEE_C = PAYEE_CONST;

  readonly columns: DataTableColumn<IPAYEE>[] = [
    { key: 'name', label: 'Name', type: 'text', sortable: true },
    { key: 'payeeCategory', label: 'Payee Category', type: 'text', sortable: true },
    { key: 'actions', label: 'Action', type: 'actions', align: 'center' },
  ];

  showAddPayeeModel = signal(false);
  showEditPayeeModal = signal(false);
  showDeletePayeeModal = signal(false);

  editPayee = signal<IPAYEE | null>(null);
  deletePayee = signal<IPAYEE | null>(null);

  savingPayee = signal(false);
  loadingPayeeCategory = signal(false);
  loadingPayee = signal(false);
  loadingPayeeMore = signal(false);
  payeeCategoryList = signal<IPAYEE_CATEGORY_LIST[]>([]);
  payees = signal<IPAYEE[]>([]);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);

  sortKey = signal<PayeeSortKey>('name');
  sortDir = signal<SortDir>('asc');

  payeeCategoryOptions = computed<FormSelectOption[]>(() =>
    this.payeeCategoryList().map((item) => ({
      id: item.id,
      value: item.name,
      label: item.name,
    })),
  );

  sortedPayees = computed(() => sortRows(this.payees(), this.sortKey(), this.sortDir()));

  payeeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    payeeCategory: ['', Validators.required],
  });

  editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    payeeCategory: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadPayeeCategory();
    this.loadPayees(true);
  }

  toggleSort(key: string): void {
    const next = nextSortState(this.sortKey(), this.sortDir(), key);
    this.sortKey.set(next.key as PayeeSortKey);
    this.sortDir.set(next.dir);
  }

  loadPayeeCategory(): void {
    this.loadingPayeeCategory.set(true);

    this.apiService
      .get(`${API_CONFIG.PAYEE.PAYEE_CATEGORY_LIST}`, {})
      .pipe(
        finalize(() => {
          this.loadingPayeeCategory.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const mapped: IPAYEE_CATEGORY_LIST[] = (response?.body ?? []).map((item: any) => ({
            id: item.id,
            name: item.name,
          }));

          this.payeeCategoryList.set(mapped);
        },
        error: () => {
          this.toasterMessageService.error(PAYEE_CONST.TOASTER_MESSAGE.LOAD.CATEGORY_FAILED);
        },
      });
  }

  loadPayees(reset = false): void {
    if (this.loadingPayee() || this.loadingPayeeMore()) {
      return;
    }

    if (!reset && this.page() > this.lastPage()) {
      return;
    }

    if (reset) {
      this.page.set(1);
      this.loadingPayee.set(true);
    } else {
      this.loadingPayeeMore.set(true);
    }

    this.apiService
      .get(`${API_CONFIG.PAYEE.LIST}`, {})
      .pipe(
        finalize(() => {
          this.loadingPayee.set(false);
          this.loadingPayeeMore.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const body = response?.body ?? {};

          const data: IPAYEE[] = (body.data ?? []).map((item: any) => ({
            id: item.id,
            name: item.name,
            payeeCategory: item.payeeCategory,
          }));

          if (reset) {
            this.payees.set(data);
          } else {
            this.payees.update((prev) => [...prev, ...data]);
          }

          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastpage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error(PAYEE_CONST.TOASTER_MESSAGE.LOAD.FAILED);
        },
      });
  }

  onAddPayee(): void {
    this.payeeForm.reset({
      name: '',
      payeeCategory: '',
    });
    this.showAddPayeeModel.set(true);
  }

  confirmAddPayeeModal(): void {
    if (this.payeeForm.invalid) {
      this.payeeForm.markAllAsTouched();
      this.toasterMessageService.warning(PAYEE_CONST.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    if (this.savingPayee()) {
      return;
    }

    const formValue = this.payeeForm.getRawValue();
    const body = {
      name: formValue.name.trim(),
      payeeCategory: formValue.payeeCategory,
    };

    this.savingPayee.set(true);

    this.apiService
      .post(`${API_CONFIG.PAYEE.CREATE}`, body)
      .pipe(
        finalize(() => {
          this.savingPayee.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const created = response?.body ?? response ?? {};
          const id = created.id ?? created?.data?.id;

          if (id == null) {
            this.toasterMessageService.error(PAYEE_CONST.TOASTER_MESSAGE.CREATE.MISSING_ID);
            return;
          }

          const newPayee: IPAYEE = {
            id: Number(id),
            name: created.name ?? body.name,
            payeeCategory: created.payeeCategory ?? body.payeeCategory,
          };

          this.payees.update((list) => [newPayee, ...list]);
          this.total.update((t) => t + 1);

          this.toasterMessageService.success(PAYEE_CONST.TOASTER_MESSAGE.CREATE.SUCCESS);
          this.cancelAddPayeeModal();
        },
        error: () => {
          this.toasterMessageService.error(PAYEE_CONST.TOASTER_MESSAGE.CREATE.FAILED);
        },
      });
  }

  cancelAddPayeeModal(): void {
    this.showAddPayeeModel.set(false);
    this.payeeForm.reset({
      name: '',
      payeeCategory: '',
    });
  }

  onEditPayee(payee: IPAYEE): void {
    this.editPayee.set(payee);
    this.editForm.reset({
      name: payee.name,
      payeeCategory: payee.payeeCategory,
    });
    this.showEditPayeeModal.set(true);
  }

  confirmEditPayeeModal(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toasterMessageService.warning(PAYEE_CONST.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    const current = this.editPayee();
    if (!current || this.savingPayee()) {
      return;
    }

    const formValue = this.editForm.getRawValue();
    const body = {
      name: formValue.name.trim(),
      payeeCategory: formValue.payeeCategory,
    };

    this.savingPayee.set(true);

    this.apiService
      .patch(`${API_CONFIG.PAYEE.UPDATE}/${current.id}`, body)
      .pipe(
        finalize(() => {
          this.savingPayee.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const updatedBody = response?.body ?? response ?? {};

          const updated: IPAYEE = {
            id: current.id,
            name: updatedBody.name ?? body.name,
            payeeCategory: updatedBody.payeeCategory ?? body.payeeCategory,
          };

          this.payees.update((list) =>
            list.map((item) => (item.id === current.id ? updated : item)),
          );

          this.toasterMessageService.success(PAYEE_CONST.TOASTER_MESSAGE.UPDATE.SUCCESS);
          this.cancelEditPayeeModal();
        },
        error: () => {
          this.toasterMessageService.error(PAYEE_CONST.TOASTER_MESSAGE.UPDATE.FAILED);
        },
      });
  }

  cancelEditPayeeModal(): void {
    this.showEditPayeeModal.set(false);
    this.editPayee.set(null);
    this.editForm.reset({
      name: '',
      payeeCategory: '',
    });
  }

  onDeletePayee(payee: IPAYEE): void {
    this.deletePayee.set(payee);
    this.showDeletePayeeModal.set(true);
  }

  confirmDeletePayeeModal(): void {
    const current = this.deletePayee();
    if (!current || this.savingPayee()) {
      return;
    }

    this.savingPayee.set(true);

    this.apiService
      .delete(`${API_CONFIG.PAYEE.DELETE}/${current.id}`)
      .pipe(
        finalize(() => {
          this.savingPayee.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.payees.update((list) => list.filter((item) => item.id !== current.id));
          this.total.update((t) => Math.max(0, t - 1));

          this.toasterMessageService.success(PAYEE_CONST.TOASTER_MESSAGE.DELETE.SUCCESS);
          this.cancelDeletePayeeModal();
        },
        error: () => {
          this.toasterMessageService.error(PAYEE_CONST.TOASTER_MESSAGE.DELETE.FAILED);
        },
      });
  }

  cancelDeletePayeeModal(): void {
    this.showDeletePayeeModal.set(false);
    this.deletePayee.set(null);
  }

  get name_payeeForm() {
    return this.payeeForm.controls.name;
  }

  get payeeCategory_payeeForm() {
    return this.payeeForm.controls.payeeCategory;
  }

  get name_editForm() {
    return this.editForm.controls.name;
  }

  get payeeCategory_editForm() {
    return this.editForm.controls.payeeCategory;
  }
}
