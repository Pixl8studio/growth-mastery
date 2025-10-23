"use client";

/**
 * Step 7: Upload Video
 * Upload pitch video to Cloudflare Stream
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { StepLayout } from "@/components/funnel/step-layout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, Video, CheckCircle } from "lucide-react";

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

interface PitchVideo {
    id: string;
    video_url?: string;
    status: string;
    processing_status?: string;
    video_duration?: number;
}

export default function Step7Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [pitchVideo, setPitchVideo] = useState<PitchVideo | null>(null);

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data: projectData } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            setProject(projectData);

            const { data: videoData } = await supabase
                .from("pitch_videos")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (videoData) {
                setPitchVideo(videoData);
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            logger.info(
                { fileName: file.name, fileSize: file.size },
                "Starting video upload"
            );

            // Get upload URL from Cloudflare
            const uploadUrlResponse = await fetch("/api/cloudflare/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: file.name, projectId }),
            });

            const { uploadUrl, videoId } = await uploadUrlResponse.json();

            // Upload file to Cloudflare
            const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("Upload failed");
            }

            // Save video metadata
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            await supabase.from("pitch_videos").insert({
                funnel_project_id: projectId,
                user_id: user.id,
                video_url: `https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/manifest/video.m3u8`,
                video_provider: "cloudflare",
                video_id: videoId,
                processing_status: "processing",
                file_size: file.size,
            });

            setUploadProgress(100);
            logger.info({ videoId }, "Video uploaded successfully");

            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to upload video");
        } finally {
            setUploading(false);
        }
    };

    const hasVideo = !!pitchVideo;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={7}
                stepTitle="Upload Video"
                stepDescription="Loading..."
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </StepLayout>
        );
    }

    return (
        <StepLayout
            projectId={projectId}
            currentStep={7}
            stepTitle="Upload Video"
            stepDescription="Upload your pitch video"
            funnelName={project?.name}
            nextDisabled={!hasVideo}
            nextLabel="Continue to Watch Page"
        >
            <div className="space-y-6">
                {hasVideo ? (
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                            <div className="flex items-center">
                                <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
                                <div>
                                    <CardTitle className="text-green-900">
                                        Video Uploaded!
                                    </CardTitle>
                                    <CardDescription className="text-green-700">
                                        Your video is processing
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-green-700">Status:</span>
                                <Badge variant="success">
                                    {pitchVideo.processing_status}
                                </Badge>
                            </div>
                            {pitchVideo.video_duration && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-700">Duration:</span>
                                    <span className="font-medium text-green-900">
                                        {Math.floor(pitchVideo.video_duration / 60)}{" "}
                                        minutes
                                    </span>
                                </div>
                            )}
                            <Button variant="outline" size="sm" className="w-full">
                                Upload New Video
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Upload className="mr-2 h-5 w-5 text-blue-600" />
                                Upload Your Pitch Video
                            </CardTitle>
                            <CardDescription>
                                Upload your recorded pitch presentation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {uploading ? (
                                <div className="py-8">
                                    <p className="mb-4 text-center text-sm font-medium text-gray-900">
                                        Uploading... {uploadProgress}%
                                    </p>
                                    <Progress value={uploadProgress} className="mb-4" />
                                    <p className="text-center text-xs text-gray-600">
                                        Please don't close this page
                                    </p>
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <Video className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                                    <label
                                        htmlFor="video-upload"
                                        className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-500"
                                    >
                                        <span className="block">
                                            Click to upload video
                                        </span>
                                        <span className="mt-1 block text-xs text-gray-500">
                                            MP4, MOV up to 1GB
                                        </span>
                                    </label>
                                    <input
                                        id="video-upload"
                                        type="file"
                                        accept="video/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </StepLayout>
    );
}
