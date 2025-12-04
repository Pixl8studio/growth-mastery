/**
 * Toast Component Tests
 * Test toast notification functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
    Toast,
    ToastProvider,
    ToastTitle,
    ToastDescription,
    ToastAction,
    ToastViewport,
} from "@/components/ui/toast";

describe("Toast", () => {
    it("should render toast with title", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastTitle>Notification</ToastTitle>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        expect(screen.getByText("Notification")).toBeInTheDocument();
    });

    it("should render toast with description", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastTitle>Success</ToastTitle>
                    <ToastDescription>Your changes have been saved.</ToastDescription>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        expect(screen.getByText("Your changes have been saved.")).toBeInTheDocument();
    });

    it("should render toast with default variant", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastTitle>Default Toast</ToastTitle>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        const toast = screen.getByText("Default Toast").closest('[data-radix-collection-item]');
        expect(toast).toBeInTheDocument();
    });

    it("should render toast with destructive variant", () => {
        render(
            <ToastProvider>
                <Toast variant="destructive">
                    <ToastTitle>Error</ToastTitle>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        const toast = screen.getByText("Error").closest('[data-radix-collection-item]');
        expect(toast).toBeInTheDocument();
    });

    it("should render toast with action", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastTitle>Update Available</ToastTitle>
                    <ToastAction altText="Update now">Update</ToastAction>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        expect(screen.getByText("Update")).toBeInTheDocument();
    });

    it("should render complete toast with all elements", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastTitle>Complete Toast</ToastTitle>
                    <ToastDescription>This is a complete toast notification.</ToastDescription>
                    <ToastAction altText="Take action">Action</ToastAction>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        expect(screen.getByText("Complete Toast")).toBeInTheDocument();
        expect(screen.getByText("This is a complete toast notification.")).toBeInTheDocument();
        expect(screen.getByText("Action")).toBeInTheDocument();
    });

    it("should handle custom className on Toast", () => {
        render(
            <ToastProvider>
                <Toast className="custom-toast">
                    <ToastTitle>Custom</ToastTitle>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        const toast = screen.getByText("Custom").closest('[data-radix-collection-item]');
        expect(toast?.className).toContain("custom-toast");
    });

    it("should handle custom className on ToastTitle", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastTitle className="custom-title">Title</ToastTitle>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        const title = screen.getByText("Title");
        expect(title.className).toContain("custom-title");
    });

    it("should handle custom className on ToastDescription", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastDescription className="custom-description">
                        Description
                    </ToastDescription>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        const description = screen.getByText("Description");
        expect(description.className).toContain("custom-description");
    });

    it("should render ToastViewport", () => {
        render(
            <ToastProvider>
                <ToastViewport data-testid="toast-viewport" />
            </ToastProvider>
        );
        const viewport = screen.getByTestId("toast-viewport");
        expect(viewport).toBeInTheDocument();
    });

    it("should handle multiple toasts", () => {
        render(
            <ToastProvider>
                <Toast>
                    <ToastTitle>Toast 1</ToastTitle>
                </Toast>
                <Toast>
                    <ToastTitle>Toast 2</ToastTitle>
                </Toast>
                <Toast>
                    <ToastTitle>Toast 3</ToastTitle>
                </Toast>
                <ToastViewport />
            </ToastProvider>
        );
        expect(screen.getByText("Toast 1")).toBeInTheDocument();
        expect(screen.getByText("Toast 2")).toBeInTheDocument();
        expect(screen.getByText("Toast 3")).toBeInTheDocument();
    });
});
