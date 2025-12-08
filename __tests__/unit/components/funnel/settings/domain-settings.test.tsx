/**
 * DomainSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DomainSettings } from "@/components/funnel/settings/domain-settings";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: mockFrom,
    }),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("DomainSettings", () => {
    const mockProps = {
        projectId: "project-123",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock chain for project fetch
        mockSingle.mockResolvedValue({
            data: { custom_domain_id: null },
            error: null,
        });
        mockEq.mockReturnValue({ single: mockSingle });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });

        // Mock domains API response
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: [] }),
        });
    });

    it("should render loading state initially", () => {
        render(<DomainSettings {...mockProps} />);

        expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
    });

    it("should render domain settings title", async () => {
        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Custom Domain")).toBeInTheDocument();
        });
    });

    it("should display default domain option", async () => {
        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Default Domain")).toBeInTheDocument();
        });

        expect(
            screen.getByText("Use the app's default domain for all pages")
        ).toBeInTheDocument();
    });

    it("should select default domain by default", async () => {
        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            const defaultRadio = screen.getByRole("radio", {
                name: /Default Domain/i,
            });
            expect(defaultRadio).toBeChecked();
        });
    });

    it("should display custom domains when available", async () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example.com",
                status: "verified",
            },
            {
                id: "domain-2",
                domain: "test.com",
                status: "pending",
            },
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: mockDomains }),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("example.com")).toBeInTheDocument();
        });

        expect(screen.getByText("test.com")).toBeInTheDocument();
    });

    it("should show domain status as Active or Pending", async () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example.com",
                status: "verified",
            },
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: mockDomains }),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Status: Active")).toBeInTheDocument();
        });
    });

    it("should handle domain selection", async () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example.com",
                status: "verified",
            },
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: mockDomains }),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("example.com")).toBeInTheDocument();
        });

        const domainRadio = screen.getByRole("radio", { name: /example.com/i });
        fireEvent.click(domainRadio);

        expect(domainRadio).toBeChecked();
    });

    it("should handle save button click", async () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example.com",
                status: "verified",
            },
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: mockDomains }),
        });

        mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Save Changes")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({
                custom_domain_id: null,
            });
        });
    });

    it("should show success toast after saving", async () => {
        mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Save Changes")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Domain Updated",
                    description: "Funnel domain settings saved successfully",
                })
            );
        });
    });

    it("should show error toast on save failure", async () => {
        mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: new Error("Save failed") }),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Save Changes")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Error",
                    variant: "destructive",
                })
            );
        });
    });

    it("should display no domains message when empty", async () => {
        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("No custom domains configured.")
            ).toBeInTheDocument();
        });

        expect(
            screen.getByText("Add a custom domain in Settings → Domains")
        ).toBeInTheDocument();
    });

    it("should show saving state on button", async () => {
        let _resolveUpdate: any;
        mockUpdate.mockReturnValue({
            eq: vi
                .fn()
                .mockImplementation(
                    () => new Promise((resolve) => (_resolveUpdate = resolve))
                ),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Save Changes")).toBeInTheDocument();
        });

        const saveButton = screen.getByText("Save Changes");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText("Saving...")).toBeInTheDocument();
        });
    });

    it("should load selected domain from project data", async () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example.com",
                status: "verified",
            },
        ];

        mockSingle.mockResolvedValue({
            data: { custom_domain_id: "domain-1" },
            error: null,
        });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: mockDomains }),
        });

        render(<DomainSettings {...mockProps} />);

        await waitFor(() => {
            const domainRadio = screen.getByRole("radio", { name: /example.com/i });
            expect(domainRadio).toBeChecked();
        });
    });
});
