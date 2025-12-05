/**
 * ProfileSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileSettings } from "@/components/settings/profile-settings";

// Mock Supabase client
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        auth: {
            getUser: mockGetUser,
        },
        from: (table: string) => ({
            select: mockSelect,
            update: mockUpdate,
        }),
    }),
}));

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock utils
vi.mock("@/lib/utils", () => ({
    isValidUsername: (username: string) => {
        if (!username) return true;
        return (
            username.length >= 3 &&
            username.length <= 30 &&
            /^[a-zA-Z0-9_-]+$/.test(username)
        );
    },
}));

describe("ProfileSettings", () => {
    const mockUser = {
        id: "user-123",
        email: "test@example.com",
    };

    const mockProfile = {
        id: "user-123",
        full_name: "John Doe",
        username: "johndoe",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock setup
        mockGetUser.mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });

        mockSelect.mockReturnValue({
            eq: mockEq,
        });

        mockEq.mockReturnValue({
            single: mockSingle,
        });

        mockSingle.mockResolvedValue({
            data: mockProfile,
            error: null,
        });

        mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
            }),
        });
    });

    it("should render without crashing", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByText("Profile Settings")).toBeInTheDocument();
        });
    });

    it("should display loading state initially", () => {
        render(<ProfileSettings />);

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should load and display user profile data", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
            expect(screen.getByDisplayValue("johndoe")).toBeInTheDocument();
        });
    });

    it("should display description text", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(
                screen.getByText("Manage your account information and public profile")
            ).toBeInTheDocument();
        });
    });

    it("should have disabled email field with helper text", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            const emailInput = screen.getByDisplayValue("test@example.com");
            expect(emailInput).toBeDisabled();
            expect(
                screen.getByText(/Email cannot be changed here/)
            ).toBeInTheDocument();
        });
    });

    it("should allow editing full name", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            const nameInput = screen.getByDisplayValue("John Doe");
            expect(nameInput).not.toBeDisabled();
        });

        const nameInput = screen.getByDisplayValue("John Doe");
        fireEvent.change(nameInput, { target: { value: "Jane Smith" } });

        expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
    });

    it("should allow editing username", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            const usernameInput = screen.getByDisplayValue("johndoe");
            expect(usernameInput).not.toBeDisabled();
        });

        const usernameInput = screen.getByDisplayValue("johndoe");
        fireEvent.change(usernameInput, { target: { value: "janesmith" } });

        expect(screen.getByDisplayValue("janesmith")).toBeInTheDocument();
    });

    it("should validate username format", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("johndoe")).toBeInTheDocument();
        });

        const usernameInput = screen.getByDisplayValue("johndoe");

        // Invalid username with special characters
        fireEvent.change(usernameInput, { target: { value: "john@doe" } });

        expect(
            screen.getByText(
                /Username must be 3-30 characters, alphanumeric with hyphens\/underscores only/
            )
        ).toBeInTheDocument();
    });

    it("should show public profile URL for valid username", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("johndoe")).toBeInTheDocument();
        });

        expect(screen.getByText(/Your public profile:/)).toBeInTheDocument();
    });

    it("should disable save button when username is invalid", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("johndoe")).toBeInTheDocument();
        });

        const usernameInput = screen.getByDisplayValue("johndoe");
        fireEvent.change(usernameInput, { target: { value: "ab" } }); // Too short

        const saveButton = screen.getByText("Save changes");
        expect(saveButton).toBeDisabled();
    });

    it("should save profile changes successfully", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        });

        const nameInput = screen.getByDisplayValue("John Doe");
        fireEvent.change(nameInput, { target: { value: "Jane Smith" } });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
        });
    });

    it("should show loading state while saving", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("should handle save error", async () => {
        mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Update failed"),
            }),
        });

        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Update failed")).toBeInTheDocument();
        });
    });

    it("should handle load profile error", async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: new Error("Failed to load profile"),
        });

        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByText("Failed to load profile")).toBeInTheDocument();
        });
    });

    it("should handle missing user session", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        render(<ProfileSettings />);

        await waitFor(() => {
            expect(mockGetUser).toHaveBeenCalled();
        });

        // Component should gracefully handle no user
        const profileSettings = screen.queryByText("Profile Settings");
        expect(profileSettings).toBeInTheDocument();
    });

    it("should cancel changes and reload profile", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        });

        const nameInput = screen.getByDisplayValue("John Doe");
        fireEvent.change(nameInput, { target: { value: "Changed Name" } });
        expect(screen.getByDisplayValue("Changed Name")).toBeInTheDocument();

        const cancelButton = screen.getByText("Cancel");
        fireEvent.click(cancelButton);

        await waitFor(() => {
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        });
    });

    it("should not save when username error exists", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("johndoe")).toBeInTheDocument();
        });

        const usernameInput = screen.getByDisplayValue("johndoe");
        fireEvent.change(usernameInput, { target: { value: "ab" } }); // Too short

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        // Should not call update
        await waitFor(() => {
            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });

    it("should handle not authenticated error when saving", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        });

        // Mock getUser to return null on save attempt
        mockGetUser.mockResolvedValueOnce({
            data: { user: null },
            error: null,
        });

        const saveButton = screen.getByText("Save changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Not authenticated")).toBeInTheDocument();
        });
    });

    it("should display all form fields with correct labels", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText("Email")).toBeInTheDocument();
            expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
            expect(screen.getByLabelText("Username")).toBeInTheDocument();
        });
    });

    it("should have correct placeholders", async () => {
        render(<ProfileSettings />);

        await waitFor(() => {
            const nameInput = screen.getByPlaceholderText("John Doe");
            const usernameInput = screen.getByPlaceholderText("john-doe");
            expect(nameInput).toBeInTheDocument();
            expect(usernameInput).toBeInTheDocument();
        });
    });
});
