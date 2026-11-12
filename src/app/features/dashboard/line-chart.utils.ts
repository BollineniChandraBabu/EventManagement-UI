import type { ChartConfiguration, ScriptableContext } from 'chart.js';

/** One plotted line: a name plus its labelled points. */
export interface LineChartSeries {
  name: string;
  series: Array<{ name: string; value: number }>;
}

export type LineChartData = LineChartSeries[];

/** Palette read from the active theme's CSS custom properties. */
export interface ChartTokens {
  sent: string;
  sentSoft: string;
  failed: string;
  failedSoft: string;
  grid: string;
  axis: string;
  legend: string;
  point: string;
  tooltipBg: string;
  tooltipFg: string;
  tooltipBorder: string;
}

/** Used when a token is missing (e.g. a host rendered before styles load). */
export const CHART_TOKEN_FALLBACKS: ChartTokens = {
  sent: '#0d9488',
  sentSoft: 'rgba(13,148,136,.22)',
  failed: '#dc2626',
  failedSoft: 'rgba(220,38,38,.18)',
  grid: '#e2e8f2',
  axis: '#94a3b8',
  legend: '#475569',
  point: '#ffffff',
  tooltipBg: '#0f172a',
  tooltipFg: '#f8fafc',
  tooltipBorder: 'rgba(148,163,184,.35)'
};

const TOKEN_NAMES: Record<keyof ChartTokens, string> = {
  sent: '--chart-sent',
  sentSoft: '--chart-sent-soft',
  failed: '--chart-failed',
  failedSoft: '--chart-failed-soft',
  grid: '--chart-grid',
  axis: '--chart-axis',
  legend: '--chart-legend',
  point: '--chart-point',
  tooltipBg: '--chart-tooltip-bg',
  tooltipFg: '--chart-tooltip-fg',
  tooltipBorder: '--chart-tooltip-border'
};

/** The theme palette, falling back per token so a chart never renders unstyled. */
export function readChartTokens(element: HTMLElement): ChartTokens {
  const computed = getComputedStyle(element);
  const read = (key: keyof ChartTokens): string =>
    computed.getPropertyValue(TOKEN_NAMES[key]).trim() || CHART_TOKEN_FALLBACKS[key];

  return {
    sent: read('sent'),
    sentSoft: read('sentSoft'),
    failed: read('failed'),
    failedSoft: read('failedSoft'),
    grid: read('grid'),
    axis: read('axis'),
    legend: read('legend'),
    point: read('point'),
    tooltipBg: read('tooltipBg'),
    tooltipFg: read('tooltipFg'),
    tooltipBorder: read('tooltipBorder')
  };
}

/** Above this many points the markers are dropped so the line stays legible. */
const MARKER_LIMIT = 14;

/**
 * A rounded top bound so a busy day does not sit flush against the axis. Small volumes
 * keep a floor of 5 so a single failed mail is not drawn as a full-height spike.
 */
export function chartYAxisMax(chartData: LineChartData): number {
  const maxDataPoint = (chartData ?? [])
    .flatMap((series) => series.series)
    .reduce((max, point) => Math.max(max, point.value ?? 0), 0);

  if (maxDataPoint <= 5) {
    return 5;
  }

  return Math.ceil(maxDataPoint * 1.1);
}

/** Fades the series colour into the plot area; falls back to the flat colour pre-layout. */
function areaGradient(context: ScriptableContext<'line'>, color: string): CanvasGradient | string {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) {
    return color;
  }

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  return gradient;
}

export interface LineChartOptions {
  /** Disables entrance animation, for users who ask for reduced motion. */
  reducedMotion?: boolean;
}

/**
 * Builds the Chart.js configuration for a themed, animated line chart. Pure, so the
 * dataset mapping and axis maths can be unit tested without a canvas.
 */
export function buildLineChartConfig(
  chartData: LineChartData | null | undefined,
  tokens: ChartTokens,
  options: LineChartOptions = {}
): ChartConfiguration<'line', number[], string> {
  const safeData = chartData ?? [];
  const labels = safeData[0]?.series.map((point) => point.name) ?? [];
  const colors = [tokens.sent, tokens.failed];
  const softs = [tokens.sentSoft, tokens.failedSoft];
  const showMarkers = labels.length > 0 && labels.length <= MARKER_LIMIT;

  const datasets = safeData.map((series, index) => {
    const color = colors[index % colors.length];
    const soft = softs[index % softs.length];

    return {
      label: series.name,
      data: series.series.map((point) => point.value),
      borderColor: color,
      backgroundColor: (context: ScriptableContext<'line'>) => areaGradient(context, soft),
      fill: true,
      tension: 0.35,
      borderWidth: 3,
      pointRadius: showMarkers ? 3 : 0,
      pointHoverRadius: 6,
      pointHitRadius: 18,
      pointBackgroundColor: tokens.point,
      pointBorderColor: color,
      pointBorderWidth: 2,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: tokens.point
    };
  });

  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: options.reducedMotion ? false : { duration: 850, easing: 'easeOutQuart' },
      layout: { padding: { top: 8, right: 10, bottom: 0, left: 0 } },
      plugins: {
        legend: {
          display: datasets.length > 0,
          position: 'bottom',
          labels: {
            color: tokens.legend,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            boxHeight: 8,
            padding: 16,
            font: { size: 12, weight: 600 }
          }
        },
        tooltip: {
          backgroundColor: tokens.tooltipBg,
          titleColor: tokens.tooltipFg,
          bodyColor: tokens.tooltipFg,
          borderColor: tokens.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          usePointStyle: true,
          boxPadding: 6,
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ${item.formattedValue}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: tokens.grid },
          ticks: {
            color: tokens.axis,
            maxRotation: 0,
            autoSkip: true,
            autoSkipPadding: 18,
            font: { size: 11 }
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: chartYAxisMax(safeData),
          grid: { color: tokens.grid, drawTicks: false },
          border: { display: false },
          ticks: { color: tokens.axis, precision: 0, maxTicksLimit: 6, font: { size: 11 } }
        }
      }
    }
  };
}
