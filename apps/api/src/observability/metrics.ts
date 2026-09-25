/**
 * Metrics collector — Phase 8 (§395)
 * Prometheus-style counters for booking_conflicts_total, booking_latency,
 * materializer_lag, reminder_lag.
 */
type Counter = {
  inc: (value?: number) => void;
};

type Gauge = {
  set: (value: number) => void;
  dec?: () => void;
  inc?: () => void;
};

class Metrics {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();

  counter(name: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, {
        inc: (value = 1) => {
          // In real implementation, this would push to Prometheus
          console.log(`METRIC ${name}+=${value} ` + new Date().toISOString());
        },
      });
    }
    return this.counters.get(name)!;
  }

  gauge(name: string): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, {
        set: (value) => {
          console.log(`METRIC ${name}=${value} ` + new Date().toISOString());
        },
      });
    }
    return this.gauges.get(name)!;
  }
}

export const metrics = new Metrics();

// Required Phase 8 metrics
export const bookingConflictsTotal = metrics.counter('booking_conflicts_total');
export const bookingLatency = metrics.gauge('booking_latency_seconds');
export const materializerLag = metrics.gauge('materializer_lag_seconds');
export const reminderLag = metrics.gauge('reminder_lag_seconds');