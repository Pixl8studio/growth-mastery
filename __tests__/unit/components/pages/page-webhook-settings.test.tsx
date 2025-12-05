/**
 * PageWebhookSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PageWebhookSettings } from "@/components/pages/page-webhook-settings";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("PageWebhookSettings", () => {
    const mockProps = {
        pageId: "page-123",
        pageType: "registration" as const,
    };

    const mockConfig = {
        pageConfig: {
            webhook_inherit_global: true,
            webhook_enabled: false,
            webhook_url: "",
            webhook_secret: "",
        },
        effectiveConfig: {
            enabled: false,
            url: null,
            isInherited: true,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockConfig,
        });
    });

    it("should render loading state initially", () => {
        render(<PageWebhookSettings {...mockProps} />);

        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should load webhook configuration", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Webhook Configuration")).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            `/api/pages/page-123/webhook?pageType=registration`
        );
    });

    it("should display global inheritance checkbox", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByLabelText("Use Global Webhook Settings")
            ).toBeInTheDocument();
        });
    });

    it("should show effective configuration status", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Current Webhook Status")).toBeInTheDocument();
            expect(screen.getByText(/Enabled:/)).toBeInTheDocument();
        });
    });

    it("should disable page-specific settings when inheriting global", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const inheritCheckbox = screen.getByLabelText(
                "Use Global Webhook Settings"
            );
            expect(inheritCheckbox).toBeChecked();
        });

        expect(
            screen.queryByLabelText("Enable Webhook for This Page")
        ).not.toBeInTheDocument();
    });

    it("should show page-specific settings when not inheriting", async () => {
        const customConfig = {
            ...mockConfig,
            pageConfig: {
                ...mockConfig.pageConfig,
                webhook_inherit_global: false,
            },
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => customConfig,
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByLabelText("Enable Webhook for This Page")
            ).toBeInTheDocument();
        });
    });

    it("should allow toggling inherit global", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const checkbox = screen.getByLabelText("Use Global Webhook Settings");
            expect(checkbox).toBeChecked();
        });

        const checkbox = screen.getByLabelText("Use Global Webhook Settings");
        fireEvent.click(checkbox);

        expect(checkbox).not.toBeChecked();
    });

    it("should show webhook URL input when enabled", async () => {
        const customConfig = {
            ...mockConfig,
            pageConfig: {
                ...mockConfig.pageConfig,
                webhook_inherit_global: false,
                webhook_enabled: true,
            },
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => customConfig,
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByLabelText("Webhook URL")).toBeInTheDocument();
            expect(screen.getByLabelText("Webhook Secret (Optional)")).toBeInTheDocument();
        });
    });

    it("should track unsaved changes", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const checkbox = screen.getByLabelText("Use Global Webhook Settings");
            expect(checkbox).toBeInTheDocument();
        });

        const checkbox = screen.getByLabelText("Use Global Webhook Settings");
        fireEvent.click(checkbox);

        await waitFor(() => {
            expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
        });
    });

    it("should disable save button when no changes", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const saveButton = screen.getByText("Save Configuration");
            expect(saveButton).toBeDisabled();
        });
    });

    it("should enable save button when changes exist", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const checkbox = screen.getByLabelText("Use Global Webhook Settings");
            fireEvent.click(checkbox);
        });

        const saveButton = screen.getByText("Save Configuration");
        expect(saveButton).not.toBeDisabled();
    });

    it("should save configuration", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockConfig,
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const checkbox = screen.getByLabelText("Use Global Webhook Settings");
            fireEvent.click(checkbox);
        });

        const saveButton = screen.getByText("Save Configuration");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `/api/pages/page-123/webhook`,
                expect.objectContaining({
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                })
            );
        });
    });

    it("should show saving state", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const checkbox = screen.getByLabelText("Use Global Webhook Settings");
            fireEvent.click(checkbox);
        });

        const saveButton = screen.getByText("Save Configuration");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Saving...")).toBeInTheDocument();
        });
    });

    it("should show success message after save", async () => {
        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const checkbox = screen.getByLabelText("Use Global Webhook Settings");
            fireEvent.click(checkbox);
        });

        const saveButton = screen.getByText("Save Configuration");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(
                screen.getByText("Webhook configuration saved successfully")
            ).toBeInTheDocument();
        });
    });

    it("should send test webhook", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                statusCode: 200,
                isInherited: true,
            }),
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const testButton = screen.getByText("Send Test Webhook");
            expect(testButton).toBeInTheDocument();
        });

        const testButton = screen.getByText("Send Test Webhook");
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `/api/pages/page-123/webhook`,
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should show test webhook success message", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                statusCode: 200,
                isInherited: false,
            }),
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const testButton = screen.getByText("Send Test Webhook");
            fireEvent.click(testButton);
        });

        await waitFor(() => {
            expect(
                screen.getByText(/Test webhook sent successfully!/)
            ).toBeInTheDocument();
        });
    });

    it("should show testing state", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const testButton = screen.getByText("Send Test Webhook");
            fireEvent.click(testButton);
        });

        await waitFor(() => {
            expect(screen.getByText("Testing...")).toBeInTheDocument();
        });
    });

    it("should handle save error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Save failed" }),
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const checkbox = screen.getByLabelText("Use Global Webhook Settings");
            fireEvent.click(checkbox);
        });

        const saveButton = screen.getByText("Save Configuration");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Save failed")).toBeInTheDocument();
        });
    });

    it("should handle test webhook error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Test failed" }),
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            const testButton = screen.getByText("Send Test Webhook");
            fireEvent.click(testButton);
        });

        await waitFor(() => {
            expect(screen.getByText("Test failed")).toBeInTheDocument();
        });
    });

    it("should handle load error", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Load failed" }),
        });

        render(<PageWebhookSettings {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("Failed to load webhook configuration")
            ).toBeInTheDocument();
        });
    });
});
