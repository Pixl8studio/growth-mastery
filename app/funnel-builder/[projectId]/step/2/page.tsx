"use client";

/**
 * Step 2: Craft Offer
 * AI-generated offer with pricing, features, and bonuses
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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

interface Offer {
    id: string;
    name: string;
    tagline: string;
    price: number;
    currency: string;
    features: string[];
    bonuses: string[];
    guarantee: string;
}

export default function Step2Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);
    const [selectedTranscriptId, setSelectedTranscriptId] = useState<string>("");
    const [offer, setOffer] = useState<Offer | null>(null);

    // Form state
    const [offerName, setOfferName] = useState("");
    const [tagline, setTagline] = useState("");
    const [price, setPrice] = useState("");
    const [features, setFeatures] = useState<string[]>([""]);
    const [bonuses, setBonuses] = useState<string[]>([""]);
    const [guarantee, setGuarantee] = useState("");

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

            // Get existing offer
            const { data: offerData } = await supabase
                .from("offers")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (offerData) {
                setOffer(offerData);
                setOfferName(offerData.name);
                setTagline(offerData.tagline || "");
                setPrice(offerData.price?.toString() || "");
                setFeatures(offerData.features || [""]);
                setBonuses(offerData.bonuses || [""]);
                setGuarantee(offerData.guarantee || "");
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
            "Generating offer"
        );

        try {
            // TODO: Call AI generation API
            // const response = await fetch('/api/generate/offer', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ projectId, transcriptId: selectedTranscriptId })
            // });
            // const data = await response.json();

            // Placeholder - simulate AI generation
            const generated = {
                name: "Pitch Deck Mastery Program",
                tagline:
                    "Transform your pitch from overlooked to oversubscribed in 30 days",
                price: 997,
                features: [
                    "Complete pitch deck framework with 55-slide template",
                    "AI-powered content generation for every slide",
                    "Video script with exact timing and delivery notes",
                    "1-on-1 pitch review session ($500 value)",
                    "Access to private community of funded founders",
                ],
                bonuses: [
                    "Investor outreach email templates ($197 value)",
                    "Pitch deck examples from 10 funded startups ($297 value)",
                    "Follow-up strategy playbook ($147 value)",
                ],
                guarantee:
                    "30-day money-back guarantee. If you don't see improvement in your pitch within 30 days, get a full refund - no questions asked.",
            };

            setOfferName(generated.name);
            setTagline(generated.tagline);
            setPrice(generated.price.toString());
            setFeatures(generated.features);
            setBonuses(generated.bonuses);
            setGuarantee(generated.guarantee);

            logger.info({}, "Offer generated successfully");
        } catch (err) {
            logger.error({ error: err }, "Failed to generate offer");
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

            const offerData = {
                funnel_project_id: projectId,
                user_id: user.id,
                name: offerName,
                tagline,
                price: parseFloat(price),
                currency: "USD",
                features,
                bonuses,
                guarantee,
            };

            if (offer) {
                // Update existing
                await supabase.from("offers").update(offerData).eq("id", offer.id);
            } else {
                // Create new
                await supabase.from("offers").insert(offerData);
            }

            logger.info({ projectId }, "Offer saved");
            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to save offer");
        } finally {
            setSaving(false);
        }
    };

    const addFeature = () => setFeatures([...features, ""]);
    const removeFeature = (index: number) =>
        setFeatures(features.filter((_, i) => i !== index));
    const updateFeature = (index: number, value: string) => {
        const newFeatures = [...features];
        newFeatures[index] = value;
        setFeatures(newFeatures);
    };

    const addBonus = () => setBonuses([...bonuses, ""]);
    const removeBonus = (index: number) =>
        setBonuses(bonuses.filter((_, i) => i !== index));
    const updateBonus = (index: number, value: string) => {
        const newBonuses = [...bonuses];
        newBonuses[index] = value;
        setBonuses(newBonuses);
    };

    const hasTranscript = transcripts.length > 0;
    const hasOffer = !!offer;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={2}
                stepTitle="Craft Offer"
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
            currentStep={2}
            stepTitle="Craft Offer"
            stepDescription="Create a compelling offer with AI-generated pricing and features"
            funnelName={project?.name}
            nextDisabled={!hasOffer}
            nextLabel="Continue to Deck Structure"
        >
            <div className="space-y-6">
                {/* Dependency Check */}
                {!hasTranscript && (
                    <DependencyWarning
                        missingStep={1}
                        missingStepName="AI Intake Call"
                        projectId={projectId}
                        message="Complete the AI intake call first to gather information for offer generation"
                    />
                )}

                {/* AI Generation Section */}
                {hasTranscript && (
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                                AI Offer Generation
                            </CardTitle>
                            <CardDescription>
                                Generate a compelling offer based on your intake call
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Select Intake Call</Label>
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
                                                ).toLocaleDateString()}{" "}
                                                -{" "}
                                                {Math.floor(
                                                    (t.transcript_text?.length || 0) /
                                                        100
                                                )}{" "}
                                                words
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
                                    ? "Generating Offer..."
                                    : "Generate Offer with AI"}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Offer Editor */}
                {(offerName || hasOffer) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                                Offer Details
                            </CardTitle>
                            <CardDescription>
                                Edit and refine your offer
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="offerName">Offer Name *</Label>
                                <Input
                                    id="offerName"
                                    value={offerName}
                                    onChange={(e) => setOfferName(e.target.value)}
                                    placeholder="e.g., Pitch Deck Mastery Program"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="tagline">Tagline</Label>
                                <Input
                                    id="tagline"
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
                                    placeholder="One-line value proposition"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="price">Price (USD) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="997"
                                    className="mt-1"
                                />
                                {price && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        Display price:{" "}
                                        {formatCurrency(parseFloat(price))}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Features *</Label>
                                <div className="mt-2 space-y-2">
                                    {features.map((feature, index) => (
                                        <div key={index} className="flex space-x-2">
                                            <Input
                                                value={feature}
                                                onChange={(e) =>
                                                    updateFeature(index, e.target.value)
                                                }
                                                placeholder={`Feature ${index + 1}`}
                                            />
                                            {features.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeFeature(index)}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addFeature}
                                    className="mt-2"
                                >
                                    Add Feature
                                </Button>
                            </div>

                            <div>
                                <Label>Bonuses</Label>
                                <div className="mt-2 space-y-2">
                                    {bonuses.map((bonus, index) => (
                                        <div key={index} className="flex space-x-2">
                                            <Input
                                                value={bonus}
                                                onChange={(e) =>
                                                    updateBonus(index, e.target.value)
                                                }
                                                placeholder={`Bonus ${index + 1} (include value)`}
                                            />
                                            {bonuses.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeBonus(index)}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addBonus}
                                    className="mt-2"
                                >
                                    Add Bonus
                                </Button>
                            </div>

                            <div>
                                <Label htmlFor="guarantee">Guarantee</Label>
                                <Textarea
                                    id="guarantee"
                                    value={guarantee}
                                    onChange={(e) => setGuarantee(e.target.value)}
                                    placeholder="e.g., 30-day money-back guarantee..."
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={saving || !offerName || !price}
                                className="w-full"
                            >
                                {saving
                                    ? "Saving..."
                                    : hasOffer
                                      ? "Update Offer"
                                      : "Save Offer"}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Offer Preview */}
                {hasOffer && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Offer Preview</CardTitle>
                            <CardDescription>
                                How your offer will appear
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {offerName}
                                    </h3>
                                    {tagline && (
                                        <p className="mt-1 text-gray-600">{tagline}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-blue-600">
                                        {formatCurrency(parseFloat(price))}
                                    </p>
                                </div>
                                {features.filter((f) => f).length > 0 && (
                                    <div>
                                        <p className="mb-2 font-semibold text-gray-900">
                                            What's Included:
                                        </p>
                                        <ul className="space-y-1">
                                            {features
                                                .filter((f) => f)
                                                .map((feature, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start text-sm text-gray-700"
                                                    >
                                                        <Badge
                                                            variant="success"
                                                            className="mr-2 mt-0.5"
                                                        >
                                                            ✓
                                                        </Badge>
                                                        {feature}
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )}
                                {bonuses.filter((b) => b).length > 0 && (
                                    <div>
                                        <p className="mb-2 font-semibold text-gray-900">
                                            Bonuses:
                                        </p>
                                        <ul className="space-y-1">
                                            {bonuses
                                                .filter((b) => b)
                                                .map((bonus, index) => (
                                                    <li
                                                        key={index}
                                                        className="text-sm text-gray-700"
                                                    >
                                                        • {bonus}
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )}
                                {guarantee && (
                                    <div className="rounded-md bg-green-50 p-4">
                                        <p className="text-sm font-semibold text-green-900">
                                            Our Guarantee:
                                        </p>
                                        <p className="mt-1 text-sm text-green-800">
                                            {guarantee}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </StepLayout>
    );
}
