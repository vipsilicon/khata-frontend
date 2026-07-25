import { Component, Input } from '@angular/core';
import { LucideIconData, LucideAngularModule } from 'lucide-angular';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-dash-card',
  standalone: true,
  imports: [LucideAngularModule, CurrencyPipe],
  templateUrl: './dash-card.component.html',
  styleUrl: './dash-card.component.css',
})
export class DashCardComponent {
  @Input() title!: string;
  @Input() icon!: LucideIconData;
  @Input() balance!: number;
}
