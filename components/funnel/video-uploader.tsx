"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";

interface VideoUploaderProps {
    projectId: string;
    onUploadComplete?: (videoData: { videoId: string; url: string }) => void;
}

export function VideoUploader({ projectId, onUploadComplete }: VideoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            "video/*": [".mp4", ".mov", ".avi", ".webm"],
        },
        maxFiles: 1,
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;

            const file = acceptedFiles[0];
            if (!file) return;

            setUploading(true);
            setError(null);
            setProgress(0);

            try {
                // Get upload URL from Cloudflare
                logger.info({ projectId, fileSize: file.size }, "Getting upload URL");

                const uploadUrlResponse = await fetch("/api/cloudflare/upload-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId }),
                });

                if (!uploadUrlResponse.ok) {
                    throw new Error("Failed to get upload URL");
                }

                const { uploadUrl, videoId } = await uploadUrlResponse.json();

                // Upload video to Cloudflare Stream
                logger.info({ videoId }, "Uploading video to Cloudflare");

                const formData = new FormData();
                formData.append("file", file);

                const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    throw new Error("Video upload failed");
                }

                setProgress(100);

                logger.info({ videoId }, "Video uploaded successfully");

                // Notify parent
                if (onUploadComplete) {
                    onUploadComplete({
                        videoId,
                        url: `https://iframe.videodelivery.net/${videoId}`,
                    });
                }

                setUploading(false);
            } catch (err) {
                logger.error({ error: err }, "Video upload failed");
                setError(err instanceof Error ? err.message : "Upload failed");
                setUploading(false);
            }
        },
    });

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                    isDragActive
                        ? "border-blue-500 bg-blue-50"
                        : uploading
                          ? "border-gray-300 bg-gray-50"
                          : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
                }`}
            >
                <input {...getInputProps()} disabled={uploading} />

                <div className="mb-4 text-6xl">{uploading ? "⏳" : "🎥"}</div>

                {uploading ? (
                    <div>
                        <p className="mb-3 text-lg font-semibold text-gray-900">
                            Uploading...
                        </p>
                        <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-gray-200">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{progress}%</p>
                    </div>
                ) : isDragActive ? (
                    <p className="text-lg font-semibold text-blue-600">
                        Drop your video here
                    </p>
                ) : (
                    <div>
                        <p className="mb-2 text-lg font-semibold text-gray-900">
                            Drag and drop your video here
                        </p>
                        <p className="mb-4 text-sm text-gray-600">or click to browse</p>
                        <Button type="button" variant="outline">
                            Choose Video
                        </Button>
                        <p className="mt-4 text-xs text-gray-500">
                            Supports MP4, MOV, AVI, WebM • Max 1GB
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-center">
                    <p className="text-sm text-red-800">{error}</p>
                    <Button
                        onClick={() => {
                            setError(null);
                            setProgress(0);
                        }}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                    >
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}
