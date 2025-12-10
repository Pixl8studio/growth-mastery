"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Palette,
    MessageSquare,
    Users,
    Target,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { BrandWizardResponses } from "@/lib/ai/types";

interface BrandWizardProps {
    onComplete: (responses: BrandWizardResponses) => void;
    onCancel: () => void;
    isGenerating?: boolean;
}

interface WizardStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
    {
        id: "personality",
        title: "Brand Personality",
        description: "How do you want your brand to feel?",
        icon: <Sparkles className="h-5 w-5" />,
    },
    {
        id: "audience",
        title: "Target Audience",
        description: "Who are you speaking to?",
        icon: <Users className="h-5 w-5" />,
    },
    {
        id: "visual",
        title: "Visual Preferences",
        description: "What visual style resonates with you?",
        icon: <Palette className="h-5 w-5" />,
    },
    {
        id: "voice",
        title: "Voice & Tone",
        description: "How should your brand communicate?",
        icon: <MessageSquare className="h-5 w-5" />,
    },
    {
        id: "positioning",
        title: "Market Position",
        description: "Where does your brand fit in the market?",
        icon: <Target className="h-5 w-5" />,
    },
];

const PERSONALITY_TRAITS = [
    {
        value: "innovative",
        label: "Innovative",
        description: "Forward-thinking, cutting-edge",
    },
    {
        value: "trustworthy",
        label: "Trustworthy",
        description: "Reliable, dependable, secure",
    },
    {
        value: "playful",
        label: "Playful",
        description: "Fun, lighthearted, approachable",
    },
    {
        value: "sophisticated",
        label: "Sophisticated",
        description: "Elegant, refined, premium",
    },
    { value: "bold", label: "Bold", description: "Confident, daring, impactful" },
    {
        value: "nurturing",
        label: "Nurturing",
        description: "Caring, supportive, empathetic",
    },
    {
        value: "authoritative",
        label: "Authoritative",
        description: "Expert, knowledgeable, leading",
    },
    {
        value: "authentic",
        label: "Authentic",
        description: "Genuine, transparent, real",
    },
];

const DESIGN_STYLES = [
    {
        value: "modern",
        label: "Modern",
        description: "Clean lines, bold colors, minimalist",
    },
    {
        value: "classic",
        label: "Classic",
        description: "Timeless, traditional, refined",
    },
    {
        value: "minimal",
        label: "Minimal",
        description: "Simple, whitespace-focused, understated",
    },
    {
        value: "bold",
        label: "Bold",
        description: "Strong contrasts, impactful, attention-grabbing",
    },
    { value: "vibrant", label: "Vibrant", description: "Colorful, energetic, dynamic" },
    {
        value: "elegant",
        label: "Elegant",
        description: "Sophisticated, luxurious, refined",
    },
    { value: "playful", label: "Playful", description: "Fun, approachable, creative" },
    {
        value: "professional",
        label: "Professional",
        description: "Corporate, trustworthy, polished",
    },
];

const COLOR_MOODS = [
    {
        value: "warm",
        label: "Warm & Inviting",
        colors: ["#FF6B35", "#F7C59F", "#EFEFEF"],
    },
    { value: "cool", label: "Cool & Calm", colors: ["#2C3E50", "#3498DB", "#ECF0F1"] },
    {
        value: "bold",
        label: "Bold & Energetic",
        colors: ["#E74C3C", "#F39C12", "#1ABC9C"],
    },
    {
        value: "soft",
        label: "Soft & Gentle",
        colors: ["#DDA0DD", "#B0E0E6", "#FFF0F5"],
    },
    {
        value: "natural",
        label: "Natural & Earthy",
        colors: ["#2E8B57", "#8B4513", "#F5DEB3"],
    },
    {
        value: "luxury",
        label: "Luxury & Premium",
        colors: ["#1C1C1C", "#C9A227", "#FFFFFF"],
    },
];

