"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Edit2 } from "lucide-react";
import type { AdVariation } from "@/types/ads";

interface AdVariationsReviewProps {
    variations: AdVariation[];
    selectedVariations: string[];
    onSelectVariations: (variationIds: string[]) => void;
}

export function AdVariationsReview({
    variations,
    selectedVariations,
    onSelectVariations,
}: AdVariationsReviewProps) {
    const [editingVariation, setEditingVariation] = useState<string | null>(null);
    const [editedVariations, setEditedVariations] = useState<
        Record<string, AdVariation>
    >({});

    const handleToggleVariation = (variationId: string) => {
        const isSelected = selectedVariations.includes(variationId);

        if (isSelected) {
            onSelectVariations(selectedVariations.filter((id) => id !== variationId));
        } else {
            onSelectVariations([...selectedVariations, variationId]);
        }
    };

    const handleEditField = (
        variationId: string,
        field: keyof AdVariation,
        value: any
    ) => {
        const variation = variations.find((v) => v.id === variationId);
        if (!variation) return;

        setEditedVariations({
            ...editedVariations,
            [variationId]: {
                ...(editedVariations[variationId] || variation),
                [field]: value,
            },
        });
    };

    const getVariation = (variationId: string): AdVariation => {
        return (
            editedVariations[variationId] ||
            variations.find((v) => v.id === variationId)!
        );
    };

    if (variations.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No variations generated yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>
                    Select 2-3 variations to test. Click to edit any field before
                    deploying.
                </span>
            </div>

            <div className="grid gap-4">
                {variations.map((variation) => {
                    const currentVariation = getVariation(variation.id);
                    const isSelected = selectedVariations.includes(variation.id);
                    const isEditing = editingVariation === variation.id;

                    return (
                        <Card
                            key={variation.id}
                            className={`transition-colors ${
                                isSelected ? "border-primary bg-primary/5" : ""
                            }`}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() =>
                                            handleToggleVariation(variation.id)
                                        }
                                        className="mt-1"
                                    />

                                    <div className="flex-1 space-y-4">
                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">
                                                    Variation{" "}
                                                    {variation.variation_number}
                                                </h4>
                                                <Badge variant="outline">
                                                    {variation.framework}
                                                </Badge>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    setEditingVariation(
                                                        isEditing ? null : variation.id
                                                    )
                                                }
                                                className="text-sm text-primary hover:underline flex items-center gap-1"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                                {isEditing ? "Done" : "Edit"}
                                            </button>
                                        </div>

                                        {/* Primary Text */}
                                        <div>
                                            <Label className="text-xs text-muted-foreground">
                                                Primary Text (95 chars max)
                                            </Label>
                                            {isEditing ? (
                                                <Textarea
                                                    value={
                                                        currentVariation.primary_text
                                                    }
                                                    onChange={(e) =>
                                                        handleEditField(
                                                            variation.id,
                                                            "primary_text",
                                                            e.target.value.substring(
                                                                0,
                                                                95
                                                            )
                                                        )
                                                    }
                                                    maxLength={95}
                                                    className="mt-1"
                                                    rows={2}
                                                />
                                            ) : (
                                                <p className="mt-1 text-sm">
                                                    {currentVariation.primary_text}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {currentVariation.primary_text.length}
                                                /95
                                            </p>
                                        </div>

                                        {/* Headline */}
                                        <div>
                                            <Label className="text-xs text-muted-foreground">
                                                Headline (40 chars max)
                                            </Label>
                                            {isEditing ? (
                                                <Input
                                                    value={currentVariation.headline}
                                                    onChange={(e) =>
                                                        handleEditField(
                                                            variation.id,
                                                            "headline",
                                                            e.target.value.substring(
                                                                0,
                                                                40
                                                            )
                                                        )
                                                    }
                                                    maxLength={40}
                                                    className="mt-1"
                                                />
                                            ) : (
                                                <p className="mt-1 text-sm font-medium">
                                                    {currentVariation.headline}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {currentVariation.headline.length}/40
                                            </p>
                                        </div>

                                        {/* Link Description */}
                                        <div>
                                            <Label className="text-xs text-muted-foreground">
                                                Link Description (30 chars max)
                                            </Label>
                                            {isEditing ? (
                                                <Input
                                                    value={
                                                        currentVariation.link_description
                                                    }
                                                    onChange={(e) =>
                                                        handleEditField(
                                                            variation.id,
                                                            "link_description",
                                                            e.target.value.substring(
                                                                0,
                                                                30
                                                            )
                                                        )
                                                    }
                                                    maxLength={30}
                                                    className="mt-1"
                                                />
                                            ) : (
                                                <p className="mt-1 text-sm">
                                                    {currentVariation.link_description}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {
                                                    currentVariation.link_description
                                                        .length
                                                }
                                                /30
                                            </p>
                                        </div>

                                        {/* Hook Variations */}
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-2">
                                                Hook Variations
                                            </Label>
                                            <Tabs
                                                defaultValue="long"
                                                className="w-full"
                                            >
                                                <TabsList className="w-full">
                                                    <TabsTrigger
                                                        value="long"
                                                        className="flex-1"
                                                    >
                                                        Long
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="short"
                                                        className="flex-1"
                                                    >
                                                        Short
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="curiosity"
                                                        className="flex-1"
                                                    >
                                                        Curiosity
                                                    </TabsTrigger>
                                                </TabsList>
                                                <TabsContent
                                                    value="long"
                                                    className="mt-2"
                                                >
                                                    <p className="text-sm text-muted-foreground">
                                                        {currentVariation.hooks.long}
                                                    </p>
                                                </TabsContent>
                                                <TabsContent
                                                    value="short"
                                                    className="mt-2"
                                                >
                                                    <p className="text-sm text-muted-foreground">
                                                        {currentVariation.hooks.short}
                                                    </p>
                                                </TabsContent>
                                                <TabsContent
                                                    value="curiosity"
                                                    className="mt-2"
                                                >
                                                    <p className="text-sm text-muted-foreground">
                                                        {
                                                            currentVariation.hooks
                                                                .curiosity
                                                        }
                                                    </p>
                                                </TabsContent>
                                            </Tabs>
                                        </div>

                                        {/* CTA */}
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">
                                                {currentVariation.call_to_action}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                Call-to-Action Button
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {selectedVariations.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-800">
                        ✓ {selectedVariations.length} variation(s) selected for testing
                    </p>
                </div>
            )}
        </div>
    );
}
