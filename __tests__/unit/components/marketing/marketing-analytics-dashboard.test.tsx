/**
 * MarketingAnalyticsDashboard Component Tests
 * Tests basic analytics dashboard (re-exports enhanced version)
 */

import { describe, it, expect } from "vitest";
import { MarketingAnalyticsDashboard } from "@/components/marketing/marketing-analytics-dashboard";
import { MarketingAnalyticsDashboardEnhanced } from "@/components/marketing/marketing-analytics-dashboard-enhanced";

describe("MarketingAnalyticsDashboard", () => {
    it("should re-export MarketingAnalyticsDashboardEnhanced", () => {
        expect(MarketingAnalyticsDashboard).toBe(MarketingAnalyticsDashboardEnhanced);
    });
});
