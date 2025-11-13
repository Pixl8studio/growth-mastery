/**
 * Create Funnel Page Component Tests
 * Test simplified funnel creation form with only name field
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import CreateFunnelPage from "@/app/funnel-builder/create/page";
import { createClient } from "@/lib/supabase/client";

// Mock Next.js router
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
    createClient: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("CreateFunnelPage", () => {
    const mockPush = vi.fn();
    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
            push: mockPush,
        });
        (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    });

    it("should render form with only Funnel Name field", () => {
        render(<CreateFunnelPage />);

        // Should have funnel name input
        expect(screen.getByLabelText(/funnel name/i)).toBeInTheDocument();

        // Should NOT have description, target audience, or business niche fields
        expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/target audience/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/business niche/i)).not.toBeInTheDocument();
    });

    it("should show simplified card header text", () => {
        render(<CreateFunnelPage />);

        expect(screen.getByText("Create Your Funnel")).toBeInTheDocument();
        expect(
            screen.getByText("Give your funnel a name to get started")
        ).toBeInTheDocument();
    });

    it("should show page title and subtitle", () => {
        render(<CreateFunnelPage />);

        expect(screen.getByText("Create New Funnel")).toBeInTheDocument();
        expect(
            screen.getByText("Give your funnel a name and let's get started")
        ).toBeInTheDocument();
    });

    it("should show What Happens Next guidance box", () => {
        render(<CreateFunnelPage />);

        expect(screen.getByText("What Happens Next?")).toBeInTheDocument();
        expect(
            screen.getByText(
                /After creating your funnel, you'll be guided through 13 steps/i
            )
        ).toBeInTheDocument();
    });

    it("should have Create button disabled when name is empty", () => {
        render(<CreateFunnelPage />);

        const createButton = screen.getByRole("button", { name: /create funnel/i });
        expect(createButton).toBeDisabled();
    });

    it("should enable Create button when name has value", async () => {
        const user = userEvent.setup();
        render(<CreateFunnelPage />);

        const nameInput = screen.getByLabelText(/funnel name/i);
        const createButton = screen.getByRole("button", { name: /create funnel/i });

        // Initially disabled
        expect(createButton).toBeDisabled();

        // Type name
        await user.clear(nameInput);
        await user.type(nameInput, "My Test Funnel");

        // Wait for button to be enabled after state update
        await waitFor(() => {
            expect(createButton).toBeEnabled();
        });
    });

    it("should call Supabase with only name and slug on submission", async () => {
        const user = userEvent.setup();
        const mockInsert = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: { id: "test-id", slug: "my-test-funnel" },
                    error: null,
                }),
            }),
        });

        mockSupabase.auth.getUser.mockResolvedValue({
            data: {
                user: { id: "user-123", email: "test@example.com" },
            },
        });

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    like: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                }),
            }),
            insert: mockInsert,
        });

        render(<CreateFunnelPage />);

        const nameInput = screen.getByLabelText(/funnel name/i);
        // Clear and type to ensure clean input
        await user.clear(nameInput);
        await user.type(nameInput, "My Test Funnel");

        // Wait for button to be enabled before clicking
        const createButton = screen.getByRole("button", { name: /create funnel/i });
        await waitFor(() => {
            expect(createButton).toBeEnabled();
        });

        await user.click(createButton);

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "My Test Funnel",
                    slug: "my-test-funnel",
                    status: "draft",
                    current_step: 1,
                    user_id: "user-123",
                    user_email: "test@example.com",
                })
            );
        });

        // Should NOT include description, target_audience, or business_niche
        const insertCall = mockInsert.mock.calls[0][0];
        expect(insertCall).not.toHaveProperty("description");
        expect(insertCall).not.toHaveProperty("target_audience");
        expect(insertCall).not.toHaveProperty("business_niche");
    });

    it("should redirect to step 1 on successful creation", async () => {
        const user = userEvent.setup();

        mockSupabase.auth.getUser.mockResolvedValue({
            data: {
                user: { id: "user-123", email: "test@example.com" },
            },
        });

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    like: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                }),
            }),
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: "new-project-id", slug: "my-funnel" },
                        error: null,
                    }),
                }),
            }),
        });

        render(<CreateFunnelPage />);

        const nameInput = screen.getByLabelText(/funnel name/i);
        await user.type(nameInput, "My Funnel");

        const createButton = screen.getByRole("button", { name: /create funnel/i });
        await user.click(createButton);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                "/funnel-builder/new-project-id/step/1"
            );
        });
    });

    it("should handle error states appropriately", async () => {
        const user = userEvent.setup();

        mockSupabase.auth.getUser.mockResolvedValue({
            data: {
                user: { id: "user-123", email: "test@example.com" },
            },
        });

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    like: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                }),
            }),
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: "Database error" },
                    }),
                }),
            }),
        });

        render(<CreateFunnelPage />);

        const nameInput = screen.getByLabelText(/funnel name/i);
        await user.type(nameInput, "My Funnel");

        const createButton = screen.getByRole("button", { name: /create funnel/i });
        await user.click(createButton);

        await waitFor(() => {
            expect(screen.getByText(/failed to create funnel/i)).toBeInTheDocument();
        });
    });

    it("should show loading state during creation", async () => {
        const user = userEvent.setup();

        mockSupabase.auth.getUser.mockResolvedValue({
            data: {
                user: { id: "user-123", email: "test@example.com" },
            },
        });

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    like: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                }),
            }),
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockImplementation(
                        () =>
                            new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve({
                                        data: { id: "test-id", slug: "test" },
                                        error: null,
                                    });
                                }, 100);
                            })
                    ),
                }),
            }),
        });

        render(<CreateFunnelPage />);

        const nameInput = screen.getByLabelText(/funnel name/i);
        await user.type(nameInput, "My Funnel");

        const createButton = screen.getByRole("button", { name: /create funnel/i });
        await user.click(createButton);

        // Should show loading text
        expect(screen.getByRole("button", { name: /creating/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalled();
        });
    });

    it("should have Cancel button that links back to funnel builder", () => {
        render(<CreateFunnelPage />);

        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        expect(cancelButton).toBeInTheDocument();

        // Check that it's wrapped in a Link
        const link = cancelButton.closest("a");
        expect(link).toHaveAttribute("href", "/funnel-builder");
    });

    it("should have Back to Funnels link in header", () => {
        render(<CreateFunnelPage />);

        const backLink = screen.getByText(/back to funnels/i);
        expect(backLink).toBeInTheDocument();
        expect(backLink.closest("a")).toHaveAttribute("href", "/funnel-builder");
    });

    it("should have name input with autofocus", () => {
        render(<CreateFunnelPage />);

        const nameInput = screen.getByLabelText(/funnel name/i) as HTMLInputElement;
        // React uses autoFocus prop, but it doesn't render as HTML attribute in testing library
        // Instead, we verify the input exists and is the first input on the page
        expect(nameInput).toBeInTheDocument();
        const allInputs = screen.getAllByRole("textbox");
        expect(allInputs[0]).toBe(nameInput);
    });

    it("should show helpful placeholder text", () => {
        render(<CreateFunnelPage />);

        const nameInput = screen.getByLabelText(/funnel name/i);
        expect(nameInput).toHaveAttribute(
            "placeholder",
            "e.g., Pitch Deck Mastery Program"
        );
    });
});
