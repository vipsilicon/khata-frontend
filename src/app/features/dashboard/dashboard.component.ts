import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  LucideIconData,
  Menu,
  Landmark,
  PiggyBank,
  HandCoins,
  Wallet,
  ChartCandlestick,
} from 'lucide-angular';
import { DashCardComponent } from '../../components/dash-card/dash-card.component';
import { AgendaComponent } from '../../components/agenda/agenda.component';
import { DashChartComponent } from '../../components/dash-chart/dash-chart.component';

interface DashboardCard {
  id: number;
  title: string;
  icon: LucideIconData;
  balance: number;
}
@Component({
  selector: 'app-dashboard',
  imports: [
    LucideAngularModule,
    DashCardComponent,
    AgendaComponent,
    DashChartComponent,
    CommonModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  readonly menu = Menu;
  readonly landmark = Landmark;
  readonly piggyBank = PiggyBank;
  readonly handCoins = HandCoins;
  readonly wallet = Wallet;
  readonly chartCandlestick = ChartCandlestick;
  list = signal<DashboardCard[]>([
    {
      id: 1,
      title: 'Bank',
      icon: this.landmark,
      balance: 1000,
    },
    {
      id: 2,
      title: 'Cash',
      icon: this.wallet,
      balance: 2000,
    },
    {
      id: 3,
      title: 'Assets',
      icon: this.handCoins,
      balance: 3000,
    },
    {
      id: 4,
      title: 'Shares',
      icon: this.chartCandlestick,
      balance: 4000,
    },
    {
      id: 5,
      title: 'Loans',
      icon: this.piggyBank,
      balance: 0,
    },
  ]);
}
