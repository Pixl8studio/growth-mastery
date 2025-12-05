/**
 * UploadIntake Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { UploadIntake } from "@/components/intake/upload-intake";

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

global.fetch = vi.fn();

describe("UploadIntake", () => {
    const defaultProps = {
        projectId: "project-123",
        userId: "user-456",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render without crashing", () => {
        render(<UploadIntake {...defaultProps} />);
        expect(screen.getByText("Upload Documents")).toBeInTheDocument();
    });

    it("should display session name input", () => {
        render(<UploadIntake {...defaultProps} />);
        expect(screen.getByLabelText(/Session Name/)).toBeInTheDocument();
    });

    it("should display drop zone", () => {
        render(<UploadIntake {...defaultProps} />);
        expect(screen.getByText(/Drag and drop your file here/)).toBeInTheDocument();
    });

    it("should display browse files button", () => {
        render(<UploadIntake {...defaultProps} />);
        expect(screen.getByRole("button", { name: /Browse Files/ })).toBeInTheDocument();
    });

    it("should update session name as user types", async () => {
        const user = userEvent.setup();
        render(<UploadIntake {...defaultProps} />);

        const input = screen.getByLabelText(/Session Name/);
        await user.type(input, "Product Documentation");

        expect(input).toHaveValue("Product Documentation");
    });

    it("should disable upload button when no file is selected", () => {
        render(<UploadIntake {...defaultProps} />);

        const button = screen.getByRole("button", { name: /Upload and Process/ });
        expect(button).toBeDisabled();
    });

    it("should reject invalid file type", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "Unsupported file type",
                    description: "Please upload a PDF, DOCX, DOC, TXT, or MD file.",
                    variant: "destructive",
                });
            });
        }
    });

    it("should reject file larger than 10MB", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        const largeContent = new Array(11 * 1024 * 1024).fill("a").join("");
        const file = new File([largeContent], "large.pdf", { type: "application/pdf" });
        Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "File too large",
                    description: "Please upload a file smaller than 10MB.",
                    variant: "destructive",
                });
            });
        }
    });

    it("should handle drag and drop", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const dropZone = container.querySelector('[class*="border-dashed"]') as HTMLElement;

        if (dropZone) {
            fireEvent.drop(dropZone, {
                dataTransfer: {
                    files: [file],
                },
            });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });
        }
    });

    it("should highlight drop zone on drag over", () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        const dropZone = container.querySelector('[class*="border-dashed"]') as HTMLElement;

        if (dropZone) {
            fireEvent.dragOver(dropZone);
            expect(dropZone).toHaveClass("border-primary");
        }
    });

    it("should remove highlight on drag leave", () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        const dropZone = container.querySelector('[class*="border-dashed"]') as HTMLElement;

        if (dropZone) {
            fireEvent.dragOver(dropZone);
            fireEvent.dragLeave(dropZone);
            expect(dropZone).toHaveClass("border-border");
        }
    });

    it("should submit upload successfully", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        const mockResponse = { intakeId: "intake-789" };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });

            const button = screen.getByRole("button", { name: /Upload and Process/ });
            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/intake/upload",
                    expect.objectContaining({
                        method: "POST",
                    })
                );
            });
        }
    });

    it("should show success toast after upload", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });

            const button = screen.getByRole("button", { name: /Upload and Process/ });
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: "File uploaded!",
                    description: "Your file has been processed successfully.",
                });
            });
        }
    });

    it("should clear form after successful upload", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        const sessionInput = screen.getByLabelText(/Session Name/);
        fireEvent.change(sessionInput, { target: { value: "Test" } });

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });

            const button = screen.getByRole("button", { name: /Upload and Process/ });
            fireEvent.click(button);

            await waitFor(() => {
                expect(sessionInput).toHaveValue("");
                expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
            });
        }
    });

    it("should call onComplete callback after successful upload", async () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const { container } = render(<UploadIntake {...defaultProps} onComplete={onComplete} />);

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ intakeId: "intake-789" }),
        });

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });

            const button = screen.getByRole("button", { name: /Upload and Process/ });
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalled();
            });

            vi.advanceTimersByTime(1000);

            expect(onComplete).toHaveBeenCalled();
            vi.useRealTimers();
        }
    });

    it("should show error toast on API error", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Upload failed" }),
        });

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });

            const button = screen.getByRole("button", { name: /Upload and Process/ });
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: "Upload failed",
                        variant: "destructive",
                    })
                );
            });
        }
    });

    it("should show error toast on network error", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });

            const button = screen.getByRole("button", { name: /Upload and Process/ });
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: "Upload failed",
                        variant: "destructive",
                    })
                );
            });
        }
    });

    it("should show Processing... text while uploading", async () => {
        const { container } = render(<UploadIntake {...defaultProps} />);

        let resolvePromise: any;
        (global.fetch as any).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolvePromise = () =>
                        resolve({
                            ok: true,
                            json: async () => ({ intakeId: "intake-789" }),
                        });
                })
        );

        const file = new File(["content"], "test.pdf", { type: "application/pdf" });
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        if (input) {
            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByText("test.pdf")).toBeInTheDocument();
            });

            const button = screen.getByRole("button", { name: /Upload and Process/ });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText("Processing...")).toBeInTheDocument();
            });

            resolvePromise();

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalled();
            });
        }
    });

    it("should display tips section", () => {
        render(<UploadIntake {...defaultProps} />);

        expect(screen.getByText("💡 Tips")).toBeInTheDocument();
        expect(screen.getByText(/Upload pitch decks/)).toBeInTheDocument();
    });

    it("should display supported file types", () => {
        render(<UploadIntake {...defaultProps} />);

        expect(screen.getByText(/Supported: PDF, DOCX, DOC, TXT, MD/)).toBeInTheDocument();
    });
});
