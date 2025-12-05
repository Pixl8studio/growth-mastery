/**
 * PagesFilterBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PagesFilterBar } from "@/components/pages/pages-filter-bar";
import { useRouter, useSearchParams } from "next/navigation";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
}));

describe("PagesFilterBar", () => {
    const mockPush = vi.fn();
    const mockSearchParams = new Map();

    const mockFunnels = [
        { id: "funnel-1", name: "Funnel One" },
        { id: "funnel-2", name: "Funnel Two" },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchParams.clear();

        (useRouter as any).mockReturnValue({
            push: mockPush,
        });

        (useSearchParams as any).mockReturnValue({
            get: (key: string) => mockSearchParams.get(key) || null,
        });
    });

    it("should render all filter controls", () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        expect(screen.getByLabelText("Funnel")).toBeInTheDocument();
        expect(screen.getByLabelText("Page Type")).toBeInTheDocument();
        expect(screen.getByLabelText("Status")).toBeInTheDocument();
        expect(screen.getByLabelText("Search")).toBeInTheDocument();
    });

    it("should render funnel options", () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        expect(screen.getByText("All Funnels")).toBeInTheDocument();
        expect(screen.getByText("Funnel One")).toBeInTheDocument();
        expect(screen.getByText("Funnel Two")).toBeInTheDocument();
    });

    it("should render page type options", () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        expect(screen.getByText("All Types")).toBeInTheDocument();
        expect(screen.getByText("Enrollment")).toBeInTheDocument();
        expect(screen.getByText("Watch")).toBeInTheDocument();
        expect(screen.getByText("Registration")).toBeInTheDocument();
    });

    it("should render status options", () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        const statusSelect = screen.getByLabelText("Status");
        expect(statusSelect).toBeInTheDocument();
    });

    it("should update URL when funnel is selected", async () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        const funnelSelect = screen.getByLabelText("Funnel");
        fireEvent.change(funnelSelect, { target: { value: "funnel-1" } });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                expect.stringContaining("funnel_id=funnel-1")
            );
        });
    });

    it("should update URL when page type is selected", async () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        const typeSelect = screen.getByLabelText("Page Type");
        fireEvent.change(typeSelect, { target: { value: "enrollment" } });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                expect.stringContaining("page_type=enrollment")
            );
        });
    });

    it("should update URL when status is selected", async () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        const statusSelect = screen.getByLabelText("Status");
        fireEvent.change(statusSelect, { target: { value: "true" } });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                expect.stringContaining("is_published=true")
            );
        });
    });

    it("should update URL when search is entered", async () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        const searchInput = screen.getByPlaceholderText("Search headlines...");
        fireEvent.change(searchInput, { target: { value: "test search" } });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                expect.stringContaining("search=test+search")
            );
        });
    });

    it("should not show clear filters button when no filters active", () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        expect(screen.queryByText("Clear Filters")).not.toBeInTheDocument();
    });

    it("should show clear filters button when filters are active", () => {
        mockSearchParams.set("funnel_id", "funnel-1");

        render(<PagesFilterBar funnels={mockFunnels} />);

        expect(screen.getByText("Clear Filters")).toBeInTheDocument();
    });

    it("should clear all filters when clear button is clicked", () => {
        mockSearchParams.set("funnel_id", "funnel-1");
        mockSearchParams.set("page_type", "enrollment");

        render(<PagesFilterBar funnels={mockFunnels} />);

        const clearButton = screen.getByText("Clear Filters");
        fireEvent.click(clearButton);

        expect(mockPush).toHaveBeenCalledWith("/pages");
    });

    it("should load initial values from URL", () => {
        mockSearchParams.set("funnel_id", "funnel-1");
        mockSearchParams.set("page_type", "watch");
        mockSearchParams.set("is_published", "true");
        mockSearchParams.set("search", "test");

        render(<PagesFilterBar funnels={mockFunnels} />);

        const funnelSelect = screen.getByLabelText("Funnel") as HTMLSelectElement;
        const typeSelect = screen.getByLabelText("Page Type") as HTMLSelectElement;
        const statusSelect = screen.getByLabelText("Status") as HTMLSelectElement;
        const searchInput = screen.getByPlaceholderText(
            "Search headlines..."
        ) as HTMLInputElement;

        expect(funnelSelect.value).toBe("funnel-1");
        expect(typeSelect.value).toBe("watch");
        expect(statusSelect.value).toBe("true");
        expect(searchInput.value).toBe("test");
    });

    it("should combine multiple filters in URL", async () => {
        render(<PagesFilterBar funnels={mockFunnels} />);

        const funnelSelect = screen.getByLabelText("Funnel");
        fireEvent.change(funnelSelect, { target: { value: "funnel-1" } });

        const typeSelect = screen.getByLabelText("Page Type");
        fireEvent.change(typeSelect, { target: { value: "enrollment" } });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                expect.stringMatching(/funnel_id=funnel-1.*page_type=enrollment/)
            );
        });
    });

    it("should remove filter from URL when set to 'all'", async () => {
        mockSearchParams.set("funnel_id", "funnel-1");

        render(<PagesFilterBar funnels={mockFunnels} />);

        const funnelSelect = screen.getByLabelText("Funnel");
        fireEvent.change(funnelSelect, { target: { value: "all" } });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                expect.not.stringContaining("funnel_id")
            );
        });
    });
});
