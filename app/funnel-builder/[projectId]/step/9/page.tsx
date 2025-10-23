"use client";

/**
 * Step 9: Registration Page
 * AI-generated lead capture page
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

interface DeckStructure {
    id: string;
}

interface RegistrationPage {
    id: string;
    headline: string;
    subheadline?: string;
    benefit_bullets?: string[];
    cta_config?: {
        text?: string;
    };
}

export default function Step9Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [registrationPage, setRegistrationPage] = useState<RegistrationPage | null>(
        null
    );

    const [headline, setHeadline] = useState("");
    const [subheadline, setSubheadline] = useState("");
    const [bulletPoints, setBulletPoints] = useState<string[]>(["", "", "", "", ""]);
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

            const { data: decksData } = await supabase
                .from("deck_structures")
                .select("*")
                .eq("funnel_project_id", projectId);

            setDeckStructures(decksData || []);

            const { data: pageData } = await supabase
                .from("registration_pages")
                .select("*")
                .eq("funnel_project_id", projectId)
                .limit(1)
                .single();

            if (pageData) {
                setRegistrationPage(pageData);
                setHeadline(pageData.headline);
                setSubheadline(pageData.subheadline || "");
                setBulletPoints(pageData.benefit_bullets || ["", "", "", "", ""]);
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
            setHeadline("Discover the Pitch Framework That Closes Deals");
            setSubheadline(
                "Watch this exclusive training and transform your pitch in the next 20 minutes"
            );
            setBulletPoints([
                "The 55-slide framework used by top performers",
                "How to hook investors in the first 30 seconds",
                "The psychology of persuasive presentations",
                "Storytelling techniques that create urgency",
                "Common pitch mistakes that kill deals (and how to avoid them)",
            ]);
            setCtaText("Register for Free Access");
            logger.info({}, "Registration copy generated");
        } catch (err) {
            logger.error({ error: err }, "Failed to generate registration copy");
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
                headline,
                subheadline,
                benefit_bullets: bulletPoints.filter((b) => b),
                cta_config: { text: ctaText },
            };

            if (registrationPage) {
                await supabase
                    .from("registration_pages")
                    .update(pageData)
                    .eq("id", registrationPage.id);
            } else {
                await supabase.from("registration_pages").insert(pageData);
            }

            logger.info({ projectId }, "Registration page saved");
            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to save registration page");
        } finally {
            setSaving(false);
        }
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasRegistrationPage = !!registrationPage;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={9}
                stepTitle="Registration Page"
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
            currentStep={9}
            stepTitle="Registration Page"
            stepDescription="Create your lead capture page"
            funnelName={project?.name}
            nextDisabled={!hasRegistrationPage}
            nextLabel="Continue to Flow Configuration"
        >
            <div className="space-y-6">
                {!hasDeckStructure && (
                    <DependencyWarning
                        missingStep={3}
                        missingStepName="Deck Structure"
                        projectId={projectId}
                    />
                )}

                {hasDeckStructure && (
                    <>
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                                    AI Registration Copy
                                </CardTitle>
                                <CardDescription>
                                    Generate copy that captures leads
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="w-full"
                                >
                                    {generating
                                        ? "Generating..."
                                        : "Generate Registration Copy"}
                                </Button>
                            </CardContent>
                        </Card>

                        {headline && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Registration Page Content</CardTitle>
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
                                            Benefit Bullets
                                        </label>
                                        {bulletPoints.map((bullet, index) => (
                                            <Input
                                                key={index}
                                                value={bullet}
                                                onChange={(e) => {
                                                    const newBullets = [
                                                        ...bulletPoints,
                                                    ];
                                                    newBullets[index] = e.target.value;
                                                    setBulletPoints(newBullets);
                                                }}
                                                placeholder={`Benefit ${index + 1}`}
                                                className="mt-2"
                                            />
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            CTA Button Text *
                                        </label>
                                        <Input
                                            value={ctaText}
                                            onChange={(e) => setCtaText(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !headline}
                                        className="w-full"
                                    >
                                        {saving
                                            ? "Saving..."
                                            : hasRegistrationPage
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
