/**
 * StoryLibrary Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StoryLibrary } from "@/components/followup/story-library";

describe("StoryLibrary", () => {
    const mockStories = [
        {
            id: "story-1",
            user_id: "user-123",
            title: "Sarah Doubled Revenue",
            story_type: "testimonial" as const,
            objection_category: "price_concern",
            business_niche: ["coaching", "consulting"],
            price_band: "mid" as const,
            content: "Sarah was skeptical about the price...",
            effectiveness_score: 92.5,
            times_used: 15,
            conversion_rate: 12.5,
            created_at: "2025-01-01T00:00:00Z",
        },
        {
            id: "story-2",
            user_id: "user-123",
            title: "Quick ROI Story",
            story_type: "micro_story" as const,
            objection_category: "timing_concern",
            business_niche: ["saas"],
            price_band: "high" as const,
            content: "Client saw results in 30 days...",
            effectiveness_score: 87.0,
            times_used: 8,
            created_at: "2025-01-02T00:00:00Z",
        },
    ];

    const mockOnCreateStory = vi.fn().mockResolvedValue(undefined);
    const mockOnUpdateStory = vi.fn().mockResolvedValue(undefined);
    const mockOnDeleteStory = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("Story Library")).toBeInTheDocument();
    });

    it("should display all stories", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("Sarah Doubled Revenue")).toBeInTheDocument();
        expect(screen.getByText("Quick ROI Story")).toBeInTheDocument();
    });

    it("should show add story button", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("Add Story")).toBeInTheDocument();
    });

    it("should display search input", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByPlaceholderText("Search stories...")).toBeInTheDocument();
    });

    it("should display filter dropdowns", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("All Objections")).toBeInTheDocument();
        expect(screen.getByText("All Types")).toBeInTheDocument();
    });

    it("should filter stories by search query", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        const searchInput = screen.getByPlaceholderText("Search stories...");
        fireEvent.change(searchInput, { target: { value: "Sarah" } });

        expect(screen.getByText("Sarah Doubled Revenue")).toBeInTheDocument();
        expect(screen.queryByText("Quick ROI Story")).not.toBeInTheDocument();
    });

    it("should show create form when add story is clicked", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        const addButton = screen.getByText("Add Story");
        fireEvent.click(addButton);

        expect(screen.getByText("Add New Story")).toBeInTheDocument();
    });

    it("should display effectiveness score", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("92.5")).toBeInTheDocument();
        expect(screen.getByText("87.0")).toBeInTheDocument();
    });

    it("should display times used count", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("Used 15x")).toBeInTheDocument();
        expect(screen.getByText("Used 8x")).toBeInTheDocument();
    });

    it("should display business niches", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("coaching")).toBeInTheDocument();
        expect(screen.getByText("consulting")).toBeInTheDocument();
        expect(screen.getByText("saas")).toBeInTheDocument();
    });

    it("should show edit button for each story", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        const editButtons = screen.getAllByText("Edit");
        expect(editButtons).toHaveLength(2);
    });

    it("should show empty state when no stories", () => {
        render(
            <StoryLibrary
                stories={[]}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("No Stories Yet")).toBeInTheDocument();
        expect(screen.getByText("Add First Story")).toBeInTheDocument();
    });

    it("should display stats footer when stories exist", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText("Total Stories")).toBeInTheDocument();
        expect(screen.getByText("Objections Covered")).toBeInTheDocument();
        expect(screen.getByText("Times Used")).toBeInTheDocument();
        expect(screen.getByText("Avg Effectiveness")).toBeInTheDocument();
    });

    it("should calculate total times used correctly", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        // 15 + 8 = 23
        expect(screen.getByText("23")).toBeInTheDocument();
    });

    it("should show edit form when edit button is clicked", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        const editButtons = screen.getAllByText("Edit");
        fireEvent.click(editButtons[0]);

        expect(screen.getByText("Edit Story")).toBeInTheDocument();
    });

    it("should call onCreateStory when creating a story", async () => {
        render(
            <StoryLibrary
                stories={[]}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        const addButton = screen.getByText("Add Story");
        fireEvent.click(addButton);

        const titleInput = screen.getByPlaceholderText("Sarah doubled revenue in 90 days");
        fireEvent.change(titleInput, { target: { value: "New Story" } });

        const contentTextarea = screen.getByPlaceholderText(/Sarah was skeptical/);
        fireEvent.change(contentTextarea, { target: { value: "New content" } });

        const createButton = screen.getByText("Add Story to Library");
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(mockOnCreateStory).toHaveBeenCalled();
        });
    });

    it("should display story content preview", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        expect(screen.getByText(/Sarah was skeptical/)).toBeInTheDocument();
        expect(screen.getByText(/Client saw results/)).toBeInTheDocument();
    });

    it("should show no matches message when filters return empty", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        const searchInput = screen.getByPlaceholderText("Search stories...");
        fireEvent.change(searchInput, { target: { value: "nonexistent" } });

        expect(screen.getByText("No Stories Match Your Filters")).toBeInTheDocument();
    });

    it("should calculate average effectiveness correctly", () => {
        render(
            <StoryLibrary
                stories={mockStories}
                onCreateStory={mockOnCreateStory}
                onUpdateStory={mockOnUpdateStory}
                onDeleteStory={mockOnDeleteStory}
            />
        );

        // (92.5 + 87.0) / 2 = 89.75 -> 89.8
        expect(screen.getByText("89.8")).toBeInTheDocument();
    });
});
