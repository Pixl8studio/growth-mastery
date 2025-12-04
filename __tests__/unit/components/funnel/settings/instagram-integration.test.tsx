/**
 * InstagramIntegration Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InstagramIntegration } from "@/components/funnel/settings/instagram-integration";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: mockFrom,
    }),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("InstagramIntegration", () => {
    const mockProps = {
        projectId: "project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockSingle.mockResolvedValue({ data: null, error: null });
        mockEq.mockReturnValue({ single: mockSingle });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect });
    });

    it("should render loading state initially", () => {
        render(<InstagramIntegration {...mockProps} />);

        expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
    });

    it("should render Instagram integration card", async () => {
        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Instagram")).toBeInTheDocument();
        });

        expect(
            screen.getByText("Connect your Instagram Business Account")
        ).toBeInTheDocument();
    });

    it("should show not connected state", async () => {
        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Not Connected")).toBeInTheDocument();
        });

        expect(screen.getByText("Connect Instagram")).toBeInTheDocument();
    });

    it("should show Facebook connection requirement", async () => {
        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("Requires Facebook connection first")
            ).toBeInTheDocument();
        });
    });

    it("should show connected state with account name", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "instagram",
            account_name: "my_business",
            connected_at: "2024-01-01T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Connected")).toBeInTheDocument();
        });

        expect(screen.getByText("@my_business")).toBeInTheDocument();
    });

    it("should handle connect button click", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://instagram.com/oauth" }),
        });

        delete (window as any).location;
        window.location = { href: "" } as any;

        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Connect Instagram")).toBeInTheDocument();
        });

        const connectButton = screen.getByText("Connect Instagram");
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    "/api/funnel/project-123/integrations/instagram/connect"
                )
            );
        });
    });

    it("should show error toast on connection failure", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Connection failed"));

        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Connect Instagram")).toBeInTheDocument();
        });

        const connectButton = screen.getByText("Connect Instagram");
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Connection Error",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle disconnect button click", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "instagram",
            account_name: "my_business",
            connected_at: "2024-01-01T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect")).toBeInTheDocument();
        });

        const disconnectButton = screen.getByText("Disconnect");
        fireEvent.click(disconnectButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/funnel/project-123/integrations/disconnect",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ provider: "instagram" }),
                })
            );
        });
    });

    it("should show success toast after disconnection", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "instagram",
            account_name: "my_business",
            connected_at: "2024-01-01T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<InstagramIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect")).toBeInTheDocument();
        });

        const disconnectButton = screen.getByText("Disconnect");
        fireEvent.click(disconnectButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Disconnected",
                    description: "Instagram has been disconnected",
                })
            );
        });
    });
});
