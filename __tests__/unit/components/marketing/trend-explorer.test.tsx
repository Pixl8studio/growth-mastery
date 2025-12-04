/**
 * TrendExplorer Component Tests
 * Tests re-export of TrendExplorerEnhanced
 */

import { describe, it, expect } from "vitest";
import { TrendExplorer } from "@/components/marketing/trend-explorer";
import { TrendExplorerEnhanced } from "@/components/marketing/trend-explorer-enhanced";

describe("TrendExplorer", () => {
    it("should export TrendExplorerEnhanced component", () => {
        expect(TrendExplorer).toBe(TrendExplorerEnhanced);
    });

    it("should be a valid React component", () => {
        expect(typeof TrendExplorer).toBe("function");
    });
});
