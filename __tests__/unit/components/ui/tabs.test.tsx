/**
 * Tabs Component Tests
 * Test tabs navigation functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

describe("Tabs", () => {
    it("should render tabs with triggers", () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
            </Tabs>
        );
        expect(screen.getByText("Tab 1")).toBeInTheDocument();
        expect(screen.getByText("Tab 2")).toBeInTheDocument();
    });

    it("should render tab content", () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
            </Tabs>
        );
        expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("should switch between tabs", async () => {
        const user = userEvent.setup();
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
        );

        expect(screen.getByText("Content 1")).toBeInTheDocument();
        expect(screen.queryByText("Content 2")).not.toBeInTheDocument();

        await user.click(screen.getByText("Tab 2"));
        expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
        expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("should handle default value", () => {
        render(
            <Tabs defaultValue="tab2">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
        );
        expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
        expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("should handle controlled value", () => {
        render(
            <Tabs value="tab2">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
        );
        expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("should call onValueChange when tab is clicked", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <Tabs defaultValue="tab1" onValueChange={onValueChange}>
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
            </Tabs>
        );

        await user.click(screen.getByText("Tab 2"));
        expect(onValueChange).toHaveBeenCalledWith("tab2");
    });

    it("should handle disabled tabs", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <Tabs defaultValue="tab1" onValueChange={onValueChange}>
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2" disabled>
                        Tab 2
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
        );

        const disabledTab = screen.getByText("Tab 2");
        await user.click(disabledTab);
        expect(onValueChange).not.toHaveBeenCalled();
        expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("should handle custom className on TabsList", () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList className="custom-list">
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                </TabsList>
            </Tabs>
        );
        const tabsList = screen.getByText("Tab 1").parentElement;
        expect(tabsList?.className).toContain("custom-list");
    });

    it("should handle custom className on TabsTrigger", () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1" className="custom-trigger">
                        Tab 1
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        );
        const trigger = screen.getByText("Tab 1");
        expect(trigger.className).toContain("custom-trigger");
    });

    it("should handle custom className on TabsContent", () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1" className="custom-content">
                    Content 1
                </TabsContent>
            </Tabs>
        );
        const content = screen.getByText("Content 1");
        expect(content.className).toContain("custom-content");
    });

    it("should render multiple tabs", () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
                <TabsContent value="tab3">Content 3</TabsContent>
            </Tabs>
        );
        expect(screen.getByText("Tab 1")).toBeInTheDocument();
        expect(screen.getByText("Tab 2")).toBeInTheDocument();
        expect(screen.getByText("Tab 3")).toBeInTheDocument();
    });
});
