"use client";

/**
 * Node Editor Form
 * Renders editable form fields for a funnel node
 * Features:
 * - Supports all field types (text, textarea, list, pricing, select, datetime)
 * - User-friendly field labels
 * - Real-time onChange for auto-save
 * - Order Bump accordion section for checkout node
 */

import { useState, useCallback } from "react";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelNodeDefinition, FunnelNodeField } from "@/types/funnel-map";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface NodeEditorFormProps {
    nodeDefinition: FunnelNodeDefinition;
    content: Record<string, unknown>;
    onChange: (newContent: Record<string, unknown>) => void;
}

// Convert snake_case or camelCase to user-friendly label
function formatFieldLabel(key: string, providedLabel?: string): string {
    if (providedLabel) return providedLabel;

    return key
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}

/**
 * Strip markdown syntax from text to display clean values in form fields
 * Removes: **bold**, *italic*, __underline__, ~~strikethrough~~, `code`, links, headers
 */
function stripMarkdown(text: string): string {
    if (!text || typeof text !== "string") return text;

    return (
        text
            // Remove bold: **text** or __text__
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .replace(/__([^_]+)__/g, "$1")
            // Remove italic: *text* or _text_
            .replace(/\*([^*]+)\*/g, "$1")
            .replace(/_([^_]+)_/g, "$1")
            // Remove strikethrough: ~~text~~
            .replace(/~~([^~]+)~~/g, "$1")
            // Remove inline code: `text`
            .replace(/`([^`]+)`/g, "$1")
            // Remove links: [text](url)
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            // Remove headers: # text
            .replace(/^#{1,6}\s+/gm, "")
            // Clean up any double spaces
            .replace(/  +/g, " ")
            .trim()
    );
}

/**
 * Strip markdown from a value, handling strings and arrays
 */
function stripMarkdownFromValue(value: unknown): unknown {
    if (typeof value === "string") {
        return stripMarkdown(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) =>
            typeof item === "string" ? stripMarkdown(item) : item
        );
    }
    return value;
}

interface FieldRendererProps {
    field: FunnelNodeField;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
    const label = formatFieldLabel(field.key, field.label);
    // Strip markdown from display value to show clean text in form fields
    const cleanValue = stripMarkdownFromValue(value);

    switch (field.type) {
        case "text":
            return (
                <div className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm font-medium">
                        {label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.helpText && (
                        <p className="text-xs text-muted-foreground">
                            {field.helpText}
                        </p>
                    )}
                    <Input
                        id={field.key}
                        value={(cleanValue as string) || ""}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full"
                    />
                </div>
            );

        case "textarea":
            return (
                <div className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm font-medium">
                        {label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.helpText && (
                        <p className="text-xs text-muted-foreground">
                            {field.helpText}
                        </p>
                    )}
                    <Textarea
                        id={field.key}
                        value={(cleanValue as string) || ""}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full min-h-[100px] resize-y"
                    />
                </div>
            );

        case "list":
            return (
                <ListFieldRenderer
                    field={field}
                    value={value}
                    onChange={onChange}
                    label={label}
                />
            );

        case "pricing":
            return (
                <PricingFieldRenderer
                    field={field}
                    value={value}
                    onChange={onChange}
                    label={label}
                />
            );

        case "select":
            return (
                <div className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm font-medium">
                        {label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.helpText && (
                        <p className="text-xs text-muted-foreground">
                            {field.helpText}
                        </p>
                    )}
                    <Select
                        value={(value as string) || ""}
                        onValueChange={(newValue) => onChange(field.key, newValue)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue
                                placeholder={
                                    field.placeholder || `Select ${label.toLowerCase()}`
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );

        case "datetime":
            return (
                <div className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm font-medium">
                        {label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.helpText && (
                        <p className="text-xs text-muted-foreground">
                            {field.helpText}
                        </p>
                    )}
                    <Input
                        id={field.key}
                        type="datetime-local"
                        value={(value as string) || ""}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        className="w-full"
                    />
                </div>
            );

        default:
            return null;
    }
}

function ListFieldRenderer({
    field,
    value,
    onChange,
    label,
}: {
    field: FunnelNodeField;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    label: string;
}) {
    // Strip markdown from list items for display
    const rawItems = Array.isArray(value) ? value : [];
    const items = rawItems.map((item) =>
        typeof item === "string" ? stripMarkdown(item) : item
    );

    const addItem = () => {
        onChange(field.key, [...rawItems, ""]);
    };

    const removeItem = (index: number) => {
        const newItems = rawItems.filter((_, i) => i !== index);
        onChange(field.key, newItems);
    };

    const updateItem = (index: number, newValue: string) => {
        const newItems = [...rawItems];
        newItems[index] = newValue;
        onChange(field.key, newItems);
    };

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">
                {label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">
                            {index + 1}.
                        </span>
                        <Input
                            value={item as string}
                            onChange={(e) => updateItem(index, e.target.value)}
                            placeholder={field.placeholder || `Item ${index + 1}`}
                            className="flex-1"
                        />
                        <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add item
                </button>
            </div>
        </div>
    );
}

function PricingFieldRenderer({
    field,
    value,
    onChange,
    label,
}: {
    field: FunnelNodeField;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    label: string;
}) {
    // Handle various pricing formats
    const getPriceValue = (): string => {
        if (typeof value === "number") return value.toString();
        if (typeof value === "object" && value !== null) {
            const priceObj = value as Record<string, number>;
            return (priceObj.webinar ?? priceObj.regular ?? "").toString();
        }
        return (value as string) || "";
    };

    const handlePriceChange = (newPrice: string) => {
        const numericPrice = parseFloat(newPrice) || 0;
        // Store as object with webinar price for consistency
        onChange(field.key, { webinar: numericPrice, regular: numericPrice });
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={field.key} className="text-sm font-medium">
                {label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                </span>
                <Input
                    id={field.key}
                    type="number"
                    min="0"
                    step="0.01"
                    value={getPriceValue()}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                />
            </div>
        </div>
    );
}

/**
 * Check if a field should be visible based on current content values
 * Returns true if field should be shown, false if it should be hidden
 */
function shouldShowField(
    field: FunnelNodeField,
    content: Record<string, unknown>
): boolean {
    // Conditional visibility for event_datetime: only show for "live" access type
    if (field.key === "event_datetime") {
        const accessType = content.access_type;
        return accessType === "live";
    }

    // All other fields are always visible
    return true;
}

export function NodeEditorForm({
    nodeDefinition,
    content,
    onChange,
}: NodeEditorFormProps) {
    const [isOrderBumpExpanded, setIsOrderBumpExpanded] = useState(false);

    const handleFieldChange = useCallback(
        (key: string, value: unknown) => {
            onChange({
                ...content,
                [key]: value,
            });
        },
        [content, onChange]
    );

    const hasOrderBumpFields =
        nodeDefinition.orderBumpFields && nodeDefinition.orderBumpFields.length > 0;

    // Filter fields based on conditional visibility
    const visibleFields = nodeDefinition.fields.filter((field) =>
        shouldShowField(field, content)
    );

    return (
        <div className="space-y-6">
            {/* Main fields */}
            {visibleFields.map((field) => (
                <FieldRenderer
                    key={field.key}
                    field={field}
                    value={content[field.key]}
                    onChange={handleFieldChange}
                />
            ))}

            {/* Order Bump accordion (for checkout node) */}
            {hasOrderBumpFields && (
                <div className="mt-8">
                    <button
                        type="button"
                        onClick={() => setIsOrderBumpExpanded(!isOrderBumpExpanded)}
                        className="flex items-center gap-2 w-full p-4 rounded-lg border border-dashed border-lime-300 bg-lime-50 hover:bg-lime-100 transition-colors"
                    >
                        {isOrderBumpExpanded ? (
                            <ChevronDown className="h-4 w-4 text-lime-700" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-lime-700" />
                        )}
                        <span className="font-medium text-lime-700">
                            Order Bump (Optional)
                        </span>
                        <span className="text-xs text-lime-600 ml-2">
                            Add a quick-win offer at checkout
                        </span>
                    </button>
                    {isOrderBumpExpanded && (
                        <div className="pt-4 pl-4 border-l-2 border-lime-200 ml-2 mt-2">
                            <div className="space-y-6">
                                {nodeDefinition.orderBumpFields?.map((field) => (
                                    <FieldRenderer
                                        key={field.key}
                                        field={field}
                                        value={content[field.key]}
                                        onChange={handleFieldChange}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
