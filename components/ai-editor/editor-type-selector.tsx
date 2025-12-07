"use client";

/**
 * Editor Type Selector
 * Allows users to choose between v1 (Visual) and v2 (AI) editor
 */

import { cn } from "@/lib/utils";
import { Sparkles, Pencil } from "lucide-react";

interface EditorTypeSelectorProps {
    selectedType: "v1" | "v2";
    onSelect: (type: "v1" | "v2") => void;
    pageType: "registration" | "watch" | "enrollment";
}

export function EditorTypeSelector({
    selectedType,
    onSelect,
    pageType,
}: EditorTypeSelectorProps) {
    const pageTypeLabels = {
        registration: "Registration",
        watch: "Watch",
        enrollment: "Enrollment",
    };

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <label className="mb-3 block text-sm font-medium text-foreground">
                Choose Editor Type
            </label>
            <div className="grid grid-cols-2 gap-3">
                {/* V1 - Visual Editor */}
                <button
                    type="button"
                    onClick={() => onSelect("v1")}
                    className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                        selectedType === "v1"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                    )}
                >
                    <div
                        className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            selectedType === "v1"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        <Pencil className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-foreground">
                            Visual Editor (v1)
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Drag & drop blocks, inline editing
                        </p>
                    </div>
                </button>

                {/* V2 - AI Editor */}
                <button
                    type="button"
                    onClick={() => onSelect("v2")}
                    className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                        selectedType === "v2"
                            ? "border-violet-500 bg-violet-500/5"
                            : "border-border hover:border-violet-500/50"
                    )}
                >
                    <div
                        className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            selectedType === "v2"
                                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-foreground">AI Editor (v2)</p>
                        <p className="text-xs text-muted-foreground">
                            Chat to edit, premium pages
                        </p>
                    </div>
                    {/* New badge */}
                    <span className="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-2 py-0.5 text-[10px] font-medium text-white">
                        NEW
                    </span>
                </button>
            </div>

            {/* Description based on selection */}
            <div className="mt-3 rounded-md bg-muted/50 p-3">
                {selectedType === "v1" ? (
                    <p className="text-xs text-muted-foreground">
                        <strong>Visual Editor:</strong> Traditional drag-and-drop
                        editing with block components. Edit text inline, reorder
                        sections, and customize with the component library. Best for
                        users who prefer direct manipulation.
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        <strong>AI Editor:</strong> Describe changes in plain English
                        and watch your {pageTypeLabels[pageType]} Page update in
                        real-time. Premium-quality output with conversion-optimized
                        sections. Best for fast, beautiful results.
                    </p>
                )}
            </div>
        </div>
    );
}
