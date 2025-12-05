/**
 * GoogleDriveIntake Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GoogleDriveIntake } from "@/components/intake/google-drive-intake";

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock window.open
global.window.open = vi.fn(() => ({
    close: vi.fn(),
}));

describe("GoogleDriveIntake", () => {
    const mockProps = {
        projectId: "project-123",
        userId: "user-456",
        onComplete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
        });
    });

    it("should render initial state", () => {
        render(<GoogleDriveIntake {...mockProps} />);

        expect(screen.getByText("Connect Google Drive")).toBeInTheDocument();
        expect(
            screen.getByText(/Import documents directly from your Google Drive/)
        ).toBeInTheDocument();
    });

    it("should show connect button", () => {
        render(<GoogleDriveIntake {...mockProps} />);

        expect(screen.getByText("Connect Google Drive")).toBeInTheDocument();
    });

    it("should display privacy information", () => {
        render(<GoogleDriveIntake {...mockProps} />);

        expect(screen.getByText("🔒 Privacy & Security")).toBeInTheDocument();
        expect(
            screen.getByText(/We only request read-only access/)
        ).toBeInTheDocument();
    });

    it("should fetch auth URL when connect is clicked", async () => {
        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/google-drive?action=auth"
            );
        });
    });

    it("should open OAuth popup", async () => {
        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(window.open).toHaveBeenCalledWith(
                "https://accounts.google.com/oauth",
                "Google Drive OAuth",
                expect.stringContaining("width=600")
            );
        });
    });

    it("should show connecting state", async () => {
        (global.fetch as any).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(screen.getByText("Connecting...")).toBeInTheDocument();
        });
    });

    it("should handle OAuth success message", async () => {
        const mockFiles = {
            files: [
                { id: "file-1", name: "Document 1.pdf", mimeType: "application/pdf", size: 1024 },
                { id: "file-2", name: "Document 2.docx", mimeType: "application/docx", size: 2048 },
            ],
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockFiles,
            });

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        // Simulate OAuth callback
        window.postMessage({
            type: "google-oauth-success",
            accessToken: "test-token",
        }, "*");

        await waitFor(() => {
            expect(screen.getByText("Document 1.pdf")).toBeInTheDocument();
        });
    });

    it("should display file list after connection", async () => {
        const mockFiles = {
            files: [
                { id: "file-1", name: "Document 1.pdf", mimeType: "application/pdf", size: 1024 },
            ],
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockFiles,
            });

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        window.postMessage({
            type: "google-oauth-success",
            accessToken: "test-token",
        }, "*");

        await waitFor(() => {
            expect(screen.getByText("Select Files to Import")).toBeInTheDocument();
        });
    });

    it("should allow selecting files", async () => {
        const mockFiles = {
            files: [
                { id: "file-1", name: "Document 1.pdf", mimeType: "application/pdf", size: 1024 },
            ],
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockFiles,
            });

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        window.postMessage({
            type: "google-oauth-success",
            accessToken: "test-token",
        }, "*");

        await waitFor(() => {
            const fileItem = screen.getByText("Document 1.pdf");
            fireEvent.click(fileItem.closest("div")!);
        });

        await waitFor(() => {
            expect(screen.getByText("1 file selected")).toBeInTheDocument();
        });
    });

    it("should import selected files", async () => {
        const mockFiles = {
            files: [
                { id: "file-1", name: "Document 1.pdf", mimeType: "application/pdf", size: 1024 },
            ],
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockFiles,
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    intakeId: "intake-789",
                    filesProcessed: 1,
                }),
            });

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        window.postMessage({
            type: "google-oauth-success",
            accessToken: "test-token",
        }, "*");

        await waitFor(() => {
            const fileItem = screen.getByText("Document 1.pdf");
            fireEvent.click(fileItem.closest("div")!);
        });

        const importButton = screen.getByText("Import 1 File");
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/intake/google-drive",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should show success toast after import", async () => {
        const mockFiles = {
            files: [
                { id: "file-1", name: "Document 1.pdf", mimeType: "application/pdf", size: 1024 },
            ],
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockFiles,
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    intakeId: "intake-789",
                    filesProcessed: 1,
                }),
            });

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        window.postMessage({
            type: "google-oauth-success",
            accessToken: "test-token",
        }, "*");

        await waitFor(() => {
            const fileItem = screen.getByText("Document 1.pdf");
            fireEvent.click(fileItem.closest("div")!);
        });

        const importButton = screen.getByText("Import 1 File");
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Files imported!",
                description: expect.stringContaining("Successfully imported 1 file"),
            });
        });
    });

    it("should handle import error", async () => {
        const mockFiles = {
            files: [
                { id: "file-1", name: "Document 1.pdf", mimeType: "application/pdf", size: 1024 },
            ],
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockFiles,
            })
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "Import failed" }),
            });

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        window.postMessage({
            type: "google-oauth-success",
            accessToken: "test-token",
        }, "*");

        await waitFor(() => {
            const fileItem = screen.getByText("Document 1.pdf");
            fireEvent.click(fileItem.closest("div")!);
        });

        const importButton = screen.getByText("Import 1 File");
        fireEvent.click(importButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith({
                title: "Import failed",
                description: "Import failed",
                variant: "destructive",
            });
        });
    });

    it("should format file size", async () => {
        const mockFiles = {
            files: [
                { id: "file-1", name: "Small.pdf", mimeType: "application/pdf", size: 500 },
                { id: "file-2", name: "Medium.pdf", mimeType: "application/pdf", size: 5000 },
                { id: "file-3", name: "Large.pdf", mimeType: "application/pdf", size: 5000000 },
            ],
        };

        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ authUrl: "https://accounts.google.com/oauth" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockFiles,
            });

        render(<GoogleDriveIntake {...mockProps} />);

        const connectButton = screen.getByText("Connect Google Drive");
        fireEvent.click(connectButton);

        window.postMessage({
            type: "google-oauth-success",
            accessToken: "test-token",
        }, "*");

        await waitFor(() => {
            expect(screen.getByText("500 B")).toBeInTheDocument();
            expect(screen.getByText("4.9 KB")).toBeInTheDocument();
            expect(screen.getByText("4.8 MB")).toBeInTheDocument();
        });
    });
});
