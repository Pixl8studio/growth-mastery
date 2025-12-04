/**
 * Skeleton Component Tests
 * Test skeleton loading placeholder functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
    it("should render skeleton", () => {
        render(<Skeleton data-testid="skeleton" />);
        const skeleton = screen.getByTestId("skeleton");
        expect(skeleton).toBeInTheDocument();
    });

    it("should have animate-pulse class", () => {
        render(<Skeleton data-testid="skeleton" />);
        const skeleton = screen.getByTestId("skeleton");
        expect(skeleton.className).toContain("animate-pulse");
    });

    it("should handle custom className", () => {
        render(<Skeleton className="custom-skeleton" data-testid="custom" />);
        const skeleton = screen.getByTestId("custom");
        expect(skeleton.className).toContain("custom-skeleton");
        expect(skeleton.className).toContain("animate-pulse");
    });

    it("should render with custom dimensions via className", () => {
        render(<Skeleton className="h-12 w-full" data-testid="sized" />);
        const skeleton = screen.getByTestId("sized");
        expect(skeleton.className).toContain("h-12");
        expect(skeleton.className).toContain("w-full");
    });

    it("should render multiple skeletons", () => {
        render(
            <div>
                <Skeleton data-testid="skeleton-1" />
                <Skeleton data-testid="skeleton-2" />
                <Skeleton data-testid="skeleton-3" />
            </div>
        );
        expect(screen.getByTestId("skeleton-1")).toBeInTheDocument();
        expect(screen.getByTestId("skeleton-2")).toBeInTheDocument();
        expect(screen.getByTestId("skeleton-3")).toBeInTheDocument();
    });

    it("should work as content placeholder", () => {
        render(
            <div>
                <Skeleton className="h-4 w-[250px]" data-testid="title-skeleton" />
                <Skeleton className="h-4 w-[200px]" data-testid="text-skeleton" />
            </div>
        );
        expect(screen.getByTestId("title-skeleton")).toBeInTheDocument();
        expect(screen.getByTestId("text-skeleton")).toBeInTheDocument();
    });

    it("should render circular skeleton via className", () => {
        render(<Skeleton className="rounded-full h-12 w-12" data-testid="circle" />);
        const skeleton = screen.getByTestId("circle");
        expect(skeleton.className).toContain("rounded-full");
    });
});
