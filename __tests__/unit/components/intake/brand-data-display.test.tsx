/**
 * BrandDataDisplay Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrandDataDisplay } from "@/components/intake/brand-data-display";

describe("BrandDataDisplay", () => {
    const mockBrandData = {
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
            weights: ["400", "600", "700"],
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

    it("should render null state when no data", () => {
        render(<BrandDataDisplay brandData={null} />);

        expect(
            screen.getByText("No brand data available for this intake session.")
        ).toBeInTheDocument();
    });

    it("should display overall confidence", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("Brand Extraction Confidence")).toBeInTheDocument();
        expect(screen.getByText("High (80%)")).toBeInTheDocument();
    });

    it("should display all colors", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("#FF5733")).toBeInTheDocument();
        expect(screen.getByText("#33FF57")).toBeInTheDocument();
        expect(screen.getByText("#3357FF")).toBeInTheDocument();
        expect(screen.getByText("#FFFFFF")).toBeInTheDocument();
        expect(screen.getByText("#000000")).toBeInTheDocument();
    });

    it("should display color labels", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("Primary")).toBeInTheDocument();
        expect(screen.getByText("Secondary")).toBeInTheDocument();
        expect(screen.getByText("Accent")).toBeInTheDocument();
        expect(screen.getByText("Background")).toBeInTheDocument();
        expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("should copy color to clipboard", async () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        const copyButtons = screen.getAllByTitle("Copy hex code");
        fireEvent.click(copyButtons[0]);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith("#FF5733");
        });
    });

    it("should show check icon after copying", async () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        const copyButtons = screen.getAllByTitle("Copy hex code");
        fireEvent.click(copyButtons[0]);

        await waitFor(() => {
            const checkIcon = copyButtons[0].querySelector("svg.text-green-600");
            expect(checkIcon).toBeInTheDocument();
        });
    });

    it("should reset icon after 2 seconds", async () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        const copyButtons = screen.getAllByTitle("Copy hex code");
        fireEvent.click(copyButtons[0]);

        vi.advanceTimersByTime(2000);

        await waitFor(() => {
            const checkIcon = copyButtons[0].querySelector("svg.text-green-600");
            expect(checkIcon).not.toBeInTheDocument();
        });
    });

    it("should display primary font", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("Primary Font")).toBeInTheDocument();
        expect(screen.getAllByText("Inter")[0]).toBeInTheDocument();
    });

    it("should display secondary font", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("Secondary Font")).toBeInTheDocument();
        expect(screen.getAllByText("Roboto")[0]).toBeInTheDocument();
    });

    it("should display font weights", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("Font Weights Used")).toBeInTheDocument();
        expect(screen.getByText("400")).toBeInTheDocument();
        expect(screen.getByText("600")).toBeInTheDocument();
        expect(screen.getByText("700")).toBeInTheDocument();
    });

    it("should display style properties", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("Border Radius")).toBeInTheDocument();
        expect(screen.getByText("8px")).toBeInTheDocument();
        expect(screen.getByText("Shadows")).toBeInTheDocument();
        expect(screen.getAllByText("Yes")[0]).toBeInTheDocument();
        expect(screen.getByText("Gradients")).toBeInTheDocument();
        expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("should show high confidence badge for 80%+", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        const highBadges = screen.getAllByText(/High \(\d+%\)/);
        expect(highBadges.length).toBeGreaterThan(0);
    });

    it("should show medium confidence badge for 50-79%", () => {
        const mediumData = {
            ...mockBrandData,
            confidence: { colors: 65, fonts: 55, overall: 60 },
        };

        render(<BrandDataDisplay brandData={mediumData} />);

        expect(screen.getByText("Medium (60%)")).toBeInTheDocument();
    });

    it("should show low confidence badge for <50%", () => {
        const lowData = {
            ...mockBrandData,
            confidence: { colors: 30, fonts: 25, overall: 28 },
        };

        render(<BrandDataDisplay brandData={lowData} />);

        expect(screen.getByText("Low (28%)")).toBeInTheDocument();
    });

    it("should display colors confidence", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("High (85%)")).toBeInTheDocument();
    });

    it("should display fonts confidence", () => {
        render(<BrandDataDisplay brandData={mockBrandData} />);

        expect(screen.getByText("Medium (75%)")).toBeInTheDocument();
    });

    it("should not render font section when no fonts", () => {
        const noFontsData = {
            ...mockBrandData,
            fonts: { weights: [] },
        };

        render(<BrandDataDisplay brandData={noFontsData} />);

        expect(screen.queryByText("Primary Font")).not.toBeInTheDocument();
        expect(screen.queryByText("Secondary Font")).not.toBeInTheDocument();
    });

    it("should show 'Not detected' for missing border radius", () => {
        const noBorderData = {
            ...mockBrandData,
            style: { ...mockBrandData.style, borderRadius: undefined },
        };

        render(<BrandDataDisplay brandData={noBorderData} />);

        expect(screen.getByText("Not detected")).toBeInTheDocument();
    });
});
