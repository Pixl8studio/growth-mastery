"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";

interface Slide {
    slideNumber: number;
    title: string;
    description: string;
    section: string;
}

interface DeckStructureEditorProps {
    initialSlides: Slide[];
    onSave?: (slides: Slide[]) => Promise<void>;
    readOnly?: boolean;
}

export function DeckStructureEditor({
    initialSlides,
    onSave,
    readOnly = false,
}: DeckStructureEditorProps) {
    const [slides, setSlides] = useState<Slide[]>(initialSlides);
    const [editingSlide, setEditingSlide] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const handleEditSlide = (index: number, field: keyof Slide, value: string) => {
        const newSlides = [...slides];
        newSlides[index] = {
            ...newSlides[index],
            [field]: value,
        };
        setSlides(newSlides);
    };

    const handleSave = async () => {
        if (!onSave || readOnly) return;

        setSaving(true);
        try {
            await onSave(slides);
            logger.info(
                { slideCount: slides.length },
                "Deck structure saved successfully"
            );
            setEditingSlide(null);
        } catch (error) {
            logger.error({ error }, "Failed to save deck structure");
            alert("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Group slides by section
    const groupedSlides = slides.reduce(
        (acc, slide) => {
            const section = slide.section || "other";
            if (!acc[section]) {
                acc[section] = [];
            }
            acc[section].push(slide);
            return acc;
        },
        {} as Record<string, Slide[]>
    );

    // Section names for 15-30-15 webinar framework
    const sectionNames: Record<string, string> = {
        connect: "🤝 Connect (Slides 1-15)",
        teach: "📚 Teach (Slides 16-45)",
        invite: "🎯 Invite (Slides 46-60)",
        // Legacy section names for backward compatibility
        hook: "🎣 Hook",
        problem: "⚠️ Problem",
        agitate: "🔥 Agitate",
        solution: "✅ Solution",
        offer: "💰 Offer",
        close: "🎯 Close",
        other: "📄 Other",
    };

    const sectionOrder = [
        "connect",
        "teach",
        "invite",
        // Legacy sections for backward compatibility
        "hook",
        "problem",
        "agitate",
        "solution",
        "offer",
        "close",
        "other",
    ];

    return (
        <div className="space-y-6">
            {/* Save Button - Sticky at top */}
            {!readOnly && (
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-soft">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {slides.length} slides •{" "}
                            {editingSlide !== null ? "Editing" : "View mode"}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {editingSlide !== null && (
                            <Button
                                variant="outline"
                                onClick={() => setEditingSlide(null)}
                                disabled={saving}
                            >
                                Cancel Edit
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving || !onSave}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Slides grouped by section */}
            {sectionOrder.map((sectionKey) => {
                const sectionSlides = groupedSlides[sectionKey];
                if (!sectionSlides || sectionSlides.length === 0) return null;

                return (
                    <div key={sectionKey} className="space-y-3">
                        {/* Section Header */}
                        <div className="sticky top-20 z-[5] rounded-lg border-l-4 border-primary bg-card px-4 py-3 shadow-sm">
                            <h3 className="text-lg font-semibold text-foreground">
                                {sectionNames[sectionKey]} ({sectionSlides.length}{" "}
                                slides)
                            </h3>
                        </div>

                        {/* Slides in this section */}
                        {sectionSlides.map((slide) => {
                            const slideIndex = slides.findIndex(
                                (s) => s.slideNumber === slide.slideNumber
                            );
                            const isEditing = editingSlide === slideIndex;

                            return (
                                <div
                                    key={slide.slideNumber}
                                    className={`rounded-lg border p-4 transition-all ${
                                        isEditing
                                            ? "border-primary bg-primary/5 shadow-md"
                                            : "border-border bg-card hover:border-border"
                                    }`}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            Slide {slide.slideNumber}
                                        </span>
                                        {!readOnly && !isEditing && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setEditingSlide(slideIndex)
                                                }
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-foreground">
                                                    Slide Title
                                                </label>
                                                <input
                                                    type="text"
                                                    value={slide.title}
                                                    onChange={(e) =>
                                                        handleEditSlide(
                                                            slideIndex,
                                                            "title",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-border bg-card px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-foreground">
                                                    Slide Description
                                                </label>
                                                <textarea
                                                    value={slide.description}
                                                    onChange={(e) =>
                                                        handleEditSlide(
                                                            slideIndex,
                                                            "description",
                                                            e.target.value
                                                        )
                                                    }
                                                    rows={3}
                                                    className="w-full rounded-lg border border-border bg-card px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        setEditingSlide(null)
                                                    }
                                                    variant="outline"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <h4 className="mb-2 text-lg font-semibold text-foreground">
                                                {slide.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">
                                                {slide.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
