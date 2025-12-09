/**
 * StoryAngleSelector Component Tests
 * Tests story angle selection with regeneration functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StoryAngleSelector } from "@/components/marketing/story-angle-selector";

// Mock dependencies
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
};

vi.mock("@/lib/client-logger", () => ({
    logger: mockLogger,
}));

describe("StoryAngleSelector", () => {
    const mockOnSelectAngle = vi.fn();
    const mockOnRegenerateAngles = vi.fn();

    const mockAngles = [
        {
            angle: "Authority Builder",
            hook: "Discover the secret strategy top marketers use",
            story_outline: "Problem > Solution > Result framework...",
        },
        {
            angle: "Problem Solver",
            hook: "Struggling with low engagement rates?",
            story_outline: "Identify pain point > Agitate > Solve...",
        },
        {
            angle: "Transformation Story",
            hook: "How I went from zero to hero",
            story_outline: "Before > Journey > After transformation...",
        },
    ] as any;

    const defaultProps = {
        angles: mockAngles,
        onSelectAngle: mockOnSelectAngle,
        onRegenerateAngles: mockOnRegenerateAngles,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockToast.mockClear();
    });

    it("should render correctly with angles", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        expect(screen.getByText("Choose Your Story Angle")).toBeInTheDocument();
        expect(
            screen.getByText("Select the angle that best fits your message")
        ).toBeInTheDocument();
    });

    it("should display all provided angles", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        expect(screen.getByText("Authority Builder")).toBeInTheDocument();
        expect(screen.getByText("Problem Solver")).toBeInTheDocument();
        expect(screen.getByText("Transformation Story")).toBeInTheDocument();
    });

    it("should display angle hooks", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        expect(
            screen.getByText("Discover the secret strategy top marketers use")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Struggling with low engagement rates?")
        ).toBeInTheDocument();
    });

    it("should display angle outlines", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        expect(
            screen.getByText(/Problem > Solution > Result framework/i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Identify pain point > Agitate > Solve/i)
        ).toBeInTheDocument();
    });

    it("should call onSelectAngle when angle card clicked", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        const angleCard = screen.getByText("Authority Builder").closest("div");
        if (angleCard) {
            fireEvent.click(angleCard);
        }

        expect(mockOnSelectAngle).toHaveBeenCalledWith(mockAngles[0]);
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Angle Selected",
                description: 'Using "Authority Builder" for content generation',
            })
        );
    });

    it("should call onSelectAngle when select button clicked", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        const selectButtons = screen.getAllByRole("button", {
            name: /Select This Angle/i,
        });
        fireEvent.click(selectButtons[0]);

        expect(mockOnSelectAngle).toHaveBeenCalledWith(mockAngles[0]);
    });

    it("should display selected state for chosen angle", () => {
        render(
            <StoryAngleSelector {...defaultProps} selectedAngleId="Authority Builder" />
        );

        expect(screen.getByText("Selected")).toBeInTheDocument();
        expect(screen.getByText(/Selected: Authority Builder/i)).toBeInTheDocument();
    });

    it("should render regenerate button when onRegenerateAngles provided", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        expect(screen.getByText("Regenerate Angles")).toBeInTheDocument();
    });

    it("should not render regenerate button when onRegenerateAngles not provided", () => {
        const propsWithoutRegenerate = {
            angles: mockAngles,
            onSelectAngle: mockOnSelectAngle,
        };

        render(<StoryAngleSelector {...propsWithoutRegenerate} />);

        expect(screen.queryByText("Regenerate Angles")).not.toBeInTheDocument();
    });

    it("should call onRegenerateAngles when regenerate button clicked", async () => {
        mockOnRegenerateAngles.mockResolvedValueOnce(undefined);

        render(<StoryAngleSelector {...defaultProps} />);

        const regenerateButton = screen.getByRole("button", {
            name: /Regenerate Angles/i,
        });
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(mockOnRegenerateAngles).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Angles Regenerated",
                })
            );
        });
    });

    it("should show loading state during regeneration", async () => {
        mockOnRegenerateAngles.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<StoryAngleSelector {...defaultProps} />);

        const regenerateButton = screen.getByRole("button", {
            name: /Regenerate Angles/i,
        });
        fireEvent.click(regenerateButton);

        expect(screen.getByText("Regenerating...")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText("Regenerating...")).not.toBeInTheDocument();
        });
    });

    it("should handle regeneration error", async () => {
        mockOnRegenerateAngles.mockRejectedValueOnce(new Error("API error"));

        render(<StoryAngleSelector {...defaultProps} />);

        const regenerateButton = screen.getByRole("button", {
            name: /Regenerate Angles/i,
        });
        fireEvent.click(regenerateButton);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Regeneration Failed",
                    variant: "destructive",
                })
            );
        });
    });

    it("should render empty state when no angles provided", () => {
        const emptyProps = {
            angles: [],
            onSelectAngle: mockOnSelectAngle,
        };

        render(<StoryAngleSelector {...emptyProps} />);

        expect(screen.getByText("No Story Angles Yet")).toBeInTheDocument();
        expect(
            screen.getByText("Generate content to see story angle options")
        ).toBeInTheDocument();
    });

    it("should display angle numbering", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        expect(screen.getByText("Angle 1")).toBeInTheDocument();
        expect(screen.getByText("Angle 2")).toBeInTheDocument();
        expect(screen.getByText("Angle 3")).toBeInTheDocument();
    });

    it("should display hook label", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        const hookLabels = screen.getAllByText("HOOK:");
        expect(hookLabels.length).toBe(3);
    });

    it("should display outline label", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        const outlineLabels = screen.getAllByText("OUTLINE:");
        expect(outlineLabels.length).toBe(3);
    });

    it("should display confirmation card for selected angle", () => {
        render(<StoryAngleSelector {...defaultProps} />);

        const selectButtons = screen.getAllByRole("button", {
            name: /Select This Angle/i,
        });
        fireEvent.click(selectButtons[0]);

        expect(
            screen.getByText(/Content will be generated using this angle/i)
        ).toBeInTheDocument();
    });

    it("should allow changing selection", () => {
        render(
            <StoryAngleSelector {...defaultProps} selectedAngleId="Authority Builder" />
        );

        const problemSolverCard = screen.getByText("Problem Solver").closest("div");
        if (problemSolverCard) {
            fireEvent.click(problemSolverCard);
        }

        expect(mockOnSelectAngle).toHaveBeenCalledWith(mockAngles[1]);
    });

    it("should display selected button text for selected angle", () => {
        render(
            <StoryAngleSelector {...defaultProps} selectedAngleId="Authority Builder" />
        );

        expect(screen.getByText("Selected")).toBeInTheDocument();
    });

    it("should display select this angle button text for unselected angles", () => {
        render(
            <StoryAngleSelector {...defaultProps} selectedAngleId="Authority Builder" />
        );

        const selectButtons = screen.getAllByRole("button", {
            name: /Select This Angle/i,
        });
        expect(selectButtons.length).toBe(2);
    });
});
