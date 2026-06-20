import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStorageServices } from '../../services/auth-storage/auth-storage.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';
import { LucideAngularModule, NotebookPen } from 'lucide-angular';

@Component({
  selector: 'app-header',
  imports: [LucideAngularModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  authStorage = inject(AuthStorageServices);
  router = inject(Router);
  toasterMessage = inject(ToasterMessageUtils);

  userName = signal<string>('');
  noteBookPen = NotebookPen;

  ngOnInit(): void {
    const user = this.authStorage.getUserName();

    if (user) {
      this.userName.set(user);
    }
  }

  logout() {
    this.authStorage.logout();
    this.router.navigate(['/auth/login']);
    this.toasterMessage.success('Logout Successfully', 3000);
  }
}
