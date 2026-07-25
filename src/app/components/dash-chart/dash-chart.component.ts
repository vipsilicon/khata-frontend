import { Component } from '@angular/core';
import { BarChartComponent } from '../chartjs/bar-chart/bar-chart.component';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dash-chart',
  imports: [BarChartComponent],
  standalone: true,
  templateUrl: './dash-chart.component.html',
  styleUrl: './dash-chart.component.css',
})
export class DashChartComponent {
  title: string = 'Monthly Income2';

  incomeChart: ChartData<'bar'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Income',
        data: [12000, 18000, 15000, 25000, 21000, 30000, 28000, 32000, 29000, 35000, 31000, 40000],
        backgroundColor: '#06b6d4',
        borderRadius: 8,
      },
    ],
  };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
  };
}
