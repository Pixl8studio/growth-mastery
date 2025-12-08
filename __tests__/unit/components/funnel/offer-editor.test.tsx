/**
 * OfferEditor Component Tests
 * Tests offer editing with features, bonuses, and 7 P's framework
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OfferEditor } from "@/components/funnel/offer-editor";

describe("OfferEditor", () => {
    const mockOnSave = vi.fn();

    const mockOffer = {
        name: "Premium Course",
        description: "Learn advanced techniques",
        price: 997,
        currency: "USD",
        features: ["Feature 1", "Feature 2"],
        bonuses: ["Bonus 1"],
        guarantee: "30-day money back",
        promise: "Transform your skills",
        person: "Beginners to intermediate",
        process: "12-week program",
        purpose: "Career advancement",
        pathway: "direct_purchase" as const,
        max_features: 6,
        max_bonuses: 5,
    };

    const defaultProps = {
        initialOffer: mockOffer,
        onSave: mockOnSave,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render core tab by default", () => {
        render(<OfferEditor {...defaultProps} />);

        expect(screen.getByDisplayValue("Premium Course")).toBeInTheDocument();
        expect(screen.getByDisplayValue("997")).toBeInTheDocument();
    });

    it("should display features", () => {
        render(<OfferEditor {...defaultProps} />);

        expect(screen.getByText("Feature 1")).toBeInTheDocument();
        expect(screen.getByText("Feature 2")).toBeInTheDocument();
    });

    it("should display bonuses", () => {
        render(<OfferEditor {...defaultProps} />);

        expect(screen.getByText("Bonus 1")).toBeInTheDocument();
    });

    it("should allow adding features", () => {
        render(<OfferEditor {...defaultProps} />);

        const addButton = screen.getByRole("button", { name: /Add.*[Ff]eature/i });
        fireEvent.click(addButton);

        expect(screen.getByText("New feature")).toBeInTheDocument();
    });

    it("should allow removing features", () => {
        render(<OfferEditor {...defaultProps} />);

        const removeButtons = screen.getAllByRole("button");
        const featureRemoveButton = removeButtons.find((btn) =>
            btn.closest("div")?.textContent?.includes("Feature 1")
        );

        if (featureRemoveButton) {
            fireEvent.click(featureRemoveButton);
        }

        expect(screen.queryByText("Feature 1")).not.toBeInTheDocument();
    });

    it("should call onSave when save button clicked", async () => {
        mockOnSave.mockResolvedValueOnce(undefined);

        render(<OfferEditor {...defaultProps} />);

        const saveButton = screen.getByRole("button", { name: /Save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
        });
    });

    it("should not render save button in read-only mode", () => {
        render(<OfferEditor {...defaultProps} readOnly={true} />);

        expect(screen.queryByRole("button", { name: /Save/i })).not.toBeInTheDocument();
    });

    it("should enforce max features limit", () => {
        const offerWithMaxFeatures = {
            ...mockOffer,
            features: Array(6).fill("Feature"),
        };

        render(<OfferEditor initialOffer={offerWithMaxFeatures} onSave={mockOnSave} />);

        const addButton = screen.getByRole("button", { name: /Add.*[Ff]eature/i });
        expect(addButton).toBeDisabled();
    });

    it("should enforce max bonuses limit", () => {
        const offerWithMaxBonuses = {
            ...mockOffer,
            bonuses: Array(5).fill("Bonus"),
        };

        render(<OfferEditor initialOffer={offerWithMaxBonuses} onSave={mockOnSave} />);

        const addButton = screen.getByRole("button", { name: /Add.*[Bb]onus/i });
        expect(addButton).toBeDisabled();
    });
});
