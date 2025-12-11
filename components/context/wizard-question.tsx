"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, X, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import type { Objection, Pricing } from "@/types/business-profile";

interface WizardQuestionProps {
    fieldKey: string;
    label: string;
    type: "text" | "textarea" | "pricing" | "objections" | "array" | "belief_shift";
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    onRegenerate?: (fieldKey: string) => Promise<void>;
    isAiGenerated?: boolean;
    subfields?: Array<{ key: string; label: string }>;
    disabled?: boolean;
}

export function WizardQuestion({
    fieldKey,
    label,
    type,
    value,
    onChange,
    onRegenerate,
    isAiGenerated = false,
    subfields,
    disabled = false,
}: WizardQuestionProps) {
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleChange = useCallback(
        (newValue: unknown) => {
            onChange(fieldKey, newValue);
        },
        [fieldKey, onChange]
    );

    const handleRegenerate = async () => {
        if (!onRegenerate) return;
        setIsRegenerating(true);
        try {
            await onRegenerate(fieldKey);
        } finally {
            setIsRegenerating(false);
        }
    };

    // Render based on field type
    if (type === "pricing") {
        return (
            <PricingField
                label={label}
                value={value as Pricing}
                onChange={handleChange}
                onRegenerate={onRegenerate ? handleRegenerate : undefined}
                isAiGenerated={isAiGenerated}
                isRegenerating={isRegenerating}
                disabled={disabled}
            />
        );
    }

    if (type === "objections") {
        return (
            <ObjectionsField
                label={label}
                value={value as Objection[]}
                onChange={handleChange}
                onRegenerate={onRegenerate ? handleRegenerate : undefined}
                isAiGenerated={isAiGenerated}
                isRegenerating={isRegenerating}
                disabled={disabled}
            />
        );
    }

    if (type === "array") {
        return (
            <ArrayField
                label={label}
                value={value as string[]}
                onChange={handleChange}
                onRegenerate={onRegenerate ? handleRegenerate : undefined}
                isAiGenerated={isAiGenerated}
                isRegenerating={isRegenerating}
                disabled={disabled}
            />
        );
    }

    if (type === "belief_shift" && subfields) {
        return (
            <BeliefShiftField
                label={label}
                value={value as Record<string, unknown>}
                onChange={handleChange}
                subfields={subfields}
                onRegenerate={onRegenerate ? handleRegenerate : undefined}
                isAiGenerated={isAiGenerated}
                isRegenerating={isRegenerating}
                disabled={disabled}
            />
        );
    }

    // Default: text or textarea
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label
                    htmlFor={fieldKey}
                    className="text-sm font-medium text-foreground"
                >
                    {label}
                </Label>
                <div className="flex items-center gap-2">
                    {isAiGenerated && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            AI Generated
                        </span>
                    )}
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRegenerate}
                            disabled={disabled || isRegenerating}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                            title="Regenerate this field"
                        >
                            {isRegenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
            {type === "textarea" ? (
                <Textarea
                    id={fieldKey}
                    value={(value as string) || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    className={cn("min-h-[100px] resize-y", {
                        "border-primary/30 bg-primary/5": isAiGenerated,
                    })}
                    disabled={disabled || isRegenerating}
                />
            ) : (
                <Input
                    id={fieldKey}
                    value={(value as string) || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    className={cn({
                        "border-primary/30 bg-primary/5": isAiGenerated,
                    })}
                    disabled={disabled || isRegenerating}
                />
            )}
        </div>
    );
}

// Pricing Field Component
function PricingField({
    label,
    value,
    onChange,
    onRegenerate,
    isAiGenerated,
    isRegenerating,
    disabled,
}: {
    label: string;
    value: Pricing;
    onChange: (value: Pricing) => void;
    onRegenerate?: () => Promise<void>;
    isAiGenerated: boolean;
    isRegenerating: boolean;
    disabled: boolean;
}) {
    const pricing = value || { regular: null, webinar: null };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <div className="flex items-center gap-2">
                    {isAiGenerated && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            AI Generated
                        </span>
                    )}
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={disabled || isRegenerating}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                            title="Regenerate this field"
                        >
                            {isRegenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                        Regular Price
                    </Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                        </span>
                        <Input
                            type="number"
                            value={pricing.regular || ""}
                            onChange={(e) =>
                                onChange({
                                    ...pricing,
                                    regular: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                            placeholder="0"
                            className={cn("pl-7", {
                                "border-primary/30 bg-primary/5": isAiGenerated,
                            })}
                            disabled={disabled || isRegenerating}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                        Webinar Price
                    </Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                        </span>
                        <Input
                            type="number"
                            value={pricing.webinar || ""}
                            onChange={(e) =>
                                onChange({
                                    ...pricing,
                                    webinar: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                            placeholder="0"
                            className={cn("pl-7", {
                                "border-primary/30 bg-primary/5": isAiGenerated,
                            })}
                            disabled={disabled || isRegenerating}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Objections Field Component
function ObjectionsField({
    label,
    value,
    onChange,
    onRegenerate,
    isAiGenerated,
    isRegenerating,
    disabled,
}: {
    label: string;
    value: Objection[];
    onChange: (value: Objection[]) => void;
    onRegenerate?: () => Promise<void>;
    isAiGenerated: boolean;
    isRegenerating: boolean;
    disabled: boolean;
}) {
    const objections = value || [];

    const addObjection = () => {
        onChange([...objections, { objection: "", response: "" }]);
    };

    const updateObjection = (
        index: number,
        field: "objection" | "response",
        newValue: string
    ) => {
        const updated = [...objections];
        updated[index] = { ...updated[index], [field]: newValue };
        onChange(updated);
    };

    const removeObjection = (index: number) => {
        onChange(objections.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <div className="flex items-center gap-2">
                    {isAiGenerated && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            AI Generated
                        </span>
                    )}
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={disabled || isRegenerating}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                            title="Regenerate this field"
                        >
                            {isRegenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {objections.map((obj, index) => (
                    <div
                        key={index}
                        className={cn("rounded-lg border p-4", {
                            "border-primary/30 bg-primary/5": isAiGenerated,
                        })}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Objection {index + 1}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeObjection(index)}
                                disabled={disabled || isRegenerating}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Objection
                                </Label>
                                <Input
                                    value={obj.objection}
                                    onChange={(e) =>
                                        updateObjection(
                                            index,
                                            "objection",
                                            e.target.value
                                        )
                                    }
                                    placeholder="What objection do they raise?"
                                    disabled={disabled || isRegenerating}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Response
                                </Label>
                                <Textarea
                                    value={obj.response}
                                    onChange={(e) =>
                                        updateObjection(
                                            index,
                                            "response",
                                            e.target.value
                                        )
                                    }
                                    placeholder="How do you address this objection?"
                                    className="min-h-[80px]"
                                    disabled={disabled || isRegenerating}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={addObjection}
                disabled={disabled || isRegenerating}
                className="w-full"
            >
                <Plus className="mr-2 h-4 w-4" />
                Add Objection
            </Button>
        </div>
    );
}

// Array Field Component (for poll questions, etc.)
function ArrayField({
    label,
    value,
    onChange,
    onRegenerate,
    isAiGenerated,
    isRegenerating,
    disabled,
}: {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    onRegenerate?: () => Promise<void>;
    isAiGenerated: boolean;
    isRegenerating: boolean;
    disabled: boolean;
}) {
    const items = value || [];

    const addItem = () => {
        onChange([...items, ""]);
    };

    const updateItem = (index: number, newValue: string) => {
        const updated = [...items];
        updated[index] = newValue;
        onChange(updated);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <div className="flex items-center gap-2">
                    {isAiGenerated && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            AI Generated
                        </span>
                    )}
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={disabled || isRegenerating}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                            title="Regenerate this field"
                        >
                            {isRegenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input
                            value={item}
                            onChange={(e) => updateItem(index, e.target.value)}
                            placeholder={`Item ${index + 1}`}
                            className={cn({
                                "border-primary/30 bg-primary/5": isAiGenerated,
                            })}
                            disabled={disabled || isRegenerating}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            disabled={disabled || isRegenerating}
                            className="h-9 w-9 text-destructive hover:text-destructive"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={disabled || isRegenerating}
                className="w-full"
            >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
            </Button>
        </div>
    );
}

// Belief Shift Field Component
function BeliefShiftField({
    label,
    value,
    onChange,
    subfields,
    onRegenerate,
    isAiGenerated,
    isRegenerating,
    disabled,
}: {
    label: string;
    value: Record<string, unknown>;
    onChange: (value: Record<string, unknown>) => void;
    subfields: Array<{ key: string; label: string }>;
    onRegenerate?: () => Promise<void>;
    isAiGenerated: boolean;
    isRegenerating: boolean;
    disabled: boolean;
}) {
    const data = value || {};

    const handleSubfieldChange = (key: string, newValue: unknown) => {
        onChange({ ...data, [key]: newValue });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-foreground">
                    {label}
                </Label>
                <div className="flex items-center gap-2">
                    {isAiGenerated && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Bot className="h-3 w-3" />
                            AI Generated
                        </span>
                    )}
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={disabled || isRegenerating}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                            title="Regenerate this field"
                        >
                            {isRegenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <div
                className={cn("space-y-4 rounded-lg border p-4", {
                    "border-primary/30 bg-primary/5": isAiGenerated,
                })}
            >
                {subfields.map((subfield) => {
                    const subValue = data[subfield.key];
                    const isArray =
                        subfield.key === "key_insights" ||
                        subfield.key === "mindset_reframes";

                    if (isArray) {
                        return (
                            <ArrayField
                                key={subfield.key}
                                label={subfield.label}
                                value={(subValue as string[]) || []}
                                onChange={(v) => handleSubfieldChange(subfield.key, v)}
                                isAiGenerated={false}
                                isRegenerating={false}
                                disabled={disabled || isRegenerating}
                            />
                        );
                    }

                    return (
                        <div key={subfield.key} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                                {subfield.label}
                            </Label>
                            <Textarea
                                value={(subValue as string) || ""}
                                onChange={(e) =>
                                    handleSubfieldChange(subfield.key, e.target.value)
                                }
                                placeholder={`Enter ${subfield.label.toLowerCase()}...`}
                                className="min-h-[80px]"
                                disabled={disabled || isRegenerating}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
