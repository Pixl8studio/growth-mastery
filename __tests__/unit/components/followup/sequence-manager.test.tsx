/**
 * SequenceManager Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SequenceManager } from "@/components/followup/sequence-manager";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("SequenceManager", () => {
    const mockProps = {
        funnelProjectId: "funnel-123",
        offerId: "offer-456",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<SequenceManager {...mockProps} />);

        expect(screen.getByText("AI Follow-Up Sequences")).toBeInTheDocument();
    });

    it("should display description text", () => {
        render(<SequenceManager {...mockProps} />);

        expect(
            screen.getByText(
                "Automatically generate personalized message sequences based on your deck and offer"
            )
        ).toBeInTheDocument();
    });

    it("should show generation buttons when no sequence exists", () => {
        render(<SequenceManager {...mockProps} />);

        expect(screen.getByText("Generate AI-Powered Sequence")).toBeInTheDocument();
        expect(screen.getByText("Use Default Templates")).toBeInTheDocument();
    });

    it("should show helpful onboarding text", () => {
        render(<SequenceManager {...mockProps} />);

        expect(screen.getByText("Generate Your First Sequence")).toBeInTheDocument();
        expect(
            screen.getByText(/Our AI will analyze your webinar deck/)
        ).toBeInTheDocument();
    });

    it("should disable buttons when no offer is provided", () => {
        render(<SequenceManager funnelProjectId="funnel-123" />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        const defaultButton = screen.getByText("Use Default Templates");

        expect(aiButton).toBeDisabled();
        expect(defaultButton).toBeDisabled();
    });

    it("should show warning when offer is missing", () => {
        render(<SequenceManager funnelProjectId="funnel-123" />);

        expect(
            screen.getByText("Please complete the offer configuration step first")
        ).toBeInTheDocument();
    });

    it("should call API when AI generation is clicked", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "ai",
                message_ids: ["msg-1", "msg-2", "msg-3", "msg-4", "msg-5"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/sequences/generate",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining('"use_defaults":false'),
                })
            );
        });
    });

    it("should call API with defaults when default templates is clicked", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "default",
                message_ids: ["msg-1", "msg-2", "msg-3", "msg-4", "msg-5"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const defaultButton = screen.getByText("Use Default Templates");
        fireEvent.click(defaultButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/sequences/generate",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining('"use_defaults":true'),
                })
            );
        });
    });

    it("should show loading state during generation", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({
                ok: true,
                json: async () => ({
                    sequence_id: "seq-123",
                    message_count: 5,
                    generation_method: "ai",
                }),
            }), 100))
        );

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        expect(screen.getByText("Generating AI Templates...")).toBeInTheDocument();
    });

    it("should display success state after generation", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "ai",
                message_ids: ["msg-1", "msg-2", "msg-3", "msg-4", "msg-5"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("Sequence Generated Successfully")).toBeInTheDocument();
        });
    });

    it("should show AI-Powered badge for AI generation", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "ai",
                message_ids: ["msg-1", "msg-2", "msg-3", "msg-4", "msg-5"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("AI-Powered")).toBeInTheDocument();
        });
    });

    it("should show Default Template badge for default generation", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "default",
                message_ids: ["msg-1", "msg-2", "msg-3"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const defaultButton = screen.getByText("Use Default Templates");
        fireEvent.click(defaultButton);

        await waitFor(() => {
            expect(screen.getByText("Default Template")).toBeInTheDocument();
        });
    });

    it("should display regenerate button after successful generation", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "ai",
                message_ids: ["msg-1"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("🔄 Regenerate")).toBeInTheDocument();
        });
    });

    it("should show error message on generation failure", async () => {
        (global.fetch as any).mockRejectedValue(new Error("Generation failed"));

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("Generation Error")).toBeInTheDocument();
        });
    });

    it("should offer default templates on AI failure", async () => {
        (global.fetch as any).mockRejectedValue(new Error("AI service unavailable"));

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("Try Default Templates Instead")).toBeInTheDocument();
        });
    });

    it("should display sequence details after generation", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "ai",
                message_ids: ["msg-1"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("3-Day Discount Sequence")).toBeInTheDocument();
            expect(screen.getByText("5 touches over 72 hours")).toBeInTheDocument();
        });
    });

    it("should display what happens next information", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "ai",
                message_ids: ["msg-1"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("What Happens Next?")).toBeInTheDocument();
            expect(
                screen.getByText(/Messages will automatically personalize/)
            ).toBeInTheDocument();
        });
    });

    it("should handle API error response", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({
                error: "Invalid offer configuration",
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("Generation Error")).toBeInTheDocument();
        });
    });

    it("should show sequence metadata", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                sequence_id: "seq-123",
                message_count: 5,
                generation_method: "ai",
                message_ids: ["msg-1"],
            }),
        });

        render(<SequenceManager {...mockProps} />);

        const aiButton = screen.getByText("Generate AI-Powered Sequence");
        fireEvent.click(aiButton);

        await waitFor(() => {
            expect(screen.getByText("📨 4 emails + 1 SMS")).toBeInTheDocument();
            expect(screen.getByText(/Adapts to:/)).toBeInTheDocument();
        });
    });
});
