/**
 * ContactsStats Component Tests
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactsStats } from "@/components/contacts/contacts-stats";

describe("ContactsStats", () => {
    const mockStats = {
        total: 100,
        registered: 60,
        watched: 30,
        enrolled: 15,
        purchased: 5,
    };

    it("should render all stat cards", () => {
        render(<ContactsStats stats={mockStats} />);

        expect(screen.getByText("Total Contacts")).toBeInTheDocument();
        expect(screen.getByText("Registered")).toBeInTheDocument();
        expect(screen.getByText("Watched Video")).toBeInTheDocument();
        expect(screen.getByText("Viewed Enrollment")).toBeInTheDocument();
        expect(screen.getByText("Purchased")).toBeInTheDocument();
    });

    it("should display correct numbers", () => {
        render(<ContactsStats stats={mockStats} />);

        expect(screen.getByText("100")).toBeInTheDocument(); // total
        expect(screen.getByText("60")).toBeInTheDocument(); // registered
        expect(screen.getByText("30")).toBeInTheDocument(); // watched
        expect(screen.getByText("15")).toBeInTheDocument(); // enrolled
        expect(screen.getByText("5")).toBeInTheDocument(); // purchased
    });

    it("should display percentages", () => {
        render(<ContactsStats stats={mockStats} />);

        // 60/100 = 60%
        expect(screen.getByText("60%")).toBeInTheDocument();
        // 30/100 = 30%
        expect(screen.getByText("30%")).toBeInTheDocument();
        // 15/100 = 15%
        expect(screen.getByText("15%")).toBeInTheDocument();
        // 5/100 = 5%
        expect(screen.getByText("5%")).toBeInTheDocument();
    });

    it("should handle zero total without crashing", () => {
        const emptyStats = {
            total: 0,
            registered: 0,
            watched: 0,
            enrolled: 0,
            purchased: 0,
        };

        render(<ContactsStats stats={emptyStats} />);

        expect(screen.getByText("Total Contacts")).toBeInTheDocument();
        expect(screen.getAllByText("0")).toHaveLength(5);
    });
});
