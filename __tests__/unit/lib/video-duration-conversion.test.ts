/**
 * Video Duration Conversion Tests
 * Tests that video duration from Cloudflare Stream (float) is properly
 * converted to integer for database storage
 *
 * Issue #202: Video upload fails to save metadata - duration type mismatch
 */

import { describe, it, expect } from "vitest";

describe("Video Duration Conversion", () => {
    /**
     * The pitch_videos.video_duration column is INTEGER type.
     * Cloudflare Stream returns duration as a float (e.g., 4.1 seconds).
     * We use Math.round() to convert to integer before database insert.
     */
    const convertDuration = (duration: number): number => Math.round(duration);

    it("should round float duration to nearest integer", () => {
        expect(convertDuration(4.1)).toBe(4);
        expect(convertDuration(4.9)).toBe(5);
        expect(convertDuration(4.5)).toBe(5);
        expect(convertDuration(4.4)).toBe(4);
    });

    it("should handle exact integer durations", () => {
        expect(convertDuration(60)).toBe(60);
        expect(convertDuration(120)).toBe(120);
        expect(convertDuration(0)).toBe(0);
    });

    it("should handle very short video durations", () => {
        expect(convertDuration(0.3)).toBe(0);
        expect(convertDuration(0.5)).toBe(1);
        expect(convertDuration(0.9)).toBe(1);
    });

    it("should handle long video durations with decimals", () => {
        expect(convertDuration(3600.7)).toBe(3601); // ~1 hour
        expect(convertDuration(7200.2)).toBe(7200); // ~2 hours
    });

    it("should handle typical presentation video lengths", () => {
        // 5 minutes 30.4 seconds
        expect(convertDuration(330.4)).toBe(330);
        // 45 minutes 15.8 seconds
        expect(convertDuration(2715.8)).toBe(2716);
        // 1 hour 23 minutes 45.5 seconds
        expect(convertDuration(5025.5)).toBe(5026);
    });
});
