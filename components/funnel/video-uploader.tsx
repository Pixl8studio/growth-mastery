"use client";

import { useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";

interface VideoUploaderProps {
    projectId: string;
    onUploadComplete?: (videoData: { videoId: string; url: string }) => void;
}

const MAX_FILE_SIZE = 1_000_000_000; // 1GB in bytes
const MAX_AUTO_RETRIES = 3;

export function VideoUploader({ projectId, onUploadComplete }: VideoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const currentFileRef = useRef<File | null>(null);

    const uploadWithProgress = (url: string, file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const percentage = Math.round((e.loaded / e.total) * 100);
                    setProgress(percentage);
                    logger.info(
                        { percentage, loaded: e.loaded, total: e.total },
                        "Upload progress"
                    );
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener("error", () =>
                reject(new Error("Network error during upload"))
            );
            xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

            xhr.open("POST", url);

            const formData = new FormData();
            formData.append("file", file);
            xhr.send(formData);
        });
    };

    const uploadWithRetry = async (file: File, attempt = 0): Promise<void> => {
        try {
            // Get upload URL from Cloudflare
            logger.info(
                { projectId, fileSize: file.size, fileName: file.name, attempt },
                "Getting upload URL"
            );

            const uploadUrlResponse = await fetch("/api/cloudflare/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, fileName: file.name }),
            });

            if (!uploadUrlResponse.ok) {
                const errorData = await uploadUrlResponse.json();
                throw new Error(errorData.error || "Failed to get upload URL");
            }

            const { uploadUrl, videoId } = await uploadUrlResponse.json();

            // Upload video with progress tracking
            logger.info({ videoId, attempt }, "Uploading video to Cloudflare");
            await uploadWithProgress(uploadUrl, file);

            logger.info({ videoId }, "Video uploaded successfully");

            // Notify parent
            if (onUploadComplete) {
                onUploadComplete({
                    videoId,
                    url: `https://iframe.videodelivery.net/${videoId}`,
                });
            }

            setUploading(false);
            setRetryCount(0);
            currentFileRef.current = null;
        } catch (err) {
            logger.error({ error: err, attempt }, "Upload failed");

            // Automatic retry with exponential backoff
            if (attempt < MAX_AUTO_RETRIES) {
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                logger.info(
                    { attempt, delay, nextAttempt: attempt + 1 },
                    "Retrying upload after delay"
                );

                await new Promise((resolve) => setTimeout(resolve, delay));
                return uploadWithRetry(file, attempt + 1);
            }

            // Max retries reached - show error with manual retry option
            setError(err instanceof Error ? err.message : "Upload failed");
            setRetryCount(attempt);
            setUploading(false);
        }
    };

    const handleRetry = () => {
        if (currentFileRef.current) {
            setError(null);
            setProgress(0);
            setRetryCount(0);
            setUploading(true);
            void uploadWithRetry(currentFileRef.current, 0);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            "video/*": [".mp4", ".mov", ".avi", ".webm"],
        },
        maxFiles: 1,
        disabled: uploading,
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;

            const file = acceptedFiles[0];
            if (!file) return;

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                const fileSizeGB = (file.size / 1_000_000_000).toFixed(2);
                setError(
                    `File too large. Maximum size is 1GB. Your file is ${fileSizeGB}GB`
                );
                logger.error(
                    { fileSize: file.size, fileSizeGB },
                    "File exceeds size limit"
                );
                return;
            }

            currentFileRef.current = file;
            setUploading(true);
            setError(null);
            setProgress(0);
            setRetryCount(0);

            void uploadWithRetry(file, 0);
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
                    </div>
                )}
            </div>

            {/* File Requirements Display */}
            <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <div className="mb-3">
                    <p className="mb-1 font-medium text-gray-700">Accepted formats:</p>
                    <p className="text-gray-600">MP4, MOV, AVI, WebM</p>
                </div>
                <div className="mb-3">
                    <p className="mb-1 font-medium text-gray-700">File size limit:</p>
                    <p className="text-gray-600">Maximum 1GB per video</p>
                </div>
                <p className="text-xs text-gray-500">
                    💡 Tip: Record at 1080p resolution for best quality while staying
                    under the limit
                </p>
            </div>

            {/* Error Display with Retry */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="mb-2 text-sm font-medium text-red-800">
                        Upload Failed
                    </p>
                    <p className="mb-3 text-sm text-red-700">{error}</p>
                    {retryCount >= MAX_AUTO_RETRIES && (
                        <p className="mb-3 text-xs text-red-600">
                            Automatic retry failed {retryCount} times. Please try again
                            manually.
                        </p>
                    )}
                    <Button onClick={handleRetry} variant="outline" size="sm">
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}
