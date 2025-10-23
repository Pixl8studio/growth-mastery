"use client";

/**
 * Step 8: Watch Page
 * AI-generated video landing page
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

interface PitchVideo {
    id: string;
    video_url?: string;
}

interface WatchPage {
    id: string;
    headline: string;
    subheadline?: string;
    cta_config?: {
        text?: string;
    };
}

export default function Step8Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [pitchVideos, setPitchVideos] = useState<PitchVideo[]>([]);
    const [watchPage, setWatchPage] = useState<WatchPage | null>(null);

    const [headline, setHeadline] = useState("");
    const [subheadline, setSubheadline] = useState("");
    const [ctaText, setCtaText] = useState("");

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data: projectData } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            setProject(projectData);

            const { data: videosData } = await supabase
                .from("pitch_videos")
                .select("*")
                .eq("funnel_project_id", projectId);

            setPitchVideos(videosData || []);

            const { data: pageData } = await supabase
                .from("watch_pages")
                .select("*")
                .eq("funnel_project_id", projectId)
                .limit(1)
                .single();

            if (pageData) {
                setWatchPage(pageData);
                setHeadline(pageData.headline);
                setSubheadline(pageData.subheadline || "");
                setCtaText(pageData.cta_config?.text || "");
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

    const handleGenerate = async () => {
        setGenerating(true);

        try {
            setHeadline("Watch This Exclusive Training");
            setSubheadline(
                "Discover the exact framework used by top performers to close more deals"
            );
            setCtaText("Get Full Access Now");
            logger.info({}, "Watch page copy generated");
        } catch (err) {
            logger.error({ error: err }, "Failed to generate watch page copy");
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const pageData = {
                funnel_project_id: projectId,
                user_id: user.id,
                pitch_video_id: pitchVideos[0]?.id,
                headline,
                subheadline,
                content_sections: {},
                cta_config: { text: ctaText },
            };

            if (watchPage) {
                await supabase
                    .from("watch_pages")
                    .update(pageData)
                    .eq("id", watchPage.id);
            } else {
                await supabase.from("watch_pages").insert(pageData);
            }

            logger.info({ projectId }, "Watch page saved");
            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to save watch page");
        } finally {
            setSaving(false);
        }
    };

    const hasVideo = pitchVideos.length > 0;
    const hasWatchPage = !!watchPage;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={8}
                stepTitle="Watch Page"
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
            currentStep={8}
            stepTitle="Watch Page"
            stepDescription="Create your video landing page"
            funnelName={project?.name}
            nextDisabled={!hasWatchPage}
            nextLabel="Continue to Registration Page"
        >
            <div className="space-y-6">
                {!hasVideo && (
                    <DependencyWarning
                        missingStep={7}
                        missingStepName="Upload Video"
                        projectId={projectId}
                        message="Upload your pitch video first"
                    />
                )}

                {hasVideo && (
                    <>
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                                    AI Watch Page Copy
                                </CardTitle>
                                <CardDescription>
                                    Generate compelling copy for your video page
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="w-full"
                                >
                                    {generating
                                        ? "Generating Copy..."
                                        : "Generate Watch Page Copy"}
                                </Button>
                            </CardContent>
                        </Card>

                        {headline && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Watch Page Content</CardTitle>
                                    <CardDescription>
                                        Edit your video landing page copy
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Headline *
                                        </label>
                                        <Input
                                            value={headline}
                                            onChange={(e) =>
                                                setHeadline(e.target.value)
                                            }
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Subheadline
                                        </label>
                                        <Textarea
                                            value={subheadline}
                                            onChange={(e) =>
                                                setSubheadline(e.target.value)
                                            }
                                            className="mt-1"
                                            rows={2}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            CTA Button Text *
                                        </label>
                                        <Input
                                            value={ctaText}
                                            onChange={(e) => setCtaText(e.target.value)}
                                            placeholder="e.g., Get Full Access Now"
                                            className="mt-1"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !headline || !ctaText}
                                        className="w-full"
                                    >
                                        {saving
                                            ? "Saving..."
                                            : hasWatchPage
                                              ? "Update Page"
                                              : "Save Page"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </StepLayout>
    );
}
