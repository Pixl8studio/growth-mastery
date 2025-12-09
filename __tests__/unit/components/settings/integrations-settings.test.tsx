/**
 * IntegrationsSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        auth: {
            getUser: mockGetUser,
        },
        from: mockFrom,
    }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("IntegrationsSettings", () => {
    const mockUser = {
        id: "user-123",
        email: "test@example.com",
    };

    const mockProfile = {
        id: "user-123",
        webhook_enabled: false,
        crm_webhook_url: "",
        webhook_secret: "",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockSingle.mockResolvedValue({ data: mockProfile, error: null });
        mockEq.mockReturnValue({ single: mockSingle });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
        mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    });

    it("should render loading state initially", () => {
        render(<IntegrationsSettings />);

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should render integrations title", async () => {
        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Integrations")).toBeInTheDocument();
        });
    });

    it("should display CRM webhook section", async () => {
        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("CRM Webhook")).toBeInTheDocument();
        });

        expect(
            screen.getByText(/Automatically send lead data to your CRM/)
        ).toBeInTheDocument();
    });

    it("should show webhook toggle", async () => {
        render(<IntegrationsSettings />);

        await waitFor(() => {
            const toggle = screen.getByRole("button", { name: "" });
            expect(toggle).toBeInTheDocument();
        });
    });

    it("should show webhook URL input when enabled", async () => {
        const enabledProfile = {
            ...mockProfile,
            webhook_enabled: true,
            crm_webhook_url: "https://crm.example.com/webhook",
        };

        mockSingle.mockResolvedValue({ data: enabledProfile, error: null });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText("Webhook URL")).toBeInTheDocument();
        });

        const urlInput = screen.getByLabelText("Webhook URL");
        expect(urlInput).toHaveValue("https://crm.example.com/webhook");
    });

    it("should handle webhook enable toggle", async () => {
        render(<IntegrationsSettings />);

        await waitFor(() => {
            const toggle = screen.getByRole("button", { name: "" });
            expect(toggle).toBeInTheDocument();
        });

        const toggle = screen.getByRole("button", { name: "" });
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(screen.getByLabelText("Webhook URL")).toBeInTheDocument();
        });
    });

    it("should handle save button click", async () => {
        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Save changes")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({
                webhook_enabled: false,
                crm_webhook_url: null,
                webhook_secret: null,
            });
        });
    });

    it("should validate webhook URL when saving", async () => {
        const enabledProfile = {
            ...mockProfile,
            webhook_enabled: true,
        };

        mockSingle.mockResolvedValue({ data: enabledProfile, error: null });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText("Webhook URL")).toBeInTheDocument();
        });

        const urlInput = screen.getByLabelText("Webhook URL");
        fireEvent.change(urlInput, { target: { value: "invalid-url" } });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        // Wait a bit for any async operations
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify that update was NOT called due to validation failure
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should require webhook URL when enabled", async () => {
        render(<IntegrationsSettings />);

        await waitFor(() => {
            const toggle = screen.getByRole("button", { name: "" });
            expect(toggle).toBeInTheDocument();
        });

        const toggle = screen.getByRole("button", { name: "" });
        fireEvent.click(toggle);

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        // Wait a bit for any async operations
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify that update was NOT called due to validation failure
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should handle test webhook button", async () => {
        const enabledProfile = {
            ...mockProfile,
            webhook_enabled: true,
            crm_webhook_url: "https://crm.example.com/webhook",
        };

        mockSingle.mockResolvedValue({ data: enabledProfile, error: null });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Send test webhook")).toBeInTheDocument();
        });

        const testButton = screen.getByText("Send test webhook");
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/user/webhook/test",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should show success message after test webhook", async () => {
        const enabledProfile = {
            ...mockProfile,
            webhook_enabled: true,
            crm_webhook_url: "https://crm.example.com/webhook",
        };

        mockSingle.mockResolvedValue({ data: enabledProfile, error: null });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Send test webhook")).toBeInTheDocument();
        });

        const testButton = screen.getByText("Send test webhook");
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(
                screen.getByText(/Test webhook sent! Check your webhook endpoint/)
            ).toBeInTheDocument();
        });
    });

    it("should display webhook secret input", async () => {
        const enabledProfile = {
            ...mockProfile,
            webhook_enabled: true,
        };

        mockSingle.mockResolvedValue({ data: enabledProfile, error: null });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(
                screen.getByLabelText("Webhook Secret (Optional)")
            ).toBeInTheDocument();
        });
    });

    it("should display popular CRM setup instructions", async () => {
        const enabledProfile = {
            ...mockProfile,
            webhook_enabled: true,
        };

        mockSingle.mockResolvedValue({ data: enabledProfile, error: null });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Popular CRM Setup")).toBeInTheDocument();
        });

        expect(screen.getByText(/GoHighLevel:/)).toBeInTheDocument();
        expect(screen.getByText(/Make.com \/ Zapier:/)).toBeInTheDocument();
    });

    it("should handle cancel button", async () => {
        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Cancel")).toBeInTheDocument();
        });

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        // Should reload data
        await waitFor(() => {
            expect(mockFrom).toHaveBeenCalled();
        });
    });

    it("should show saving state", async () => {
        let _resolveUpdate: any;
        mockUpdate.mockReturnValue({
            eq: vi
                .fn()
                .mockImplementation(
                    () => new Promise((resolve) => (_resolveUpdate = resolve))
                ),
        });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Save changes")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Saving...")).toBeInTheDocument();
        });
    });

    it("should show error message on save failure", async () => {
        mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: new Error("Save failed") }),
        });

        render(<IntegrationsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Save changes")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Save failed")).toBeInTheDocument();
        });
    });
});
