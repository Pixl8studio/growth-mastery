/**
 * Tooltip Component Tests
 * Test tooltip functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    it("should show tooltip on hover", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent>Tooltip text</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        const trigger = screen.getByText("Hover me");
        await user.hover(trigger);

        // Wait for tooltip to appear
        expect(await screen.findByText("Tooltip text")).toBeInTheDocument();
    });

    it("should render tooltip with custom content", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Info</TooltipTrigger>
                    <TooltipContent>
                        <p>This is detailed information</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        await user.hover(screen.getByText("Info"));
        expect(await screen.findByText("This is detailed information")).toBeInTheDocument();
    });

    it("should handle custom className on TooltipContent", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent className="custom-tooltip">Custom styled</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        await user.hover(screen.getByText("Hover me"));
        const tooltip = await screen.findByText("Custom styled");
        expect(tooltip.className).toContain("custom-tooltip");
    });

    it("should work with button trigger", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button>Click me</button>
                    </TooltipTrigger>
                    <TooltipContent>Button tooltip</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        const button = screen.getByRole("button", { name: "Click me" });
        await user.hover(button);

        expect(await screen.findByText("Button tooltip")).toBeInTheDocument();
    });

    it("should handle side offset", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent sideOffset={10}>With offset</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        await user.hover(screen.getByText("Hover me"));
        expect(await screen.findByText("With offset")).toBeInTheDocument();
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

        expect(screen.getByText("Always visible")).toBeInTheDocument();
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

    it("should render multiple tooltips", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>First</TooltipTrigger>
                    <TooltipContent>First tooltip</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>Second</TooltipTrigger>
                    <TooltipContent>Second tooltip</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        await user.hover(screen.getByText("First"));
        expect(await screen.findByText("First tooltip")).toBeInTheDocument();
    });

    it("should work with delay configuration", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger>Delayed</TooltipTrigger>
                    <TooltipContent>Delayed tooltip</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        await user.hover(screen.getByText("Delayed"));
        expect(await screen.findByText("Delayed tooltip")).toBeInTheDocument();
    });

    it("should hide tooltip on unhover", async () => {
        const user = userEvent.setup();
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent>Tooltip text</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

        const trigger = screen.getByText("Hover me");
        await user.hover(trigger);
        expect(await screen.findByText("Tooltip text")).toBeInTheDocument();

        await user.unhover(trigger);
        // Tooltip should eventually disappear
        expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
    });
});
