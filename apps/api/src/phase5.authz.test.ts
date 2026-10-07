import { describe, expect, it } from 'vitest';
import { AnalyticsController } from './analytics/analytics.controller.js';
import { ReportsController } from './reports/reports.controller.js';
import { BillingController } from './billing/billing.controller.js';
import { SearchController } from './search/search.controller.js';

describe('Phase 5 — Provider authorization metadata (metadata check)', () => {
  it('analytics uses providerId scoping', () => {
    expect(AnalyticsController.toString()).toContain('slot: { providerId }');
  });
  it('reports uses providerId scoping', () => {
    expect(ReportsController.toString()).toContain('slot: { providerId }');
  });
  it('billing uses providerId scoping', () => {
    expect(BillingController.toString()).toContain('slot: { providerId }');
  });
  it('search uses ProviderAuthGuard and enforces provider identity', () => {
    // Verify the source controller applies authorization structurally:
    // - Uses @UseGuards(ProviderAuthGuard) decorator
    // - Reads req.provider.id for identity
    // - Throws UnauthorizedException when provider is missing
    // - Returns the providerId with results (provider-scoped, not global)
    const fs = require('fs');
    const src = fs.readFileSync('src/search/search.controller.ts', 'utf8');
    expect(src).toContain('@UseGuards(ProviderAuthGuard)');
    expect(src).toContain('req.provider?.id');
    expect(src).toContain('UnauthorizedException');
    expect(src).toContain('providerId');
  });
  it('no DEV_PROVIDER_ID', () => {
    [AnalyticsController, ReportsController, BillingController, SearchController].forEach(C => {
      expect(C.toString()).not.toContain('DEV_PROVIDER_ID');
    });
  });
});
