/**
 * BriefTemplateLibrary Component Tests
 * Tests template library display, search, filtering, and template actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BriefTemplateLibrary } from "@/components/marketing/brief-template-library";

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
import { logger } from "@/lib/client-logger";

describe("BriefTemplateLibrary", () => {
    const mockOnSelectTemplate = vi.fn();
    const defaultProps = {
        onSelectTemplate: mockOnSelectTemplate,
        funnelProjectId: "test-funnel-123",
    };

    const mockTemplates = [
        {
            id: "template-1",
            name: "Launch Campaign",
            description: "Product launch template",
            config: {},
            is_default: true,
            is_favorite: false,
            created_at: "2024-01-01",
        },
        {
            id: "template-2",
            name: "Lead Gen",
            description: "Lead generation template",
            config: {},
            is_default: false,
            is_favorite: true,
            created_at: "2024-01-02",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should render correctly with header and search", () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: mockTemplates }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        expect(screen.getByText("Brief Templates")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Search templates...")).toBeInTheDocument();
    });

    it("should load templates on mount", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: mockTemplates }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/templates")
            );
        });

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
            expect(screen.getByText("Lead Gen")).toBeInTheDocument();
        });
    });

    it("should filter templates by search term", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: mockTemplates }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText("Search templates...");
        fireEvent.change(searchInput, { target: { value: "Lead" } });

        await waitFor(() => {
            expect(screen.queryByText("Launch Campaign")).not.toBeInTheDocument();
            expect(screen.getByText("Lead Gen")).toBeInTheDocument();
        });
    });

    it("should filter templates by type (all/default/custom)", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: mockTemplates }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
        });

        // Use getByRole to find the button specifically, not the badge
        const defaultButton = screen.getByRole("button", { name: "Default" });
        fireEvent.click(defaultButton);

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
            expect(screen.queryByText("Lead Gen")).not.toBeInTheDocument();
        });
    });

    it("should display favorites section when favorites exist", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: mockTemplates }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Favorites")).toBeInTheDocument();
        });
    });

    it("should handle template selection", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: mockTemplates }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
        });

        // Find "Launch Campaign" template card and click its "Use Template" button
        const launchCampaignHeading = screen.getByText("Launch Campaign");
        const templateCard = launchCampaignHeading.closest('[class*="rounded-lg"]') as HTMLElement;
        const useTemplateButton = within(templateCard).getByText("Use Template");
        fireEvent.click(useTemplateButton);

        expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it("should handle template deletion", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, templates: mockTemplates }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        global.confirm = vi.fn(() => true);

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Lead Gen")).toBeInTheDocument();
        });

        // Find delete button (only custom templates have delete)
        const deleteButtons = screen.queryAllByRole("button");
        const deleteButton = deleteButtons.find((btn) =>
            btn.querySelector('svg[class*="lucide-trash"]')
        );

        if (deleteButton) {
            fireEvent.click(deleteButton);
        }

        await waitFor(() => {
            expect(global.confirm).toHaveBeenCalledWith("Delete this template?");
        });
    });

    it("should handle template duplication", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, templates: mockTemplates }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
        });

        // Find duplicate button (copy icon)
        const buttons = screen.getAllByRole("button");
        const duplicateButton = buttons.find((btn) =>
            btn.querySelector('svg[class*="lucide-copy"]')
        );

        if (duplicateButton) {
            fireEvent.click(duplicateButton);
        }

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/templates"),
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should toggle favorite status", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                json: async () => ({ success: true, templates: mockTemplates }),
            })
            .mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
        });

        // Find favorite button (star icon)
        const buttons = screen.getAllByRole("button");
        const favoriteButton = buttons.find((btn) =>
            btn.querySelector('svg[class*="lucide-star"]')
        );

        if (favoriteButton) {
            fireEvent.click(favoriteButton);
        }

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/marketing/templates/"),
                expect.objectContaining({
                    method: "PATCH",
                })
            );
        });
    });

    it("should display empty state when no templates", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: [] }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("No Templates Found")).toBeInTheDocument();
        });
    });

    it("should display search empty state", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            json: async () => ({ success: true, templates: mockTemplates }),
        });

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Launch Campaign")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText("Search templates...");
        fireEvent.change(searchInput, { target: { value: "nonexistent" } });

        await waitFor(() => {
            expect(screen.getByText("Try a different search term")).toBeInTheDocument();
        });
    });

    it("should handle loading error", async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const mockLogger = vi.mocked(logger);

        render(<BriefTemplateLibrary {...defaultProps} />);

        await waitFor(() => {
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
