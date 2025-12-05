/**
 * CountdownDealBanner Component Tests
 * Tests deal timing, countdown logic, variant styling, and deal switching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CountdownDealBanner } from "@/components/public/countdown-deal-banner";

describe("CountdownDealBanner", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should not render when no active deal", () => {
        // Set date after all deals expire
        vi.setSystemTime(new Date("2026-01-01"));

        const { container } = render(<CountdownDealBanner />);
        expect(container.firstChild).toBeNull();
    });

    it("should render first deal when active", () => {
        // Set date during first deal period
        vi.setSystemTime(new Date("2025-11-01"));

        render(<CountdownDealBanner />);

        waitFor(() => {
            expect(screen.getByText(/Save \$2,000 Today!/)).toBeInTheDocument();
            expect(screen.getByText("PRELAUNCH2000")).toBeInTheDocument();
        });
    });

    it("should render second deal when active", () => {
        // Set date during second deal period (after first expires)
        vi.setSystemTime(new Date("2025-11-15"));

        render(<CountdownDealBanner />);

        waitFor(() => {
            expect(screen.getByText(/Save \$1,500 Today!/)).toBeInTheDocument();
            expect(screen.getByText("PRELAUNCH1500")).toBeInTheDocument();
        });
    });

    it("should display countdown timer", () => {
        vi.setSystemTime(new Date("2025-11-01"));

        render(<CountdownDealBanner />);

        waitFor(() => {
            expect(screen.getByText("Days : Hours : Mins : Secs")).toBeInTheDocument();
        });
    });

    it("should update countdown every second", async () => {
        vi.setSystemTime(new Date("2025-11-08T23:59:00"));

        render(<CountdownDealBanner />);

        // Initial state
        await waitFor(() => {
            expect(screen.getByText(/00.*00.*59/)).toBeInTheDocument();
        });

        // Advance 1 second
        vi.advanceTimersByTime(1000);

        await waitFor(() => {
            expect(screen.getByText(/00.*00.*58/)).toBeInTheDocument();
        });
    });

    it("should show expiring soon warning when less than 24 hours", () => {
        vi.setSystemTime(new Date("2025-11-08T23:00:00"));

        render(<CountdownDealBanner />);

        waitFor(() => {
            expect(screen.getByText(/⏰ Deal ends soon/)).toBeInTheDocument();
        });
    });

    it("should apply light variant styling", () => {
        vi.setSystemTime(new Date("2025-11-01"));

        const { container } = render(<CountdownDealBanner variant="light" />);

        waitFor(() => {
            const banner = container.querySelector("div[class*='bg-gradient']");
            expect(banner).toBeInTheDocument();
        });
    });

    it("should apply dark variant styling", () => {
        vi.setSystemTime(new Date("2025-11-01"));

        const { container } = render(<CountdownDealBanner variant="dark" />);

        waitFor(() => {
            const banner = container.querySelector("div[class*='backdrop-blur']");
            expect(banner).toBeInTheDocument();
        });
    });

    it("should pad time values with leading zeros", () => {
        vi.setSystemTime(new Date("2025-11-08T23:59:59"));

        render(<CountdownDealBanner />);

        waitFor(() => {
            // Should display "00:00:00:01" or similar with padding
            const timeElements = screen.getAllByText(/^\d{2}$/);
            expect(timeElements.length).toBeGreaterThan(0);
        });
    });

    it("should not render until mounted (SSR protection)", () => {
        vi.setSystemTime(new Date("2025-11-01"));

        const { container } = render(<CountdownDealBanner />);

        // Initially should not render (before mount effect)
        expect(container.firstChild).toBeNull();
    });

    it("should display PRE-LAUNCH SPECIAL badge", () => {
        vi.setSystemTime(new Date("2025-11-01"));

        render(<CountdownDealBanner />);

        waitFor(() => {
            expect(screen.getByText(/🎉 PRE-LAUNCH SPECIAL/)).toBeInTheDocument();
        });
    });

    it("should display use code at checkout message", () => {
        vi.setSystemTime(new Date("2025-11-01"));

        render(<CountdownDealBanner />);

        waitFor(() => {
            expect(screen.getByText(/Use code.*at checkout/)).toBeInTheDocument();
        });
    });
});
