"use client";

/**
 * Step 4: Gamma Presentation
 * Generate visual presentation with theme selection
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Palette, ExternalLink, CheckCircle } from "lucide-react";
import { GAMMA_THEMES } from "@/lib/gamma/types";

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

interface DeckStructure {
    id: string;
    sections: string[];
    total_slides?: number;
    created_at?: string;
}

interface GammaDeck {
    id: string;
    deck_url?: string;
    edit_url?: string;
    status: string;
    theme_name?: string;
}

export default function Step4Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [deckStructures, setDeckStructures] = useState<DeckStructure[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string>("");
    const [selectedTheme, setSelectedTheme] = useState<string>("alpine");
    const [gammaDeck, setGammaDeck] = useState<GammaDeck | null>(null);

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

            // Get deck structures
            const { data: deckData } = await supabase
                .from("deck_structures")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false });

            setDeckStructures(deckData || []);

            if (deckData && deckData.length > 0) {
                setSelectedDeckId(deckData[0].id);
            }

            // Get existing Gamma deck
            const { data: gammaData } = await supabase
                .from("gamma_decks")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (gammaData) {
                setGammaDeck(gammaData);
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
            { projectId, deckId: selectedDeckId, theme: selectedTheme },
            "Generating Gamma deck"
        );

        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            // TODO: Call Gamma API
            // Placeholder - save gamma deck record
            const themeName =
                GAMMA_THEMES.find((t) => t.id === selectedTheme)?.name || selectedTheme;

            const { data: newDeck } = await supabase
                .from("gamma_decks")
                .insert({
                    funnel_project_id: projectId,
                    deck_structure_id: selectedDeckId,
                    user_id: user.id,
                    gamma_session_id: `session_${Date.now()}`,
                    theme_id: selectedTheme,
                    theme_name: themeName,
                    deck_url: `https://gamma.app/docs/demo-${Date.now()}`,
                    edit_url: `https://gamma.app/docs/demo-${Date.now()}/edit`,
                    generation_status: "ready",
                })
                .select()
                .single();

            setGammaDeck(newDeck);
            logger.info({}, "Gamma deck generated");
        } catch (err) {
            logger.error({ error: err }, "Failed to generate Gamma deck");
        } finally {
            setGenerating(false);
        }
    };

    const hasDeckStructure = deckStructures.length > 0;
    const hasGammaDeck = !!gammaDeck;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={4}
                stepTitle="Gamma Presentation"
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
            currentStep={4}
            stepTitle="Gamma Presentation"
            stepDescription="Generate a beautiful visual presentation"
            funnelName={project?.name}
            nextDisabled={!hasGammaDeck}
            nextLabel="Continue to Enrollment Page"
        >
            <div className="space-y-6">
                {/* Dependency Check */}
                {!hasDeckStructure && (
                    <DependencyWarning
                        missingStep={3}
                        missingStepName="Deck Structure"
                        projectId={projectId}
                        message="Create your deck structure before generating the Gamma presentation"
                    />
                )}

                {/* Gamma Deck Generated */}
                {hasGammaDeck ? (
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                            <div className="flex items-center">
                                <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
                                <div>
                                    <CardTitle className="text-green-900">
                                        Presentation Created!
                                    </CardTitle>
                                    <CardDescription className="text-green-700">
                                        Your Gamma presentation is ready
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-green-700">Theme:</span>
                                <Badge variant="success">{gammaDeck.theme_name}</Badge>
                            </div>

                            <div className="flex space-x-3">
                                <a
                                    href={gammaDeck.deck_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        size="sm"
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        View Deck
                                    </Button>
                                </a>
                                <a
                                    href={gammaDeck.edit_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        size="sm"
                                    >
                                        Edit in Gamma
                                    </Button>
                                </a>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerate}
                                className="w-full"
                            >
                                Generate New Variation
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    // Generation Interface
                    hasDeckStructure && (
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                                    Generate Gamma Presentation
                                </CardTitle>
                                <CardDescription>
                                    Choose a theme and create your visual presentation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Select Deck Structure
                                    </label>
                                    <Select
                                        value={selectedDeckId}
                                        onValueChange={setSelectedDeckId}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select a deck" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {deckStructures.map((deck) => (
                                                <SelectItem
                                                    key={deck.id}
                                                    value={deck.id}
                                                >
                                                    {deck.total_slides} slides -{" "}
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

                                <div>
                                    <label className="mb-3 block text-sm font-medium text-gray-700">
                                        <Palette className="mr-2 inline h-4 w-4" />
                                        Choose Theme
                                    </label>
                                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                                        {GAMMA_THEMES.map((theme) => (
                                            <button
                                                key={theme.id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedTheme(theme.id)
                                                }
                                                className={`relative rounded-lg border-2 p-2 text-left transition-all ${
                                                    selectedTheme === theme.id
                                                        ? "border-blue-500 ring-2 ring-blue-200"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            >
                                                <div className="mb-2 h-16 rounded bg-gradient-to-br from-gray-100 to-gray-200"></div>
                                                <p className="text-xs font-medium text-gray-900">
                                                    {theme.name}
                                                </p>
                                                {selectedTheme === theme.id && (
                                                    <div className="absolute right-1 top-1 rounded-full bg-blue-500 p-1">
                                                        <CheckCircle className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating || !selectedDeckId}
                                    className="w-full"
                                >
                                    {generating
                                        ? "Generating Presentation..."
                                        : "Generate Presentation"}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                )}
            </div>
        </StepLayout>
    );
}