export function BrandWizard({ onComplete, onCancel, isGenerating }: BrandWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [responses, setResponses] = useState<BrandWizardResponses>({});

    const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

    const updateResponse = (key: string, value: string | string[] | number) => {
        setResponses((prev) => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        if (currentStep < WIZARD_STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            onComplete(responses);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const canProceed = () => {
        const step = WIZARD_STEPS[currentStep];
        switch (step.id) {
            case "personality":
                return (
                    Array.isArray(responses.personality_traits) &&
                    responses.personality_traits.length >= 2
                );
            case "audience":
                return responses.audience_description && responses.audience_age_range;
            case "visual":
                return responses.design_style && responses.color_mood;
            case "voice":
                return (
                    responses.formality_level !== undefined &&
                    responses.energy_level !== undefined
                );
            case "positioning":
                return responses.market_position;
            default:
                return true;
        }
    };

    const renderStepContent = () => {
        const step = WIZARD_STEPS[currentStep];

        switch (step.id) {
            case "personality":
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-medium">
                                Select 2-4 personality traits that best describe your
                                brand
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                These will shape your brand&apos;s voice and visual
                                identity
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {PERSONALITY_TRAITS.map((trait) => {
                                const selected =
                                    Array.isArray(responses.personality_traits) &&
                                    responses.personality_traits.includes(trait.value);
                                return (
                                    <div
                                        key={trait.value}
                                        className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                                            selected
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        }`}
                                        onClick={() => {
                                            const current = Array.isArray(
                                                responses.personality_traits
                                            )
                                                ? responses.personality_traits
                                                : [];
                                            if (selected) {
                                                updateResponse(
                                                    "personality_traits",
                                                    current.filter(
                                                        (t) => t !== trait.value
                                                    )
                                                );
                                            } else if (current.length < 4) {
                                                updateResponse("personality_traits", [
                                                    ...current,
                                                    trait.value,
                                                ]);
                                            }
                                        }}
                                    >
                                        <Checkbox checked={selected} />
                                        <div>
                                            <p className="font-medium">{trait.label}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {trait.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            case "audience":
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-base font-medium">
                                Describe your ideal customer in a few sentences
                            </Label>
                            <Textarea
                                placeholder="e.g., Busy professionals aged 30-50 who want to improve their health but struggle to find time for exercise..."
                                value={(responses.audience_description as string) || ""}
                                onChange={(e) =>
                                    updateResponse(
                                        "audience_description",
                                        e.target.value
                                    )
                                }
                                rows={4}
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-base font-medium">
                                Primary age range
                            </Label>
                            <RadioGroup
                                value={(responses.audience_age_range as string) || ""}
                                onValueChange={(value) =>
                                    updateResponse("audience_age_range", value)
                                }
                            >
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        { value: "18-25", label: "18-25 (Gen Z)" },
                                        {
                                            value: "26-35",
                                            label: "26-35 (Millennials)",
                                        },
                                        { value: "36-50", label: "36-50 (Gen X)" },
                                        { value: "51+", label: "51+ (Baby Boomers)" },
                                        { value: "all", label: "All ages" },
                                    ].map((option) => (
                                        <div
                                            key={option.value}
                                            className="flex items-center space-x-2 rounded-lg border p-4"
                                        >
                                            <RadioGroupItem
                                                value={option.value}
                                                id={option.value}
                                            />
                                            <Label htmlFor={option.value}>
                                                {option.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                );

            case "visual":
                return (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Label className="text-base font-medium">
                                Which design style appeals to you most?
                            </Label>
                            <RadioGroup
                                value={(responses.design_style as string) || ""}
                                onValueChange={(value) =>
                                    updateResponse("design_style", value)
                                }
                            >
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {DESIGN_STYLES.map((style) => (
                                        <div
                                            key={style.value}
                                            className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                                                responses.design_style === style.value
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50"
                                            }`}
                                            onClick={() =>
                                                updateResponse(
                                                    "design_style",
                                                    style.value
                                                )
                                            }
                                        >
                                            <RadioGroupItem
                                                value={style.value}
                                                id={style.value}
                                            />
                                            <div>
                                                <Label
                                                    htmlFor={style.value}
                                                    className="font-medium cursor-pointer"
                                                >
                                                    {style.label}
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    {style.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-base font-medium">
                                Which color mood resonates with your brand?
                            </Label>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {COLOR_MOODS.map((mood) => (
                                    <div
                                        key={mood.value}
                                        className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                                            responses.color_mood === mood.value
                                                ? "border-primary ring-2 ring-primary"
                                                : "border-border hover:border-primary/50"
                                        }`}
                                        onClick={() =>
                                            updateResponse("color_mood", mood.value)
                                        }
                                    >
                                        <div className="flex gap-1 mb-2">
                                            {mood.colors.map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="h-8 flex-1 rounded"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                        <p className="font-medium text-center">
                                            {mood.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case "voice":
                return (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label className="text-base font-medium">
                                    Formality Level
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                    {responses.formality_level === undefined
                                        ? "Select"
                                        : (responses.formality_level as number) <= 3
                                          ? "Formal"
                                          : (responses.formality_level as number) >= 7
                                            ? "Casual"
                                            : "Balanced"}
                                </span>
                            </div>
                            <div className="px-2">
                                <Slider
                                    value={[
                                        (responses.formality_level as number) !==
                                        undefined
                                            ? (responses.formality_level as number)
                                            : 5,
                                    ]}
                                    onValueChange={([value]) =>
                                        updateResponse("formality_level", value)
                                    }
                                    min={1}
                                    max={10}
                                    step={1}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Formal</span>
                                    <span>Casual</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label className="text-base font-medium">
                                    Energy Level
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                    {responses.energy_level === undefined
                                        ? "Select"
                                        : (responses.energy_level as number) <= 3
                                          ? "Reserved"
                                          : (responses.energy_level as number) >= 7
                                            ? "Enthusiastic"
                                            : "Balanced"}
                                </span>
                            </div>
                            <div className="px-2">
                                <Slider
                                    value={[
                                        (responses.energy_level as number) !== undefined
                                            ? (responses.energy_level as number)
                                            : 5,
                                    ]}
                                    onValueChange={([value]) =>
                                        updateResponse("energy_level", value)
                                    }
                                    min={1}
                                    max={10}
                                    step={1}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Reserved</span>
                                    <span>Enthusiastic</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label className="text-base font-medium">
                                    Authority Level
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                    {responses.authority_level === undefined
                                        ? "Select"
                                        : (responses.authority_level as number) <= 3
                                          ? "Expert"
                                          : (responses.authority_level as number) >= 7
                                            ? "Peer"
                                            : "Mentor"}
                                </span>
                            </div>
                            <div className="px-2">
                                <Slider
                                    value={[
                                        (responses.authority_level as number) !==
                                        undefined
                                            ? (responses.authority_level as number)
                                            : 5,
                                    ]}
                                    onValueChange={([value]) =>
                                        updateResponse("authority_level", value)
                                    }
                                    min={1}
                                    max={10}
                                    step={1}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Authoritative Expert</span>
                                    <span>Friendly Peer</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "positioning":
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-base font-medium">
                                Where does your brand sit in the market?
                            </Label>
                            <RadioGroup
                                value={(responses.market_position as string) || ""}
                                onValueChange={(value) =>
                                    updateResponse("market_position", value)
                                }
                            >
                                <div className="grid gap-3">
                                    {[
                                        {
                                            value: "premium",
                                            label: "Premium / Luxury",
                                            description:
                                                "High-end positioning with exclusive pricing and boutique experience",
                                        },
                                        {
                                            value: "professional",
                                            label: "Professional / Expert",
                                            description:
                                                "Industry authority with comprehensive solutions",
                                        },
                                        {
                                            value: "accessible",
                                            label: "Accessible / Value",
                                            description:
                                                "Quality offerings at competitive prices for the masses",
                                        },
                                        {
                                            value: "disruptor",
                                            label: "Disruptor / Challenger",
                                            description:
                                                "Innovative approach that challenges industry norms",
                                        },
                                        {
                                            value: "community",
                                            label: "Community / Movement",
                                            description:
                                                "Building a tribe around shared values and mission",
                                        },
                                    ].map((option) => (
                                        <div
                                            key={option.value}
                                            className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                                                responses.market_position ===
                                                option.value
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50"
                                            }`}
                                            onClick={() =>
                                                updateResponse(
                                                    "market_position",
                                                    option.value
                                                )
                                            }
                                        >
                                            <RadioGroupItem
                                                value={option.value}
                                                id={option.value}
                                            />
                                            <div>
                                                <Label
                                                    htmlFor={option.value}
                                                    className="font-medium cursor-pointer"
                                                >
                                                    {option.label}
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    {option.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-base font-medium">
                                What makes you different from competitors? (optional)
                            </Label>
                            <Textarea
                                placeholder="e.g., We're the only company that combines X with Y to deliver Z..."
                                value={(responses.differentiator as string) || ""}
                                onChange={(e) =>
                                    updateResponse("differentiator", e.target.value)
                                }
                                rows={3}
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {WIZARD_STEPS[currentStep].icon}
                        <div>
                            <CardTitle className="text-lg">
                                {WIZARD_STEPS[currentStep].title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {WIZARD_STEPS[currentStep].description}
                            </p>
                        </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        Step {currentStep + 1} of {WIZARD_STEPS.length}
                    </span>
                </div>
                <Progress value={progress} className="mt-4" />
            </CardHeader>
            <CardContent className="pt-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>

                <div className="flex justify-between mt-8 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={currentStep === 0 ? onCancel : handleBack}
                        disabled={isGenerating}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        {currentStep === 0 ? "Cancel" : "Back"}
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={!canProceed() || isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating Guidelines...
                            </>
                        ) : currentStep === WIZARD_STEPS.length - 1 ? (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Brand Guidelines
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
