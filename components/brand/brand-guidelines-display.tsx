"use client";

import { useState } from "react";
import {
    Palette,
    MessageSquare,
    FileText,
    Layout,
    Copy,
    Check,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type {
    BrandVoice,
    MessagingFramework,
    BrandApplication,
    BrandFonts,
    DesignPreferences,
} from "@/lib/ai/types";

interface BrandGuidelinesDisplayProps {
    guidelines: {
        // Visual Identity
        primary_color: string;
        secondary_color: string | null;
        accent_color: string | null;
        background_color: string;
        text_color: string;
        design_style: string | null;
        personality_traits: {
            tone?: string;
            mood?: string;
            energy?: string;
            values?: string[];
        };
        fonts?: BrandFonts;
        design_preferences?: DesignPreferences;
        // Brand Voice & Tone
        brand_voice?: BrandVoice;
        // Messaging Framework
        messaging_framework?: MessagingFramework;
        // Brand Application
        brand_application?: BrandApplication;
        // Metadata
        brand_name?: string | null;
    };
    onRegenerate?: (section: string) => void;
    onEdit?: (section: string, field: string, value: unknown) => void;
    isRegenerating?: string | null;
}

function ColorSwatch({
    color,
    label,
    onCopy,
}: {
    color: string;
    label: string;
    onCopy: (text: string) => void;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        onCopy(color);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className="h-16 w-16 rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: color }}
                onClick={handleCopy}
                title="Click to copy"
            />
            <span className="text-sm font-medium">{label}</span>
            <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
                {copied ? (
                    <>
                        <Check className="h-3 w-3" />
                        Copied
                    </>
                ) : (
                    <>
                        <Copy className="h-3 w-3" />
                        {color}
                    </>
                )}
            </button>
        </div>
    );
}

function ToneSpectrumDisplay({
    name,
    lowEnd,
    highEnd,
    position,
    description,
}: {
    name: string;
    lowEnd: string;
    highEnd: string;
    position: number;
    description: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{lowEnd}</span>
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">{highEnd}</span>
            </div>
            <div className="relative">
                <Progress value={position * 10} className="h-2" />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow"
                    style={{ left: `calc(${position * 10}% - 8px)` }}
                />
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    );
}

export function BrandGuidelinesDisplay({
    guidelines,
    onRegenerate,
    onEdit: _onEdit,
    isRegenerating,
}: BrandGuidelinesDisplayProps) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const hasComprehensiveGuidelines =
        guidelines.brand_voice || guidelines.messaging_framework;

    return (
        <div className="space-y-4">
            <Accordion
                type="multiple"
                defaultValue={["visual-identity"]}
                className="w-full"
            >
                {/* Section 1: Visual Identity */}
                <AccordionItem value="visual-identity">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Palette className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold">Visual Identity</h3>
                                <p className="text-sm text-muted-foreground font-normal">
                                    Colors, fonts, and design preferences
                                </p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 pt-4">
                            {/* Color Palette */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium">Color Palette</h4>
                                    {onRegenerate && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onRegenerate("colors")}
                                            disabled={isRegenerating === "colors"}
                                        >
                                            <RefreshCw
                                                className={`h-4 w-4 mr-2 ${isRegenerating === "colors" ? "animate-spin" : ""}`}
                                            />
                                            Regenerate
                                        </Button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                                    <ColorSwatch
                                        color={guidelines.primary_color}
                                        label="Primary"
                                        onCopy={copyToClipboard}
                                    />
                                    {guidelines.secondary_color && (
                                        <ColorSwatch
                                            color={guidelines.secondary_color}
                                            label="Secondary"
                                            onCopy={copyToClipboard}
                                        />
                                    )}
                                    {guidelines.accent_color && (
                                        <ColorSwatch
                                            color={guidelines.accent_color}
                                            label="Accent"
                                            onCopy={copyToClipboard}
                                        />
                                    )}
                                    <ColorSwatch
                                        color={guidelines.background_color}
                                        label="Background"
                                        onCopy={copyToClipboard}
                                    />
                                    <ColorSwatch
                                        color={guidelines.text_color}
                                        label="Text"
                                        onCopy={copyToClipboard}
                                    />
                                </div>
                            </div>

                            {/* Typography */}
                            {guidelines.fonts && (
                                <div>
                                    <h4 className="font-medium mb-4">Typography</h4>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Card>
                                            <CardContent className="pt-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Primary Font (Headings)
                                                </p>
                                                <p
                                                    className="text-2xl font-bold mt-1"
                                                    style={{
                                                        fontFamily:
                                                            guidelines.fonts
                                                                .primary_font,
                                                    }}
                                                >
                                                    {guidelines.fonts.primary_font}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Secondary Font (Body)
                                                </p>
                                                <p
                                                    className="text-xl mt-1"
                                                    style={{
                                                        fontFamily:
                                                            guidelines.fonts
                                                                .secondary_font,
                                                    }}
                                                >
                                                    {guidelines.fonts.secondary_font}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* Design Style & Preferences */}
                            <div>
                                <h4 className="font-medium mb-4">Design Style</h4>
                                <div className="flex flex-wrap gap-2">
                                    {guidelines.design_style && (
                                        <Badge variant="secondary" className="text-sm">
                                            {guidelines.design_style}
                                        </Badge>
                                    )}
                                    {guidelines.personality_traits?.tone && (
                                        <Badge variant="outline" className="text-sm">
                                            {guidelines.personality_traits.tone}
                                        </Badge>
                                    )}
                                    {guidelines.personality_traits?.mood && (
                                        <Badge variant="outline" className="text-sm">
                                            {guidelines.personality_traits.mood}
                                        </Badge>
                                    )}
                                    {guidelines.personality_traits?.energy && (
                                        <Badge variant="outline" className="text-sm">
                                            {guidelines.personality_traits.energy}
                                        </Badge>
                                    )}
                                </div>
                                {guidelines.personality_traits?.values &&
                                    guidelines.personality_traits.values.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Brand Values
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {guidelines.personality_traits.values.map(
                                                    (value, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="outline"
                                                        >
                                                            {value}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {/* Design Preferences */}
                            {guidelines.design_preferences && (
                                <div>
                                    <h4 className="font-medium mb-4">
                                        Design Preferences
                                    </h4>
                                    <div className="grid gap-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Imagery Style
                                            </span>
                                            <span>
                                                {
                                                    guidelines.design_preferences
                                                        .imagery_style
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Icon Style
                                            </span>
                                            <span>
                                                {
                                                    guidelines.design_preferences
                                                        .icon_style
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Visual Density
                                            </span>
                                            <span>
                                                {
                                                    guidelines.design_preferences
                                                        .visual_density
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Section 2: Brand Voice & Tone */}
                {guidelines.brand_voice && (
                    <AccordionItem value="brand-voice">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <MessageSquare className="h-5 w-5 text-purple-500" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">
                                        Brand Voice & Tone
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-normal">
                                        Personality, archetypes, and writing guidelines
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-6 pt-4">
                                {/* Personality Descriptors */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Personality Descriptors
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {guidelines.brand_voice.personality_descriptors.map(
                                            (descriptor, i) => (
                                                <Badge key={i} className="text-sm">
                                                    {descriptor}
                                                </Badge>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Brand Archetypes */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Brand Archetypes
                                    </h4>
                                    <Card>
                                        <CardContent className="pt-4">
                                            <div className="flex gap-4 mb-3">
                                                <Badge variant="secondary">
                                                    Primary:{" "}
                                                    {
                                                        guidelines.brand_voice
                                                            .archetypes.primary
                                                    }
                                                </Badge>
                                                <Badge variant="outline">
                                                    Secondary:{" "}
                                                    {
                                                        guidelines.brand_voice
                                                            .archetypes.secondary
                                                    }
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {
                                                    guidelines.brand_voice.archetypes
                                                        .description
                                                }
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Tone Spectrums */}
                                <div>
                                    <h4 className="font-medium mb-4">Tone Spectrums</h4>
                                    <div className="space-y-6">
                                        {guidelines.brand_voice.tone_spectrums.map(
                                            (spectrum, i) => (
                                                <ToneSpectrumDisplay
                                                    key={i}
                                                    name={spectrum.name}
                                                    lowEnd={spectrum.low_end}
                                                    highEnd={spectrum.high_end}
                                                    position={spectrum.position}
                                                    description={spectrum.description}
                                                />
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Writing Guidelines */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Writing Guidelines
                                    </h4>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm text-green-700 dark:text-green-400">
                                                    Do
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="text-sm space-y-2">
                                                    {guidelines.brand_voice.writing_guidelines.do.map(
                                                        (item, i) => (
                                                            <li
                                                                key={i}
                                                                className="flex gap-2"
                                                            >
                                                                <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                                                {item}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm text-red-700 dark:text-red-400">
                                                    Don&apos;t
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="text-sm space-y-2">
                                                    {guidelines.brand_voice.writing_guidelines.dont.map(
                                                        (item, i) => (
                                                            <li
                                                                key={i}
                                                                className="flex gap-2"
                                                            >
                                                                <span className="text-red-600 shrink-0">
                                                                    ✕
                                                                </span>
                                                                {item}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Word Lists */}
                                <div>
                                    <h4 className="font-medium mb-3">Word Lists</h4>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div>
                                            <p className="text-sm font-medium text-green-600 mb-2">
                                                Power Words
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {guidelines.brand_voice.word_lists.power_words.map(
                                                    (word, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {word}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-red-600 mb-2">
                                                Words to Avoid
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {guidelines.brand_voice.word_lists.words_to_avoid.map(
                                                    (word, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="outline"
                                                            className="text-xs text-red-600 border-red-200"
                                                        >
                                                            {word}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-blue-600 mb-2">
                                                Industry Terms
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {guidelines.brand_voice.word_lists.industry_terms.map(
                                                    (term, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {term}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* Section 3: Messaging Framework */}
                {guidelines.messaging_framework && (
                    <AccordionItem value="messaging">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <FileText className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">
                                        Messaging Framework
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-normal">
                                        Positioning, tagline, and value propositions
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-6 pt-4">
                                {/* Positioning Statement */}
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Positioning Statement
                                        </p>
                                        <p className="text-lg font-medium">
                                            {
                                                guidelines.messaging_framework
                                                    .positioning_statement
                                            }
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Tagline */}
                                <div>
                                    <h4 className="font-medium mb-2">Tagline</h4>
                                    <p className="text-2xl font-bold text-primary">
                                        &ldquo;{guidelines.messaging_framework.tagline}
                                        &rdquo;
                                    </p>
                                </div>

                                {/* Elevator Pitch */}
                                <div>
                                    <h4 className="font-medium mb-2">Elevator Pitch</h4>
                                    <Card>
                                        <CardContent className="pt-4">
                                            <p className="text-sm">
                                                {
                                                    guidelines.messaging_framework
                                                        .elevator_pitch
                                                }
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Value Propositions */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Value Propositions
                                    </h4>
                                    <div className="grid gap-4">
                                        {guidelines.messaging_framework.value_propositions.map(
                                            (vp, i) => (
                                                <Card key={i}>
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base">
                                                            {vp.headline}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-muted-foreground mb-3">
                                                            {vp.description}
                                                        </p>
                                                        <ul className="text-sm space-y-1">
                                                            {vp.supporting_points.map(
                                                                (point, j) => (
                                                                    <li
                                                                        key={j}
                                                                        className="flex gap-2"
                                                                    >
                                                                        <span className="text-primary">
                                                                            •
                                                                        </span>
                                                                        {point}
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </CardContent>
                                                </Card>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Customer Journey Messages */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Customer Journey Messages
                                    </h4>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        {guidelines.messaging_framework.customer_journey_messages.map(
                                            (msg, i) => (
                                                <Card key={i}>
                                                    <CardHeader className="pb-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="w-fit capitalize"
                                                        >
                                                            {msg.stage}
                                                        </Badge>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm font-medium mb-2">
                                                            {msg.primary_message}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mb-2">
                                                            Emotion:{" "}
                                                            {msg.emotional_trigger}
                                                        </p>
                                                        <p className="text-xs text-primary">
                                                            CTA: {msg.call_to_action}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Key Differentiators */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Key Differentiators
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {guidelines.messaging_framework.key_differentiators.map(
                                            (diff, i) => (
                                                <Badge key={i} variant="secondary">
                                                    {diff}
                                                </Badge>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* Section 4: Brand Application */}
                {guidelines.brand_application && (
                    <AccordionItem value="application">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-teal-500/10">
                                    <Layout className="h-5 w-5 text-teal-500" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">Brand Application</h3>
                                    <p className="text-sm text-muted-foreground font-normal">
                                        Logo usage, photography, icons, and guidelines
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-6 pt-4">
                                {/* Logo Usage */}
                                <div>
                                    <h4 className="font-medium mb-3">Logo Usage</h4>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                Clear Space
                                            </p>
                                            <p className="text-sm">
                                                {
                                                    guidelines.brand_application
                                                        .logo_usage.clear_space
                                                }
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                Minimum Size
                                            </p>
                                            <p className="text-sm">
                                                {
                                                    guidelines.brand_application
                                                        .logo_usage.minimum_size
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Placement Guidelines
                                        </p>
                                        <ul className="text-sm space-y-1">
                                            {guidelines.brand_application.logo_usage.placement_guidelines.map(
                                                (guideline, i) => (
                                                    <li key={i}>• {guideline}</li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Photography Style */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Photography Style
                                    </h4>
                                    <Card>
                                        <CardContent className="pt-4">
                                            <p className="text-sm mb-3">
                                                {
                                                    guidelines.brand_application
                                                        .photography_style.style
                                                }
                                            </p>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">
                                                        Subjects
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {guidelines.brand_application.photography_style.subjects.map(
                                                            (subject, i) => (
                                                                <Badge
                                                                    key={i}
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {subject}
                                                                </Badge>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">
                                                        Color Treatment
                                                    </p>
                                                    <p className="text-sm">
                                                        {
                                                            guidelines.brand_application
                                                                .photography_style
                                                                .color_treatment
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Icon Style */}
                                <div>
                                    <h4 className="font-medium mb-3">Icon Style</h4>
                                    <div className="grid gap-4 sm:grid-cols-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">
                                                Style
                                            </p>
                                            <p>
                                                {
                                                    guidelines.brand_application
                                                        .icon_style.style
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Stroke
                                            </p>
                                            <p>
                                                {
                                                    guidelines.brand_application
                                                        .icon_style.stroke_weight
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Corners
                                            </p>
                                            <p>
                                                {
                                                    guidelines.brand_application
                                                        .icon_style.corner_style
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Fill
                                            </p>
                                            <p>
                                                {
                                                    guidelines.brand_application
                                                        .icon_style.fill_style
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Do's and Don'ts */}
                                <div>
                                    <h4 className="font-medium mb-3">
                                        Application Do&apos;s and Don&apos;ts
                                    </h4>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm text-green-700 dark:text-green-400">
                                                    Do
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="text-sm space-y-2">
                                                    {guidelines.brand_application.dos_and_donts.dos.map(
                                                        (item, i) => (
                                                            <li
                                                                key={i}
                                                                className="flex gap-2"
                                                            >
                                                                <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                                                {item}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm text-red-700 dark:text-red-400">
                                                    Don&apos;t
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="text-sm space-y-2">
                                                    {guidelines.brand_application.dos_and_donts.donts.map(
                                                        (item, i) => (
                                                            <li
                                                                key={i}
                                                                className="flex gap-2"
                                                            >
                                                                <span className="text-red-600 shrink-0">
                                                                    ✕
                                                                </span>
                                                                {item}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}
            </Accordion>

            {/* Show message if only basic guidelines are available */}
            {!hasComprehensiveGuidelines && (
                <Card className="border-dashed">
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground mb-4">
                            Generate comprehensive brand guidelines to unlock Voice &
                            Tone, Messaging Framework, and Brand Application sections.
                        </p>
                        {onRegenerate && (
                            <Button
                                variant="outline"
                                onClick={() => onRegenerate("comprehensive")}
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Full Guidelines
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
