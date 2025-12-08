/**
 * AIFollowupDashboard Component Tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIFollowupDashboard } from "@/components/followup/ai-followup-dashboard";

// Mock child components
vi.mock("@/components/followup/global-dashboard", () => ({
    GlobalDashboard: ({ userId }: { userId: string }) => (
        <div data-testid="global-dashboard">Global Dashboard - {userId}</div>
    ),
}));

vi.mock("@/components/followup/global-prospect-list", () => ({
    GlobalProspectList: ({ userId }: { userId: string }) => (
        <div data-testid="global-prospect-list">Prospect List - {userId}</div>
    ),
}));

vi.mock("@/components/followup/global-prospects-table", () => ({
    GlobalProspectsTable: ({ userId }: { userId: string }) => (
        <div data-testid="global-prospects-table">Prospects Table - {userId}</div>
    ),
}));

vi.mock("@/components/followup/prospects-kanban", () => ({
    ProspectsKanban: ({ userId }: { userId: string }) => (
        <div data-testid="prospects-kanban">Kanban - {userId}</div>
    ),
}));

describe("AIFollowupDashboard", () => {
    const mockUserId = "user-123";

    it("should render without crashing", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);
        expect(screen.getByText("📊 Dashboard")).toBeInTheDocument();
    });

    it("should render all navigation buttons", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);

        expect(screen.getByText("📊 Dashboard")).toBeInTheDocument();
        expect(screen.getByText("📋 List")).toBeInTheDocument();
        expect(screen.getByText("📊 Table")).toBeInTheDocument();
        expect(screen.getByText("🎯 Kanban")).toBeInTheDocument();
    });

    it("should display dashboard view by default", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);

        expect(screen.getByTestId("global-dashboard")).toBeInTheDocument();
        expect(
            screen.getByText(`Global Dashboard - ${mockUserId}`)
        ).toBeInTheDocument();
    });

    it("should switch to list view when list button is clicked", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);

        const listButton = screen.getByText("📋 List");
        fireEvent.click(listButton);

        expect(screen.getByTestId("global-prospect-list")).toBeInTheDocument();
        expect(screen.getByText(`Prospect List - ${mockUserId}`)).toBeInTheDocument();
    });

    it("should switch to table view when table button is clicked", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);

        const tableButton = screen.getByText("📊 Table");
        fireEvent.click(tableButton);

        expect(screen.getByTestId("global-prospects-table")).toBeInTheDocument();
        expect(screen.getByText(`Prospects Table - ${mockUserId}`)).toBeInTheDocument();
    });

    it("should switch to kanban view when kanban button is clicked", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);

        const kanbanButton = screen.getByText("🎯 Kanban");
        fireEvent.click(kanbanButton);

        expect(screen.getByTestId("prospects-kanban")).toBeInTheDocument();
        expect(screen.getByText(`Kanban - ${mockUserId}`)).toBeInTheDocument();
    });

    it("should only display one view at a time", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);

        // Initially dashboard should be visible
        expect(screen.getByTestId("global-dashboard")).toBeInTheDocument();
        expect(screen.queryByTestId("global-prospect-list")).not.toBeInTheDocument();

        // Switch to list
        const listButton = screen.getByText("📋 List");
        fireEvent.click(listButton);

        // Now list should be visible, dashboard not
        expect(screen.queryByTestId("global-dashboard")).not.toBeInTheDocument();
        expect(screen.getByTestId("global-prospect-list")).toBeInTheDocument();
    });

    it("should pass userId to all child components", () => {
        render(<AIFollowupDashboard userId={mockUserId} />);

        // Check dashboard
        expect(
            screen.getByText(`Global Dashboard - ${mockUserId}`)
        ).toBeInTheDocument();

        // Check list
        fireEvent.click(screen.getByText("📋 List"));
        expect(screen.getByText(`Prospect List - ${mockUserId}`)).toBeInTheDocument();

        // Check table
        fireEvent.click(screen.getByText("📊 Table"));
        expect(screen.getByText(`Prospects Table - ${mockUserId}`)).toBeInTheDocument();

        // Check kanban
        fireEvent.click(screen.getByText("🎯 Kanban"));
        expect(screen.getByText(`Kanban - ${mockUserId}`)).toBeInTheDocument();
    });
});
