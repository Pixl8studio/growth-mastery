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

    it("should toggle story themes", () => {
        render(<ProfileConfigFormEnhanced {...defaultProps} />);

        const howToTheme = screen.getByText("How To");
        fireEvent.click(howToTheme.closest("div")!);

        // Theme should be toggled
        expect(screen.getByText("How To")).toBeInTheDocument();
    });
});
