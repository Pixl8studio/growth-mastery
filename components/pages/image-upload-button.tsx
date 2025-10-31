"use client";

/**
 * Image Upload Button
 * Upload images with drag-drop support for page editor
 */

import { useState, useRef, DragEvent } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

interface ImageUploadButtonProps {
    onImageUploaded: (imageUrl: string, mediaId: string, filename: string) => void;
    projectId: string;
    pageId?: string;
    className?: string;
    variant?: "button" | "dropzone";
}

export function ImageUploadButton({
    onImageUploaded,
    projectId,
    pageId,
    className,
    variant = "button",
}: ImageUploadButtonProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

        if (!allowedTypes.includes(file.type)) {
            setError("Invalid file type. Please upload JPG, PNG, WebP, or GIF.");
            return;
        }

        if (file.size > maxSize) {
            setError("File too large. Maximum size is 5MB.");
            return;
        }

        setError(null);

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        uploadFile(file);
    };

    const uploadFile = async (file: File) => {
        setUploading(true);
        setError(null);

        try {
            logger.info(
                { fileName: file.name, fileSize: file.size, projectId },
                "Uploading image"
            );

            const formData = new FormData();
            formData.append("image", file);
            formData.append("projectId", projectId);
            if (pageId) {
                formData.append("pageId", pageId);
            }

            const response = await fetch("/api/pages/upload-image", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to upload image");
            }

            logger.info(
                { imageUrl: data.imageUrl, mediaId: data.mediaId },
                "Image uploaded successfully"
            );

            onImageUploaded(data.imageUrl, data.mediaId, data.filename);
            setPreview(null);
        } catch (err) {
            logger.error({ error: err }, "Image upload failed");
            setError(err instanceof Error ? err.message : "Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    if (variant === "dropzone") {
        return (
            <div className={cn("w-full", className)}>
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    className={cn(
                        "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                        isDragging
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
                        uploading && "pointer-events-none opacity-50"
                    )}
                >
                    {preview ? (
                        <div className="relative">
                            <img
                                src={preview}
                                alt="Preview"
                                className="mx-auto max-h-48 rounded-lg"
                            />
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Upload className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                            <p className="mb-1 text-sm font-medium text-gray-700">
                                {uploading
                                    ? "Uploading..."
                                    : "Drop image here or click to browse"}
                            </p>
                            <p className="text-xs text-gray-500">
                                JPG, PNG, WebP, or GIF • Max 5MB
                            </p>
                        </>
                    )}
                </div>

                {error && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileInputChange}
                    className="hidden"
                />
            </div>
        );
    }

    return (
        <>
            <Button
                onClick={handleClick}
                disabled={uploading}
                variant="outline"
                className={className}
            >
                {uploading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                    </>
                )}
            </Button>

            {error && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileInputChange}
                className="hidden"
            />
        </>
    );
}
