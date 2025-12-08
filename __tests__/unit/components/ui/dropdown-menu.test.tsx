/**
 * Dropdown Menu Component Tests
 * Test dropdown menu functionality
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

describe("DropdownMenu", () => {
    it("should render dropdown menu trigger", () => {
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
            </DropdownMenu>
        );
        expect(screen.getByText("Open Menu")).toBeInTheDocument();
    });

    it("should open dropdown menu when trigger is clicked", async () => {
        const user = userEvent.setup();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Item 1</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("should render multiple menu items", async () => {
        const user = userEvent.setup();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Item 1</DropdownMenuItem>
                    <DropdownMenuItem>Item 2</DropdownMenuItem>
                    <DropdownMenuItem>Item 3</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        expect(screen.getByText("Item 1")).toBeInTheDocument();
        expect(screen.getByText("Item 2")).toBeInTheDocument();
        expect(screen.getByText("Item 3")).toBeInTheDocument();
    });

    it("should render menu with label", async () => {
        const user = userEvent.setup();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        expect(screen.getByText("My Account")).toBeInTheDocument();
    });

    it("should render menu with separator", async () => {
        const user = userEvent.setup();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Item 1</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Item 2</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        const separator = screen.getByText("Item 1").nextElementSibling;
        expect(separator).toBeInTheDocument();
    });

    it("should handle menu item click", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={onSelect}>Click me</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        await user.click(screen.getByText("Click me"));
        expect(onSelect).toHaveBeenCalled();
    });

    it("should render checkbox items", async () => {
        const user = userEvent.setup();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuCheckboxItem checked>
                        Show Panel
                    </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        expect(screen.getByText("Show Panel")).toBeInTheDocument();
    });

    it("should render radio group", async () => {
        const user = userEvent.setup();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuRadioGroup value="option1">
                        <DropdownMenuRadioItem value="option1">
                            Option 1
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="option2">
                            Option 2
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        expect(screen.getByText("Option 1")).toBeInTheDocument();
        expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("should handle custom className on content", async () => {
        const user = userEvent.setup();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent className="custom-menu">
                    <DropdownMenuItem>Item</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        const content = screen.getByText("Item").closest('[role="menu"]');
        expect(content?.className).toContain("custom-menu");
    });

    it("should handle disabled menu items", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem disabled onSelect={onSelect}>
                        Disabled Item
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        await user.click(screen.getByText("Open Menu"));
        const item = screen.getByText("Disabled Item");
        await user.click(item);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
