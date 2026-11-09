import { deliveryHealth } from './dashboard.utils';

describe('deliveryHealth', () => {
  it('reports a perfect rate when no mail was attempted', () => {
    expect(deliveryHealth({ emailsSentToday: 0, failedEmails: 0 })).toEqual({
      rate: 100,
      tone: 'good',
      label: '100% delivered'
    });
  });

  it('treats a null payload as an idle, healthy day', () => {
    expect(deliveryHealth(null).rate).toBe(100);
  });

  it('rounds the delivered share of the attempted mail', () => {
    expect(deliveryHealth({ emailsSentToday: 95, failedEmails: 5 }).rate).toBe(95);
  });

  it('flags a warn rate below the good threshold', () => {
    expect(deliveryHealth({ emailsSentToday: 92, failedEmails: 8 }).tone).toBe('warn');
  });

  it('flags a bad rate when most mail failed', () => {
    const health = deliveryHealth({ emailsSentToday: 20, failedEmails: 80 });
    expect(health.tone).toBe('bad');
    expect(health.label).toBe('20% delivered');
  });
});
