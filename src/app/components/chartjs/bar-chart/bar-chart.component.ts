import { AfterViewInit, Component, ViewChild, ElementRef, Input, OnChanges } from '@angular/core';
import {
  Chart,
  registerables,
  ChartConfiguration,
  ChartType,
  ChartOptions,
  ChartData,
} from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-bar-chart',
  imports: [],
  standalone: true,
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.css',
})
export class BarChartComponent implements AfterViewInit, OnChanges {
  @ViewChild('barChartCanvas', { static: true }) barChartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() title: string = 'title';
  @Input({ required: true }) data!: ChartData;
  @Input()
  options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  chart!: Chart;
  type: ChartType = 'bar';

  ngOnChanges(): void {}

  ngAfterViewInit(): void {
    this.createChart();
  }

  private createChart(): void {
    this.chart = new Chart(this.barChartCanvas.nativeElement, {
      type: this.type,
      data: this.data,
      options: this.options,
    });
  }
}
