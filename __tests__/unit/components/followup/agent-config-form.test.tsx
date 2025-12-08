/**
 * AgentConfigForm Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AgentConfigForm } from "@/components/followup/agent-config-form";

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

describe("AgentConfigForm", () => {
    const mockConfig = {
        name: "Test Agent",
        voice_config: {
            tone: "conversational",
            personality: "helpful",
            empathy_level: "moderate",
            urgency_level: "gentle",
        },
        knowledge_base: {
            brand_voice: "Test brand voice",
            product_knowledge: "Test product knowledge",
            objection_responses: "Test objection responses",
            blacklist_topics: "Test blacklist",
        },
        scoring_config: {
            watch_weight: 45,
            offer_click_weight: 25,
            email_engagement_weight: 5,
            reply_weight: 15,
            hot_threshold: 75,
            engaged_threshold: 50,
            sampler_threshold: 25,
            skimmer_threshold: 1,
        },
    };

    const mockOnSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);
        expect(screen.getByText("AI Agent Configuration")).toBeInTheDocument();
    });

    it("should render all tabs", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);
        expect(screen.getByText("Voice")).toBeInTheDocument();
        expect(screen.getByText("Knowledge")).toBeInTheDocument();
        expect(screen.getByText("Scoring")).toBeInTheDocument();
        expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("should display agent name input with value", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);
        const input = screen.getByPlaceholderText("Main Follow-Up Agent");
        expect(input).toHaveValue("Test Agent");
    });

    it("should handle agent name change", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);
        const input = screen.getByPlaceholderText("Main Follow-Up Agent");
        fireEvent.change(input, { target: { value: "New Agent Name" } });
        expect(input).toHaveValue("New Agent Name");
    });

    it("should render voice configuration dropdowns", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Check if tone dropdown exists with correct value
        const toneSelect = screen.getAllByRole("combobox")[0];
        expect(toneSelect).toHaveValue("conversational");
    });

    it("should call onSave when save button is clicked", async () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        const saveButton = screen.getByText("Save Agent Configuration");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled();
        });
    });

    it("should render with null config using defaults", () => {
        render(<AgentConfigForm config={null} onSave={mockOnSave} />);

        const input = screen.getByPlaceholderText("Main Follow-Up Agent");
        expect(input).toHaveValue("Main Follow-Up Agent");
    });

    it("should display scoring configuration inputs", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Switch to Scoring tab
        const scoringTab = screen.getByText("Scoring");
        fireEvent.click(scoringTab);

        expect(screen.getByText("Watch Percentage Weight")).toBeInTheDocument();
        expect(screen.getByText("Offer Click Weight")).toBeInTheDocument();
    });

    it("should handle scoring weight changes", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Switch to Scoring tab
        const scoringTab = screen.getByText("Scoring");
        fireEvent.click(scoringTab);

        // Find watch weight input and change it
        const watchWeightInputs = screen.getAllByRole("spinbutton");
        const watchWeightInput = watchWeightInputs[0];
        fireEvent.change(watchWeightInput, { target: { value: "50" } });
        expect(watchWeightInput).toHaveValue(50);
    });

    it("should render knowledge base textareas", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Switch to Knowledge tab
        const knowledgeTab = screen.getByText("Knowledge");
        fireEvent.click(knowledgeTab);

        expect(screen.getByText("Brand Voice Guidelines")).toBeInTheDocument();
        expect(screen.getByText("Product/Service Knowledge")).toBeInTheDocument();
        expect(screen.getByText("Common Objection Responses")).toBeInTheDocument();
    });

    it("should display preview tab content", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Switch to Preview tab
        const previewTab = screen.getByText("Preview");
        fireEvent.click(previewTab);

        expect(screen.getByText("Agent Summary")).toBeInTheDocument();
        expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });

    it("should show regenerate button when funnelProjectId is provided", () => {
        render(
            <AgentConfigForm
                config={mockConfig}
                onSave={mockOnSave}
                funnelProjectId="test-funnel-id"
            />
        );

        // Switch to Knowledge tab
        const knowledgeTab = screen.getByText("Knowledge");
        fireEvent.click(knowledgeTab);

        expect(screen.getByText("Regenerate")).toBeInTheDocument();
    });

    it("should disable save button when saving", () => {
        render(
            <AgentConfigForm config={mockConfig} onSave={mockOnSave} saving={true} />
        );

        const saveButton = screen.getByText("Saving...");
        expect(saveButton).toBeDisabled();
    });

    it("should handle knowledge base content changes", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Switch to Knowledge tab
        const knowledgeTab = screen.getByText("Knowledge");
        fireEvent.click(knowledgeTab);

        const brandVoiceTextarea = screen.getByPlaceholderText(
            "Describe your brand's voice and communication style..."
        );
        fireEvent.change(brandVoiceTextarea, {
            target: { value: "Updated brand voice" },
        });
        expect(brandVoiceTextarea).toHaveValue("Updated brand voice");
    });

    it("should update formData when config prop changes", () => {
        const { rerender } = render(
            <AgentConfigForm config={mockConfig} onSave={mockOnSave} />
        );

        const newConfig = {
            ...mockConfig,
            name: "Updated Agent",
        };

        rerender(<AgentConfigForm config={newConfig} onSave={mockOnSave} />);

        const input = screen.getByPlaceholderText("Main Follow-Up Agent");
        expect(input).toHaveValue("Updated Agent");
    });

    it("should render all segmentation threshold inputs", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Switch to Scoring tab
        const scoringTab = screen.getByText("Scoring");
        fireEvent.click(scoringTab);

        expect(screen.getByText("Hot (75-100)")).toBeInTheDocument();
        expect(screen.getByText("Engaged (50-74)")).toBeInTheDocument();
        expect(screen.getByText("Sampler (25-49)")).toBeInTheDocument();
        expect(screen.getByText("Skimmer (1-24)")).toBeInTheDocument();
    });

    it("should render sample message preview", () => {
        render(<AgentConfigForm config={mockConfig} onSave={mockOnSave} />);

        // Switch to Preview tab
        const previewTab = screen.getByText("Preview");
        fireEvent.click(previewTab);

        expect(screen.getByText("Sample Message Preview:")).toBeInTheDocument();
    });
});
