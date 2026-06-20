import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Settings, UserPen } from 'lucide-angular';

@Component({
  selector: 'app-side-bar',
  imports: [RouterLink, LucideAngularModule],
  standalone: true,
  templateUrl: './side-bar.component.html',
  styleUrl: './side-bar.component.css',
})
export class SideBarComponent {
  settings = Settings;
  userPen = UserPen;
}
