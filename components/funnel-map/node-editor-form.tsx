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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface FieldRendererProps {
    field: FunnelNodeField;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
    const label = formatFieldLabel(field.key, field.label);

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
                        value={(value as string) || ""}
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
                        value={(value as string) || ""}
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
    const items = Array.isArray(value) ? value : [];

    const addItem = () => {
        onChange(field.key, [...items, ""]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(field.key, newItems);
    };

    const updateItem = (index: number, newValue: string) => {
        const newItems = [...items];
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

    return (
        <div className="space-y-6">
            {/* Main fields */}
            {nodeDefinition.fields.map((field) => (
                <FieldRenderer
                    key={field.key}
                    field={field}
                    value={content[field.key]}
                    onChange={handleFieldChange}
                />
            ))}

            {/* Order Bump accordion (for checkout node) */}
            {hasOrderBumpFields && (
                <Collapsible
                    open={isOrderBumpExpanded}
                    onOpenChange={setIsOrderBumpExpanded}
                    className="mt-8"
                >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 rounded-lg border border-dashed border-lime-300 bg-lime-50 hover:bg-lime-100 transition-colors">
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
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 pl-4 border-l-2 border-lime-200 ml-2 mt-2">
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
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
}
