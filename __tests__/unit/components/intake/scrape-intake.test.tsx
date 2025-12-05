/**
 * ScrapeIntake Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ScrapeIntake } from "@/components/intake/scrape-intake";

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

global.fetch = vi.fn();

describe("ScrapeIntake", () => {
    const defaultProps = {
        projectId: "project-123",
        userId: "user-456",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<ScrapeIntake {...defaultProps} />);
        expect(screen.getByText("Scrape Website Content")).toBeInTheDocument();
    });

    it("should display session name input", () => {
        render(<ScrapeIntake {...defaultProps} />);
        expect(screen.getByLabelText(/Session Name/)).toBeInTheDocument();
    });

    it("should display URL input", () => {
        render(<ScrapeIntake {...defaultProps} />);
        expect(screen.getByLabelText(/Website URL/)).toBeInTheDocument();
    });

    it("should update session name as user types", async () => {
        const user = userEvent.setup();
        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Session Name/);
        await user.type(input, "My Sales Page");

        expect(input).toHaveValue("My Sales Page");
    });

    it("should update URL as user types", async () => {
        const user = userEvent.setup();
        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        expect(input).toHaveValue("https://example.com");
    });

    it("should disable scrape button when URL is empty", () => {
        render(<ScrapeIntake {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        expect(button).toBeDisabled();
    });

    it("should enable scrape button when URL is provided", async () => {
        const user = userEvent.setup();
        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        expect(button).not.toBeDisabled();
    });

    it("should show preview link when valid URL is entered", async () => {
        const user = userEvent.setup();
        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        expect(screen.getByText(/Preview in new tab/)).toBeInTheDocument();
    });

    it("should not show preview link for invalid URL", async () => {
        const user = userEvent.setup();
        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "invalid-url");

        expect(screen.queryByText(/Preview in new tab/)).not.toBeInTheDocument();
    });

    it("should show error toast for invalid URL on submit", async () => {
        const user = userEvent.setup();
        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "invalid-url");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        expect(mockToast).toHaveBeenCalledWith({
            title: "Invalid URL",
            description: "Please enter a valid HTTP or HTTPS URL.",
            variant: "destructive",
        });
    });

    it("should reject non-HTTP/HTTPS protocols", async () => {
        const user = userEvent.setup();
        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "ftp://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        expect(mockToast).toHaveBeenCalledWith({
            title: "Invalid URL",
            description: "Please enter a valid HTTP or HTTPS URL.",
            variant: "destructive",
        });
    });

    it("should submit scrape request successfully", async () => {
        const user = userEvent.setup();
        const mockResponse = {
            intakeId: "intake-789",
            preview: "Sample content from website",
        };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/scrape",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })
            );
        });
    });

    it("should use hostname as session name when not provided", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789", preview: "Content" }),
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com/sales-page");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/scrape",
                expect.objectContaining({
                    body: expect.stringContaining("example.com"),
                })
            );
        });
    });

    it("should use custom session name when provided", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789", preview: "Content" }),
        });

        render(<ScrapeIntake {...defaultProps} />);

        const sessionInput = screen.getByLabelText(/Session Name/);
        await user.type(sessionInput, "Sales Page Copy");

        const urlInput = screen.getByLabelText(/Website URL/);
        await user.type(urlInput, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/scrape",
                expect.objectContaining({
                    body: expect.stringContaining("Sales Page Copy"),
                })
            );
        });
    });

    it("should display preview after successful scrape", async () => {
        const user = userEvent.setup();
        const mockResponse = {
            intakeId: "intake-789",
            preview: "Sample content from website",
        };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(screen.getByText("Sample content from website")).toBeInTheDocument();
        });
    });

    it("should display brand data when extracted", async () => {
        const user = userEvent.setup();
        const mockResponse = {
            intakeId: "intake-789",
            preview: "Content",
            brandData: {
                colors: {
                    primary: "#ff0000",
                    secondary: "#00ff00",
                    accent: "#0000ff",
                    background: "#ffffff",
                    text: "#000000",
                },
                fonts: {
                    primary: "Arial",
                    weights: ["400", "700"],
                },
                confidence: {
                    colors: 85,
                    fonts: 75,
                    overall: 80,
                },
            },
        };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(screen.getByText("Brand Colors Extracted")).toBeInTheDocument();
            expect(screen.getByText(/Confidence: 80%/)).toBeInTheDocument();
        });
    });

    it("should show success toast with brand data message", async () => {
        const user = userEvent.setup();
        const mockResponse = {
            intakeId: "intake-789",
            preview: "Content",
            brandData: {
                colors: {
                    primary: "#ff0000",
                    secondary: "#00ff00",
                    accent: "#0000ff",
                    background: "#ffffff",
                    text: "#000000",
                },
                fonts: { weights: [] },
                confidence: { colors: 85, fonts: 75, overall: 80 },
            },
        };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Content imported!",
                description: "Website content and brand colors extracted successfully.",
            });
        });
    });

    it("should show success toast without brand data message", async () => {
        const user = userEvent.setup();
        const mockResponse = {
            intakeId: "intake-789",
            preview: "Content",
        };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Content imported!",
                description: "Website content has been scraped successfully.",
            });
        });
    });

    it("should clear form after successful scrape", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789", preview: "Content" }),
        });

        render(<ScrapeIntake {...defaultProps} />);

        const sessionInput = screen.getByLabelText(/Session Name/);
        await user.type(sessionInput, "Test");

        const urlInput = screen.getByLabelText(/Website URL/);
        await user.type(urlInput, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(sessionInput).toHaveValue("");
            expect(urlInput).toHaveValue("");
        });
    });

    it("should call onComplete callback after successful scrape", async () => {
        vi.useFakeTimers();
        const user = userEvent.setup({ delay: null });
        const onComplete = vi.fn();
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789", preview: "Content" }),
        });

        render(<ScrapeIntake {...defaultProps} onComplete={onComplete} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
        });

        vi.advanceTimersByTime(1500);

        expect(onComplete).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("should show error toast on API error", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Failed to scrape URL" }),
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Scraping failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should show error toast on network error", async () => {
        const user = userEvent.setup();
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Scraping failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should show Scraping... text while processing", async () => {
        const user = userEvent.setup();
        let resolvePromise: any;
        (global.fetch as any).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolvePromise = () =>
                        resolve({
                            ok: true,
                            json: async () => ({ intakeId: "intake-789", preview: "Content" }),
                        });
                })
        );

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(screen.getByText("Scraping...")).toBeInTheDocument();
        });

        resolvePromise();

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
        });
    });

    it("should display tips section", () => {
        render(<ScrapeIntake {...defaultProps} />);

        expect(screen.getByText("💡 Tips")).toBeInTheDocument();
        expect(
            screen.getByText(/Works best with enrollment pages/)
        ).toBeInTheDocument();
    });

    it("should clear preview and brand data before new scrape", async () => {
        const user = userEvent.setup();

        // First scrape
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                intakeId: "intake-1",
                preview: "First content",
                brandData: {
                    colors: {
                        primary: "#ff0000",
                        secondary: "#00ff00",
                        accent: "#0000ff",
                        background: "#ffffff",
                        text: "#000000",
                    },
                    fonts: { weights: [] },
                    confidence: { colors: 85, fonts: 75, overall: 80 },
                },
            }),
        });

        render(<ScrapeIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Website URL/);
        await user.type(input, "https://example.com");

        const button = screen.getByRole("button", { name: /Scrape and Import/ });
        await user.click(button);

        await waitFor(() => {
            expect(screen.getByText("First content")).toBeInTheDocument();
        });

        // Second scrape
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                intakeId: "intake-2",
                preview: "Second content",
            }),
        });

        await user.clear(input);
        await user.type(input, "https://example2.com");
        await user.click(button);

        await waitFor(() => {
            expect(screen.getByText("Second content")).toBeInTheDocument();
        });

        expect(screen.queryByText("First content")).not.toBeInTheDocument();
    });
});
