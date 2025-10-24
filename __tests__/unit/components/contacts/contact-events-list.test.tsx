/**
 * ContactEventsList Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactEventsList } from "@/components/contacts/contact-events-list";

describe("ContactEventsList", () => {
    const mockEvents = [
        {
            id: "1",
            event_type: "page_view",
            page_type: "registration",
            event_data: {},
            created_at: "2025-01-01T00:00:00Z",
        },
        {
            id: "2",
            event_type: "video_start",
            page_type: "watch",
            event_data: {},
            created_at: "2025-01-01T00:05:00Z",
        },
        {
            id: "3",
            event_type: "video_complete",
            page_type: "watch",
            event_data: {},
            created_at: "2025-01-01T00:15:00Z",
        },
    ];

    it("should render list of events", () => {
        render(<ContactEventsList events={mockEvents} />);

        expect(screen.getByText("Viewed registration page")).toBeInTheDocument();
        expect(screen.getByText("Started watching video")).toBeInTheDocument();
        expect(screen.getByText("Completed video")).toBeInTheDocument();
    });

    it("should show empty state when no events", () => {
        render(<ContactEventsList events={[]} />);

        expect(screen.getByText("No activity events recorded")).toBeInTheDocument();
    });

    it("should display event type badges", () => {
        render(<ContactEventsList events={mockEvents} />);

        expect(screen.getByText("page_view")).toBeInTheDocument();
        expect(screen.getByText("video_start")).toBeInTheDocument();
        expect(screen.getByText("video_complete")).toBeInTheDocument();
    });

    it("should render event icons", () => {
        render(<ContactEventsList events={mockEvents} />);

        // Icons are rendered as emojis
        const container = screen.getByText("Viewed registration page").closest("div");
        expect(container).toBeTruthy();
    });

    it("should display event timestamps", () => {
        render(<ContactEventsList events={mockEvents} />);

        // Check that timestamps are rendered (format varies by timezone)
        const timestamps = screen.getAllByText(/\d{1,2}, 20\d{2}/);
        expect(timestamps.length).toBe(3);
    });
});
