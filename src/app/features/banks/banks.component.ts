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

// Services
import { ApiServices } from '../../services/api/api.services';

// Config
import { API_CONFIG } from '../../core/config/api.config';
import { ROUTES_CONST } from '../../core/constants/routes.constants';

interface Bank {
  id: number;
  name: string;
  code: string;
  icon: string | null;
  initialAmount: number;
  balance: number;
}
@Component({
  selector: 'app-banks.component',
  imports: [LucideAngularModule, CommonModule],
  templateUrl: './banks.component.html',
  styleUrl: './banks.component.css',
})
export class BanksComponent implements OnInit {
  private apiService = inject(ApiServices);

  chevronLeftIcon = ChevronLeft;
  chevronRightIcon = ChevronRight;
  plus = Plus;
  squarePen = SquarePen;
  trash = Trash2;

  loading = signal<boolean>(true);

  showAddBankModal = signal<boolean>(false);

  banks = signal<Bank[]>([]);

  bankList = signal<string[]>(['State bank of india']);

  ngOnInit(): void {
    this.loadUserBanks();

    this.loadBankLists();
  }

  loadBankLists(): void {
    this.apiService
      .get(`${API_CONFIG.BANK.LIST}`, { page: 1, limit: 10 })
      .pipe(finalize(() => {}))
      .subscribe({
        next: (response: any) => {
          console.log(response);
        },
        error: (error) => {
          console.log(error);
        },
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
        error: (error) => {
          console.log(error);
        },
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

  addBank() {
    console.log('Add bank');
  }

  closedModal() {
    this.showAddBankModal.set(false);
  }

  savedModal() {
    this.showAddBankModal.set(false);
  }
}
