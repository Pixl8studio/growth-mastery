/**
 * GammaThemeSelector Component Tests
 * Tests Gamma theme selection with preview images
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GammaThemeSelector from "@/components/funnel/gamma-theme-selector";

describe("GammaThemeSelector", () => {
    const mockOnThemeChange = vi.fn();

    const defaultProps = {
        selectedTheme: "",
        onThemeChange: mockOnThemeChange,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render theme selector", () => {
        render(<GammaThemeSelector {...defaultProps} />);

        expect(screen.getByText("Choose Theme")).toBeInTheDocument();
    });

    it("should display theme selection tip", () => {
        render(<GammaThemeSelector {...defaultProps} />);

        expect(
            screen.getByText(/Don't see a theme you love\? You can change it later/i)
        ).toBeInTheDocument();
    });

    it("should render multiple theme options", () => {
        render(<GammaThemeSelector {...defaultProps} />);

        expect(screen.getByText("Atmosphere")).toBeInTheDocument();
        expect(screen.getByText("Borealis")).toBeInTheDocument();
        expect(screen.getByText("Nova")).toBeInTheDocument();
    });

    it("should call onThemeChange when theme clicked", () => {
        render(<GammaThemeSelector {...defaultProps} />);

        const themeButton = screen.getByText("Atmosphere").closest("button");
        if (themeButton) {
            fireEvent.click(themeButton);
        }

        expect(mockOnThemeChange).toHaveBeenCalledWith("atmosphere");
    });

    it("should render with custom className", () => {
        const { container } = render(
            <GammaThemeSelector {...defaultProps} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass("custom-class");
    });
});
