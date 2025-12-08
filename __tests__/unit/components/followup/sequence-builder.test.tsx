/**
 * SequenceBuilder Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SequenceBuilder } from "@/components/followup/sequence-builder";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("SequenceBuilder", () => {
    const mockSequences = [
        {
            id: "seq-1",
            name: "3-Day Discount",
            description: "Limited time offer sequence",
            sequence_type: "3_day_discount",
            trigger_event: "webinar_completed",
            trigger_delay_hours: 1,
            deadline_hours: 72,
            total_messages: 5,
            target_segments: ["sampler", "engaged", "hot"],
            requires_manual_approval: false,
            is_active: true,
            message_count: 5,
        },
        {
            id: "seq-2",
            name: "Nurture Sequence",
            description: "Long-term nurture",
            sequence_type: "nurture",
            trigger_event: "webinar_completed",
            trigger_delay_hours: 24,
            deadline_hours: 168,
            total_messages: 3,
            target_segments: ["skimmer"],
            requires_manual_approval: true,
            is_active: false,
            message_count: 0,
        },
    ];

    const mockOnCreateSequence = vi.fn().mockResolvedValue(undefined);
    const mockOnUpdateSequence = vi.fn().mockResolvedValue(undefined);
    const mockOnDeleteSequence = vi.fn().mockResolvedValue(undefined);
    const mockOnSelectSequence = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("Message Sequences")).toBeInTheDocument();
    });

    it("should display all sequences", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("3-Day Discount")).toBeInTheDocument();
        expect(screen.getByText("Nurture Sequence")).toBeInTheDocument();
    });

    it("should show new sequence button", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("New Sequence")).toBeInTheDocument();
    });

    it("should display create form when new sequence button is clicked", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        const newButton = screen.getByText("New Sequence");
        fireEvent.click(newButton);

        expect(screen.getByText("Create New Sequence")).toBeInTheDocument();
    });

    it("should display sequence details", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("5 of 5 messages")).toBeInTheDocument();
        expect(screen.getByText("72h duration")).toBeInTheDocument();
        expect(screen.getByText("3 segments")).toBeInTheDocument();
    });

    it("should show active badge for active sequences", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("should show paused badge for inactive sequences", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("should show manual approval badge when required", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("Manual Approval")).toBeInTheDocument();
    });

    it("should display target segments", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("sampler")).toBeInTheDocument();
        expect(screen.getByText("engaged")).toBeInTheDocument();
        expect(screen.getByText("hot")).toBeInTheDocument();
    });

    it("should show generate messages button for sequences without messages", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("Generate Messages")).toBeInTheDocument();
    });

    it("should show view messages button for sequences with messages", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
                onSelectSequence={mockOnSelectSequence}
            />
        );

        expect(screen.getByText(/View Messages \(5\)/)).toBeInTheDocument();
    });

    it("should call onSelectSequence when view messages is clicked", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
                onSelectSequence={mockOnSelectSequence}
            />
        );

        const viewButton = screen.getByText(/View Messages \(5\)/);
        fireEvent.click(viewButton);

        expect(mockOnSelectSequence).toHaveBeenCalledWith("seq-1");
    });

    it("should display edit button for each sequence", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        const editButtons = screen.getAllByRole("button", { name: "" });
        const editButtonsWithEditIcon = editButtons.filter((btn) =>
            btn.querySelector("svg")
        );
        expect(editButtonsWithEditIcon.length).toBeGreaterThan(0);
    });

    it("should display delete button for each sequence", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        const deleteButtons = screen.getAllByRole("button");
        expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("should show empty state when no sequences", () => {
        render(
            <SequenceBuilder
                sequences={[]}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("No Sequences Yet")).toBeInTheDocument();
        expect(screen.getByText("Create First Sequence")).toBeInTheDocument();
    });

    it("should display timeline visualization", () => {
        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getAllByText("Timeline")).toHaveLength(2);
    });

    it("should show message count mismatch warning", () => {
        const mismatchSequences = [
            {
                ...mockSequences[0],
                message_count: 3,
                total_messages: 5,
            },
        ];

        render(
            <SequenceBuilder
                sequences={mismatchSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        expect(screen.getByText("Message Count Mismatch")).toBeInTheDocument();
    });

    it("should handle form submission for new sequence", async () => {
        render(
            <SequenceBuilder
                sequences={[]}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        const newButton = screen.getByText("New Sequence");
        fireEvent.click(newButton);

        const nameInput = screen.getByPlaceholderText("3-Day Discount Sequence");
        fireEvent.change(nameInput, { target: { value: "My New Sequence" } });

        const createButton = screen.getByText("Create Sequence");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockOnCreateSequence).toHaveBeenCalled();
        });
    });

    it("should display segment checkboxes in create form", () => {
        render(
            <SequenceBuilder
                sequences={[]}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        const newButton = screen.getByText("New Sequence");
        fireEvent.click(newButton);

        expect(screen.getByText("no show")).toBeInTheDocument();
        expect(screen.getByText("skimmer")).toBeInTheDocument();
    });

    it("should generate messages when button clicked", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                messages_generated: 3,
                total_attempted: 3,
            }),
        });

        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        const generateButton = screen.getByText("Generate Messages");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/sequences/seq-2/generate-messages",
                expect.any(Object)
            );
        });
    });

    it("should show generation progress", async () => {
        (global.fetch as any).mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: async () => ({
                                    messages_generated: 3,
                                    total_attempted: 3,
                                }),
                            }),
                        100
                    )
                )
        );

        render(
            <SequenceBuilder
                sequences={mockSequences}
                onCreateSequence={mockOnCreateSequence}
                onUpdateSequence={mockOnUpdateSequence}
                onDeleteSequence={mockOnDeleteSequence}
            />
        );

        const generateButton = screen.getByText("Generate Messages");
        fireEvent.click(generateButton);

        await waitFor(() => {
            expect(screen.getByText("Initializing...")).toBeInTheDocument();
        });
    });
});
