/**
 * Watch Page Template
 * Public video landing page
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/client-logger";

interface WatchPageVideo {
    video_url?: string;
    thumbnail_url?: string;
}

interface WatchPageData {
    id: string;
    headline: string;
    subheadline?: string;
    pitch_videos?: WatchPageVideo;
    cta_config?: {
        text?: string;
        subtext?: string;
    };
}

interface WatchPageProps {
    page: WatchPageData;
}

export function WatchPageTemplate({ page }: WatchPageProps) {
    const video = page.pitch_videos;

    const handleCTAClick = () => {
        logger.info({ pageId: page.id }, "Watch page CTA clicked");

        // TODO: Track event to analytics
        // TODO: Get enrollment page UUID from flow
        // TODO: Redirect to enrollment page

        alert("Redirecting to enrollment page...");
    };

    return (
        <div className="min-h-screen bg-muted/50">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-16">
                {/* Header */}
                <div className="mb-6 sm:mb-8 text-center">
                    <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl font-bold text-foreground px-2">
                        {page.headline}
                    </h1>
                    {page.subheadline && (
                        <p className="text-lg sm:text-xl text-foreground px-4">
                            {page.subheadline}
                        </p>
                    )}
                </div>

                {/* Video Player - Optimized for mobile */}
                <Card className="mb-6 sm:mb-8 overflow-hidden">
                    {video?.video_url ? (
                        <div className="relative aspect-video bg-black">
                            <video
                                controls
                                className="h-full w-full"
                                src={video.video_url}
                                poster={video.thumbnail_url}
                                playsInline
                                preload="metadata"
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    ) : (
                        <div className="flex aspect-video items-center justify-center bg-gray-200">
                            <p className="text-sm sm:text-base text-muted-foreground px-4 text-center">
                                Video player will appear here
                            </p>
                        </div>
                    )}
                </Card>

                {/* CTA - Mobile optimized */}
                <div className="text-center px-4">
                    <Button
                        size="lg"
                        onClick={handleCTAClick}
                        className="w-full sm:w-auto sm:min-w-[300px] min-h-[52px] text-base sm:text-lg"
                    >
                        {page.cta_config?.text || "Get Full Access Now"}
                    </Button>
                    {page.cta_config?.subtext && (
                        <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
                            {page.cta_config.subtext}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <p className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-muted-foreground">
                    Powered by Genie AI
                </p>
            </div>
        </div>
    );
}
