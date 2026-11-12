import {
  CHART_TOKEN_FALLBACKS,
  buildLineChartConfig,
  chartYAxisMax
} from './line-chart.utils';

const data = [
  { name: 'Sent', series: [{ name: 'Nov 1', value: 3 }, { name: 'Nov 2', value: 9 }] },
  { name: 'Failed', series: [{ name: 'Nov 1', value: 1 }, { name: 'Nov 2', value: 0 }] }
];

describe('chartYAxisMax', () => {
  it('keeps a floor of 5 so small volumes are not drawn as full spikes', () => {
    expect(chartYAxisMax([{ name: 'Sent', series: [{ name: 'd', value: 2 }] }])).toBe(5);
  });

  it('rounds a busy series up past the peak', () => {
    expect(chartYAxisMax([{ name: 'Sent', series: [{ name: 'd', value: 42 }] }])).toBe(47);
  });

  it('ignores null or missing series', () => {
    expect(chartYAxisMax(null as unknown as [])).toBe(5);
  });
});

describe('buildLineChartConfig', () => {
  it('maps each series onto a labelled dataset', () => {
    const config = buildLineChartConfig(data, CHART_TOKEN_FALLBACKS);

    expect(config.data.labels).toEqual(['Nov 1', 'Nov 2']);
    expect(config.data.datasets.map((dataset) => dataset.label)).toEqual(['Sent', 'Failed']);
    expect(config.data.datasets[0].data).toEqual([3, 9]);
    expect(config.data.datasets[1].data).toEqual([1, 0]);
  });

  it('paints the first series with the sent token and the second with failed', () => {
    const config = buildLineChartConfig(data, CHART_TOKEN_FALLBACKS);

    expect(config.data.datasets[0].borderColor).toBe(CHART_TOKEN_FALLBACKS.sent);
    expect(config.data.datasets[1].borderColor).toBe(CHART_TOKEN_FALLBACKS.failed);
  });

  it('uses a shared index tooltip and no x gridlines', () => {
    const config = buildLineChartConfig(data, CHART_TOKEN_FALLBACKS);
    const scales = config.options?.scales as Record<string, any> | undefined;

    expect(config.options?.interaction?.mode).toBe('index');
    expect(scales?.['x']?.grid?.display).toBe(false);
    expect(scales?.['y']?.beginAtZero).toBe(true);
  });

  it('disables animation when reduced motion is requested', () => {
    const config = buildLineChartConfig(data, CHART_TOKEN_FALLBACKS, { reducedMotion: true });

    expect(config.options?.animation).toBe(false);
  });

  it('handles an empty dataset without throwing', () => {
    const config = buildLineChartConfig(null, CHART_TOKEN_FALLBACKS);
    const plugins = config.options?.plugins as Record<string, any> | undefined;

    expect(config.data.labels).toEqual([]);
    expect(config.data.datasets).toEqual([]);
    expect(plugins?.['legend']?.display).toBe(false);
  });

  it('hides point markers when there are too many labels to draw them cleanly', () => {
    const wide = [
      {
        name: 'Sent',
        series: Array.from({ length: 40 }, (_, index) => ({ name: `d${index}`, value: index }))
      }
    ];
    const config = buildLineChartConfig(wide, CHART_TOKEN_FALLBACKS);

    expect(config.data.datasets[0].pointRadius).toBe(0);
  });
});
