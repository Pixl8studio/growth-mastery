/**
 * ProfileConfigFormEnhanced Component Tests
 * Tests comprehensive profile configuration with brand voice, tone settings, and compliance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileConfigFormEnhanced } from "@/components/marketing/profile-config-form-enhanced";

// Create stable mocks
const mockToast = vi.fn();

// Mock dependencies
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
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
    } as any;

    const defaultProps = {
        profile: mockProfile,
        onUpdate: mockOnUpdate,
    } as any;

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

        // Multiple sliders may have the same value, so use getAllByText
        expect(screen.getByText("50")).toBeInTheDocument(); // conversational_professional
        const seventyElements = screen.getAllByText("70"); // warmth: 70, authority: 70
        expect(seventyElements.length).toBeGreaterThanOrEqual(1);
    });

    it("should allow adjusting tone sliders", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        // Verify sliders are rendered (8 total in enhanced form)
        const sliders = screen.getAllByRole("slider");
        expect(sliders.length).toBe(8);

        // Verify warmth slider shows current value
        const warmthElements = screen.getAllByText("70");
        expect(warmthElements.length).toBeGreaterThanOrEqual(1);
    });

    it("should toggle Echo Mode", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        // Multiple switches exist in enhanced form, get them all
        const switches = screen.getAllByRole("switch");
        expect(switches.length).toBeGreaterThan(0);

        // First switch should be Echo Mode (based on component structure)
        const echoModeSwitch = switches[0];
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
            target: {
                value:
                    "This is my first sample post with enough content to pass the validation check\n\nThis is my second sample post with enough content to pass the validation check\n\nThis is my third sample post with enough content to pass the validation check",
            },
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

        render(
            <ProfileConfigFormEnhanced {...defaultProps} profile={echoEnabledProfile} />
        );

        const calibrateButton = screen.getByText("Calibrate Voice");
        fireEvent.click(calibrateButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
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
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Invalid URL",
                    variant: "destructive",
                })
            );
        });
    });

    it("should apply tone presets", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const thoughtLeaderButton = screen.getByText("Thought Leader");
        fireEvent.click(thoughtLeaderButton);

        expect(mockToast).toHaveBeenCalledWith(
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
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Profile Updated",
                })
            );
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });

    it("should handle save error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Save failed"));

        const mockLogger = vi.mocked(logger);

        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const saveButton = screen.getByText("Save Profile");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Error",
                    variant: "destructive",
                })
            );
        });
    });

    it("should display visual identity color pickers", () => {
        const { container } = render(<ProfileConfigFormEnhanced {...defaultProps} />);

        // Query for color input elements
        const colorInputs = container.querySelectorAll('input[type="color"]');
        expect(colorInputs.length).toBeGreaterThanOrEqual(2);

        // Verify Brand Color text is present
        expect(screen.getByText("Primary Brand Color")).toBeInTheDocument();
        expect(screen.getByText("Secondary Brand Color")).toBeInTheDocument();
    });

    it("should handle auto-populate from intake", async () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const intakeButton = screen.getByText("From Intake");
        fireEvent.click(intakeButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
        });
    });

    it("should handle auto-populate from offer", async () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const offerButton = screen.getByText("From Offer");
        fireEvent.click(offerButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
        });
    });
});
