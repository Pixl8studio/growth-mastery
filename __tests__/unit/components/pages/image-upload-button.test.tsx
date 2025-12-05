/**
 * ImageUploadButton Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageUploadButton } from "@/components/pages/image-upload-button";

// Mock logger
vi.mock("@/lib/client-logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
global.fetch = vi.fn();

describe("ImageUploadButton", () => {
    const mockProps = {
        onImageUploaded: vi.fn(),
        projectId: "project-123",
        pageId: "page-456",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                imageUrl: "https://example.com/uploaded.jpg",
                mediaId: "media-789",
                filename: "test-image.jpg",
            }),
        });
    });

    describe("Button variant", () => {
        it("should render upload button", () => {
            render(<ImageUploadButton {...mockProps} variant="button" />);

            expect(screen.getByText("Upload Image")).toBeInTheDocument();
        });

        it("should open file picker when button is clicked", () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="button" />
            );

            const fileInput = container.querySelector('input[type="file"]');
            const clickSpy = vi.spyOn(fileInput as HTMLElement, "click");

            const button = screen.getByText("Upload Image");
            fireEvent.click(button);

            expect(clickSpy).toHaveBeenCalled();
        });

        it("should upload file when selected", async () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="button" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/pages/upload-image",
                    expect.objectContaining({
                        method: "POST",
                    })
                );
            });
        });

        it("should call onImageUploaded after successful upload", async () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="button" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(mockProps.onImageUploaded).toHaveBeenCalledWith(
                    "https://example.com/uploaded.jpg",
                    "media-789",
                    "test-image.jpg"
                );
            });
        });

        it("should show uploading state", async () => {
            (global.fetch as any).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );

            const { container } = render(
                <ImageUploadButton {...mockProps} variant="button" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(screen.getByText("Uploading...")).toBeInTheDocument();
            });
        });

        it("should reject invalid file types", async () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="button" />
            );

            const file = new File(["test"], "test.txt", { type: "text/plain" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(
                    screen.getByText(/Invalid file type/)
                ).toBeInTheDocument();
            });

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it("should reject files larger than 5MB", async () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="button" />
            );

            const largeFile = new File(
                [new ArrayBuffer(6 * 1024 * 1024)],
                "large.jpg",
                { type: "image/jpeg" }
            );
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [largeFile],
            });

            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(screen.getByText(/File too large/)).toBeInTheDocument();
            });

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it("should handle upload error", async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Upload failed" }),
            });

            const { container } = render(
                <ImageUploadButton {...mockProps} variant="button" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(screen.getByText("Upload failed")).toBeInTheDocument();
            });
        });
    });

    describe("Dropzone variant", () => {
        it("should render dropzone", () => {
            render(<ImageUploadButton {...mockProps} variant="dropzone" />);

            expect(
                screen.getByText("Drop image here or click to browse")
            ).toBeInTheDocument();
        });

        it("should show file type hint", () => {
            render(<ImageUploadButton {...mockProps} variant="dropzone" />);

            expect(
                screen.getByText("JPG, PNG, WebP, or GIF • Max 5MB")
            ).toBeInTheDocument();
        });

        it("should handle drag over", () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="dropzone" />
            );

            const dropzone = container.querySelector("div");
            fireEvent.dragOver(dropzone!);

            expect(dropzone).toHaveClass("border-purple-600");
        });

        it("should handle drag leave", () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="dropzone" />
            );

            const dropzone = container.querySelector("div");
            fireEvent.dragOver(dropzone!);
            fireEvent.dragLeave(dropzone!);

            expect(dropzone).not.toHaveClass("border-purple-600");
        });

        it("should handle file drop", async () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="dropzone" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const dropzone = container.querySelector("div");

            const dataTransfer = {
                files: [file],
            };

            fireEvent.drop(dropzone!, { dataTransfer });

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            });
        });

        it("should show preview during upload", async () => {
            const { container } = render(
                <ImageUploadButton {...mockProps} variant="dropzone" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            const mockFileReader = {
                readAsDataURL: vi.fn(),
                onload: null as any,
                result: "data:image/jpeg;base64,test",
            };

            vi.spyOn(window, "FileReader").mockImplementation(
                () => mockFileReader as any
            );

            fireEvent.change(fileInput);

            if (mockFileReader.onload) {
                mockFileReader.onload({ target: mockFileReader } as any);
            }

            await waitFor(() => {
                expect(screen.getByAltText("Preview")).toBeInTheDocument();
            });
        });

        it("should show uploading overlay on preview", async () => {
            (global.fetch as any).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            );

            const { container } = render(
                <ImageUploadButton {...mockProps} variant="dropzone" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            const mockFileReader = {
                readAsDataURL: vi.fn(),
                onload: null as any,
                result: "data:image/jpeg;base64,test",
            };

            vi.spyOn(window, "FileReader").mockImplementation(
                () => mockFileReader as any
            );

            fireEvent.change(fileInput);

            if (mockFileReader.onload) {
                mockFileReader.onload({ target: mockFileReader } as any);
            }

            await waitFor(() => {
                const preview = screen.getByAltText("Preview");
                expect(preview).toBeInTheDocument();
            });
        });

        it("should allow closing error message", async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                json: async () => ({ error: "Upload failed" }),
            });

            const { container } = render(
                <ImageUploadButton {...mockProps} variant="dropzone" />
            );

            const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
            const fileInput = container.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;

            Object.defineProperty(fileInput, "files", {
                value: [file],
            });

            fireEvent.change(fileInput);

            await waitFor(() => {
                expect(screen.getByText("Upload failed")).toBeInTheDocument();
            });

            const closeButton = container.querySelector("button");
            if (closeButton) {
                fireEvent.click(closeButton);
            }

            await waitFor(() => {
                expect(screen.queryByText("Upload failed")).not.toBeInTheDocument();
            });
        });
    });

    it("should include pageId in upload request when provided", async () => {
        const { container } = render(
            <ImageUploadButton {...mockProps} variant="button" />
        );

        const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
        const fileInput = container.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;

        Object.defineProperty(fileInput, "files", {
            value: [file],
        });

        fireEvent.change(fileInput);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/pages/upload-image",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    it("should apply custom className", () => {
        render(
            <ImageUploadButton
                {...mockProps}
                variant="button"
                className="custom-class"
            />
        );

        const button = screen.getByText("Upload Image");
        expect(button).toHaveClass("custom-class");
    });
});
