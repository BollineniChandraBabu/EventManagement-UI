import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { LineChartData, buildLineChartConfig, readChartTokens } from './line-chart.utils';

// Registered once; Chart.js is tree-shaken to only the pieces a line chart needs.
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Legend,
  Tooltip
);

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="line-chart-host"><canvas #chartCanvas role="img" [attr.aria-label]="ariaLabel"></canvas></div>',
  styleUrl: './line-chart.component.css'
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) chartData: LineChartData | null = null;
  @Input() ariaLabel = 'Line chart';

  @ViewChild('chartCanvas', { static: true })
  private readonly chartCanvas?: ElementRef<HTMLCanvasElement>;

  private chart: Chart<'line', number[], string> | null = null;
  private viewInitialized = false;
  private readonly themeObserver = new MutationObserver(() => this.renderChart());
  private readonly motionQuery =
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCED_MOTION_QUERY) : null;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();

    // Repaint with the new palette when the theme (data-theme on <html>) or the
    // OS motion preference changes. Both are external to Angular's change detection.
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    this.motionQuery?.addEventListener('change', this.onMotionChange);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData']) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.themeObserver.disconnect();
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    this.chart?.destroy();
    this.chart = null;
  }

  private readonly onMotionChange = (): void => this.renderChart();

  private renderChart(): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!this.viewInitialized || !canvas) {
      return;
    }

    const tokens = readChartTokens(canvas);
    const config = buildLineChartConfig(this.chartData, tokens, {
      reducedMotion: this.motionQuery?.matches ?? false
    });

    if (!this.chart) {
      this.chart = new Chart(canvas, config);
      return;
    }

    // Reuse the instance so data updates animate from the previous values.
    this.chart.data = config.data;
    if (config.options) {
      this.chart.options = config.options;
    }
    this.chart.update();
  }
}
