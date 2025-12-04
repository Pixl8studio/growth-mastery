/**
 * MarketingSettings Component Tests
 * Tests basic marketing settings (re-exports enhanced version)
 */

import { describe, it, expect } from "vitest";
import { MarketingSettings } from "@/components/marketing/marketing-settings";
import { MarketingSettingsEnhanced } from "@/components/marketing/marketing-settings-enhanced";

describe("MarketingSettings", () => {
    it("should re-export MarketingSettingsEnhanced", () => {
        expect(MarketingSettings).toBe(MarketingSettingsEnhanced);
    });
});
