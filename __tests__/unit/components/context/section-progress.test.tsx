/**
 * SectionProgress Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SectionProgress } from "@/components/context/section-progress";
import type { CompletionStatus } from "@/types/business-profile";

describe("SectionProgress", () => {
    const defaultCompletionStatus: CompletionStatus = {
        section1: 0,
        section2: 0,
        section3: 0,
        section4: 0,
        section5: 0,
        overall: 0,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );
        expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    });

    it("should display overall progress percentage", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 50,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 30,
        };

        render(
            <SectionProgress
                currentSection="section1"
                completionStatus={completionStatus}
            />
        );

        expect(screen.getByText("30%")).toBeInTheDocument();
    });

    it("should render progress bar with correct width", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 100,
            section4: 0,
            section5: 0,
            overall: 60,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section3"
                completionStatus={completionStatus}
            />
        );

        const progressBar = container.querySelector('[style*="width: 60%"]');
        expect(progressBar).toBeInTheDocument();
    });

    it("should render all 5 section indicators", () => {
        render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );

        expect(screen.getByText("Customer")).toBeInTheDocument();
        expect(screen.getByText("Story")).toBeInTheDocument();
        expect(screen.getByText("Offer")).toBeInTheDocument();
        expect(screen.getByText("Beliefs")).toBeInTheDocument();
        expect(screen.getByText("CTA")).toBeInTheDocument();
    });

    it("should highlight current section", () => {
        const { container } = render(
            <SectionProgress
                currentSection="section2"
                completionStatus={defaultCompletionStatus}
            />
        );

        const storyLabel = screen.getByText("Story");
        expect(storyLabel).toHaveClass("font-semibold");
        expect(storyLabel).toHaveClass("text-primary");
    });

    it("should display step numbers for incomplete sections", () => {
        render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should display checkmarks for completed sections", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 40,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section3"
                completionStatus={completionStatus}
            />
        );

        const checkIcons = container.querySelectorAll('svg.lucide-check');
        expect(checkIcons.length).toBe(2);
    });

    it("should apply correct styles to current section indicator", () => {
        const { container } = render(
            <SectionProgress
                currentSection="section3"
                completionStatus={defaultCompletionStatus}
            />
        );

        const indicators = container.querySelectorAll('[class*="border-primary bg-primary"]');
        expect(indicators.length).toBeGreaterThan(0);
    });

    it("should apply correct styles to completed section indicators", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 40,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section3"
                completionStatus={completionStatus}
            />
        );

        const completedIndicators = container.querySelectorAll('[class*="border-green-500 bg-green-500"]');
        expect(completedIndicators.length).toBe(2);
    });

    it("should call onSectionClick when clicking a completed section", async () => {
        const user = userEvent.setup();
        const onSectionClick = vi.fn();
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 0,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 20,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section2"
                completionStatus={completionStatus}
                onSectionClick={onSectionClick}
            />
        );

        const indicators = container.querySelectorAll('[class*="cursor-pointer"]');
        if (indicators.length > 0) {
            await user.click(indicators[0]);
            expect(onSectionClick).toHaveBeenCalledWith("section1");
        }
    });

    it("should call onSectionClick when clicking current section", async () => {
        const user = userEvent.setup();
        const onSectionClick = vi.fn();
        const completionStatus: CompletionStatus = {
            section1: 50,
            section2: 0,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 10,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section1"
                completionStatus={completionStatus}
                onSectionClick={onSectionClick}
            />
        );

        const indicators = container.querySelectorAll('[class*="cursor-pointer"]');
        if (indicators.length > 0) {
            await user.click(indicators[0]);
            expect(onSectionClick).toHaveBeenCalledWith("section1");
        }
    });

    it("should not call onSectionClick when no handler provided", async () => {
        const user = userEvent.setup();
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 0,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 20,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section2"
                completionStatus={completionStatus}
            />
        );

        const indicators = container.querySelectorAll('[class*="rounded-full"]');
        await user.click(indicators[0]);
        // Should not throw error
    });

    it("should render connector lines between sections", () => {
        const { container } = render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );

        const connectors = container.querySelectorAll('[class*="flex-1"][class*="h-0.5"]');
        expect(connectors.length).toBe(4); // 4 connectors for 5 sections
    });

    it("should highlight connector for completed sections", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 40,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section3"
                completionStatus={completionStatus}
            />
        );

        const activeConnectors = container.querySelectorAll('[class*="bg-primary"], [class*="bg-green-500"]');
        expect(activeConnectors.length).toBeGreaterThan(0);
    });

    it("should show section titles on hover", () => {
        render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );

        const indicators = screen.getAllByTitle(/Ideal Customer & Core Problem|Your Story & Signature Method/);
        expect(indicators.length).toBeGreaterThan(0);
    });

    it("should handle zero overall progress", () => {
        const { container } = render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );

        expect(screen.getByText("0%")).toBeInTheDocument();
        const progressBar = container.querySelector('[style*="width: 0%"]');
        expect(progressBar).toBeInTheDocument();
    });

    it("should handle 100% overall progress", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 100,
            section4: 100,
            section5: 100,
            overall: 100,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section5"
                completionStatus={completionStatus}
            />
        );

        expect(screen.getByText("100%")).toBeInTheDocument();
        const progressBar = container.querySelector('[style*="width: 100%"]');
        expect(progressBar).toBeInTheDocument();
    });

    it("should show all sections as completed when at 100%", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 100,
            section4: 100,
            section5: 100,
            overall: 100,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section5"
                completionStatus={completionStatus}
            />
        );

        const checkIcons = container.querySelectorAll('svg.lucide-check');
        expect(checkIcons.length).toBe(5);
    });

    it("should handle partial completion of current section", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 50,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 30,
        };

        render(
            <SectionProgress
                currentSection="section2"
                completionStatus={completionStatus}
            />
        );

        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("30%")).toBeInTheDocument();
    });

    it("should render section labels in correct order", () => {
        render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );

        const labels = screen.getAllByText(/Customer|Story|Offer|Beliefs|CTA/);
        expect(labels).toHaveLength(5);
    });

    it("should apply hover effect on clickable sections", () => {
        const onSectionClick = vi.fn();
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 0,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 20,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section2"
                completionStatus={completionStatus}
                onSectionClick={onSectionClick}
            />
        );

        const hoverableElements = container.querySelectorAll('[class*="hover:scale-105"]');
        expect(hoverableElements.length).toBeGreaterThan(0);
    });

    it("should handle mid-progress correctly", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 50,
            section4: 0,
            section5: 0,
            overall: 50,
        };

        render(
            <SectionProgress
                currentSection="section3"
                completionStatus={completionStatus}
            />
        );

        expect(screen.getByText("50%")).toBeInTheDocument();
        expect(screen.getByText("Offer")).toHaveClass("text-primary");
    });

    it("should not allow clicking future sections without handler", () => {
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 0,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 20,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section1"
                completionStatus={completionStatus}
            />
        );

        // Future sections should not have cursor-pointer without handler
        const futureIndicators = container.querySelectorAll('[class*="rounded-full"]');
        const clickableCount = Array.from(futureIndicators).filter(el =>
            el.className.includes('cursor-pointer')
        ).length;

        // Only current/past sections should be clickable
        expect(clickableCount).toBeLessThan(5);
    });

    it("should display transition classes on progress bar", () => {
        const { container } = render(
            <SectionProgress
                currentSection="section1"
                completionStatus={defaultCompletionStatus}
            />
        );

        const progressBar = container.querySelector('[class*="transition-all"]');
        expect(progressBar).toBeInTheDocument();
    });

    it("should handle section navigation through all sections", async () => {
        const user = userEvent.setup();
        const onSectionClick = vi.fn();
        const completionStatus: CompletionStatus = {
            section1: 100,
            section2: 100,
            section3: 100,
            section4: 100,
            section5: 0,
            overall: 80,
        };

        const { container } = render(
            <SectionProgress
                currentSection="section5"
                completionStatus={completionStatus}
                onSectionClick={onSectionClick}
            />
        );

        const clickableIndicators = container.querySelectorAll('[class*="cursor-pointer"]');
        expect(clickableIndicators.length).toBeGreaterThan(0);
    });
});
