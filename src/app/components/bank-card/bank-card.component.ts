import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule, SquarePen, Trash2 } from 'lucide-angular';

export interface BankCardData {
  id: number;
  name: string;
  code: string;
  icon: string | null;
  initialAmount: number;
  balance: number;
}

@Component({
  selector: 'app-bank-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './bank-card.component.html',
  styleUrl: './bank-card.component.css',
})
export class BankCardComponent {
  readonly squarePen = SquarePen;
  readonly trash = Trash2;

  @Input({ required: true }) bank!: BankCardData;

  @Output() edit = new EventEmitter<BankCardData>();
  @Output() delete = new EventEmitter<BankCardData>();

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.bank);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.bank);
  }
}
