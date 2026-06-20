import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToasterMessageComponent } from './common/shared/toaster-message/toaster-message.component/toaster-message.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToasterMessageComponent],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('khata-frontend');
}
