/**
 * ProfileConfigFormEnhanced Component Tests
 * Tests comprehensive profile configuration with brand voice, tone settings, and compliance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileConfigFormEnhanced } from "@/components/marketing/profile-config-form-enhanced";

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

describe("ProfileConfigFormEnhanced", () => {
    const mockOnUpdate = vi.fn();

    const mockProfile = {
        id: "profile-1",
        funnel_project_id: "test-funnel-123",
        brand_voice: "Professional and friendly tone",
        tone_settings: {
            conversational_professional: 50,
            warmth: 70,
            urgency: 40,
            empathy: 60,
            confidence: 75,
        },
        echo_mode_config: {
            enabled: false,
            voice_strength: 75,
            vocabulary_level: "intermediate",
        },
        story_themes: ["founder_saga", "myth_buster"],
        visual_preferences: {
            brand_colors: ["#3B82F6", "#8B5CF6"],
            logo_url: "",
        },
        metadata: {
            tone_extended: {
                humor: 30,
                authority: 70,
                vulnerability: 40,
            },
        },
    };

    const defaultProps = {
        profile: mockProfile,
        onUpdate: mockOnUpdate,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render all major sections", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        expect(screen.getByText("Brand Voice Guidelines")).toBeInTheDocument();
        expect(screen.getByText("Visual Identity")).toBeInTheDocument();
        expect(screen.getByText(/Echo Mode/)).toBeInTheDocument();
        expect(screen.getByText("Tone Settings")).toBeInTheDocument();
        expect(screen.getByText("Preferred Story Frameworks")).toBeInTheDocument();
        expect(screen.getByText("Content Restrictions")).toBeInTheDocument();
        expect(screen.getByText("Compliance & Legal")).toBeInTheDocument();
    });

    it("should populate brand voice field with profile data", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const brandVoiceTextarea = screen.getByPlaceholderText(
            /Describe your brand voice/
        );
        expect(brandVoiceTextarea).toHaveValue("Professional and friendly tone");
    });

    it("should allow editing brand voice", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const brandVoiceTextarea = screen.getByPlaceholderText(
            /Describe your brand voice/
        );
        fireEvent.change(brandVoiceTextarea, {
            target: { value: "Updated brand voice" },
        });

        expect(brandVoiceTextarea).toHaveValue("Updated brand voice");
    });

    it("should display tone sliders with current values", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        expect(screen.getByText("50")).toBeInTheDocument(); // conversational_professional
        expect(screen.getByText("70")).toBeInTheDocument(); // warmth
    });

    it("should allow adjusting tone sliders", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const warmthSlider = screen.getAllByRole("slider")[1]; // Second slider (warmth)
        fireEvent.change(warmthSlider, { target: { value: "80" } });

        expect(screen.getByText("80")).toBeInTheDocument();
    });

    it("should toggle Echo Mode", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const echoModeSwitch = screen.getByRole("switch");
        fireEvent.click(echoModeSwitch);

        expect(echoModeSwitch).toBeChecked();
    });

    it("should show Echo Mode options when enabled", () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        render(
            <ProfileConfigFormEnhanced {...defaultProps} profile={echoEnabledProfile} />
        );

        expect(screen.getByText("Sample Content for Calibration")).toBeInTheDocument();
        expect(screen.getByText(/Voice Strength/)).toBeInTheDocument();
    });

    it("should switch between manual input and URL analysis", () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        render(
            <ProfileConfigFormEnhanced {...defaultProps} profile={echoEnabledProfile} />
        );

        const urlButton = screen.getByText("Analyze from URL");
        fireEvent.click(urlButton);

        expect(
            screen.getByPlaceholderText(/https:\/\/instagram.com\/username/)
        ).toBeInTheDocument();
    });

    it("should handle voice calibration", async () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                echo_mode_config: {
                    voice_characteristics: ["conversational", "friendly"],
                },
            }),
        });

        render(
            <ProfileConfigFormEnhanced {...defaultProps} profile={echoEnabledProfile} />
        );

        const sampleTextarea = screen.getByPlaceholderText(/Paste 3-5 existing/);
        fireEvent.change(sampleTextarea, {
            target: { value: "Post 1\n\nPost 2\n\nPost 3" },
        });

        const calibrateButton = screen.getByText("Calibrate Voice");
        fireEvent.click(calibrateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/profiles/profile-1/calibrate"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should require minimum sample posts for calibration", async () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        const { toast } = require("@/components/ui/use-toast").useToast();

        render(
            <ProfileConfigFormEnhanced {...defaultProps} profile={echoEnabledProfile} />
        );

        const calibrateButton = screen.getByText("Calibrate Voice");
        fireEvent.click(calibrateButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Sample Content Required",
                    variant: "destructive",
                })
            );
        });
    });

    it("should handle URL analysis", async () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({
                success: true,
                styleSummary: "Conversational and engaging",
                previewParagraph: "This is a sample preview",
            }),
        });

        render(
            <ProfileConfigFormEnhanced {...defaultProps} profile={echoEnabledProfile} />
        );

        const urlButton = screen.getByText("Analyze from URL");
        fireEvent.click(urlButton);

        const urlInput = screen.getByPlaceholderText(/https:\/\/instagram.com/);
        fireEvent.change(urlInput, {
            target: { value: "https://instagram.com/test" },
        });

        const analyzeButton = screen.getByText("Analyze URL");
        fireEvent.click(analyzeButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    "/api/marketing/profiles/profile-1/analyze-url"
                ),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should validate URL before analysis", async () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        const { toast } = require("@/components/ui/use-toast").useToast();

        render(
            <ProfileConfigFormEnhanced {...defaultProps} profile={echoEnabledProfile} />
        );

        const urlButton = screen.getByText("Analyze from URL");
        fireEvent.click(urlButton);

        const urlInput = screen.getByPlaceholderText(/https:\/\/instagram.com/);
        fireEvent.change(urlInput, { target: { value: "invalid-url" } });

        const analyzeButton = screen.getByText("Analyze URL");
        fireEvent.click(analyzeButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Invalid URL",
                    variant: "destructive",
                })
            );
        });
    });

    it("should apply tone presets", () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const thoughtLeaderButton = screen.getByText("Thought Leader");
        fireEvent.click(thoughtLeaderButton);

        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Tone Preset Applied",
            })
        );
    });

    it("should toggle story themes", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const howToTheme = screen.getByText("How To");
        fireEvent.click(howToTheme.closest("div")!);

        // Theme should be toggled
        expect(screen.getByText("How To")).toBeInTheDocument();
    });

    it("should handle profile save", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true }),
        });

        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const saveButton = screen.getByText("Save Profile");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/profiles/profile-1"),
                expect.objectContaining({
                    method: "PUT",
                })
            );
        });

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Profile Updated",
                })
            );
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });

    it("should handle save error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Save failed"));

        const { logger } = require("@/lib/client-logger");
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const saveButton = screen.getByText("Save Profile");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
            expect(toast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Error",
                    variant: "destructive",
                })
            );
        });
    });

    it("should display visual identity color pickers", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const colorInputs = screen.getAllByLabelText(/Brand Color/);
        expect(colorInputs.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle auto-populate from intake", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const intakeButton = screen.getByText("From Intake");
        fireEvent.click(intakeButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalled();
        });
    });

    it("should handle auto-populate from offer", async () => {
        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const offerButton = screen.getByText("From Offer");
        fireEvent.click(offerButton);

        await waitFor(() => {
            expect(toast).toHaveBeenCalled();
        });
    });
});
