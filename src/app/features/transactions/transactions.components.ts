import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

import { TransactionAnalysisComponent } from './transaction-analysis/transaction-analysis.component';
import { TransactionPassbookComponent } from './transaction-passbook/transaction-passbook.component';

type TransactionTab = 'passbook' | 'analysis';

@Component({
  selector: 'app-transactions.components',
  imports: [CommonModule, TransactionPassbookComponent, TransactionAnalysisComponent],
  templateUrl: './transactions.components.html',
  styleUrl: './transactions.components.css',
})
export class TransactionsComponents {
  readonly selectedTab = signal<TransactionTab>('passbook');

  selectTab(tab: TransactionTab): void {
    this.selectedTab.set(tab);
  }
}
