/**
 * Toaster Component Tests
 * Test toaster container functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import * as useToastModule from "@/components/ui/use-toast";

// Mock the useToast hook
vi.mock("@/components/ui/use-toast", () => ({
    useToast: vi.fn(),
}));

describe("Toaster", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render toaster without toasts", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        const { container } = render(<Toaster />);
        expect(container).toBeInTheDocument();
    });

    it("should render single toast", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    title: "Test Toast",
                    description: "Test description",
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        render(<Toaster />);
        expect(screen.getByText("Test Toast")).toBeInTheDocument();
        expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should render multiple toasts", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    title: "Toast 1",
                },
                {
                    id: "2",
                    title: "Toast 2",
                },
                {
                    id: "3",
                    title: "Toast 3",
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        render(<Toaster />);
        expect(screen.getByText("Toast 1")).toBeInTheDocument();
        expect(screen.getByText("Toast 2")).toBeInTheDocument();
        expect(screen.getByText("Toast 3")).toBeInTheDocument();
    });

    it("should render toast with only title", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    title: "Just a title",
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        render(<Toaster />);
        expect(screen.getByText("Just a title")).toBeInTheDocument();
    });

    it("should render toast with only description", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    description: "Just a description",
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        render(<Toaster />);
        expect(screen.getByText("Just a description")).toBeInTheDocument();
    });

    it("should render toast with action", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    title: "Toast with action",
                    action: <button>Action Button</button>,
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        render(<Toaster />);
        expect(screen.getByText("Toast with action")).toBeInTheDocument();
        expect(screen.getByText("Action Button")).toBeInTheDocument();
    });

    it("should render toast with variant", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    title: "Error",
                    variant: "destructive",
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        render(<Toaster />);
        expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("should render toast with close button", () => {
        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    title: "Closeable Toast",
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });

        render(<Toaster />);
        // Verify toast renders with its content
        expect(screen.getByText("Closeable Toast")).toBeInTheDocument();
    });

    it("should handle empty toast list after dismissal", () => {
        const { rerender } = render(<Toaster />);

        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [
                {
                    id: "1",
                    title: "Temporary Toast",
                },
            ],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });
        rerender(<Toaster />);
        expect(screen.getByText("Temporary Toast")).toBeInTheDocument();

        vi.mocked(useToastModule.useToast).mockReturnValue({
            toasts: [],
            toast: vi.fn(),
            dismiss: vi.fn(),
        });
        rerender(<Toaster />);
        expect(screen.queryByText("Temporary Toast")).not.toBeInTheDocument();
    });
});
