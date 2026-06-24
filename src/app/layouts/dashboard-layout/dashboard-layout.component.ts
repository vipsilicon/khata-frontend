import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Components
import { HeaderComponent } from '../../shared/header/header.component';
import { SideBarComponent } from '../../shared/side-bar/side-bar.component';

// Services
import { ApiServices } from '../../services/api/api.services';
import { AuthStorageServices } from '../../services/auth-storage/auth-storage.services';

// Configs
import { API_CONFIG } from '../../core/config/api.config';
@Component({
  selector: 'app-dashboard-layout.component',
  imports: [HeaderComponent, SideBarComponent, RouterOutlet],
  standalone: true,
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent implements OnInit {
  apiService = inject(ApiServices);
  authStorageService = inject(AuthStorageServices);
  ngOnInit(): void {
    this.apiService.get(`${API_CONFIG.PROFILE.FETCH}`, {}).subscribe({
      next: (user) => {},
      error: (err) => {
        console.error(err);
      },
    });
  }
}
