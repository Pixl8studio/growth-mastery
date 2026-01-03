/**
 * SenderSetupTab Component Tests
 *
 * Tests for Mailgun domain setup, Gmail OAuth, and SendGrid configuration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SenderSetupTab } from "@/components/followup/sender-setup-tab";

// Mock toast hook
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock window.open
global.open = vi.fn();

// Mock fetch
global.fetch = vi.fn();

// Mock clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
    },
});

describe("SenderSetupTab", () => {
    const mockProps = {
        agentConfigId: "agent-123",
        currentSenderName: "Test Sender",
        currentSenderEmail: "sender@example.com",
        currentSMSSenderId: "TestBrand",
        emailProviderType: "sendgrid" as const,
        gmailUserEmail: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ available: true }),
        });
    });

    it("should render without crashing", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Sender Setup Progress")).toBeInTheDocument();
        });
    });

    it("should display setup progress tracker", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Sender Setup Progress")).toBeInTheDocument();
            expect(screen.getByText(/steps complete/)).toBeInTheDocument();
        });
    });

    it("should display Gmail connection option in alternative options", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Alternative Options")).toBeInTheDocument();
            expect(screen.getByText("Gmail")).toBeInTheDocument();
        });
    });

    it("should display SendGrid sender form", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText("Sender Information (SendGrid)")
            ).toBeInTheDocument();
            expect(screen.getByLabelText("From Name *")).toHaveValue("Test Sender");
            expect(screen.getByLabelText("From Email *")).toHaveValue(
                "sender@example.com"
            );
        });
    });

    it("should handle sender name input change", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            const input = screen.getByLabelText("From Name *");
            fireEvent.change(input, { target: { value: "New Sender" } });
            expect(input).toHaveValue("New Sender");
        });
    });

    it("should handle sender email input change", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            const input = screen.getByLabelText("From Email *");
            fireEvent.change(input, { target: { value: "new@example.com" } });
            expect(input).toHaveValue("new@example.com");
        });
    });

    it("should handle SMS sender ID input", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            const input = screen.getByLabelText("SMS Sender ID (Optional)");
            expect(input).toHaveValue("TestBrand");
        });
    });

    it("should call save API when save button is clicked", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ available: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            const saveButton = screen.getByText("Save Sender Info");
            fireEvent.click(saveButton);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/followup/sender/update",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should display disconnect button when Gmail is connected", async () => {
        const gmailProps = {
            ...mockProps,
            emailProviderType: "gmail" as const,
            gmailUserEmail: "user@gmail.com",
        };

        render(<SenderSetupTab {...gmailProps} />);

        await waitFor(() => {
            expect(screen.getByText("Disconnect Gmail")).toBeInTheDocument();
        });
    });

    it("should open Gmail OAuth popup on connect", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ available: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, domains: [] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://oauth.example.com" }),
            });

        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            // Gmail option is now a clickable card
            const gmailOption = screen.getByText("Gmail");
            fireEvent.click(gmailOption.closest("div")!);
        });

        await waitFor(() => {
            expect(global.open).toHaveBeenCalled();
        });
    });

    it("should hide sender form when Gmail is connected", async () => {
        const gmailProps = {
            ...mockProps,
            emailProviderType: "gmail" as const,
            gmailUserEmail: "user@gmail.com",
        };

        render(<SenderSetupTab {...gmailProps} />);

        await waitFor(() => {
            expect(
                screen.queryByText("Sender Information (SendGrid)")
            ).not.toBeInTheDocument();
        });
    });

    it("should show Gmail unavailable warning when not configured", async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ available: false }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, domains: [] }),
            });

        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText(/Gmail OAuth not configured/i)
            ).toBeInTheDocument();
        });
    });

    it("should display progress bar", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            const progressBar = document.querySelector(
                ".bg-gradient-to-r.from-primary"
            );
            expect(progressBar).toBeInTheDocument();
        });
    });

    it("should show setup complete when all steps done", async () => {
        const completeProps = {
            ...mockProps,
            emailProviderType: "gmail" as const,
            gmailUserEmail: "user@gmail.com",
        };

        render(<SenderSetupTab {...completeProps} />);

        await waitFor(() => {
            expect(screen.getByText("Setup Complete!")).toBeInTheDocument();
        });
    });

    it("should display step indicators", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            expect(screen.getByText("Choose Provider")).toBeInTheDocument();
            expect(screen.getByText("Connect Account")).toBeInTheDocument();
        });
    });

    it("should limit SMS sender ID to 11 characters", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            const input = screen.getByLabelText("SMS Sender ID (Optional)");
            expect(input).toHaveAttribute("maxLength", "11");
        });
    });

    it("should call onUpdate callback when provided", async () => {
        const mockOnUpdate = vi.fn();

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ available: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

        render(<SenderSetupTab {...mockProps} onUpdate={mockOnUpdate} />);

        await waitFor(() => {
            const saveButton = screen.getByText("Save Sender Info");
            fireEvent.click(saveButton);
        });

        await waitFor(() => {
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });

    it("should display helpful descriptions", async () => {
        render(<SenderSetupTab {...mockProps} />);

        await waitFor(() => {
            expect(
                screen.getByText(/Example: "Sarah from Acme Corp"/)
            ).toBeInTheDocument();
            expect(
                screen.getByText(/Use an email from your SendGrid authenticated domain/)
            ).toBeInTheDocument();
        });
    });

    // ==========================================================================
    // Mailgun Domain Setup Tests
    // ==========================================================================

    describe("Mailgun Domain Setup", () => {
        const mockDomains = [
            {
                id: "domain-1",
                domain: "example.com",
                subdomain: "mail",
                full_domain: "mail.example.com",
                verification_status: "verified",
                spf_record: "v=spf1 include:mailgun.org ~all",
                dkim1_record: "k=rsa; p=MIGfMA0GCS...",
                dkim1_host: "pic._domainkey",
                dkim2_record: "k=rsa; p=MIGfMA0GCS...",
                dkim2_host: "k1._domainkey",
            },
            {
                id: "domain-2",
                domain: "pending.com",
                subdomain: "mail",
                full_domain: "mail.pending.com",
                verification_status: "pending",
                spf_record: "v=spf1 include:mailgun.org ~all",
                dkim1_record: "k=rsa; p=MIGfMA0GCS...",
                dkim1_host: "pic._domainkey",
                dkim2_record: "k=rsa; p=MIGfMA0GCS...",
                dkim2_host: "k1._domainkey",
            },
        ];

        beforeEach(() => {
            vi.clearAllMocks();
            mockToast.mockClear();
        });

        it("should display Custom Domain as recommended option", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: [] }),
                });

            render(<SenderSetupTab {...mockProps} />);

            await waitFor(() => {
                expect(screen.getByText("Custom Domain (Recommended)")).toBeInTheDocument();
                expect(screen.getByText("Best for branding")).toBeInTheDocument();
            });
        });

        it("should show loading state while fetching domains", async () => {
            let resolveDomainsPromise: (value: any) => void;
            const domainsPromise = new Promise((resolve) => {
                resolveDomainsPromise = resolve;
            });

            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockReturnValueOnce({
                    ok: true,
                    json: () => domainsPromise,
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                expect(
                    screen.getByText("Loading your email domains...")
                ).toBeInTheDocument();
            });

            // Resolve the promise
            resolveDomainsPromise!({ success: true, domains: [] });
        });

        it("should display existing domains list", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: mockDomains }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                expect(screen.getByText("Your Email Domains")).toBeInTheDocument();
                expect(screen.getByText("mail.example.com")).toBeInTheDocument();
                expect(screen.getByText("mail.pending.com")).toBeInTheDocument();
            });
        });

        it("should show verified badge for verified domains", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: mockDomains }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                expect(screen.getByText("Verified")).toBeInTheDocument();
                expect(screen.getByText("Pending DNS")).toBeInTheDocument();
            });
        });

        it("should show Verify button only for pending domains", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: mockDomains }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                // Should show one Verify button (for pending domain)
                const verifyButtons = screen.getAllByRole("button", { name: /Verify/i });
                expect(verifyButtons).toHaveLength(1);
            });
        });

        it("should handle domain verification with per-domain loading state", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domains: [mockDomains[1]], // Only pending domain
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        verification: { verified: false },
                        domain: mockDomains[1],
                    }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                const verifyButton = screen.getByRole("button", { name: /Verify/i });
                fireEvent.click(verifyButton);
            });

            // After clicking, verification should be called
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/email-domains/domain-2/verify",
                    expect.objectContaining({ method: "POST" })
                );
            });
        });

        it("should show toast on successful domain verification", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domains: [mockDomains[1]],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        verification: { verified: true },
                        domain: { ...mockDomains[1], verification_status: "verified" },
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: mockDomains }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                const verifyButton = screen.getByRole("button", { name: /Verify/i });
                fireEvent.click(verifyButton);
            });

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: "Domain Verified!",
                    })
                );
            });
        });

        it("should validate domain format on input", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: [] }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            // Click to show domain setup form
            await waitFor(() => {
                const addDomainButton = screen.getByRole("button", {
                    name: /Add Custom Domain/i,
                });
                fireEvent.click(addDomainButton);
            });

            await waitFor(() => {
                const domainInput = screen.getByPlaceholderText("yourdomain.com");
                fireEvent.change(domainInput, { target: { value: "invalid" } });
            });

            await waitFor(() => {
                expect(
                    screen.getByText(/Invalid domain format/)
                ).toBeInTheDocument();
            });
        });

        it("should show valid domain format without error", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: [] }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            // Click to show domain setup form
            await waitFor(() => {
                const addDomainButton = screen.getByRole("button", {
                    name: /Add Custom Domain/i,
                });
                fireEvent.click(addDomainButton);
            });

            await waitFor(() => {
                const domainInput = screen.getByPlaceholderText("yourdomain.com");
                fireEvent.change(domainInput, { target: { value: "example.com" } });
            });

            await waitFor(() => {
                expect(
                    screen.queryByText(/Invalid domain format/)
                ).not.toBeInTheDocument();
            });
        });

        it("should display email prefix input field", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: [] }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            // Click to show domain setup form
            await waitFor(() => {
                const addDomainButton = screen.getByRole("button", {
                    name: /Add Custom Domain/i,
                });
                fireEvent.click(addDomainButton);
            });

            await waitFor(() => {
                expect(screen.getByText("Email Prefix")).toBeInTheDocument();
                expect(screen.getByPlaceholderText("noreply")).toBeInTheDocument();
            });
        });

        it("should show email preview with prefix, subdomain and domain", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: [] }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            // Click to show domain setup form
            await waitFor(() => {
                const addDomainButton = screen.getByRole("button", {
                    name: /Add Custom Domain/i,
                });
                fireEvent.click(addDomainButton);
            });

            await waitFor(() => {
                // Check email preview shows default values
                expect(
                    screen.getByText("Emails will be sent from:")
                ).toBeInTheDocument();
            });
        });

        it("should call API with email prefix when selecting verified domain", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domains: [mockDomains[0]], // Verified domain only
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                // Click "Use" button for verified domain
                const useButton = screen.getByRole("button", { name: /Use/i });
                fireEvent.click(useButton);
            });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/followup/sender/update",
                    expect.objectContaining({
                        method: "POST",
                        body: expect.stringContaining("noreply@mail.example.com"),
                    })
                );
            });
        });

        it("should show error toast when domain selection fails", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domains: [mockDomains[0]],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({ error: "Failed to update sender" }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                const useButton = screen.getByRole("button", { name: /Use/i });
                fireEvent.click(useButton);
            });

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: "Error",
                        variant: "destructive",
                    })
                );
            });
        });

        it("should create domain with validation", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: [] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domain: mockDomains[1],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, domains: [mockDomains[1]] }),
                });

            render(<SenderSetupTab {...mockProps} funnelProjectId="project-123" />);

            // Click to show domain setup form
            await waitFor(() => {
                const addDomainButton = screen.getByRole("button", {
                    name: /Add Custom Domain/i,
                });
                fireEvent.click(addDomainButton);
            });

            // Fill in valid domain
            await waitFor(() => {
                const domainInput = screen.getByPlaceholderText("yourdomain.com");
                fireEvent.change(domainInput, { target: { value: "pending.com" } });
            });

            // Click create
            await waitFor(() => {
                const createButton = screen.getByRole("button", {
                    name: /Create Domain/i,
                });
                fireEvent.click(createButton);
            });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/email-domains",
                    expect.objectContaining({
                        method: "POST",
                    })
                );
            });
        });

        it("should show DNS records for pending domains", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domains: [mockDomains[1]],
                    }),
                });

            render(
                <SenderSetupTab
                    {...mockProps}
                    funnelProjectId="project-123"
                    mailgunDomainId="domain-2"
                />
            );

            // Expand DNS records section
            await waitFor(() => {
                const dnsButton = screen.getByText(/DNS Configuration/);
                fireEvent.click(dnsButton);
            });

            await waitFor(() => {
                expect(screen.getByText("TXT (SPF)")).toBeInTheDocument();
            });
        });

        it("should copy DNS record to clipboard", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domains: [mockDomains[1]],
                    }),
                });

            render(
                <SenderSetupTab
                    {...mockProps}
                    funnelProjectId="project-123"
                    mailgunDomainId="domain-2"
                />
            );

            // Expand DNS records section
            await waitFor(() => {
                const dnsButton = screen.getByText(/DNS Configuration/);
                fireEvent.click(dnsButton);
            });

            // Click copy button (there should be multiple, get the first)
            await waitFor(() => {
                const copyButtons = screen.getAllByRole("button");
                const copyButton = copyButtons.find((btn) =>
                    btn.querySelector('svg.lucide-copy')
                );
                if (copyButton) {
                    fireEvent.click(copyButton);
                }
            });

            await waitFor(() => {
                expect(navigator.clipboard.writeText).toHaveBeenCalled();
            });
        });

        it("should show connected state when Mailgun domain is verified and selected", async () => {
            const mailgunProps = {
                ...mockProps,
                emailProviderType: "mailgun" as const,
                mailgunDomainId: "domain-1",
            };

            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ available: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        domains: [mockDomains[0]],
                    }),
                });

            render(<SenderSetupTab {...mailgunProps} funnelProjectId="project-123" />);

            await waitFor(() => {
                expect(screen.getByText("Custom Domain Connected")).toBeInTheDocument();
                expect(screen.getByText(/mail\.example\.com/)).toBeInTheDocument();
            });
        });
    });
});
