"use client";

/**
 * Step 3: Deck Structure
 * AI-generated 55-slide presentation outline
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText } from "lucide-react";
import { FUNNEL_CONFIG } from "@/lib/config";

interface Slide {
    slideNumber: number;
    title: string;
    description: string;
    section: string;
}

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

interface VapiTranscript {
    id: string;
    transcript_text: string;
    created_at: string;
}

interface DeckStructure {
    id: string;
    sections: string[];
    slides: Slide[];
}

export default function Step3Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);
    const [selectedTranscriptId, setSelectedTranscriptId] = useState<string>("");
    const [deckStructure, setDeckStructure] = useState<DeckStructure | null>(null);
    const [slides, setSlides] = useState<Slide[]>([]);

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            // Get project
            const { data: projectData } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            setProject(projectData);

            // Get transcripts
            const { data: transcriptsData } = await supabase
                .from("vapi_transcripts")
                .select("*")
                .eq("funnel_project_id", projectId)
                .eq("call_status", "completed")
                .order("created_at", { ascending: false });

            setTranscripts(transcriptsData || []);

            if (transcriptsData && transcriptsData.length > 0) {
                setSelectedTranscriptId(transcriptsData[0].id);
            }

            // Get existing deck structure
            const { data: deckData } = await supabase
                .from("deck_structures")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (deckData) {
                setDeckStructure(deckData);
                setSlides(deckData.slides || []);
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
        logger.info(
            { projectId, transcriptId: selectedTranscriptId },
            "Generating deck structure"
        );

        try {
            // TODO: Call AI generation API
            // Placeholder - simulate AI generation of 55 slides
            const generatedSlides: Slide[] = [];
            const sections: Array<{ section: string; count: number }> = [
                { section: "hook", count: 8 },
                { section: "problem", count: 10 },
                { section: "agitate", count: 7 },
                { section: "solution", count: 18 },
                { section: "offer", count: 8 },
                { section: "close", count: 4 },
            ];

            let slideNumber = 1;
            sections.forEach(({ section, count }) => {
                for (let i = 0; i < count; i++) {
                    generatedSlides.push({
                        slideNumber,
                        title: `${section.charAt(0).toUpperCase() + section.slice(1)} Slide ${i + 1}`,
                        description: `Content for this ${section} slide goes here...`,
                        section,
                    });
                    slideNumber++;
                }
            });

            setSlides(generatedSlides);
            logger.info({}, "Deck structure generated");
        } catch (err) {
            logger.error({ error: err }, "Failed to generate deck structure");
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

            const deckData = {
                funnel_project_id: projectId,
                user_id: user.id,
                template_type: "55_slide_promo",
                total_slides: slides.length,
                slides,
                sections: calculateSections(slides),
            };

            if (deckStructure) {
                await supabase
                    .from("deck_structures")
                    .update(deckData)
                    .eq("id", deckStructure.id);
            } else {
                await supabase.from("deck_structures").insert(deckData);
            }

            logger.info({ projectId }, "Deck structure saved");
            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to save deck structure");
        } finally {
            setSaving(false);
        }
    };

    const calculateSections = (slideList: Slide[]) => {
        const sections: Record<string, number> = {};
        FUNNEL_CONFIG.deckStructure.sections.forEach((section) => {
            sections[section] = slideList.filter((s) => s.section === section).length;
        });
        return sections;
    };

    const updateSlide = (
        slideNumber: number,
        field: "title" | "description",
        value: string
    ) => {
        setSlides(
            slides.map((s) =>
                s.slideNumber === slideNumber ? { ...s, [field]: value } : s
            )
        );
    };

    const hasTranscript = transcripts.length > 0;
    const hasDeckStructure = !!deckStructure;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={3}
                stepTitle="Deck Structure"
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
            currentStep={3}
            stepTitle="Deck Structure"
            stepDescription="Create a 55-slide presentation outline"
            funnelName={project?.name}
            nextDisabled={!hasDeckStructure}
            nextLabel="Continue to Gamma Presentation"
        >
            <div className="space-y-6">
                {/* Dependency Check */}
                {!hasTranscript && (
                    <DependencyWarning
                        missingStep={1}
                        missingStepName="AI Intake Call"
                        projectId={projectId}
                        message="Complete the AI intake call to generate deck structure"
                    />
                )}

                {/* AI Generation Section */}
                {hasTranscript && (
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                                AI Deck Structure Generation
                            </CardTitle>
                            <CardDescription>
                                Generate a {FUNNEL_CONFIG.deckStructure.totalSlides}
                                -slide presentation outline
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Select Intake Call
                                </label>
                                <Select
                                    value={selectedTranscriptId}
                                    onValueChange={setSelectedTranscriptId}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select a transcript" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {transcripts.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {new Date(
                                                    t.created_at
                                                ).toLocaleDateString()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={generating || !selectedTranscriptId}
                                className="w-full"
                            >
                                {generating
                                    ? "Generating Structure..."
                                    : `Generate ${FUNNEL_CONFIG.deckStructure.totalSlides} Slides`}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Slide Editor */}
                {slides.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center">
                                        <FileText className="mr-2 h-5 w-5 text-gray-600" />
                                        Deck Structure ({slides.length} slides)
                                    </CardTitle>
                                    <CardDescription>
                                        Edit slide titles and descriptions
                                    </CardDescription>
                                </div>
                                <div className="flex space-x-2">
                                    {FUNNEL_CONFIG.deckStructure.sections.map(
                                        (section) => {
                                            const count = slides.filter(
                                                (s) => s.section === section
                                            ).length;
                                            return (
                                                <Badge
                                                    key={section}
                                                    variant="secondary"
                                                >
                                                    {section}: {count}
                                                </Badge>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs
                                defaultValue={FUNNEL_CONFIG.deckStructure.sections[0]}
                            >
                                <TabsList className="mb-4">
                                    {FUNNEL_CONFIG.deckStructure.sections.map(
                                        (section) => (
                                            <TabsTrigger
                                                key={section}
                                                value={section}
                                                className="capitalize"
                                            >
                                                {section}
                                            </TabsTrigger>
                                        )
                                    )}
                                </TabsList>

                                {FUNNEL_CONFIG.deckStructure.sections.map((section) => (
                                    <TabsContent key={section} value={section}>
                                        <div className="max-h-96 space-y-3 overflow-y-auto">
                                            {slides
                                                .filter((s) => s.section === section)
                                                .map((slide) => (
                                                    <div
                                                        key={slide.slideNumber}
                                                        className="rounded-lg border border-gray-200 bg-white p-4"
                                                    >
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                Slide{" "}
                                                                {slide.slideNumber}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="capitalize"
                                                            >
                                                                {section}
                                                            </Badge>
                                                        </div>
                                                        <Input
                                                            value={slide.title}
                                                            onChange={(e) =>
                                                                updateSlide(
                                                                    slide.slideNumber,
                                                                    "title",
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="mb-2"
                                                            placeholder="Slide title"
                                                        />
                                                        <Textarea
                                                            value={slide.description}
                                                            onChange={(e) =>
                                                                updateSlide(
                                                                    slide.slideNumber,
                                                                    "description",
                                                                    e.target.value
                                                                )
                                                            }
                                                            rows={2}
                                                            placeholder="Slide description"
                                                        />
                                                    </div>
                                                ))}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>

                            <div className="mt-6">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full"
                                >
                                    {saving
                                        ? "Saving..."
                                        : hasDeckStructure
                                          ? "Update Deck Structure"
                                          : "Save Deck Structure"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </StepLayout>
    );
}
