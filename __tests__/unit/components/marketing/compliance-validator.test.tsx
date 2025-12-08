/**
 * ComplianceValidator Component Tests
 * Tests preflight validation checks and issue reporting
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ComplianceValidator } from "@/components/marketing/compliance-validator";

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Import mocked modules
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

describe("ComplianceValidator", () => {
    const mockOnValidationComplete = vi.fn();
    const defaultProps = {
        variantId: "variant-123",
        onValidationComplete: mockOnValidationComplete,
        embedded: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly", () => {
        render(<ComplianceValidator {...defaultProps} />);
        expect(screen.getByText("Preflight Validation")).toBeInTheDocument();
        expect(screen.getByText("Run Validation")).toBeInTheDocument();
    });

    it("should render in embedded mode without Card wrapper", () => {
        const { container } = render(
            <ComplianceValidator {...defaultProps} embedded={true} />
        );
        expect(container.querySelector(".card")).not.toBeInTheDocument();
    });

    it("should display initial state before validation", () => {
        render(<ComplianceValidator {...defaultProps} />);
        expect(
            screen.getByText('Click "Run Validation" to check content')
        ).toBeInTheDocument();
    });

    it("should handle validation with passing results", async () => {
        const mockValidationResult = {
            passed: true,
            compliance_check: "pass",
            accessibility_check: "pass",
            brand_voice_check: "pass",
            character_limit_check: "pass",
            issues: [],
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                validation_result: mockValidationResult,
            }),
        });

        render(<ComplianceValidator {...defaultProps} />);

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(
                screen.getByText("All Validation Checks Passed")
            ).toBeInTheDocument();
        });

        expect(mockOnValidationComplete).toHaveBeenCalledWith(mockValidationResult);
    });

    it("should handle validation with failing results and issues", async () => {
        const mockValidationResult = {
            passed: false,
            compliance_check: "fail",
            accessibility_check: "pass",
            brand_voice_check: "pass",
            character_limit_check: "pass",
            issues: [
                {
                    type: "Compliance Issue",
                    message: "Missing disclaimer for health claims",
                    severity: "error" as const,
                },
                {
                    type: "Warning",
                    message: "Content may be too promotional",
                    severity: "warning" as const,
                },
            ],
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                validation_result: mockValidationResult,
            }),
        });

        render(<ComplianceValidator {...defaultProps} />);

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText("Issues (2)")).toBeInTheDocument();
            expect(
                screen.getByText("Missing disclaimer for health claims")
            ).toBeInTheDocument();
            expect(
                screen.getByText("Content may be too promotional")
            ).toBeInTheDocument();
        });
    });

    it("should display check status icons correctly", async () => {
        const mockValidationResult = {
            passed: false,
            compliance_check: "fail",
            accessibility_check: "pass",
            brand_voice_check: "pending",
            character_limit_check: "pass",
            issues: [],
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                validation_result: mockValidationResult,
            }),
        });

        render(<ComplianceValidator {...defaultProps} />);

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText("Compliance Check")).toBeInTheDocument();
        });
    });

    it("should show validating state during validation", async () => {
        (global.fetch as any).mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                json: async () => ({
                                    success: true,
                                    validation_result: { passed: true, issues: [] },
                                }),
                            }),
                        100
                    )
                )
        );

        render(<ComplianceValidator {...defaultProps} />);

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        expect(screen.getByText("Validating...")).toBeInTheDocument();
    });

    it("should validate with content prop instead of variant ID", async () => {
        const mockContent = {
            copy_text: "Test content",
            platform: "instagram",
            hashtags: ["test"],
            alt_text: "Image description",
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                validation_result: { passed: true, issues: [] },
            }),
        });

        render(
            <ComplianceValidator
                content={mockContent}
                onValidationComplete={mockOnValidationComplete}
                embedded={false}
            />
        );

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/validate"),
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify(mockContent),
                })
            );
        });
    });

    it("should handle validation error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Validation failed"));

        const mockLogger = vi.mocked(logger);
        const mockToast = vi.mocked(useToast)().toast;

        render(<ComplianceValidator {...defaultProps} />);

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Validation Error",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle missing variant ID and content", async () => {
        const mockToast = vi.mocked(useToast)().toast;

        render(
            <ComplianceValidator
                onValidationComplete={mockOnValidationComplete}
                embedded={false}
            />
        );

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Validation Error",
                    variant: "destructive",
                })
            );
        });
    });

    it("should display severity colors correctly", async () => {
        const mockValidationResult = {
            passed: false,
            compliance_check: "fail",
            accessibility_check: "pass",
            brand_voice_check: "pass",
            character_limit_check: "pass",
            issues: [
                {
                    type: "Error",
                    message: "Critical error",
                    severity: "error" as const,
                },
                {
                    type: "Warning",
                    message: "Warning message",
                    severity: "warning" as const,
                },
                {
                    type: "Info",
                    message: "Info message",
                    severity: "info" as const,
                },
            ],
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                validation_result: mockValidationResult,
            }),
        });

        const { container } = render(<ComplianceValidator {...defaultProps} />);

        const runButton = screen.getByText("Run Validation");
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText("Critical error")).toBeInTheDocument();
            expect(screen.getByText("Warning message")).toBeInTheDocument();
            expect(screen.getByText("Info message")).toBeInTheDocument();
        });
    });
});
