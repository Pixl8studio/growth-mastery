/**
 * VideoEngagementChart Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VideoEngagementChart } from "@/components/contacts/video-engagement-chart";

describe("VideoEngagementChart", () => {
    it("should render watch percentage", () => {
        render(
            <VideoEngagementChart
                watchPercentage={75}
                completionEvents={[25, 50, 75]}
                replayCount={0}
            />
        );

        expect(screen.getByText(/Watch Progress: 75%/)).toBeInTheDocument();
    });

    it("should show completion message at 100%", () => {
        render(
            <VideoEngagementChart
                watchPercentage={100}
                completionEvents={[25, 50, 75, 100]}
                replayCount={0}
            />
        );

        expect(screen.getByText(/Completed entire video/)).toBeInTheDocument();
    });

    it("should show drop-off warning when incomplete", () => {
        render(
            <VideoEngagementChart
                watchPercentage={35}
                completionEvents={[25]}
                replayCount={0}
            />
        );

        expect(screen.getByText(/Dropped off after 25% milestone/)).toBeInTheDocument();
    });

    it("should display replay count when present", () => {
        render(
            <VideoEngagementChart
                watchPercentage={80}
                completionEvents={[25, 50, 75]}
                replayCount={3}
            />
        );

        expect(screen.getByText("3 replays")).toBeInTheDocument();
    });

    it("should show appropriate insights", () => {
        render(
            <VideoEngagementChart
                watchPercentage={20}
                completionEvents={[]}
                replayCount={0}
            />
        );

        expect(
            screen.getByText(
                /Contact dropped off very early - consider improving video hook/
            )
        ).toBeInTheDocument();
    });

    it("should handle zero watch percentage", () => {
        render(
            <VideoEngagementChart
                watchPercentage={0}
                completionEvents={[]}
                replayCount={0}
            />
        );

        expect(
            screen.getByText(/Contact registered but hasn't watched the video yet/)
        ).toBeInTheDocument();
    });

    it("should render all milestone markers", () => {
        render(
            <VideoEngagementChart
                watchPercentage={50}
                completionEvents={[25, 50]}
                replayCount={0}
            />
        );

        // Check for milestone percentages
        const milestones = [0, 25, 50, 75, 100];
        milestones.forEach((milestone) => {
            const elements = screen.getAllByText(`${milestone}%`);
            expect(elements.length).toBeGreaterThan(0);
        });
    });
});
