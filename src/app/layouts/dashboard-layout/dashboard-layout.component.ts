import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
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
  private apiService = inject(ApiServices);
  private authStorageService = inject(AuthStorageServices);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Skip on SSR (no localStorage) and when not logged in — avoids 401 → false logout
    if (!isPlatformBrowser(this.platformId) || !this.authStorageService.isLoggedIn()) {
      return;
    }

    this.apiService.get(`${API_CONFIG.PROFILE.FETCH}`, {}).subscribe({
      next: () => {},
      error: () => {
        // Profile load failure must not clear session (interceptor handles real 401)
      },
    });
  }
}
