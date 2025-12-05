/**
 * ContentCalendar Component Tests
 * Tests basic calendar view functionality (re-exports enhanced version)
 */

import { describe, it, expect } from "vitest";
import { ContentCalendar } from "@/components/marketing/content-calendar";
import { ContentCalendarEnhanced } from "@/components/marketing/content-calendar-enhanced";

describe("ContentCalendar", () => {
    it("should re-export ContentCalendarEnhanced", () => {
        expect(ContentCalendar).toBe(ContentCalendarEnhanced);
    });
});
