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
import type {
    FunnelNodeDefinition,
    FunnelNodeField,
    PaymentOption,
} from "@/types/funnel-map";
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
import { PaymentOptionsEditor } from "./payment-options-editor";

interface NodeEditorFormProps {
    nodeDefinition: FunnelNodeDefinition;
    content: Record<string, unknown>;
    onChange: (newContent: Record<string, unknown>) => void;
    onBlur?: () => void;
    showValidation?: boolean;
    emptyRequiredFields?: string[];
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
 *
 * Order matters: process longer patterns first (*** before ** before *)
 * Uses non-greedy matching (.*?) to handle nested/adjacent patterns correctly
 */
function stripMarkdown(text: string): string {
    if (!text || typeof text !== "string") return text;

    let result = text;

    // Remove links first: [text](url) - must be before other patterns
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Remove inline code: `text` - preserve content inside
    result = result.replace(/`([^`]+)`/g, "$1");

    // Remove headers: # text (at line start)
    result = result.replace(/^#{1,6}\s+/gm, "");

    // Remove strikethrough: ~~text~~
    result = result.replace(/~~(.+?)~~/g, "$1");

    // Remove bold+italic combined: ***text*** (must be before ** and *)
    result = result.replace(/\*\*\*(.+?)\*\*\*/g, "$1");

    // Remove bold: **text** or __text__ (must be before single *)
    result = result.replace(/\*\*(.+?)\*\*/g, "$1");
    result = result.replace(/__(.+?)__/g, "$1");

    // Remove italic: *text* or _text_ (single markers, non-greedy)
    // Only match when not preceded/followed by word characters (avoid mid-word underscores)
    result = result.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1");
    result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");

    // Clean up any double spaces and trim
    result = result.replace(/  +/g, " ").trim();

    return result;
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
    onBlur?: () => void;
    showValidationError?: boolean;
}

function FieldRenderer({
    field,
    value,
    onChange,
    onBlur,
    showValidationError,
}: FieldRendererProps) {
    const label = formatFieldLabel(field.key, field.label);
    // Strip markdown from display value to show clean text in form fields
    const cleanValue = stripMarkdownFromValue(value);

    // Validation error styling
    const errorClass = showValidationError ? "border-red-500 ring-1 ring-red-500" : "";

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
                        onBlur={onBlur}
                        placeholder={field.placeholder}
                        className={cn("w-full", errorClass)}
                    />
                    {showValidationError && (
                        <p className="text-xs text-red-500">This field is required</p>
                    )}
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
                        onBlur={onBlur}
                        placeholder={field.placeholder}
                        className={cn("w-full min-h-[100px] resize-y", errorClass)}
                    />
                    {showValidationError && (
                        <p className="text-xs text-red-500">This field is required</p>
                    )}
                </div>
            );

        case "list":
            return (
                <ListFieldRenderer
                    field={field}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    label={label}
                    showValidationError={showValidationError}
                />
            );

        case "pricing":
            return (
                <PricingFieldRenderer
                    field={field}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    label={label}
                    showValidationError={showValidationError}
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
                        onValueChange={(newValue) => {
                            onChange(field.key, newValue);
                            // Trigger blur on select change since there's no blur event
                            onBlur?.();
                        }}
                    >
                        <SelectTrigger className={cn("w-full", errorClass)}>
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
                    {showValidationError && (
                        <p className="text-xs text-red-500">This field is required</p>
                    )}
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
                        onBlur={onBlur}
                        className={cn("w-full", errorClass)}
                    />
                    {showValidationError && (
                        <p className="text-xs text-red-500">This field is required</p>
                    )}
                </div>
            );

        case "payment_options":
            return (
                <div className="space-y-2">
                    <Label className="text-sm font-medium">
                        {label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.helpText && (
                        <p className="text-xs text-muted-foreground">
                            {field.helpText}
                        </p>
                    )}
                    <PaymentOptionsEditor
                        value={(value as PaymentOption[]) || []}
                        onChange={(options) => {
                            onChange(field.key, options);
                            onBlur?.();
                        }}
                    />
                    {showValidationError && (
                        <p className="text-xs text-red-500">
                            At least one payment option is required
                        </p>
                    )}
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
    onBlur,
    label,
    showValidationError,
}: {
    field: FunnelNodeField;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    onBlur?: () => void;
    label: string;
    showValidationError?: boolean;
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
        onBlur?.();
    };

    const updateItem = (index: number, newValue: string) => {
        const newItems = [...rawItems];
        newItems[index] = newValue;
        onChange(field.key, newItems);
    };

    const errorClass = showValidationError ? "border-red-500 ring-1 ring-red-500" : "";

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
                            onBlur={onBlur}
                            placeholder={field.placeholder || `Item ${index + 1}`}
                            className={cn("flex-1", errorClass)}
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
            {showValidationError && (
                <p className="text-xs text-red-500">This field is required</p>
            )}
        </div>
    );
}

function PricingFieldRenderer({
    field,
    value,
    onChange,
    onBlur,
    label,
    showValidationError,
}: {
    field: FunnelNodeField;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    onBlur?: () => void;
    label: string;
    showValidationError?: boolean;
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

    const errorClass = showValidationError ? "border-red-500 ring-1 ring-red-500" : "";

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
                    onBlur={onBlur}
                    placeholder="0.00"
                    className={cn("pl-7", errorClass)}
                />
            </div>
            {showValidationError && (
                <p className="text-xs text-red-500">This field is required</p>
            )}
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
    onBlur,
    showValidation,
    emptyRequiredFields = [],
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
                    onBlur={onBlur}
                    showValidationError={
                        showValidation && emptyRequiredFields.includes(field.key)
                    }
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
                                        onBlur={onBlur}
                                        showValidationError={
                                            showValidation &&
                                            emptyRequiredFields.includes(field.key)
                                        }
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
