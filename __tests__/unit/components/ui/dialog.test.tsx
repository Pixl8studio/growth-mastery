/**
 * Dialog Component Tests
 * Test dialog (modal) functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

describe("Dialog", () => {
    it("should render dialog trigger", () => {
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
            </Dialog>
        );
        expect(screen.getByText("Open Dialog")).toBeInTheDocument();
    });

    it("should open dialog when trigger is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );

        await user.click(screen.getByText("Open Dialog"));
        expect(screen.getByText("Dialog Title")).toBeInTheDocument();
    });

    it("should render dialog with description", async () => {
        const user = userEvent.setup();
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                        <DialogDescription>Dialog description text</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );

        await user.click(screen.getByText("Open Dialog"));
        expect(screen.getByText("Dialog description text")).toBeInTheDocument();
    });

    it("should render dialog with footer", async () => {
        const user = userEvent.setup();
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                    </DialogHeader>
                    <DialogFooter>Footer content</DialogFooter>
                </DialogContent>
            </Dialog>
        );

        await user.click(screen.getByText("Open Dialog"));
        expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("should close dialog when close button is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );

        await user.click(screen.getByText("Open Dialog"));
        expect(screen.getByText("Dialog Title")).toBeInTheDocument();

        const closeButton = screen.getByRole("button", { name: /close/i });
        await user.click(closeButton);

        expect(screen.queryByText("Dialog Title")).not.toBeInTheDocument();
    });

    it("should handle custom className on DialogContent", async () => {
        const user = userEvent.setup();
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
                <DialogContent className="custom-dialog">
                    <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );

        await user.click(screen.getByText("Open Dialog"));
        const dialogContent = screen.getByText("Dialog Title").closest('[role="dialog"]');
        expect(dialogContent?.className).toContain("custom-dialog");
    });

    it("should render dialog with controlled open state", () => {
        render(
            <Dialog open={true}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Always Open Dialog</DialogTitle>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );

        expect(screen.getByText("Always Open Dialog")).toBeInTheDocument();
    });

    it("should not render dialog content when closed", () => {
        render(
            <Dialog open={false}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hidden Dialog</DialogTitle>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );

        expect(screen.queryByText("Hidden Dialog")).not.toBeInTheDocument();
    });
});
