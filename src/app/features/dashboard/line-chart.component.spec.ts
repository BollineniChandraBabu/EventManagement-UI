import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import { LineChartComponent } from './line-chart.component';

const data = [
  { name: 'Sent', series: [{ name: 'Nov 1', value: 4 }, { name: 'Nov 2', value: 11 }] },
  { name: 'Failed', series: [{ name: 'Nov 1', value: 2 }, { name: 'Nov 2', value: 1 }] }
];

describe('LineChartComponent', () => {
  let fixture: ComponentFixture<LineChartComponent>;

  function createComponent(): LineChartComponent {
    fixture = TestBed.createComponent(LineChartComponent);
    fixture.componentRef.setInput('chartData', data);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LineChartComponent] }).compileComponents();
  });

  afterEach(() => {
    // Destroying the component must release the Chart.js instance it owns.
    fixture?.destroy();
  });

  it('renders a canvas and registers a Chart.js instance on it', () => {
    const component = createComponent();
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

    expect(canvas).toBeTruthy();
    const chart = Chart.getChart(canvas);
    expect(chart).toBeTruthy();
    expect(chart?.data.datasets.length).toBe(2);
    expect(chart?.data.datasets[0].data).toEqual([4, 11]);
    expect(component).toBeTruthy();
  });

  it('updates the existing chart instance when the data changes', () => {
    createComponent();
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const chart = Chart.getChart(canvas);

    fixture.componentRef.setInput('chartData', [
      { name: 'Sent', series: [{ name: 'Nov 3', value: 7 }] }
    ]);
    fixture.detectChanges();

    // Same instance, new data — so updates animate instead of a full teardown.
    expect(Chart.getChart(canvas)).toBe(chart);
    expect(chart?.data.labels).toEqual(['Nov 3']);
    expect(chart?.data.datasets[0].data).toEqual([7]);
  });

  it('destroys the chart instance when the component is destroyed', () => {
    createComponent();
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

    fixture.destroy();

    expect(Chart.getChart(canvas)).toBeUndefined();
  });
});
