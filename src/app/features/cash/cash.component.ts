import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

// Child tabs
import { CashAnalysisComponent } from './cash-analysis/cash-analysis.component';
import { CashPassbookComponent } from './cash-passbook/cash-passbook.component';

type CashTab = 'passbook' | 'analysis';

@Component({
  selector: 'app-cash.component',
  imports: [CommonModule, CashPassbookComponent, CashAnalysisComponent],
  templateUrl: './cash.component.html',
  styleUrl: './cash.component.css',
})
export class CashComponent {
  readonly selectedTab = signal<CashTab>('passbook');
  readonly balance = signal(0);

  selectTab(tab: CashTab): void {
    this.selectedTab.set(tab);
  }

  onBalanceChange(balance: number): void {
    this.balance.set(balance);
  }
}
