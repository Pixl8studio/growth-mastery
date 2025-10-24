/**
 * FunnelProgressionTimeline Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FunnelProgressionTimeline } from "@/components/contacts/funnel-progression-timeline";

describe("FunnelProgressionTimeline", () => {
    it("should render all funnel stages", () => {
        const contact = {
            current_stage: "registered",
            stages_completed: ["registered"],
            created_at: "2025-01-01T00:00:00Z",
            video_watched_at: null,
        };

        render(<FunnelProgressionTimeline contact={contact} />);

        expect(screen.getByText("Registered")).toBeInTheDocument();
        expect(screen.getByText("Watched Video")).toBeInTheDocument();
        expect(screen.getByText("Viewed Enrollment")).toBeInTheDocument();
        expect(screen.getByText("Purchased")).toBeInTheDocument();
    });

    it("should show completed badge for completed stages", () => {
        const contact = {
            current_stage: "watched",
            stages_completed: ["registered", "watched"],
            created_at: "2025-01-01T00:00:00Z",
            video_watched_at: "2025-01-02T00:00:00Z",
        };

        render(<FunnelProgressionTimeline contact={contact} />);

        const completedBadges = screen.getAllByText("Completed");
        expect(completedBadges.length).toBeGreaterThanOrEqual(1);
    });

    it("should show current badge for current stage", () => {
        const contact = {
            current_stage: "enrolled",
            stages_completed: ["registered", "watched"],
            created_at: "2025-01-01T00:00:00Z",
            video_watched_at: "2025-01-02T00:00:00Z",
        };

        render(<FunnelProgressionTimeline contact={contact} />);

        // The current stage should NOT be in stages_completed to show "Current" badge
        expect(screen.getByText("Current")).toBeInTheDocument();
    });

    it("should show drop-off warning for incomplete funnels", () => {
        const contact = {
            current_stage: "registered",
            stages_completed: ["registered"],
            created_at: "2025-01-01T00:00:00Z",
            video_watched_at: null,
        };

        render(<FunnelProgressionTimeline contact={contact} />);

        expect(screen.getByText("Drop-off Point Detected")).toBeInTheDocument();
    });

    it("should show success message for completed funnel", () => {
        const contact = {
            current_stage: "purchased",
            stages_completed: ["registered", "watched", "enrolled", "purchased"],
            created_at: "2025-01-01T00:00:00Z",
            video_watched_at: "2025-01-02T00:00:00Z",
        };

        render(<FunnelProgressionTimeline contact={contact} />);

        expect(screen.getByText("Conversion Complete!")).toBeInTheDocument();
    });

    it("should handle array stages_completed correctly", () => {
        const contact = {
            current_stage: "watched",
            stages_completed: ["registered", "watched"],
            created_at: "2025-01-01T00:00:00Z",
            video_watched_at: "2025-01-02T00:00:00Z",
        };

        render(<FunnelProgressionTimeline contact={contact} />);

        // Should not crash and should show appropriate content
        expect(screen.getByText("Registered")).toBeInTheDocument();
        expect(screen.getByText("Watched Video")).toBeInTheDocument();
    });
});
