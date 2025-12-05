/**
 * IntakeDataViewer Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntakeDataViewer } from "@/components/intake/intake-data-viewer";

// Mock sub-components
vi.mock("@/components/intake/brand-data-display", () => ({
    BrandDataDisplay: ({ brandData }: any) => (
        <div data-testid="brand-data-display">
            {brandData ? "Brand Data" : "No Brand Data"}
        </div>
    ),
}));

vi.mock("@/components/intake/pricing-display", () => ({
    PricingDisplay: ({ pricing }: any) => (
        <div data-testid="pricing-display">
            {pricing ? "Pricing Data" : "No Pricing Data"}
        </div>
    ),
}));

vi.mock("@/components/intake/metadata-display", () => ({
    MetadataDisplay: () => <div data-testid="metadata-display">Metadata</div>,
}));

describe("IntakeDataViewer", () => {
    const mockSession = {
        id: "session-123",
        call_id: "call-456",
        transcript_text: "This is the transcript text content. It contains multiple lines.\nSecond line here.",
        call_duration: 300,
        call_status: "completed",
        created_at: "2024-01-01T00:00:00Z",
        intake_method: "voice",
        session_name: "Test Session",
        extracted_data: {
            pricing: [
                { amount: 100, currency: "USD", context: "Monthly", confidence: "high" as const },
            ],
        },
        brand_data: {
            colors: {
                primary: "#FF5733",
                secondary: "#33FF57",
                accent: "#3357FF",
                background: "#FFFFFF",
                text: "#000000",
            },
            fonts: {
                primary: "Inter",
                secondary: "Roboto",
                weights: ["400", "600"],
            },
            style: {
                borderRadius: "8px",
                shadows: true,
                gradients: false,
            },
            confidence: {
                colors: 85,
                fonts: 75,
                overall: 80,
            },
        },
        metadata: { key: "value" },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should not render when session is null", () => {
        const { container } = render(
            <IntakeDataViewer session={null} isOpen={true} onClose={vi.fn()} />
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("should not render when closed", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={false} onClose={vi.fn()} />);

        expect(screen.queryByText("Test Session")).not.toBeInTheDocument();
    });

    it("should render when open with session", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText("Test Session")).toBeInTheDocument();
    });

    it("should display session method", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText("Voice Call")).toBeInTheDocument();
    });

    it("should display created date", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    });

    it("should render all tabs", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Content")).toBeInTheDocument();
        expect(screen.getByText("Brand")).toBeInTheDocument();
        expect(screen.getByText("Pricing")).toBeInTheDocument();
        expect(screen.getByText("Metadata")).toBeInTheDocument();
        expect(screen.getByText("Raw")).toBeInTheDocument();
    });

    it("should show badges on tabs", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        // Content tab should show size badge
        expect(screen.getByText(/1k/)).toBeInTheDocument();
        // Brand tab should show checkmark
        expect(screen.getByText("✓")).toBeInTheDocument();
        // Pricing tab should show count
        expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should switch tabs", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const contentTab = screen.getByText("Content");
        fireEvent.click(contentTab);

        expect(screen.getByPlaceholderText("Search within content...")).toBeInTheDocument();
    });

    it("should display overview stats", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText("Content Length")).toBeInTheDocument();
        expect(screen.getByText("Word Count")).toBeInTheDocument();
        expect(screen.getByText("Data Quality")).toBeInTheDocument();
    });

    it("should show available data badges", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText("✓ Full Content")).toBeInTheDocument();
        expect(screen.getByText("✓ Brand Data")).toBeInTheDocument();
        expect(screen.getByText(/✓ Pricing/)).toBeInTheDocument();
    });

    it("should display content preview", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText("Content Preview")).toBeInTheDocument();
        expect(
            screen.getByText(/This is the transcript text content/)
        ).toBeInTheDocument();
    });

    it("should search content", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const contentTab = screen.getByText("Content");
        fireEvent.click(contentTab);

        const searchInput = screen.getByPlaceholderText("Search within content...");
        fireEvent.change(searchInput, { target: { value: "multiple" } });

        expect(screen.getByText(/Found results for "multiple"/)).toBeInTheDocument();
    });

    it("should clear search", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const contentTab = screen.getByText("Content");
        fireEvent.click(contentTab);

        const searchInput = screen.getByPlaceholderText("Search within content...");
        fireEvent.change(searchInput, { target: { value: "test" } });

        const clearButton = screen.getByRole("button", { name: "" });
        fireEvent.click(clearButton);

        expect((searchInput as HTMLInputElement).value).toBe("");
    });

    it("should copy content to clipboard", async () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const contentTab = screen.getByText("Content");
        fireEvent.click(contentTab);

        const copyButton = screen.getByText("Copy All");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                mockSession.transcript_text
            );
        });
    });

    it("should show copied state", async () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const contentTab = screen.getByText("Content");
        fireEvent.click(contentTab);

        const copyButton = screen.getByText("Copy All");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(screen.getByText("Copied!")).toBeInTheDocument();
        });
    });

    it("should display brand data in brand tab", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const brandTab = screen.getByText("Brand");
        fireEvent.click(brandTab);

        expect(screen.getByTestId("brand-data-display")).toBeInTheDocument();
        expect(screen.getByText("Brand Data")).toBeInTheDocument();
    });

    it("should display pricing data in pricing tab", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const pricingTab = screen.getByText("Pricing");
        fireEvent.click(pricingTab);

        expect(screen.getByTestId("pricing-display")).toBeInTheDocument();
    });

    it("should display metadata in metadata tab", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const metadataTab = screen.getByText("Metadata");
        fireEvent.click(metadataTab);

        expect(screen.getByTestId("metadata-display")).toBeInTheDocument();
    });

    it("should display raw JSON in raw tab", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const rawTab = screen.getByText("Raw");
        fireEvent.click(rawTab);

        expect(screen.getByText(/Raw JSON data for this intake session/)).toBeInTheDocument();
    });

    it("should copy raw JSON", async () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const rawTab = screen.getByText("Raw");
        fireEvent.click(rawTab);

        const copyButton = screen.getByText("Copy JSON");
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                JSON.stringify(mockSession, null, 2)
            );
        });
    });

    it("should close modal when close button clicked", () => {
        const onClose = vi.fn();
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={onClose} />);

        const closeButton = screen.getByText("Close");
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    it("should display correct intake method labels", () => {
        const methods = [
            { method: "voice", label: "Voice Call" },
            { method: "paste", label: "Pasted Text" },
            { method: "upload", label: "File Upload" },
            { method: "scrape", label: "Web Scraping" },
            { method: "google_drive", label: "Google Drive" },
        ];

        methods.forEach(({ method, label }) => {
            const session = { ...mockSession, intake_method: method };
            const { unmount } = render(
                <IntakeDataViewer session={session} isOpen={true} onClose={vi.fn()} />
            );

            expect(screen.getByText(label)).toBeInTheDocument();
            unmount();
        });
    });

    it("should handle no search results", () => {
        render(<IntakeDataViewer session={mockSession} isOpen={true} onClose={vi.fn()} />);

        const contentTab = screen.getByText("Content");
        fireEvent.click(contentTab);

        const searchInput = screen.getByPlaceholderText("Search within content...");
        fireEvent.change(searchInput, { target: { value: "nonexistent" } });

        expect(screen.getByText(/No results found for "nonexistent"/)).toBeInTheDocument();
    });
});
