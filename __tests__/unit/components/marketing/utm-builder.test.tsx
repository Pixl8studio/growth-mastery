/**
 * UTMBuilder Component Tests
 * Tests UTM parameter building with copy and reset functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UTMBuilder } from "@/components/marketing/utm-builder";

// Mock dependencies
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

// Mock clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(),
    },
});

describe("UTMBuilder", () => {
    const mockOnUrlChange = vi.fn();

    const defaultProps = {
        baseUrl: "https://example.com",
        onUrlChange: mockOnUrlChange,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockToast.mockClear();
    });

    it("should render correctly with base props", () => {
        render(<UTMBuilder {...defaultProps} />);

        expect(screen.getByText("UTM Parameters")).toBeInTheDocument();
        expect(screen.getByLabelText(/Source/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Medium/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Campaign/i)).toBeInTheDocument();
    });

    it("should populate with default values", () => {
        render(<UTMBuilder {...defaultProps} />);

        expect(screen.getByLabelText(/Source/i)).toHaveValue("social");
        expect(screen.getByLabelText(/Medium/i)).toHaveValue("organic");
    });

    it("should populate with provided defaults", () => {
        render(
            <UTMBuilder
                {...defaultProps}
                defaultCampaign="test-campaign"
                defaultSource="email"
                defaultMedium="newsletter"
                defaultContent="variant-a"
            />
        );

        expect(screen.getByLabelText(/Source/i)).toHaveValue("email");
        expect(screen.getByLabelText(/Medium/i)).toHaveValue("newsletter");
        expect(screen.getByLabelText(/Campaign/i)).toHaveValue("test-campaign");
        expect(screen.getByLabelText(/Content/i)).toHaveValue("variant-a");
    });

    it("should build final URL with parameters", () => {
        render(<UTMBuilder {...defaultProps} />);

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).toHaveValue(
            "https://example.com?utm_source=social&utm_medium=organic"
        );
    });

    it("should update final URL when parameters change", () => {
        render(<UTMBuilder {...defaultProps} />);

        const campaignInput = screen.getByLabelText(/Campaign/i);
        fireEvent.change(campaignInput, { target: { value: "my-campaign" } });

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).toHaveValue(
            expect.stringContaining("utm_campaign=my-campaign")
        );
    });

    it("should call onUrlChange when parameters change", () => {
        render(<UTMBuilder {...defaultProps} />);

        const sourceInput = screen.getByLabelText(/Source/i);
        fireEvent.change(sourceInput, { target: { value: "facebook" } });

        expect(mockOnUrlChange).toHaveBeenCalledWith(
            expect.stringContaining("utm_source=facebook")
        );
    });

    it("should handle base URL with existing query parameters", () => {
        render(<UTMBuilder {...defaultProps} baseUrl="https://example.com?foo=bar" />);

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).toHaveValue(
            expect.stringContaining("foo=bar&utm_source=social")
        );
    });

    it("should copy final URL to clipboard", async () => {
        const writeTextMock = vi.spyOn(navigator.clipboard, "writeText");

        render(<UTMBuilder {...defaultProps} />);

        const copyButton = screen.getByRole("button", { name: "" }); // Icon button
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(writeTextMock).toHaveBeenCalledWith(
                expect.stringContaining("utm_source=social")
            );
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Copied to Clipboard",
                })
            );
        });
    });

    it("should show checkmark after successful copy", async () => {
        vi.spyOn(navigator.clipboard, "writeText").mockResolvedValueOnce();

        render(<UTMBuilder {...defaultProps} />);

        const copyButton = screen.getByRole("button", { name: "" });
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(copyButton.querySelector("svg")).toBeInTheDocument();
        });
    });

    it("should handle copy error", async () => {
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
            new Error("Clipboard error")
        );

        render(<UTMBuilder {...defaultProps} />);

        const copyButton = screen.getByRole("button", { name: "" });
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Copy Failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should reset parameters to defaults", () => {
        render(<UTMBuilder {...defaultProps} defaultCampaign="initial-campaign" />);

        // Change values
        const sourceInput = screen.getByLabelText(/Source/i);
        fireEvent.change(sourceInput, { target: { value: "facebook" } });

        const campaignInput = screen.getByLabelText(/Campaign/i);
        fireEvent.change(campaignInput, { target: { value: "new-campaign" } });

        // Reset
        const resetButton = screen.getByRole("button", { name: /Reset/i });
        fireEvent.click(resetButton);

        expect(sourceInput).toHaveValue("social");
        expect(campaignInput).toHaveValue("initial-campaign");
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Reset to Defaults",
            })
        );
    });

    it("should display required field indicators", () => {
        render(<UTMBuilder {...defaultProps} />);

        const requiredMarkers = screen.getAllByText("*");
        expect(requiredMarkers.length).toBeGreaterThan(0);
    });

    it("should allow optional content parameter", () => {
        render(<UTMBuilder {...defaultProps} />);

        const contentInput = screen.getByLabelText(/Content/i);
        expect(contentInput).toBeInTheDocument();

        fireEvent.change(contentInput, { target: { value: "variant-b" } });

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).toHaveValue(
            expect.stringContaining("utm_content=variant-b")
        );
    });

    it("should not include empty parameters in final URL", () => {
        render(<UTMBuilder {...defaultProps} />);

        const contentInput = screen.getByLabelText(/Content/i);
        expect(contentInput).toHaveValue("");

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).not.toHaveValue(expect.stringContaining("utm_content"));
    });

    it("should display usage tip", () => {
        render(<UTMBuilder {...defaultProps} />);

        expect(
            screen.getByText(/Use this URL in your social posts to track campaign/i)
        ).toBeInTheDocument();
    });

    it("should handle empty base URL", () => {
        render(<UTMBuilder {...defaultProps} baseUrl="" />);

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).toHaveValue("");
    });

    it("should update all parameters independently", () => {
        render(<UTMBuilder {...defaultProps} />);

        const sourceInput = screen.getByLabelText(/Source/i);
        const mediumInput = screen.getByLabelText(/Medium/i);
        const campaignInput = screen.getByLabelText(/Campaign/i);
        const contentInput = screen.getByLabelText(/Content/i);

        fireEvent.change(sourceInput, { target: { value: "instagram" } });
        fireEvent.change(mediumInput, { target: { value: "paid" } });
        fireEvent.change(campaignInput, { target: { value: "summer-sale" } });
        fireEvent.change(contentInput, { target: { value: "carousel-ad" } });

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).toHaveValue(
            expect.stringContaining("utm_source=instagram")
        );
        expect(finalUrlInput).toHaveValue(expect.stringContaining("utm_medium=paid"));
        expect(finalUrlInput).toHaveValue(
            expect.stringContaining("utm_campaign=summer-sale")
        );
        expect(finalUrlInput).toHaveValue(
            expect.stringContaining("utm_content=carousel-ad")
        );
    });

    it("should have readonly final URL input", () => {
        render(<UTMBuilder {...defaultProps} />);

        const finalUrlInput = screen.getByLabelText(/Final URL/i);
        expect(finalUrlInput).toHaveAttribute("readonly");
    });

    it("should display placeholders for inputs", () => {
        render(<UTMBuilder {...defaultProps} />);

        expect(screen.getByPlaceholderText("social")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("organic")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Q4_lead_gen")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("variant_a")).toBeInTheDocument();
    });
});
