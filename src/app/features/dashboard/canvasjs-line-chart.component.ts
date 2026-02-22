import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';

type LineChartData = Array<{ name: string; series: Array<{ name: string; value: number }> }>;

declare global {
  interface Window {
    CanvasJS?: {
      Chart: new (container: HTMLElement, options: Record<string, unknown>) => {
        render: () => void;
        destroy: () => void;
      };
    };
  }
}

@Component({
  selector: 'app-canvasjs-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: '<div #chartContainer class="canvasjs-host"></div>',
  styleUrl: './canvasjs-line-chart.component.css'
})
export class CanvasJsLineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) chartData: LineChartData | null = null;

  @ViewChild('chartContainer', { static: true })
  private readonly chartContainer?: ElementRef<HTMLElement>;

  private chartInstance: { render: () => void; destroy: () => void } | null = null;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['chartData']) {
      return;
    }

    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
    this.chartInstance = null;
  }

  private renderChart(): void {
    if (!this.viewInitialized || !this.chartContainer?.nativeElement) {
      return;
    }

    const canvasJs = window.CanvasJS;
    if (!canvasJs) {
      return;
    }

    const safeData = this.chartData ?? [];
    const yAxisMax = this.chartYAxisMax(safeData);

    const options = {
      animationEnabled: true,
      backgroundColor: 'transparent',
      axisX: {
        labelAngle: -25,
        interval: 1
      },
      axisY: {
        title: 'Emails',
        minimum: 0,
        maximum: yAxisMax,
        gridColor: '#e5e7eb'
      },
      legend: {
        horizontalAlign: 'center',
        verticalAlign: 'bottom'
      },
      toolTip: {
        shared: true
      },
      data: safeData.map((series, index) => ({
        type: 'line',
        showInLegend: true,
        name: series.name,
        lineThickness: 3,
        markerSize: 6,
        color: index === 0 ? '#14b8a6' : '#ef4444',
        dataPoints: series.series.map((point) => ({ label: point.name, y: point.value }))
      }))
    };

    this.chartInstance?.destroy();
    this.chartInstance = new canvasJs.Chart(this.chartContainer.nativeElement, options);
    this.chartInstance.render();
  }

  private chartYAxisMax(chartData: LineChartData): number {
    const maxDataPoint = chartData
      .flatMap((series) => series.series)
      .reduce((max, point) => Math.max(max, point.value ?? 0), 0);

    if (maxDataPoint <= 5) {
      return 5;
    }

    return Math.ceil(maxDataPoint * 1.1);
  }
}
