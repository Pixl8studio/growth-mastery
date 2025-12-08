/**
 * Card Component Tests
 * Test card variants and functionality
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";

describe("Card", () => {
    it("should render card with default styling", () => {
        render(<Card>Card content</Card>);
        const card = screen.getByText("Card content");
        expect(card).toBeInTheDocument();
    });

    it("should render card with header", () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                </CardHeader>
            </Card>
        );
        expect(screen.getByText("Card Title")).toBeInTheDocument();
    });

    it("should render card with description", () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description</CardDescription>
                </CardHeader>
            </Card>
        );
        expect(screen.getByText("Card description")).toBeInTheDocument();
    });

    it("should render card with content", () => {
        render(
            <Card>
                <CardContent>Main content</CardContent>
            </Card>
        );
        expect(screen.getByText("Main content")).toBeInTheDocument();
    });

    it("should render card with footer", () => {
        render(
            <Card>
                <CardFooter>Footer content</CardFooter>
            </Card>
        );
        expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("should render complete card with all sections", () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>Title</CardTitle>
                    <CardDescription>Description</CardDescription>
                </CardHeader>
                <CardContent>Content</CardContent>
                <CardFooter>Footer</CardFooter>
            </Card>
        );
        expect(screen.getByText("Title")).toBeInTheDocument();
        expect(screen.getByText("Description")).toBeInTheDocument();
        expect(screen.getByText("Content")).toBeInTheDocument();
        expect(screen.getByText("Footer")).toBeInTheDocument();
    });

    it("should handle custom className on Card", () => {
        render(<Card className="custom-card">Content</Card>);
        const card = screen.getByText("Content");
        expect(card.className).toContain("custom-card");
    });

    it("should handle custom className on CardHeader", () => {
        render(
            <Card>
                <CardHeader className="custom-header">Header</CardHeader>
            </Card>
        );
        const header = screen.getByText("Header");
        expect(header.className).toContain("custom-header");
    });

    it("should handle custom className on CardTitle", () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle className="custom-title">Title</CardTitle>
                </CardHeader>
            </Card>
        );
        const title = screen.getByText("Title");
        expect(title.className).toContain("custom-title");
    });

    it("should handle custom className on CardDescription", () => {
        render(
            <Card>
                <CardHeader>
                    <CardDescription className="custom-desc">
                        Description
                    </CardDescription>
                </CardHeader>
            </Card>
        );
        const description = screen.getByText("Description");
        expect(description.className).toContain("custom-desc");
    });

    it("should handle custom className on CardContent", () => {
        render(
            <Card>
                <CardContent className="custom-content">Content</CardContent>
            </Card>
        );
        const content = screen.getByText("Content");
        expect(content.className).toContain("custom-content");
    });

    it("should handle custom className on CardFooter", () => {
        render(
            <Card>
                <CardFooter className="custom-footer">Footer</CardFooter>
            </Card>
        );
        const footer = screen.getByText("Footer");
        expect(footer.className).toContain("custom-footer");
    });
});
