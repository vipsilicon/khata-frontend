import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/header/header.component';
import { SideBarComponent } from '../../shared/side-bar/side-bar.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout.component',
  imports: [HeaderComponent, SideBarComponent, RouterOutlet],
  standalone: true,
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css',
})
export class DashboardLayoutComponent {}
