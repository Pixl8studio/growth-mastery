/**
 * FunnelDashboardTabs Component Tests
 * Tests tabbed dashboard interface
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FunnelDashboardTabs } from "@/components/funnel/funnel-dashboard-tabs";

// Mock child components
vi.mock("@/components/funnel/analytics-dashboard", () => ({
    FunnelAnalyticsDashboard: () => <div>Analytics Dashboard</div>,
}));

vi.mock("@/components/funnel/funnel-pages-view", () => ({
    FunnelPagesView: () => <div>Pages View</div>,
}));

vi.mock("@/components/funnel/funnel-followup-view", () => ({
    FunnelFollowupView: () => <div>Followup View</div>,
}));

vi.mock("@/components/funnel/funnel-contacts-view", () => ({
    FunnelContactsView: () => <div>Contacts View</div>,
}));

vi.mock("@/components/funnel/funnel-settings-view", () => ({
    FunnelSettingsView: () => <div>Settings View</div>,
}));

vi.mock("@/app/funnel-builder/completion-utils", () => ({
    getStepCompletionStatus: vi.fn(() => Promise.resolve([])),
    getMasterStepCompletionStatus: vi.fn(() =>
        Promise.resolve({
            totalMasterSteps: 5,
            completedMasterSteps: 0,
            masterStepCompletions: [],
        })
    ),
}));

vi.mock("@/components/funnel/horizontal-master-steps", () => ({
    HorizontalMasterSteps: () => <div>Horizontal Master Steps</div>,
}));

vi.mock("@/components/funnel-builder/master-section-card", () => ({
    MasterSectionCard: () => <div>Master Section Card</div>,
}));

describe("FunnelDashboardTabs", () => {
    const defaultProps = {
        projectId: "test-project-123",
        username: "testuser",
        currentStep: 1,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render tab navigation", async () => {
        render(<FunnelDashboardTabs {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByRole("tab", { name: /Dashboard/i })).toBeInTheDocument();
            expect(screen.getByRole("tab", { name: /Pages/i })).toBeInTheDocument();
            expect(
                screen.getByRole("tab", { name: /AI Followup/i })
            ).toBeInTheDocument();
            expect(screen.getByRole("tab", { name: /Contacts/i })).toBeInTheDocument();
            expect(screen.getByRole("tab", { name: /Settings/i })).toBeInTheDocument();
        });
    });

    it("should display analytics dashboard by default", async () => {
        render(<FunnelDashboardTabs {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
        });
    });

    it("should display funnel builder progress card", async () => {
        render(<FunnelDashboardTabs {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Funnel Builder Progress")).toBeInTheDocument();
        });
    });

    it("should display continue building button", async () => {
        render(<FunnelDashboardTabs {...defaultProps} />);

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /Continue Building/i })
            ).toBeInTheDocument();
        });
    });

    it("should display performance dashboard card", async () => {
        render(<FunnelDashboardTabs {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Performance Dashboard")).toBeInTheDocument();
        });
    });
});
