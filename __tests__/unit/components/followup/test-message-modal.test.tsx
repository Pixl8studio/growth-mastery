/**
 * TestMessageModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TestMessageModal } from "@/components/followup/test-message-modal";

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("TestMessageModal", () => {
    const mockProps = {
        open: true,
        onClose: vi.fn(),
        agentConfigId: "agent-123",
        userEmail: "user@example.com",
        userPhone: "+1234567890",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset fetch mock with default resolved value
        (global.fetch as any).mockReset();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ delivery_id: "del-123" }),
        });
    });

    afterEach(() => {
        vi.useRealTimers(); // Clean up any fake timers to prevent test interference
    });

    it("should render when open is true", () => {
        render(<TestMessageModal {...mockProps} />);
        expect(screen.getByText("Test Message to Self")).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
        render(<TestMessageModal {...mockProps} open={false} />);
        expect(screen.queryByText("Test Message to Self")).not.toBeInTheDocument();
    });

    it("should display channel selection buttons", () => {
        render(<TestMessageModal {...mockProps} />);
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("SMS")).toBeInTheDocument();
    });

    it("should default to email channel", () => {
        render(<TestMessageModal {...mockProps} />);
        expect(screen.getByLabelText("Your Email Address")).toBeInTheDocument();
    });

    it("should switch to SMS input when SMS is selected", () => {
        render(<TestMessageModal {...mockProps} />);

        const smsButton = screen.getByText("SMS").closest("button");
        fireEvent.click(smsButton!);

        expect(screen.getByLabelText("Your Phone Number")).toBeInTheDocument();
        expect(screen.queryByLabelText("Your Email Address")).not.toBeInTheDocument();
    });

    it("should populate email input with userEmail prop", () => {
        render(<TestMessageModal {...mockProps} />);
        const emailInput = screen.getByLabelText("Your Email Address");
        expect(emailInput).toHaveValue("user@example.com");
    });

    it("should populate phone input with userPhone prop", () => {
        render(<TestMessageModal {...mockProps} />);

        const smsButton = screen.getByText("SMS").closest("button");
        fireEvent.click(smsButton!);

        const phoneInput = screen.getByLabelText("Your Phone Number");
        expect(phoneInput).toHaveValue("+1234567890");
    });

    it("should display email info message when email is selected", () => {
        render(<TestMessageModal {...mockProps} />);
        expect(
            screen.getByText(/This will send a sample follow-up email/)
        ).toBeInTheDocument();
    });

    it("should display SMS info message when SMS is selected", () => {
        render(<TestMessageModal {...mockProps} />);

        const smsButton = screen.getByText("SMS").closest("button");
        fireEvent.click(smsButton!);

        expect(screen.getByText(/This will send a sample SMS/)).toBeInTheDocument();
    });

    it("should have cancel and send buttons", () => {
        render(<TestMessageModal {...mockProps} />);
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Send Test Email")).toBeInTheDocument();
    });

    it("should call onClose when cancel is clicked", () => {
        render(<TestMessageModal {...mockProps} />);

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it("should send email test when button is clicked", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ delivery_id: "del-123" }),
        });

        render(<TestMessageModal {...mockProps} />);

        const sendButton = screen.getByText("Send Test Email");
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/test-message",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining('"channel":"email"'),
                })
            );
        });
    });

    it("should send SMS test when SMS is selected and button is clicked", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ delivery_id: "del-123" }),
        });

        render(<TestMessageModal {...mockProps} />);

        const smsButton = screen.getByText("SMS").closest("button");
        fireEvent.click(smsButton!);

        const sendButton = screen.getByText("Send Test SMS");
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/test-message",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining('"channel":"sms"'),
                })
            );
        });
    });

    it("should show loading state while sending", async () => {
        (global.fetch as any).mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: async () => ({ delivery_id: "del-123" }),
                            }),
                        100
                    )
                )
        );

        render(<TestMessageModal {...mockProps} />);

        const sendButton = screen.getByText("Send Test Email");
        fireEvent.click(sendButton);

        expect(screen.getByText("Sending...")).toBeInTheDocument();
        expect(screen.getByText("Sending...")).toBeDisabled();
    });

    it("should show success state after sending", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ delivery_id: "del-123" }),
        });

        render(<TestMessageModal {...mockProps} />);

        const sendButton = screen.getByText("Send Test Email");
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Test Message Sent!")).toBeInTheDocument();
        });
    });

    it("should display recipient email in success state", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ delivery_id: "del-123" }),
        });

        render(<TestMessageModal {...mockProps} />);

        const sendButton = screen.getByText("Send Test Email");
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(
                screen.getByText(/Check your inbox at user@example.com/)
            ).toBeInTheDocument();
        });
    });

    it("should auto-close modal after successful send", async () => {
        vi.useFakeTimers();

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ delivery_id: "del-123" }),
        });

        render(<TestMessageModal {...mockProps} />);

        const sendButton = screen.getByText("Send Test Email");
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Test Message Sent!")).toBeInTheDocument();
        });

        // Use async version to properly handle pending promises
        await vi.advanceTimersByTimeAsync(2000);

        await waitFor(() => {
            expect(mockProps.onClose).toHaveBeenCalled();
        });

        vi.useRealTimers();
    });

    it("should reset sent state when modal is reopened", () => {
        const { rerender } = render(<TestMessageModal {...mockProps} open={false} />);

        rerender(<TestMessageModal {...mockProps} open={true} />);

        expect(screen.getByText("Send Test Email")).toBeInTheDocument();
    });

    it("should handle email input change", () => {
        render(<TestMessageModal {...mockProps} />);

        const emailInput = screen.getByLabelText("Your Email Address");
        fireEvent.change(emailInput, { target: { value: "new@example.com" } });

        expect(emailInput).toHaveValue("new@example.com");
    });

    it("should handle phone input change", () => {
        render(<TestMessageModal {...mockProps} />);

        const smsButton = screen.getByText("SMS").closest("button");
        fireEvent.click(smsButton!);

        const phoneInput = screen.getByLabelText("Your Phone Number");
        fireEvent.change(phoneInput, { target: { value: "+9876543210" } });

        expect(phoneInput).toHaveValue("+9876543210");
    });

    it("should display placeholder for email input", () => {
        render(<TestMessageModal {...mockProps} userEmail="" />);
        const emailInput = screen.getByLabelText("Your Email Address");
        expect(emailInput).toHaveAttribute("placeholder", "your.email@example.com");
    });

    it("should display placeholder for phone input", () => {
        render(<TestMessageModal {...mockProps} userPhone="" />);

        const smsButton = screen.getByText("SMS").closest("button");
        fireEvent.click(smsButton!);

        const phoneInput = screen.getByLabelText("Your Phone Number");
        expect(phoneInput).toHaveAttribute("placeholder", "+1234567890");
    });

    it("should highlight selected channel", () => {
        render(<TestMessageModal {...mockProps} />);

        const emailButton = screen.getByText("Email").closest("button");
        expect(emailButton).toHaveClass("border-primary");
    });

    it("should handle API error gracefully", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Network error"));

        render(<TestMessageModal {...mockProps} />);

        const sendButton = screen.getByText("Send Test Email");
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.queryByText("Test Message Sent!")).not.toBeInTheDocument();
        });
    });

    it("should display close button in success state", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ delivery_id: "del-123" }),
        });

        render(<TestMessageModal {...mockProps} />);

        const sendButton = screen.getByText("Send Test Email");
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText("Close")).toBeInTheDocument();
        });
    });
});
