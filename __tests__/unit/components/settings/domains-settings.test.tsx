/**
 * DomainsSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DomainsSettings } from "@/components/settings/domains-settings";

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
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: mockFrom,
    }),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe("DomainsSettings", () => {
    const mockProjects = [
        { id: "proj-1", name: "My Funnel", slug: "my-funnel" },
        { id: "proj-2", name: "Another Funnel", slug: "another" },
    ];

    const mockDomains = [
        {
            id: "dom-1",
            domain: "example.com",
            verified: true,
            verification_status: "verified",
            funnel_projects: { id: "proj-1", name: "My Funnel" },
            dns_instructions: {
                type: "CNAME",
                name: "www",
                value: "proxy.example.com",
            },
        },
        {
            id: "dom-2",
            domain: "test.com",
            verified: false,
            verification_status: "pending",
            funnel_projects: { id: "proj-2", name: "Another Funnel" },
            dns_instructions: {
                type: "CNAME",
                name: "www",
                value: "proxy.example.com",
            },
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup Supabase mocks
        mockOrder.mockResolvedValue({ data: mockProjects, error: null });
        mockSelect.mockReturnValue({ order: mockOrder });
        mockFrom.mockReturnValue({ select: mockSelect });

        // Setup fetch mocks
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: mockDomains }),
        });
    });

    it("should render loading state initially", () => {
        render(<DomainsSettings />);

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should render domains settings title", async () => {
        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Custom Domains")).toBeInTheDocument();
        });
    });

    it("should display add domain form", async () => {
        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Add New Domain")).toBeInTheDocument();
        });

        expect(screen.getByLabelText("Domain or Subdomain")).toBeInTheDocument();
        expect(screen.getByLabelText("Funnel Project")).toBeInTheDocument();
    });

    it("should list existing domains", async () => {
        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("example.com")).toBeInTheDocument();
        });

        expect(screen.getByText("test.com")).toBeInTheDocument();
    });

    it("should show verified status", async () => {
        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("✓ Verified")).toBeInTheDocument();
        });
    });

    it("should show pending status for unverified domains", async () => {
        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Pending")).toBeInTheDocument();
        });
    });

    it("should handle add domain submission", async () => {
        (global.fetch as any).mockImplementation((url: string, options?: any) => {
            if (options?.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        domain: {
                            id: "dom-3",
                            domain: "newdomain.com",
                            verified: false,
                        },
                    }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ domains: mockDomains }),
            });
        });

        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText("Domain or Subdomain")).toBeInTheDocument();
        });

        const domainInput = screen.getByLabelText("Domain or Subdomain");
        const projectSelect = screen.getByLabelText("Funnel Project");
        const submitButton = screen.getByText("Add Domain");

        fireEvent.change(domainInput, { target: { value: "newdomain.com" } });
        fireEvent.change(projectSelect, { target: { value: "proj-1" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/domains",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("newdomain.com"),
                })
            );
        });
    });

    it("should show DNS configuration for unverified domains", async () => {
        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("DNS Configuration Required")).toBeInTheDocument();
        });

        expect(screen.getByText("Type:")).toBeInTheDocument();
        expect(screen.getByText("CNAME")).toBeInTheDocument();
    });

    it("should handle domain verification", async () => {
        (global.fetch as any).mockImplementation((url: string, options?: any) => {
            if (url.includes("/verify") && options?.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ verified: true }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ domains: mockDomains }),
            });
        });

        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Check Verification Status")).toBeInTheDocument();
        });

        const verifyButton = screen.getByText("Check Verification Status");
        fireEvent.click(verifyButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/verify"),
                expect.objectContaining({ method: "POST" })
            );
        });
    });

    it("should handle domain deletion", async () => {
        (global.fetch as any).mockImplementation((url: string, options?: any) => {
            if (options?.method === "DELETE") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ domains: mockDomains }),
            });
        });

        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getAllByText("Remove Domain")[0]).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByText("Remove Domain")[0];
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(global.confirm).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/domains/"),
                expect.objectContaining({ method: "DELETE" })
            );
        });
    });

    it("should show no domains message when empty", async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ domains: [] }),
        });

        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("No domains connected yet.")).toBeInTheDocument();
        });
    });

    it("should display success message after adding domain", async () => {
        (global.fetch as any).mockImplementation((url: string, options?: any) => {
            if (options?.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        domain: {
                            id: "dom-3",
                            domain: "newdomain.com",
                        },
                    }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ domains: mockDomains }),
            });
        });

        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByLabelText("Domain or Subdomain")).toBeInTheDocument();
        });

        const domainInput = screen.getByLabelText("Domain or Subdomain");
        const projectSelect = screen.getByLabelText("Funnel Project");
        const submitButton = screen.getByText("Add Domain");

        fireEvent.change(domainInput, { target: { value: "newdomain.com" } });
        fireEvent.change(projectSelect, { target: { value: "proj-1" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(
                screen.getByText(
                    "Domain added successfully! Please configure your DNS settings."
                )
            ).toBeInTheDocument();
        });
    });

    it("should show verification failure message", async () => {
        (global.fetch as any).mockImplementation((url: string, options?: any) => {
            if (url.includes("/verify") && options?.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ verified: false }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ domains: mockDomains }),
            });
        });

        render(<DomainsSettings />);

        await waitFor(() => {
            expect(screen.getByText("Check Verification Status")).toBeInTheDocument();
        });

        const verifyButton = screen.getByText("Check Verification Status");
        fireEvent.click(verifyButton);

        await waitFor(() => {
            expect(screen.getByText(/Domain not yet verified/)).toBeInTheDocument();
        });
    });
});
