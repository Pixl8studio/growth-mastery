"use client";

/**
 * Video Selector Modal
 * Select from uploaded pitch videos to insert into pages
 */

import { useState, useEffect } from "react";
import { X, Video, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import type { PitchVideo } from "@/types/pages";

interface VideoSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVideoSelected: (video: PitchVideo) => void;
    projectId: string;
}

export function VideoSelectorModal({
    isOpen,
    onClose,
    onVideoSelected,
    projectId,
}: VideoSelectorModalProps) {
    const [videos, setVideos] = useState<PitchVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<PitchVideo | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadVideos();
        }
    }, [isOpen, projectId]);

    const loadVideos = async () => {
        setLoading(true);
        setError(null);

        try {
            logger.info({ projectId }, "Loading pitch videos");

            const response = await fetch(
                `/api/pages/pitch-videos?projectId=${projectId}`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load videos");
            }

            logger.info({ videoCount: data.videos.length }, "Pitch videos loaded");

            setVideos(data.videos);
        } catch (err) {
            logger.error({ error: err }, "Failed to load pitch videos");
            setError(err instanceof Error ? err.message : "Failed to load videos");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVideo = () => {
        if (selectedVideo) {
            onVideoSelected(selectedVideo);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedVideo(null);
        onClose();
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "Unknown";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 p-6">
                    <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            Select Pitch Video
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-lg p-1 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[600px] overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center text-center">
                            <Video className="mb-3 h-12 w-12 text-gray-300" />
                            <p className="mb-1 text-sm font-medium text-gray-700">
                                No pitch videos yet
                            </p>
                            <p className="text-xs text-gray-500">
                                Upload a pitch video in Step 7 to use it here
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-gray-600">
                                Select a pitch video to insert into your page
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {videos.map((video) => (
                                    <button
                                        key={video.id}
                                        onClick={() => setSelectedVideo(video)}
                                        className={`group relative overflow-hidden rounded-lg border-2 text-left transition-all ${
                                            selectedVideo?.id === video.id
                                                ? "border-blue-600 bg-blue-50"
                                                : "border-gray-200 bg-white hover:border-blue-300"
                                        }`}
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative aspect-video w-full bg-gray-900">
                                            {video.thumbnail_url ? (
                                                <img
                                                    src={video.thumbnail_url}
                                                    alt={video.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <Video className="h-12 w-12 text-gray-600" />
                                                </div>
                                            )}

                                            {/* Duration Badge */}
                                            {video.duration && (
                                                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDuration(video.duration)}
                                                </div>
                                            )}

                                            {/* Selection Overlay */}
                                            {selectedVideo?.id === video.id && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-blue-600/20">
                                                    <div className="rounded-full bg-blue-600 p-2">
                                                        <svg
                                                            className="h-6 w-6 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Video Info */}
                                        <div className="p-3">
                                            <h3 className="mb-1 line-clamp-2 text-sm font-medium text-gray-900">
                                                {video.title}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {new Date(
                                                    video.created_at
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && !error && videos.length > 0 && (
                    <div className="border-t border-gray-200 p-6">
                        <div className="flex justify-end gap-3">
                            <Button onClick={handleClose} variant="outline">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSelectVideo}
                                disabled={!selectedVideo}
                            >
                                Insert Video
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
