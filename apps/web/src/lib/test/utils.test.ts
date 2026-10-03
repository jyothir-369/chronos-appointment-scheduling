import { describe, it, expect } from "vitest";
import { deriveDashboardMetrics, AGGREGATES } from "@chronos/mock-data/utils";

describe("dashboard metrics", () => {
  it("matches exact seed aggregates", () => {
    const m = deriveDashboardMetrics();
    expect(m.total).toBe(142);
    expect(m.previousMonthTotal).toBe(124);
    expect(m.percentChange).toBe(14.5);
    expect(m.todayCount).toBe(2);
    expect(m.estimatedValue).toBe(4850);
    expect(m.paidCount).toBe(30);
    expect(m.occupancy).toBe(88);
  });
});
