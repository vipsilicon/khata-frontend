import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { BankCardData } from '../../../components/bank-card/bank-card.component';

export type BankAccount = BankCardData;

@Component({
  selector: 'app-bank-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bank-analysis.component.html',
  styleUrl: './bank-analysis.component.css',
})
export class BankAnalysisComponent {
  /** Multiple user bank accounts — analysis is scoped per bank. */
  readonly banks = input<BankAccount[]>([]);
  readonly selectedUserBankId = input<number | null>(null);

  readonly selectBank = output<BankAccount>();

  onSelectBank(bank: BankAccount): void {
    this.selectBank.emit(bank);
  }
}
