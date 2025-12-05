/**
 * MetadataDisplay Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MetadataDisplay } from "@/components/intake/metadata-display";

describe("MetadataDisplay", () => {
    beforeEach(() => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    it("should render without crashing", () => {
        render(<MetadataDisplay metadata={{}} />);
        expect(screen.getByText("Session Overview")).toBeInTheDocument();
    });

    it("should display session name when provided", () => {
        render(
            <MetadataDisplay
                metadata={{}}
                sessionName="Test Session"
            />
        );

        expect(screen.getByText("Session Name")).toBeInTheDocument();
        expect(screen.getByText("Test Session")).toBeInTheDocument();
    });

    it("should display intake method with icon", () => {
        render(
            <MetadataDisplay
                metadata={{}}
                intakeMethod="paste"
            />
        );

        expect(screen.getByText("Intake Method")).toBeInTheDocument();
        expect(screen.getByText("paste")).toBeInTheDocument();
        expect(screen.getByText("📝")).toBeInTheDocument();
    });

    it("should format intake method by replacing underscores", () => {
        render(
            <MetadataDisplay
                metadata={{}}
                intakeMethod="google_drive"
            />
        );

        expect(screen.getByText("google drive")).toBeInTheDocument();
    });

    it("should display formatted date", () => {
        const testDate = "2024-01-15T10:30:00Z";
        render(
            <MetadataDisplay
                metadata={{}}
                createdAt={testDate}
            />
        );

        expect(screen.getByText("Created")).toBeInTheDocument();
        expect(screen.getByText(/January/)).toBeInTheDocument();
    });

    it("should display source URL as clickable link", () => {
        const url = "https://example.com";
        render(
            <MetadataDisplay
                metadata={{}}
                scrapedUrl={url}
            />
        );

        expect(screen.getByText("Source URL")).toBeInTheDocument();
        const link = screen.getByRole("link", { name: url });
        expect(link).toHaveAttribute("href", url);
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should display file count", () => {
        render(
            <MetadataDisplay
                metadata={{}}
                fileUrls={["file1.pdf", "file2.docx"]}
            />
        );

        expect(screen.getByText("Uploaded Files")).toBeInTheDocument();
        expect(screen.getByText("2 files")).toBeInTheDocument();
    });

    it("should display singular file text for one file", () => {
        render(
            <MetadataDisplay
                metadata={{}}
                fileUrls={["file1.pdf"]}
            />
        );

        expect(screen.getByText("1 file")).toBeInTheDocument();
    });

    it("should display metadata fields", () => {
        const metadata = {
            version: "1.0",
            author: "Test User",
            wordCount: 500,
        };

        render(<MetadataDisplay metadata={metadata} />);

        expect(screen.getByText("Technical Metadata")).toBeInTheDocument();
        expect(screen.getByText("version")).toBeInTheDocument();
        expect(screen.getByText("1.0")).toBeInTheDocument();
        expect(screen.getByText("author")).toBeInTheDocument();
        expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("should format boolean values", () => {
        const metadata = {
            isActive: true,
            isArchived: false,
        };

        render(<MetadataDisplay metadata={metadata} />);

        expect(screen.getByText("Yes")).toBeInTheDocument();
        expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("should format number values with locale", () => {
        const metadata = {
            wordCount: 1000,
        };

        render(<MetadataDisplay metadata={metadata} />);

        expect(screen.getByText("1,000")).toBeInTheDocument();
    });

    it("should display N/A for null values", () => {
        const metadata = {
            emptyField: null,
        };

        render(<MetadataDisplay metadata={metadata} />);

        expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("should display JSON for object values", () => {
        const metadata = {
            settings: { theme: "dark", language: "en" },
        };

        render(<MetadataDisplay metadata={metadata} />);

        const pre = document.querySelector("pre");
        expect(pre).toBeInTheDocument();
    });

    it("should copy value to clipboard when copy button clicked", async () => {
        const user = userEvent.setup();
        const metadata = {
            testKey: "testValue",
        };

        render(<MetadataDisplay metadata={metadata} />);

        const copyButton = screen.getAllByTitle("Copy value")[0];
        await user.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith("testValue");
        });
    });

    it("should show check icon after copying", async () => {
        const user = userEvent.setup();
        const metadata = {
            testKey: "testValue",
        };

        render(<MetadataDisplay metadata={metadata} />);

        const copyButton = screen.getAllByTitle("Copy value")[0];
        await user.click(copyButton);

        await waitFor(() => {
            expect(screen.getByTitle("Copy value").querySelector(".text-green-600")).toBeInTheDocument();
        });
    });

    it("should display empty state when no metadata", () => {
        render(<MetadataDisplay metadata={{}} />);

        expect(screen.getByText("No additional metadata available.")).toBeInTheDocument();
    });

    it("should display empty state when metadata is null", () => {
        render(<MetadataDisplay metadata={null} />);

        expect(screen.getByText("No additional metadata available.")).toBeInTheDocument();
    });

    it("should display all method icons correctly", () => {
        const methods = [
            { method: "voice", icon: "🎤" },
            { method: "paste", icon: "📝" },
            { method: "upload", icon: "📎" },
            { method: "scrape", icon: "🌐" },
            { method: "google_drive", icon: "☁️" },
            { method: "unknown", icon: "📄" },
        ];

        methods.forEach(({ method, icon }) => {
            const { unmount } = render(
                <MetadataDisplay metadata={{}} intakeMethod={method} />
            );
            expect(screen.getByText(icon)).toBeInTheDocument();
            unmount();
        });
    });
});
