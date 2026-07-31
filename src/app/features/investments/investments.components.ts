import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

import { InvestmentAnalysisComponent } from './investment-analysis/investment-analysis.component';
import { InvestmentPassbookComponent } from './investment-passbook/investment-passbook.component';

type InvestmentTab = 'passbook' | 'analysis';

@Component({
  selector: 'app-investments.components',
  imports: [CommonModule, InvestmentPassbookComponent, InvestmentAnalysisComponent],
  templateUrl: './investments.components.html',
  styleUrl: './investments.components.css',
})
export class InvestmentsComponents {
  readonly selectedTab = signal<InvestmentTab>('passbook');

  selectTab(tab: InvestmentTab): void {
    this.selectedTab.set(tab);
  }
}
