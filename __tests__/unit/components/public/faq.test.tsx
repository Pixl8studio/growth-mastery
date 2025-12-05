/**
 * FAQ Component Tests
 * Tests FAQ accordion functionality and support contact section
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FAQ from "@/components/public/faq";

describe("FAQ", () => {
    it("should render the component", () => {
        render(<FAQ />);
        expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
        expect(
            screen.getByText("Everything you need to know about GrowthMastery.ai")
        ).toBeInTheDocument();
    });

    it("should display all FAQ questions", () => {
        render(<FAQ />);

        expect(screen.getByText("Do I have to switch CRMs?")).toBeInTheDocument();
        expect(screen.getByText("What if I don't have an offer yet?")).toBeInTheDocument();
        expect(screen.getByText("How fast can I launch?")).toBeInTheDocument();
        expect(
            screen.getByText("What if I already have an existing funnel or offer?")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Is the $997 deposit really refundable?")
        ).toBeInTheDocument();
        expect(screen.getByText("How does the 5% performance fee work?")).toBeInTheDocument();
        expect(
            screen.getByText("What if I need support or want help optimizing?")
        ).toBeInTheDocument();
    });

    it("should have 7 FAQ items", () => {
        const { container } = render(<FAQ />);

        const accordionItems = container.querySelectorAll('[data-radix-accordion-item]');
        expect(accordionItems.length).toBe(7);
    });

    it("should display support contact section", () => {
        render(<FAQ />);

        expect(screen.getByText("Still have questions?")).toBeInTheDocument();
        expect(
            screen.getByText("Our team is here to help you get started")
        ).toBeInTheDocument();
    });

    it("should have contact support button with email link", () => {
        render(<FAQ />);

        const contactButton = screen.getByRole("link", { name: /Contact Support/ });
        expect(contactButton).toBeInTheDocument();
        expect(contactButton).toHaveAttribute(
            "href",
            "mailto:joe@growthmastery.ai?subject=Growth"
        );
    });

    it("should display CRM agnostic answer", () => {
        render(<FAQ />);

        expect(
            screen.getByText(/No\. GrowthMastery is CRM-agnostic/)
        ).toBeInTheDocument();
    });

    it("should display refundable deposit answer", () => {
        render(<FAQ />);

        expect(screen.getByText(/Yes - 100%/)).toBeInTheDocument();
    });

    it("should display performance fee explanation", () => {
        render(<FAQ />);

        expect(screen.getByText(/We only earn when you do/)).toBeInTheDocument();
    });
});
