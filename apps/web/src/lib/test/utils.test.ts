import { describe, it, expect } from "vitest";
import { deriveDashboardMetrics } from "@chronos/mock-data/utils";

describe("deriveDashboardMetrics", () => {
  it("derives total, percent change, today count, value, paid count, occupancy, busy duration", () => {
    const metrics = deriveDashboardMetrics([] as any);
    expect(typeof metrics.total).toBe("number");
    expect(typeof metrics.percentChange).toBe("number");
    expect(typeof metrics.todayCount).toBe("number");
    expect(typeof metrics.estimatedValue).toBe("number");
    expect(typeof metrics.paidCount).toBe("number");
    expect(typeof metrics.occupancy).toBe("number");
    expect(typeof metrics.busyDuration).toBe("number");
  });
});
