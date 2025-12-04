/**
 * Accordion Component Tests
 * Test accordion variants and functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";

describe("Accordion", () => {
    it("should render accordion with single type", () => {
        render(
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger>Section 1</AccordionTrigger>
                    <AccordionContent>Content 1</AccordionContent>
                </AccordionItem>
            </Accordion>
        );
        expect(screen.getByText("Section 1")).toBeInTheDocument();
    });

    it("should render multiple accordion items", () => {
        render(
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger>Section 1</AccordionTrigger>
                    <AccordionContent>Content 1</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Section 2</AccordionTrigger>
                    <AccordionContent>Content 2</AccordionContent>
                </AccordionItem>
            </Accordion>
        );
        expect(screen.getByText("Section 1")).toBeInTheDocument();
        expect(screen.getByText("Section 2")).toBeInTheDocument();
    });

    it("should expand accordion item when clicked", async () => {
        const user = userEvent.setup();
        render(
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger>Section 1</AccordionTrigger>
                    <AccordionContent>Content 1</AccordionContent>
                </AccordionItem>
            </Accordion>
        );

        const trigger = screen.getByText("Section 1");
        await user.click(trigger);

        expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("should handle custom className on AccordionItem", () => {
        render(
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1" className="custom-item">
                    <AccordionTrigger>Section 1</AccordionTrigger>
                    <AccordionContent>Content 1</AccordionContent>
                </AccordionItem>
            </Accordion>
        );
        const item = screen.getByText("Section 1").closest('[data-radix-collection-item]');
        expect(item?.className).toContain("custom-item");
    });

    it("should handle custom className on AccordionTrigger", () => {
        render(
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger className="custom-trigger">Section 1</AccordionTrigger>
                    <AccordionContent>Content 1</AccordionContent>
                </AccordionItem>
            </Accordion>
        );
        const trigger = screen.getByText("Section 1");
        expect(trigger.className).toContain("custom-trigger");
    });

    it("should handle custom className on AccordionContent", () => {
        render(
            <Accordion type="single" defaultValue="item-1">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Section 1</AccordionTrigger>
                    <AccordionContent className="custom-content">Content 1</AccordionContent>
                </AccordionItem>
            </Accordion>
        );
        const contentWrapper = screen.getByText("Content 1").parentElement;
        expect(contentWrapper?.className).toContain("custom-content");
    });

    it("should render with default expanded state", () => {
        render(
            <Accordion type="single" defaultValue="item-1">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Section 1</AccordionTrigger>
                    <AccordionContent>Content 1</AccordionContent>
                </AccordionItem>
            </Accordion>
        );
        expect(screen.getByText("Content 1")).toBeInTheDocument();
    });
});
