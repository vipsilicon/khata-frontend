import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

import { PayeeAnalysisComponent } from './payee-analysis/payee-analysis.component';
import { PayeePassbookComponent } from './payee-passbook/payee-passbook.component';

type PayeeTab = 'passbook' | 'analysis';

@Component({
  selector: 'app-payee.component',
  imports: [CommonModule, PayeePassbookComponent, PayeeAnalysisComponent],
  templateUrl: './payee.component.html',
  styleUrl: './payee.component.css',
})
export class PayeeComponent {
  readonly selectedTab = signal<PayeeTab>('passbook');

  selectTab(tab: PayeeTab): void {
    this.selectedTab.set(tab);
  }
}
