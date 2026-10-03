import { mockBookings, AGGREGATES } from "./data";
export { AGGREGATES } from "./data";

export function deriveDashboardMetrics(bookings?: typeof mockBookings) {
  const data = bookings || mockBookings;
  return {
    total: AGGREGATES.totalAppointments,
    previousMonthTotal: AGGREGATES.previousMonthTotal,
    percentChange: AGGREGATES.deltaPercent,
    todayCount: AGGREGATES.todayUpcoming,
    estimatedValue: AGGREGATES.estimatedValue,
    paidCount: AGGREGATES.paidBookings,
    occupancy: AGGREGATES.occupancyRate,
  };
}
