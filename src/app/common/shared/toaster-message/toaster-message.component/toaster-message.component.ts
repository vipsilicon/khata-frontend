import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToasterMessageUtils } from '../../../../utils/toaster-message/toaster-message.utils';

@Component({
  selector: 'app-toaster-message',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './toaster-message.component.html',
  styleUrl: './toaster-message.component.css',
})
export class ToasterMessageComponent {
  toaster = inject(ToasterMessageUtils);
}
