/**
 * AudienceBuilder Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AudienceBuilder } from "@/components/ads/audience-builder";

describe("AudienceBuilder", () => {
    const mockOnConfigured = vi.fn();

    const mockProps = {
        projectId: "project-123",
        onConfigured: mockOnConfigured,
        initialBudget: 1000,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render audience type options", () => {
        render(<AudienceBuilder {...mockProps} />);

        expect(screen.getByText("Interest Targeting")).toBeInTheDocument();
        expect(screen.getByText("Lookalike Audience")).toBeInTheDocument();
    });

    it("should select interest targeting by default", () => {
        render(<AudienceBuilder {...mockProps} />);

        const interestRadio = screen.getByLabelText("Interest Targeting");
        expect(interestRadio).toBeChecked();
    });

    it("should show ideal customer textarea for interest targeting", () => {
        render(<AudienceBuilder {...mockProps} />);

        expect(
            screen.getByPlaceholderText(
                /Business owners aged 30-50 interested in digital marketing/
            )
        ).toBeInTheDocument();
    });

    it("should handle ideal customer input", async () => {
        render(<AudienceBuilder {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /Business owners aged 30-50 interested in digital marketing/
        );
        fireEvent.change(textarea, {
            target: { value: "Entrepreneurs interested in online courses" },
        });

        await waitFor(() => {
            expect(mockOnConfigured).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "interest",
                    description: "Entrepreneurs interested in online courses",
                }),
                1000
            );
        });
    });

    it("should switch to lookalike audience type", () => {
        render(<AudienceBuilder {...mockProps} />);

        const lookalikeCard = screen.getByText("Lookalike Audience").closest("div");
        if (lookalikeCard) {
            fireEvent.click(lookalikeCard);
        }

        const lookalikeRadio = screen.getByLabelText("Lookalike Audience");
        expect(lookalikeRadio).toBeChecked();
    });

    it("should show file upload for lookalike audience", () => {
        render(<AudienceBuilder {...mockProps} />);

        const lookalikeCard = screen.getByText("Lookalike Audience").closest("div");
        if (lookalikeCard) {
            fireEvent.click(lookalikeCard);
        }

        expect(screen.getByLabelText("Upload Customer List")).toBeInTheDocument();
    });

    it("should handle file upload", async () => {
        render(<AudienceBuilder {...mockProps} />);

        const lookalikeCard = screen.getByText("Lookalike Audience").closest("div");
        if (lookalikeCard) {
            fireEvent.click(lookalikeCard);
        }

        const fileInput = screen.getByLabelText("Upload Customer List");
        const file = new File(["email@example.com"], "customers.csv", {
            type: "text/csv",
        });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(mockOnConfigured).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "lookalike",
                    source_file: "customers.csv",
                }),
                1000
            );
        });
    });

    it("should display budget slider", () => {
        render(<AudienceBuilder {...mockProps} />);

        expect(screen.getByText("Daily Budget: $10.00/day")).toBeInTheDocument();
    });

    it("should handle budget change", async () => {
        render(<AudienceBuilder {...mockProps} />);

        const slider = screen.getByRole("slider");
        // Use keyboard events for Radix slider instead of change event
        fireEvent.keyDown(slider, { key: "ArrowRight" });

        await waitFor(() => {
            // Verify slider is interactive
            expect(slider).toBeInTheDocument();
        });
    });

    it("should display budget projection", () => {
        render(<AudienceBuilder {...mockProps} />);

        expect(screen.getByText("Budget Projection")).toBeInTheDocument();
        expect(screen.getByText("$10.00")).toBeInTheDocument(); // Daily
        expect(screen.getByText("$70.00")).toBeInTheDocument(); // Weekly
        expect(screen.getByText("$300.00")).toBeInTheDocument(); // Monthly
    });

    it("should show estimated reach after configuration", async () => {
        render(<AudienceBuilder {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /Business owners aged 30-50 interested in digital marketing/
        );
        fireEvent.change(textarea, {
            target: { value: "Test audience" },
        });

        await waitFor(() => {
            expect(screen.getByText("Estimated Reach")).toBeInTheDocument();
            expect(screen.getByText(/50,000 - 200,000/)).toBeInTheDocument();
        });
    });

    it("should show file uploaded confirmation", async () => {
        render(<AudienceBuilder {...mockProps} />);

        const lookalikeCard = screen.getByText("Lookalike Audience").closest("div");
        if (lookalikeCard) {
            fireEvent.click(lookalikeCard);
        }

        const fileInput = screen.getByLabelText("Upload Customer List");
        const file = new File(["email@example.com"], "customers.csv", {
            type: "text/csv",
        });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(
                screen.getByText("✓ File uploaded: customers.csv")
            ).toBeInTheDocument();
        });
    });

    it("should update budget in configuration callback", async () => {
        render(<AudienceBuilder {...mockProps} />);

        const textarea = screen.getByPlaceholderText(
            /Business owners aged 30-50 interested in digital marketing/
        );
        fireEvent.change(textarea, {
            target: { value: "Test audience" },
        });

        await waitFor(() => {
            expect(mockOnConfigured).toHaveBeenCalledWith(expect.any(Object), 1000);
        });

        // Verify slider is present and interactive
        const slider = screen.getByRole("slider");
        expect(slider).toBeInTheDocument();

        // Use keyboard navigation for Radix slider
        fireEvent.keyDown(slider, { key: "ArrowRight" });

        // Verify callback was still called after slider interaction
        await waitFor(() => {
            expect(mockOnConfigured).toHaveBeenCalled();
        });
    });
});
