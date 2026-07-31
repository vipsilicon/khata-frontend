import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule, Plus } from 'lucide-angular';

@Component({
  selector: 'app-add-card',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './add-card.component.html',
  styleUrl: './add-card.component.css',
})
export class AddCardComponent {
  readonly plus = Plus;

  /** Label under the plus icon. Default: `Add`. */
  @Input() label = 'Add';

  @Output() add = new EventEmitter<void>();

  onClick(): void {
    this.add.emit();
  }
}
