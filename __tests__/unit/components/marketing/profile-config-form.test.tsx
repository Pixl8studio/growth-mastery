/**
 * ProfileConfigForm Component Tests
 * Tests basic profile configuration form functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileConfigForm } from "@/components/marketing/profile-config-form";

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

describe("ProfileConfigForm", () => {
    const mockOnUpdate = vi.fn();

    const mockProfile = {
        id: "profile-1",
        funnel_project_id: "test-funnel-123",
        brand_voice: "Professional and approachable",
        tone_settings: {
            conversational_professional: 50,
            warmth: 70,
            urgency: 40,
            empathy: 60,
            confidence: 75,
        },
        echo_mode_config: {
            enabled: false,
        },
        story_themes: ["founder_saga"],
    } as any;

    const defaultProps = {
        profile: mockProfile,
        onUpdate: mockOnUpdate,
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly with main sections", () => {
        render(<ProfileConfigForm {...defaultProps} />);

        expect(screen.getByText("Brand Voice Guidelines")).toBeInTheDocument();
        expect(screen.getByText(/Echo Mode/)).toBeInTheDocument();
        expect(screen.getByText("Tone Settings")).toBeInTheDocument();
        expect(screen.getByText("Preferred Story Frameworks")).toBeInTheDocument();
    });

    it("should populate brand voice with profile data", () => {
        render(<ProfileConfigForm {...defaultProps} />);

        const brandVoiceTextarea = screen.getByPlaceholderText(
            /Describe your brand voice/
        );
        expect(brandVoiceTextarea).toHaveValue("Professional and approachable");
    });

    it("should allow editing brand voice", () => {
        render(<ProfileConfigForm {...defaultProps} />);

        const brandVoiceTextarea = screen.getByPlaceholderText(
            /Describe your brand voice/
        );
        fireEvent.change(brandVoiceTextarea, {
            target: { value: "New brand voice" },
        });

        expect(brandVoiceTextarea).toHaveValue("New brand voice");
    });

    it("should toggle Echo Mode", () => {
        render(<ProfileConfigForm {...defaultProps} />);

        const echoModeSwitch = screen.getByRole("switch");
        fireEvent.click(echoModeSwitch);

        expect(echoModeSwitch).toBeChecked();
    });

    it("should display Echo Mode options when enabled", () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        render(<ProfileConfigForm {...defaultProps} profile={echoEnabledProfile} />);

        expect(screen.getByText("Sample Content for Calibration")).toBeInTheDocument();
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
                    voice_characteristics: ["casual", "friendly"],
                },
            }),
        });

        render(<ProfileConfigForm {...defaultProps} profile={echoEnabledProfile} />);

        const sampleTextarea = screen.getByPlaceholderText(
            /Paste 3-5 of your existing/
        );
        fireEvent.change(sampleTextarea, {
            target: { value: "Sample post 1\n\nSample post 2\n\nSample post 3" },
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

    it("should require sample content for calibration", async () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ProfileConfigForm {...defaultProps} profile={echoEnabledProfile} />);

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

    it("should display tone sliders", () => {
        render(<ProfileConfigForm {...defaultProps} />);

        expect(screen.getByText(/Conversational ↔ Professional/)).toBeInTheDocument();
        expect(screen.getByText("Warmth")).toBeInTheDocument();
        expect(screen.getByText("Urgency")).toBeInTheDocument();
        expect(screen.getByText("Empathy")).toBeInTheDocument();
        expect(screen.getByText("Confidence")).toBeInTheDocument();
    });

    it("should toggle story themes", () => {
        render(<ProfileConfigForm {...defaultProps} />);

        const mythBusterTheme = screen.getByText("Myth Buster");
        fireEvent.click(mythBusterTheme.closest("div")!);

        expect(screen.getByText("Myth Buster")).toBeInTheDocument();
    });

    it("should handle profile save", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true }),
        });

        const { toast } = require("@/components/ui/use-toast").useToast();

        render(<ProfileConfigForm {...defaultProps} />);

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
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const { logger } = require("@/lib/client-logger");

        render(<ProfileConfigForm {...defaultProps} />);

        const saveButton = screen.getByText("Save Profile");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("should switch between manual input and URL analysis", () => {
        const echoEnabledProfile = {
            ...mockProfile,
            echo_mode_config: { ...mockProfile.echo_mode_config, enabled: true },
        };

        render(<ProfileConfigForm {...defaultProps} profile={echoEnabledProfile} />);

        const urlButton = screen.getByText("Analyze from URL");
        fireEvent.click(urlButton);

        expect(
            screen.getByPlaceholderText(/https:\/\/instagram.com\/username or/)
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
                styleSummary: "Engaging and informative",
                previewParagraph: "Sample preview text",
            }),
        });

        render(<ProfileConfigForm {...defaultProps} profile={echoEnabledProfile} />);

        const urlButton = screen.getByText("Analyze from URL");
        fireEvent.click(urlButton);

        const urlInput = screen.getByPlaceholderText(
            /https:\/\/instagram.com\/username or/
        );
        fireEvent.change(urlInput, {
            target: { value: "https://instagram.com/testuser" },
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
});
