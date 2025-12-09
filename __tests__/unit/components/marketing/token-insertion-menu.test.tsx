/**
 * TokenInsertionMenu Component Tests
 * Tests token insertion dropdown menu with search and categories
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TokenInsertionMenu } from "@/components/marketing/token-insertion-menu";

describe("TokenInsertionMenu", () => {
    const mockOnInsertToken = vi.fn();

    const defaultProps = {
        onInsertToken: mockOnInsertToken,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render closed by default", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        expect(screen.getByText("Insert Token")).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText("Search tokens...")
        ).not.toBeInTheDocument();
    });

    it("should open menu when button clicked", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByPlaceholderText("Search tokens...")).toBeInTheDocument();
    });

    it("should close menu when backdrop clicked", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const backdrop = document.querySelector(".fixed.inset-0");
        if (backdrop) {
            fireEvent.click(backdrop);
        }

        expect(
            screen.queryByPlaceholderText("Search tokens...")
        ).not.toBeInTheDocument();
    });

    it("should display search input when open", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const searchInput = screen.getByPlaceholderText("Search tokens...");
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveFocus();
    });

    it("should display token categories", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByText("Personal")).toBeInTheDocument();
        expect(screen.getByText("Event")).toBeInTheDocument();
        expect(screen.getByText("Offer")).toBeInTheDocument();
        expect(screen.getByText("Urgency")).toBeInTheDocument();
        expect(screen.getByText("Sender")).toBeInTheDocument();
    });

    it("should display personal tokens", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByText("{first_name}")).toBeInTheDocument();
        expect(screen.getByText("{last_name}")).toBeInTheDocument();
        expect(screen.getByText("{email}")).toBeInTheDocument();
    });

    it("should display token descriptions", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByText("Contact's first name")).toBeInTheDocument();
        expect(screen.getByText("Contact's email address")).toBeInTheDocument();
    });

    it("should filter tokens by search term", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const searchInput = screen.getByPlaceholderText("Search tokens...");
        fireEvent.change(searchInput, { target: { value: "name" } });

        expect(screen.getByText("{first_name}")).toBeInTheDocument();
        expect(screen.getByText("{last_name}")).toBeInTheDocument();
        expect(screen.queryByText("{email}")).not.toBeInTheDocument();
    });

    it("should filter tokens by description", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const searchInput = screen.getByPlaceholderText("Search tokens...");
        fireEvent.change(searchInput, { target: { value: "deadline" } });

        expect(screen.getByText("{deadline_date}")).toBeInTheDocument();
        expect(screen.getByText("{deadline_time}")).toBeInTheDocument();
    });

    it("should be case insensitive when filtering", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const searchInput = screen.getByPlaceholderText("Search tokens...");
        fireEvent.change(searchInput, { target: { value: "EMAIL" } });

        expect(screen.getByText("{email}")).toBeInTheDocument();
    });

    it("should call onInsertToken when token clicked", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const token = screen.getByText("{first_name}");
        fireEvent.click(token.closest("button")!);

        expect(mockOnInsertToken).toHaveBeenCalledWith("{first_name}");
    });

    it("should close menu after token insertion", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const token = screen.getByText("{first_name}");
        fireEvent.click(token.closest("button")!);

        expect(
            screen.queryByPlaceholderText("Search tokens...")
        ).not.toBeInTheDocument();
    });

    it("should display no results message when search has no matches", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const searchInput = screen.getByPlaceholderText("Search tokens...");
        fireEvent.change(searchInput, { target: { value: "nonexistent" } });

        expect(screen.getByText("No tokens found")).toBeInTheDocument();
    });

    it("should display tip in footer", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(
            screen.getByText(/Tokens are replaced with actual values/i)
        ).toBeInTheDocument();
    });

    it("should display event tokens", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByText("{webinar_title}")).toBeInTheDocument();
        expect(screen.getByText("{watch_percentage}")).toBeInTheDocument();
        expect(screen.getByText("{registration_date}")).toBeInTheDocument();
    });

    it("should display offer tokens", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByText("{offer_name}")).toBeInTheDocument();
        expect(screen.getByText("{offer_price}")).toBeInTheDocument();
        expect(screen.getByText("{discount_amount}")).toBeInTheDocument();
    });

    it("should display urgency tokens", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByText("{deadline_date}")).toBeInTheDocument();
        expect(screen.getByText("{deadline_time}")).toBeInTheDocument();
        expect(screen.getByText("{hours_remaining}")).toBeInTheDocument();
    });

    it("should display sender tokens", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        expect(screen.getByText("{sender_name}")).toBeInTheDocument();
        expect(screen.getByText("{sender_email}")).toBeInTheDocument();
    });

    it("should hide category when no tokens match search", () => {
        render(<TokenInsertionMenu {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Insert Token/i });
        fireEvent.click(button);

        const searchInput = screen.getByPlaceholderText("Search tokens...");
        fireEvent.change(searchInput, { target: { value: "first_name" } });

        expect(screen.queryByText("Event")).not.toBeInTheDocument();
        expect(screen.queryByText("Offer")).not.toBeInTheDocument();
    });
});
