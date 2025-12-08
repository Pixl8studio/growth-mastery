/**
 * CalendarIntegration Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CalendarIntegration } from "@/components/funnel/settings/calendar-integration";

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

describe("CalendarIntegration", () => {
    const mockProps = {
        projectId: "project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock chain - need to handle two .eq() calls
        mockSingle.mockResolvedValue({ data: null, error: null });
        mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect });
    });

    it("should render loading state initially", () => {
        render(<CalendarIntegration {...mockProps} />);

        const loadingElement = document.querySelector(".animate-pulse");
        expect(loadingElement).toBeInTheDocument();
    });

    it("should render calendar integration title", async () => {
        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Calendar Integration")).toBeInTheDocument();
        });
    });

    it("should show not connected state when no connection exists", async () => {
        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Not Connected")).toBeInTheDocument();
        });

        expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
    });

    it("should display features list when not connected", async () => {
        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText(/Schedule calls and meetings directly from funnel/)
            ).toBeInTheDocument();
        });

        expect(
            screen.getByText(/Automatic calendar event creation for enrollments/)
        ).toBeInTheDocument();
    });

    it("should show connected state when connection exists", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "google",
            account_email: "test@example.com",
            calendar_name: "Primary Calendar",
            connected_at: "2024-01-01T00:00:00Z",
            last_synced_at: "2024-01-02T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Connected")).toBeInTheDocument();
        });

        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByText("Primary Calendar")).toBeInTheDocument();
    });

    it("should display connection date", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "google",
            account_email: "test@example.com",
            connected_at: "2024-01-01T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Connected 1\/1\/2024/)).toBeInTheDocument();
        });
    });

    it("should handle connect button click", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://oauth.example.com/authorize" }),
        });

        // Mock window.location.href
        delete (window as any).location;
        window.location = { href: "" } as any;

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
        });

        const connectButton = screen.getByText("Connect Google Calendar");
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    "/api/funnel/project-123/integrations/calendar/connect"
                )
            );
        });
    });

    it("should show error toast on connection failure", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Connection failed"));

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
        });

        const connectButton = screen.getByText("Connect Google Calendar");
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
            provider: "google",
            account_email: "test@example.com",
            connected_at: "2024-01-01T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect Calendar")).toBeInTheDocument();
        });

        const disconnectButton = screen.getByText("Disconnect Calendar");
        fireEvent.click(disconnectButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/funnel/project-123/integrations/disconnect",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ provider: "google", type: "calendar" }),
                })
            );
        });
    });

    it("should show success toast after disconnection", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "google",
            account_email: "test@example.com",
            connected_at: "2024-01-01T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect Calendar")).toBeInTheDocument();
        });

        const disconnectButton = screen.getByText("Disconnect Calendar");
        fireEvent.click(disconnectButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Disconnected",
                    description: "Calendar has been disconnected",
                })
            );
        });
    });

    it("should show error toast on disconnect failure", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "google",
            account_email: "test@example.com",
            connected_at: "2024-01-01T00:00:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        (global.fetch as any).mockRejectedValue(new Error("Disconnect failed"));

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect Calendar")).toBeInTheDocument();
        });

        const disconnectButton = screen.getByText("Disconnect Calendar");
        fireEvent.click(disconnectButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Error",
                    variant: "destructive",
                })
            );
        });
    });

    it("should display last synced time when available", async () => {
        const mockConnection = {
            id: "conn-123",
            provider: "google",
            account_email: "test@example.com",
            connected_at: "2024-01-01T00:00:00Z",
            last_synced_at: "2024-01-02T12:30:00Z",
        };

        mockSingle.mockResolvedValue({ data: mockConnection, error: null });

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Last synced/)).toBeInTheDocument();
        });
    });

    it("should show future calendar providers section", async () => {
        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("More Calendars")).toBeInTheDocument();
        });

        expect(
            screen.getByText("Outlook and CalDAV support coming soon")
        ).toBeInTheDocument();
    });

    it("should handle Supabase error during load", async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: new Error("Database error"),
        });

        render(<CalendarIntegration {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
        });
    });
});
