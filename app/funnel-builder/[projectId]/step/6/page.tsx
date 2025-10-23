"use client";

/**
 * Step 6: Talk Track
 * AI-generated video script with slide timings
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sparkles, FileText, Clock } from "lucide-react";

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

interface GammaDeck {
    id: string;
    deck_url?: string;
    theme_name?: string;
    created_at?: string;
}

interface TalkTrack {
    id: string;
    script: string;
}

export default function Step6Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [gammaDecks, setGammaDecks] = useState<GammaDeck[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string>("");
    const [talkTrack, setTalkTrack] = useState<TalkTrack | null>(null);
    const [script, setScript] = useState("");

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data: projectData } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            setProject(projectData);

            const { data: decksData } = await supabase
                .from("gamma_decks")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false });

            setGammaDecks(decksData || []);

            if (decksData && decksData.length > 0) {
                setSelectedDeckId(decksData[0].id);
            }

            const { data: trackData } = await supabase
                .from("talk_tracks")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (trackData) {
                setTalkTrack(trackData);
                setScript(trackData.content);
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
            // TODO: Call AI generation
            setScript(
                "Generated talk track script goes here... This would be a 15-20 minute script for your pitch video, generated based on your deck structure."
            );
            logger.info({}, "Talk track generated");
        } catch (err) {
            logger.error({ error: err }, "Failed to generate talk track");
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

            const trackData = {
                funnel_project_id: projectId,
                user_id: user.id,
                deck_structure_id: selectedDeckId,
                content: script,
                slide_timings: [],
                total_duration: 900,
            };

            if (talkTrack) {
                await supabase
                    .from("talk_tracks")
                    .update(trackData)
                    .eq("id", talkTrack.id);
            } else {
                await supabase.from("talk_tracks").insert(trackData);
            }

            logger.info({ projectId }, "Talk track saved");
            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to save talk track");
        } finally {
            setSaving(false);
        }
    };

    const hasGammaDeck = gammaDecks.length > 0;
    const hasTalkTrack = !!talkTrack;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={6}
                stepTitle="Talk Track"
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
            currentStep={6}
            stepTitle="Talk Track"
            stepDescription="Generate your video script with AI"
            funnelName={project?.name}
            nextDisabled={!hasTalkTrack}
            nextLabel="Continue to Upload Video"
        >
            <div className="space-y-6">
                {!hasGammaDeck && (
                    <DependencyWarning
                        missingStep={4}
                        missingStepName="Gamma Presentation"
                        projectId={projectId}
                        message="Create your Gamma presentation first"
                    />
                )}

                {hasGammaDeck && (
                    <>
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                                    AI Talk Track Generation
                                </CardTitle>
                                <CardDescription>
                                    Generate a 15-20 minute video script
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Select Gamma Deck
                                    </label>
                                    <Select
                                        value={selectedDeckId}
                                        onValueChange={setSelectedDeckId}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {gammaDecks.map((deck) => (
                                                <SelectItem
                                                    key={deck.id}
                                                    value={deck.id}
                                                >
                                                    {deck.theme_name} -{" "}
                                                    {deck.created_at
                                                        ? new Date(
                                                              deck.created_at
                                                          ).toLocaleDateString()
                                                        : "N/A"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating || !selectedDeckId}
                                    className="w-full"
                                >
                                    {generating
                                        ? "Generating Script..."
                                        : "Generate Talk Track"}
                                </Button>
                            </CardContent>
                        </Card>

                        {script && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <FileText className="mr-2 h-5 w-5 text-gray-600" />
                                        Video Script
                                    </CardTitle>
                                    <CardDescription>
                                        <div className="flex items-center">
                                            <Clock className="mr-1 h-4 w-4" />
                                            Estimated duration: 15-20 minutes
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        value={script}
                                        onChange={(e) => setScript(e.target.value)}
                                        rows={20}
                                        className="font-mono text-sm"
                                    />

                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !script}
                                        className="mt-4 w-full"
                                    >
                                        {saving
                                            ? "Saving..."
                                            : hasTalkTrack
                                              ? "Update Talk Track"
                                              : "Save Talk Track"}
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
