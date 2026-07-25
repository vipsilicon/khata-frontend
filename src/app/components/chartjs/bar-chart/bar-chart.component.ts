import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import {
  Chart,
  registerables,
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
export class BarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('barChartCanvas', { static: true })
  barChartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() title: string = 'title';
  @Input({ required: true }) data!: ChartData;
  @Input()
  options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  chart?: Chart;
  type: ChartType = 'bar';

  ngAfterViewInit(): void {
    // Chart.js needs a real canvas context — not available during SSR
    if (this.isBrowser) {
      this.createChart();
    }
  }

  ngOnChanges(): void {
    if (!this.isBrowser || !this.chart || !this.data) {
      return;
    }

    this.chart.data = this.data;
    this.chart.options = this.options;
    this.chart.update();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private createChart(): void {
    const canvas = this.barChartCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    // Node/SSR canvas polyfill does not implement getContext
    if (typeof canvas.getContext !== 'function') {
      return;
    }

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: this.type,
      data: this.data,
      options: this.options,
    });
  }
}
