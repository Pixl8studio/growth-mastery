/**
 * PricingDisplay Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PricingDisplay } from "@/components/intake/pricing-display";

describe("PricingDisplay", () => {
    it("should render without crashing", () => {
        render(<PricingDisplay pricing={[]} />);
        expect(screen.getByText("No pricing information detected.")).toBeInTheDocument();
    });

    it("should display empty state when no pricing", () => {
        render(<PricingDisplay pricing={null} />);
        expect(screen.getByText("No pricing information detected.")).toBeInTheDocument();
        expect(
            screen.getByText(/Pricing is automatically extracted/)
        ).toBeInTheDocument();
    });

    it("should display single price", () => {
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: "Monthly subscription",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText("$99.00")).toBeInTheDocument();
        expect(screen.getByText("Monthly subscription")).toBeInTheDocument();
    });

    it("should display most likely price card", () => {
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: "Monthly plan",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText("Most Likely Price")).toBeInTheDocument();
    });

    it("should display confidence badges", () => {
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: "Price 1",
                confidence: "high" as const,
            },
            {
                amount: 49,
                currency: "USD",
                context: "Price 2",
                confidence: "medium" as const,
            },
            {
                amount: 29,
                currency: "USD",
                context: "Price 3",
                confidence: "low" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getAllByText("high")).toHaveLength(1);
        expect(screen.getAllByText("medium")).toHaveLength(1);
        expect(screen.getAllByText("low")).toHaveLength(1);
    });

    it("should sort prices by confidence and amount", () => {
        const pricing = [
            {
                amount: 49,
                currency: "USD",
                context: "Low price",
                confidence: "low" as const,
            },
            {
                amount: 99,
                currency: "USD",
                context: "High confidence",
                confidence: "high" as const,
            },
            {
                amount: 79,
                currency: "USD",
                context: "Medium price",
                confidence: "medium" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        const priceElements = screen.getAllByText(/\$\d+\.\d{2}/);
        expect(priceElements[0]).toHaveTextContent("$99.00");
    });

    it("should display all detected prices count", () => {
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: "Price 1",
                confidence: "high" as const,
            },
            {
                amount: 49,
                currency: "USD",
                context: "Price 2",
                confidence: "medium" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText("All Detected Prices (2)")).toBeInTheDocument();
    });

    it("should format currency correctly", () => {
        const pricing = [
            {
                amount: 1234.56,
                currency: "USD",
                context: "Test price",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    });

    it("should truncate long context in summary card", () => {
        const longContext = "a".repeat(150);
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: longContext,
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        const contextText = screen.getByText(/\.\.\.$/);
        expect(contextText.textContent).toHaveLength(103);
    });

    it("should display pricing insights for multiple prices", () => {
        const pricing = [
            {
                amount: 29,
                currency: "USD",
                context: "Basic",
                confidence: "high" as const,
            },
            {
                amount: 99,
                currency: "USD",
                context: "Premium",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText("Pricing Insights")).toBeInTheDocument();
        expect(screen.getByText(/Found 2 prices/)).toBeInTheDocument();
    });

    it("should display price range", () => {
        const pricing = [
            {
                amount: 29,
                currency: "USD",
                context: "Basic",
                confidence: "high" as const,
            },
            {
                amount: 99,
                currency: "USD",
                context: "Premium",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText(/Range:.*\$29\.00.*-.*\$99\.00/)).toBeInTheDocument();
    });

    it("should display high confidence count", () => {
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: "Price 1",
                confidence: "high" as const,
            },
            {
                amount: 49,
                currency: "USD",
                context: "Price 2",
                confidence: "high" as const,
            },
            {
                amount: 29,
                currency: "USD",
                context: "Price 3",
                confidence: "low" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText(/High confidence prices: 2/)).toBeInTheDocument();
    });

    it("should not display pricing insights for single price", () => {
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: "Only price",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.queryByText("Pricing Insights")).not.toBeInTheDocument();
    });

    it("should display context for each price", () => {
        const pricing = [
            {
                amount: 99,
                currency: "USD",
                context: "Premium monthly subscription",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText("Context:")).toBeInTheDocument();
        expect(screen.getByText("Premium monthly subscription")).toBeInTheDocument();
    });

    it("should handle empty array", () => {
        render(<PricingDisplay pricing={[]} />);

        expect(screen.getByText("No pricing information detected.")).toBeInTheDocument();
    });

    it("should handle different currencies", () => {
        const pricing = [
            {
                amount: 99,
                currency: "EUR",
                context: "Euro price",
                confidence: "high" as const,
            },
        ];

        render(<PricingDisplay pricing={pricing} />);

        expect(screen.getByText("€99.00")).toBeInTheDocument();
    });
});
