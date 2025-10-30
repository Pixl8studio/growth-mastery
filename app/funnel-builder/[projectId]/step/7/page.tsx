"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { VideoUploader } from "@/components/funnel/video-uploader";
import {
    Video,
    Trash2,
    Play,
    Presentation,
    FileText,
    ExternalLink,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";

interface PitchVideo {
    id: string;
    video_url: string;
    thumbnail_url: string | null;
    video_duration: number;
    created_at: string;
}

interface DeckStructure {
    id: string;
    title: string;
    slide_count: number;
    gamma_deck_url?: string;
}

interface TalkTrack {
    id: string;
    deck_structure_id: string;
    content: string;
    created_at: string;
}

export default function Step7Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [videos, setVideos] = useState<PitchVideo[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<PitchVideo | null>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState("");
    const [talkTracks, setTalkTracks] = useState<TalkTrack[]>([]);
    const [selectedTalkTrack, setSelectedTalkTrack] = useState<TalkTrack | null>(null);

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    useEffect(() => {
        const loadProject = async () => {
            if (!projectId) return;
            try {
                const supabase = createClient();
                const { data: projectData, error: projectError } = await supabase
                    .from("funnel_projects")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                if (projectError) throw projectError;
                setProject(projectData);
            } catch (error) {
                logger.error({ error }, "Failed to load project");
            }
        };
        loadProject();
    }, [projectId]);

    useEffect(() => {
        const loadData = async () => {
            if (!projectId) return;
            try {
                const supabase = createClient();
                const [
                    videosResult,
                    deckStructuresResult,
                    gammaDecksResult,
                    talkTracksResult,
                ] = await Promise.all([
                    supabase
                        .from("pitch_videos")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("deck_structures")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("gamma_decks")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("talk_tracks")
                        .select("*")
                        .eq("funnel_project_id", projectId)
                        .order("created_at", { ascending: false }),
                ]);

                if (videosResult.data) setVideos(videosResult.data);

                // Transform deck structures and merge with gamma deck URLs
                if (deckStructuresResult.data) {
                    // Create map of gamma deck URLs by deck_structure_id
                    const gammaDecksMap = new Map(
                        (gammaDecksResult.data || []).map((deck: any) => [
                            deck.deck_structure_id,
                            deck.deck_url, // ← Fixed: was gamma_url, should be deck_url
                        ])
                    );

                    logger.info(
                        {
                            totalGammaDecks: gammaDecksResult.data?.length || 0,
                            gammaDecksWithUrls: Array.from(
                                gammaDecksMap.values()
                            ).filter((url) => url).length,
                        },
                        "Loaded Gamma decks"
                    );

                    const transformed = (deckStructuresResult.data || []).map(
                        (deck: any) => ({
                            id: deck.id,
                            title: deck.metadata?.title || "Untitled Deck",
                            slide_count: Array.isArray(deck.slides)
                                ? deck.slides.length
                                : deck.total_slides || 55,
                            gamma_deck_url: gammaDecksMap.get(deck.id),
                        })
                    );

                    logger.info(
                        {
                            totalDecks: transformed.length,
                            decksWithGammaUrls: transformed.filter(
                                (d) => d.gamma_deck_url
                            ).length,
                        },
                        "Transformed deck structures"
                    );

                    setDeckStructures(transformed);

                    // Auto-select first deck if available
                    if (transformed.length > 0 && !selectedDeckId) {
                        setSelectedDeckId(transformed[0].id);
                    }
                }

                if (talkTracksResult.data) setTalkTracks(talkTracksResult.data);
            } catch (error) {
                logger.error({ error }, "Failed to load data");
            }
        };
        loadData();
    }, [projectId]);

    const pollVideoStatus = async (
        videoId: string,
        maxAttempts = 10
    ): Promise<{ duration: number; thumbnailUrl: string }> => {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                logger.info(
                    { videoId, attempt: i + 1, maxAttempts },
                    "Polling video status"
                );

                const response = await fetch(`/api/cloudflare/video/${videoId}`);
                const data = await response.json();

                if (data.readyToStream) {
                    logger.info(
                        { videoId, duration: data.duration },
                        "Video ready to stream"
                    );
                    return {
                        duration: data.duration || 0,
                        thumbnailUrl: data.thumbnail || "",
                    };
                }

                // Wait 2 seconds before next poll
                await new Promise((resolve) => setTimeout(resolve, 2000));
            } catch (error) {
                logger.error(
                    { error, videoId, attempt: i + 1 },
                    "Error polling video status"
                );
            }
        }

        logger.warn({ videoId }, "Video processing timeout - saving without metadata");
        return { duration: 0, thumbnailUrl: "" };
    };

    const handleUploadComplete = async (videoData: {
        videoId: string;
        url: string;
    }) => {
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            // Poll for video metadata (duration, thumbnail)
            logger.info({ videoId: videoData.videoId }, "Polling for video metadata");
            const videoMetadata = await pollVideoStatus(videoData.videoId);

            const { data, error } = await supabase
                .from("pitch_videos")
                .insert({
                    funnel_project_id: projectId,
                    user_id: user.id,
                    video_url: videoData.url,
                    video_id: videoData.videoId,
                    video_provider: "cloudflare",
                    video_duration: videoMetadata.duration,
                    thumbnail_url: videoMetadata.thumbnailUrl,
                    processing_status: "ready",
                })
                .select()
                .single();

            if (error) throw error;

            setVideos((prev) => [data, ...prev]);
            logger.info({ videoId: videoData.videoId }, "Video saved successfully");
        } catch (error) {
            logger.error({ error }, "Failed to save video");
            alert(
                "Video uploaded but failed to save metadata. Please contact support."
            );
        }
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!confirm("Delete this video?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("pitch_videos")
                .delete()
                .eq("id", videoId);

            if (!error) {
                setVideos((prev) => prev.filter((v) => v.id !== videoId));
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete video");
        }
    };

    const handleViewDeck = () => {
        const selectedDeck = deckStructures.find((d) => d.id === selectedDeckId);

        logger.info(
            {
                selectedDeckId,
                deckTitle: selectedDeck?.title,
                hasGammaUrl: !!selectedDeck?.gamma_deck_url,
                gammaUrl: selectedDeck?.gamma_deck_url,
            },
            "View Deck clicked"
        );

        if (selectedDeck?.gamma_deck_url) {
            window.open(selectedDeck.gamma_deck_url, "_blank", "width=1200,height=800");
        } else {
            alert("No Gamma deck found for this deck structure. Create one in Step 4.");
        }
    };

    const handleViewTalkTrack = () => {
        const track = talkTracks.find((t) => t.deck_structure_id === selectedDeckId);
        if (track) {
            setSelectedTalkTrack(track);
        } else {
            alert("No talk track found for this deck. Generate one in Step 6.");
        }
    };

    const selectedDeck = deckStructures.find((d) => d.id === selectedDeckId);

    const hasVideo = videos.length > 0;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={7}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            nextDisabled={!hasVideo}
            nextLabel={hasVideo ? "Generate Watch Page" : "Upload Video First"}
            stepTitle="Upload Presentation Video"
            stepDescription="Record and upload your pitch video"
        >
            <div className="space-y-8">
                {/* Recording Instructions */}
                <div className="rounded-lg border border-primary/10 bg-primary/5 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-foreground">
                        🎬 How to Record Your Presentation
                    </h3>
                    <ol className="space-y-2 text-sm text-foreground">
                        <li className="flex items-start">
                            <span className="mr-2">1️⃣</span>
                            <span>Open a Zoom meeting alone</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">2️⃣</span>
                            <span>
                                Share your presentation deck (screen-share mode)
                            </span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">3️⃣</span>
                            <span>Record to computer (local file)</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">4️⃣</span>
                            <span>Speak through the AI-generated Talk Track</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">5️⃣</span>
                            <span>Upload the finished MP4 here</span>
                        </li>
                    </ol>
                </div>

                {/* Recording Helper Section */}
                {deckStructures.length > 0 && (
                    <div className="rounded-lg border border-primary/10 bg-gradient-to-br from-primary/5 to-primary/5 p-6">
                        <div className="mb-4">
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                🎬 Recording Helper
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Select your deck to view it alongside your talk track
                                while recording
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-foreground">
                                Select Deck Structure
                            </label>
                            <select
                                value={selectedDeckId}
                                onChange={(e) => setSelectedDeckId(e.target.value)}
                                className="w-full rounded-lg border border-border px-4 py-2 focus:border-primary focus:ring-2 focus:ring-primary"
                            >
                                {deckStructures.map((deck) => (
                                    <option key={deck.id} value={deck.id}>
                                        {deck.title} ({deck.slide_count} slides)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedDeck && (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleViewDeck}
                                    disabled={!selectedDeck.gamma_deck_url}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-colors ${
                                        selectedDeck.gamma_deck_url
                                            ? "bg-purple-600 text-white hover:bg-purple-700"
                                            : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                    }`}
                                >
                                    <Presentation className="h-5 w-5" />
                                    View Deck
                                    <ExternalLink className="h-4 w-4" />
                                </button>

                                <button
                                    onClick={handleViewTalkTrack}
                                    disabled={
                                        !talkTracks.some(
                                            (t) =>
                                                t.deck_structure_id === selectedDeckId
                                        )
                                    }
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-colors ${
                                        talkTracks.some(
                                            (t) =>
                                                t.deck_structure_id === selectedDeckId
                                        )
                                            ? "bg-primary text-white hover:bg-primary/90"
                                            : "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                    }`}
                                >
                                    <FileText className="h-5 w-5" />
                                    View Talk Track
                                </button>
                            </div>
                        )}

                        {selectedDeck && !selectedDeck.gamma_deck_url && (
                            <p className="mt-3 text-sm text-amber-600">
                                💡 Create a Gamma deck in Step 4 to view it while
                                recording
                            </p>
                        )}

                        {selectedDeck &&
                            !talkTracks.some(
                                (t) => t.deck_structure_id === selectedDeckId
                            ) && (
                                <p className="mt-3 text-sm text-amber-600">
                                    💡 Generate a talk track in Step 6 to view it while
                                    recording
                                </p>
                            )}
                    </div>
                )}

                <div className="rounded-lg border border-red-100 bg-gradient-to-br from-red-50 to-orange-50 p-8">
                    <VideoUploader
                        projectId={projectId}
                        onUploadComplete={handleUploadComplete}
                    />
                </div>

                <div className="rounded-lg border border-border bg-card shadow-soft">
                    <div className="border-b border-border p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-foreground">
                                Your Videos
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {videos.length} uploaded
                            </span>
                        </div>
                    </div>

                    <div className="p-6">
                        {videos.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Video className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                <p>No videos yet. Upload your first one above!</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {videos.map((video) => (
                                    <div
                                        key={video.id}
                                        className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-red-300 hover:shadow-md"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-foreground">
                                                Presentation Video
                                            </span>
                                            <button
                                                onClick={() =>
                                                    handleDeleteVideo(video.id)
                                                }
                                                className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                                            {video.thumbnail_url ? (
                                                <img
                                                    src={video.thumbnail_url}
                                                    alt="Video thumbnail"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <Video className="h-12 w-12 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-3 text-sm text-muted-foreground">
                                            <div className="flex items-center justify-between">
                                                <span>
                                                    ⏱️{" "}
                                                    {Math.floor(
                                                        video.video_duration / 60
                                                    )}
                                                    :
                                                    {(video.video_duration % 60)
                                                        .toString()
                                                        .padStart(2, "0")}
                                                </span>
                                                <span>
                                                    {new Date(
                                                        video.created_at
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedVideo(video)}
                                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                                        >
                                            <Play className="h-4 w-4" />
                                            Watch Video
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Video Player Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
                    <div className="w-full max-w-4xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                Presentation Video
                            </h3>
                            <button
                                onClick={() => setSelectedVideo(null)}
                                className="text-2xl font-bold text-white hover:text-gray-300"
                            >
                                ×
                            </button>
                        </div>
                        <div className="aspect-video w-full overflow-hidden rounded-lg">
                            <iframe
                                src={selectedVideo.video_url}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Talk Track Viewer Modal */}
            {selectedTalkTrack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-card shadow-2xl">
                        <div className="flex-shrink-0 rounded-t-lg border-b border-border bg-muted/50 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">
                                        Talk Track Script
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Use this script while recording your
                                        presentation
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedTalkTrack(null)}
                                    className="text-2xl font-bold text-muted-foreground hover:text-muted-foreground"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-scroll p-6">
                            <div className="prose max-w-none">
                                <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm">
                                    {selectedTalkTrack.content}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </StepLayout>
    );
}
