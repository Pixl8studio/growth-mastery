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
            <div className="mx-auto max-w-5xl px-4 py-16">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="mb-4 text-4xl font-bold text-foreground">
                        {page.headline}
                    </h1>
                    {page.subheadline && (
                        <p className="text-xl text-foreground">{page.subheadline}</p>
                    )}
                </div>

                {/* Video Player */}
                <Card className="mb-8 overflow-hidden">
                    {video?.video_url ? (
                        <div className="relative aspect-video bg-black">
                            <video
                                controls
                                className="h-full w-full"
                                src={video.video_url}
                                poster={video.thumbnail_url}
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    ) : (
                        <div className="flex aspect-video items-center justify-center bg-gray-200">
                            <p className="text-muted-foreground">
                                Video player will appear here
                            </p>
                        </div>
                    )}
                </Card>

                {/* CTA */}
                <div className="text-center">
                    <Button
                        size="lg"
                        onClick={handleCTAClick}
                        className="min-w-[300px]"
                    >
                        {page.cta_config?.text || "Get Full Access Now"}
                    </Button>
                    {page.cta_config?.subtext && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            {page.cta_config.subtext}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <p className="mt-12 text-center text-sm text-muted-foreground">
                    Powered by Genie AI
                </p>
            </div>
        </div>
    );
}
