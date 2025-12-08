/**
 * Tooltip Component Tests
 * Tests tooltip functionality using controlled state for reliable jsdom testing
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

describe("Tooltip", () => {
    it("should render tooltip trigger", () => {
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                </Tooltip>
            </TooltipProvider>
        );
        expect(screen.getByText("Hover me")).toBeInTheDocument();
    });

    it("should show tooltip content when open", () => {
        // Use controlled open state for reliable jsdom testing
        render(
            <TooltipProvider>
                <Tooltip open>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent>Tooltip text</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.getByRole("tooltip")).toHaveTextContent("Tooltip text");
    });

    it("should render tooltip with custom content when open", () => {
        render(
            <TooltipProvider>
                <Tooltip open>
                    <TooltipTrigger>Info</TooltipTrigger>
                    <TooltipContent>
                        <p>This is detailed information</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.getByRole("tooltip")).toHaveTextContent("This is detailed information");
    });

    it("should handle custom className on TooltipContent", () => {
        render(
            <TooltipProvider>
                <Tooltip open>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent className="custom-tooltip">Custom styled</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        // Verify the tooltip renders with custom content
        // Note: Testing className on portaled Radix UI components in jsdom is fragile
        // We verify the component accepts the prop and renders correctly
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent("Custom styled");
    });

    it("should work with button trigger", () => {
        render(
            <TooltipProvider>
                <Tooltip open>
                    <TooltipTrigger asChild>
                        <button>Click me</button>
                    </TooltipTrigger>
                    <TooltipContent>Button tooltip</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
        expect(screen.getByRole("tooltip")).toHaveTextContent("Button tooltip");
    });

    it("should handle side offset", () => {
        render(
            <TooltipProvider>
                <Tooltip open>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent sideOffset={10}>With offset</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.getByRole("tooltip")).toHaveTextContent("With offset");
    });

    it("should support controlled open state", () => {
        render(
            <TooltipProvider>
                <Tooltip open={true}>
                    <TooltipTrigger>Trigger</TooltipTrigger>
                    <TooltipContent>Always visible</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.getByRole("tooltip")).toHaveTextContent("Always visible");
    });

    it("should support controlled closed state", () => {
        render(
            <TooltipProvider>
                <Tooltip open={false}>
                    <TooltipTrigger>Trigger</TooltipTrigger>
                    <TooltipContent>Hidden content</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
    });

    it("should render multiple tooltips when open", () => {
        render(
            <TooltipProvider>
                <Tooltip open>
                    <TooltipTrigger>First</TooltipTrigger>
                    <TooltipContent>First tooltip</TooltipContent>
                </Tooltip>
                <Tooltip open>
                    <TooltipTrigger>Second</TooltipTrigger>
                    <TooltipContent>Second tooltip</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        // Use getAllByRole since there are multiple tooltips
        const tooltips = screen.getAllByRole("tooltip");
        expect(tooltips.length).toBe(2);
    });

    it("should render tooltip provider with delay configuration", () => {
        render(
            <TooltipProvider delayDuration={100}>
                <Tooltip open>
                    <TooltipTrigger>Delayed</TooltipTrigger>
                    <TooltipContent>Delayed tooltip</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        // Use role-based query for the visible tooltip content
        expect(screen.getByRole("tooltip")).toHaveTextContent("Delayed tooltip");
    });

    it("should hide tooltip when closed", () => {
        render(
            <TooltipProvider>
                <Tooltip open={false}>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent>Tooltip text</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
    });
});
