"use client";

/**
 * Payment Options Editor
 * Manages multiple payment options for offer fields in the funnel map.
 * Each offer can have multiple payment plans (Pay in Full, Payment Plan, Recurring, etc.)
 */

import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { PaymentOption, PaymentType, PaymentFrequency } from "@/types/funnel-map";

interface PaymentOptionsEditorProps {
    value: PaymentOption[];
    onChange: (options: PaymentOption[]) => void;
    disabled?: boolean;
}

const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
    { value: "one_time", label: "One-time Payment" },
    { value: "fixed_payments", label: "Fixed Number of Payments" },
    { value: "recurring", label: "Recurring Subscription" },
];

const FREQUENCY_OPTIONS: { value: PaymentFrequency; label: string }[] = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annually" },
];

function generateId(): string {
    return `po_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createDefaultOption(): PaymentOption {
    return {
        id: generateId(),
        description: "",
        amount: 0,
        paymentType: "one_time",
    };
}

export function PaymentOptionsEditor({
    value = [],
    onChange,
    disabled = false,
}: PaymentOptionsEditorProps) {
    const [expandedOption, setExpandedOption] = useState<string | null>(
        value.length > 0 ? value[0].id : null
    );

    const handleAddOption = useCallback(() => {
        const newOption = createDefaultOption();
        onChange([...value, newOption]);
        setExpandedOption(newOption.id);
    }, [value, onChange]);

    const handleRemoveOption = useCallback(
        (id: string) => {
            const newOptions = value.filter((opt) => opt.id !== id);
            onChange(newOptions);
            if (expandedOption === id) {
                setExpandedOption(newOptions.length > 0 ? newOptions[0].id : null);
            }
        },
        [value, onChange, expandedOption]
    );

    const handleUpdateOption = useCallback(
        (id: string, updates: Partial<PaymentOption>) => {
            const newOptions = value.map((opt) =>
                opt.id === id ? { ...opt, ...updates } : opt
            );
            onChange(newOptions);
        },
        [value, onChange]
    );

    const handlePaymentTypeChange = useCallback(
        (id: string, paymentType: PaymentType) => {
            const updates: Partial<PaymentOption> = { paymentType };

            // Reset conditional fields when payment type changes
            if (paymentType === "one_time") {
                updates.numberOfPayments = undefined;
                updates.frequency = undefined;
            } else if (paymentType === "fixed_payments") {
                updates.numberOfPayments = updates.numberOfPayments || 3;
                updates.frequency = updates.frequency || "monthly";
            } else if (paymentType === "recurring") {
                updates.numberOfPayments = undefined;
                updates.frequency = updates.frequency || "monthly";
            }

            handleUpdateOption(id, updates);
        },
        [handleUpdateOption]
    );

    return (
        <div className="space-y-4">
            {value.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">
                        No payment options defined yet
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddOption}
                        disabled={disabled}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment Option
                    </Button>
                </div>
            )}

            {value.map((option, index) => (
                <div
                    key={option.id}
                    className={cn(
                        "border rounded-lg transition-all",
                        expandedOption === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                    )}
                >
                    {/* Header - always visible */}
                    <div
                        className="flex items-center gap-3 p-4 cursor-pointer"
                        onClick={() =>
                            setExpandedOption(
                                expandedOption === option.id ? null : option.id
                            )
                        }
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Option {index + 1}
                                </span>
                                {option.description && (
                                    <span className="text-sm font-semibold text-foreground truncate">
                                        - {option.description}
                                    </span>
                                )}
                            </div>
                            {option.amount > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    ${option.amount.toLocaleString()}
                                    {option.paymentType === "fixed_payments" &&
                                        option.numberOfPayments &&
                                        ` x ${option.numberOfPayments} payments`}
                                    {option.paymentType === "recurring" &&
                                        option.frequency &&
                                        ` / ${option.frequency}`}
                                </p>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveOption(option.id);
                            }}
                            disabled={disabled}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Expanded content */}
                    {expandedOption === option.id && (
                        <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
                            {/* Customer-Facing Description */}
                            <div className="space-y-2">
                                <Label htmlFor={`desc-${option.id}`}>
                                    Customer-Facing Description
                                </Label>
                                <Input
                                    id={`desc-${option.id}`}
                                    placeholder='e.g., "Pay in Full", "3 Easy Payments"'
                                    value={option.description}
                                    onChange={(e) =>
                                        handleUpdateOption(option.id, {
                                            description: e.target.value,
                                        })
                                    }
                                    disabled={disabled}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This is what your customers will see when choosing a
                                    payment option
                                </p>
                            </div>

                            {/* Payment Amount */}
                            <div className="space-y-2">
                                <Label htmlFor={`amount-${option.id}`}>
                                    Payment Amount ($)
                                </Label>
                                <Input
                                    id={`amount-${option.id}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={option.amount || ""}
                                    onChange={(e) =>
                                        handleUpdateOption(option.id, {
                                            amount: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    disabled={disabled}
                                />
                            </div>

                            {/* Payment Type */}
                            <div className="space-y-2">
                                <Label>Payment Type</Label>
                                <Select
                                    value={option.paymentType}
                                    onValueChange={(val) =>
                                        handlePaymentTypeChange(
                                            option.id,
                                            val as PaymentType
                                        )
                                    }
                                    disabled={disabled}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select payment type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_TYPE_OPTIONS.map((type) => (
                                            <SelectItem
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Number of Payments - only for fixed_payments */}
                            {option.paymentType === "fixed_payments" && (
                                <div className="space-y-2">
                                    <Label htmlFor={`num-payments-${option.id}`}>
                                        Number of Payments
                                    </Label>
                                    <Input
                                        id={`num-payments-${option.id}`}
                                        type="number"
                                        min="2"
                                        max="24"
                                        value={option.numberOfPayments || ""}
                                        onChange={(e) =>
                                            handleUpdateOption(option.id, {
                                                numberOfPayments:
                                                    parseInt(e.target.value) || 2,
                                            })
                                        }
                                        disabled={disabled}
                                    />
                                </div>
                            )}

                            {/* Frequency - for fixed_payments and recurring */}
                            {(option.paymentType === "fixed_payments" ||
                                option.paymentType === "recurring") && (
                                <div className="space-y-2">
                                    <Label>Payment Frequency</Label>
                                    <Select
                                        value={option.frequency || "monthly"}
                                        onValueChange={(val) =>
                                            handleUpdateOption(option.id, {
                                                frequency: val as PaymentFrequency,
                                            })
                                        }
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FREQUENCY_OPTIONS.map((freq) => (
                                                <SelectItem
                                                    key={freq.value}
                                                    value={freq.value}
                                                >
                                                    {freq.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Summary */}
                            {option.amount > 0 && (
                                <div className="bg-muted/50 rounded-md p-3 mt-4">
                                    <p className="text-sm font-medium text-foreground">
                                        Summary
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {option.paymentType === "one_time" && (
                                            <>
                                                One-time payment of $
                                                {option.amount.toLocaleString()}
                                            </>
                                        )}
                                        {option.paymentType === "fixed_payments" && (
                                            <>
                                                {option.numberOfPayments || 3}{" "}
                                                {option.frequency || "monthly"} payments
                                                of ${option.amount.toLocaleString()}
                                                <br />
                                                <span className="text-xs">
                                                    Total: $
                                                    {(
                                                        option.amount *
                                                        (option.numberOfPayments || 3)
                                                    ).toLocaleString()}
                                                </span>
                                            </>
                                        )}
                                        {option.paymentType === "recurring" && (
                                            <>
                                                ${option.amount.toLocaleString()} /{" "}
                                                {option.frequency || "month"} (recurring)
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {value.length > 0 && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    disabled={disabled}
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Payment Option
                </Button>
            )}
        </div>
    );
}
