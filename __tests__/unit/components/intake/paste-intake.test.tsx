/**
 * PasteIntake Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PasteIntake } from "@/components/intake/paste-intake";

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

global.fetch = vi.fn();

describe("PasteIntake", () => {
    const defaultProps = {
        projectId: "project-123",
        userId: "user-456",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<PasteIntake {...defaultProps} />);
        expect(screen.getByText("Paste Your Content")).toBeInTheDocument();
    });

    it("should display session name input", () => {
        render(<PasteIntake {...defaultProps} />);
        expect(screen.getByLabelText(/Session Name/)).toBeInTheDocument();
    });

    it("should display content textarea", () => {
        render(<PasteIntake {...defaultProps} />);
        expect(screen.getByLabelText(/Content/)).toBeInTheDocument();
    });

    it("should update word count as user types", async () => {
        const user = userEvent.setup();
        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        await user.type(textarea, "Hello world test");

        expect(screen.getByText("3 words")).toBeInTheDocument();
    });

    it("should update character count as user types", async () => {
        const user = userEvent.setup();
        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        await user.type(textarea, "Hello");

        expect(screen.getByText("5 characters")).toBeInTheDocument();
    });

    it("should disable submit button when content is too short", () => {
        render(<PasteIntake {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Save Content/ });
        expect(button).toBeDisabled();
    });

    it("should enable submit button when content is sufficient", async () => {
        const user = userEvent.setup();
        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        expect(button).not.toBeDisabled();
    });

    it("should show error toast when content is too short on submit", async () => {
        const user = userEvent.setup();
        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        await user.type(textarea, "Short");

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        expect(mockToast).toHaveBeenCalledWith({
            title: "Content too short",
            description: "Please provide at least 100 characters of content.",
            variant: "destructive",
        });
    });

    it("should submit content successfully", async () => {
        const user = userEvent.setup();
        const mockResponse = { intakeId: "intake-789", success: true };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/paste",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })
            );
        });
    });

    it("should use default session name if not provided", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/paste",
                expect.objectContaining({
                    body: expect.stringContaining("Pasted Content"),
                })
            );
        });
    });

    it("should use custom session name if provided", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        render(<PasteIntake {...defaultProps} />);

        const sessionInput = screen.getByLabelText(/Session Name/);
        await user.type(sessionInput, "My Custom Session");

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/paste",
                expect.objectContaining({
                    body: expect.stringContaining("My Custom Session"),
                })
            );
        });
    });

    it("should show success toast after successful submission", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Content saved!",
                description: "Your content has been saved successfully.",
            });
        });
    });

    it("should clear form after successful submission", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        render(<PasteIntake {...defaultProps} />);

        const sessionInput = screen.getByLabelText(/Session Name/);
        await user.type(sessionInput, "Test Session");

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(sessionInput).toHaveValue("");
            expect(textarea).toHaveValue("");
        });
    });

    it("should call onComplete callback after successful submission", async () => {
        vi.useFakeTimers();
        const user = userEvent.setup({ delay: null });
        const onComplete = vi.fn();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        render(<PasteIntake {...defaultProps} onComplete={onComplete} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        vi.advanceTimersByTime(1000);

        expect(onComplete).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("should show error toast on API error", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "API Error" }),
        });

        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Error",
                description: "API Error",
                variant: "destructive",
            });
        });
    });

    it("should show generic error toast on network error", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Error",
                description: "Network error",
                variant: "destructive",
            });
        });
    });

    it("should display tips section", () => {
        render(<PasteIntake {...defaultProps} />);

        expect(screen.getByText("💡 Tips")).toBeInTheDocument();
        expect(
            screen.getByText(/Include details about your business/)
        ).toBeInTheDocument();
    });

    it("should show Saving... text while submitting", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockImplementationOnce(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: async () => ({ intakeId: "intake-789" }),
                            }),
                        100
                    )
                )
        );

        render(<PasteIntake {...defaultProps} />);

        const textarea = screen.getByLabelText(/Content/);
        const longText = "a".repeat(100);
        await user.type(textarea, longText);

        const button = screen.getByRole("button", { name: /Save Content/ });
        await user.click(button);

        expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
});
