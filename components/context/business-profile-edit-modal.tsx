"use client";

/**
 * Business Profile Edit Modal
 * Interactive tabbed modal for viewing and editing all business profile sections.
 * Features:
 * - Color-coded tabs matching section tiles
 * - All fields editable with appropriate field types
 * - Auto-save with 1s debounce via PATCH endpoint
 * - Visual feedback: "Saving...", "Saved", error states
 * - Bidirectional sync with wizard
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Users,
    BookOpen,
    Package,
    Lightbulb,
    Target,
    Cloud,
    Check,
    AlertCircle,
    X,
    Plus,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";
import type {
    BusinessProfile,
    SectionId,
    SectionData,
    Objection,
    Pricing,
    VehicleBeliefShift,
    InternalBeliefShift,
    ExternalBeliefShift,
} from "@/types/business-profile";
import { SECTION_DEFINITIONS } from "@/types/business-profile";
import type { LucideIcon } from "lucide-react";

const AUTOSAVE_DELAY = 1000; // 1 second debounce as per requirements

// Tab configuration with colors
interface TabConfig {
    id: SectionId;
    title: string;
    icon: LucideIcon;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    activeColorClass: string;
}

const TAB_CONFIG: TabConfig[] = [
    {
        id: "section1",
        title: "Customer",
        icon: Users,
        colorClass: "text-blue-600",
        bgClass: "bg-blue-50",
        borderClass: "border-blue-500",
        activeColorClass: "text-blue-600 bg-blue-50 border-b-2 border-blue-600",
    },
    {
        id: "section2",
        title: "Story",
        icon: BookOpen,
        colorClass: "text-purple-600",
        bgClass: "bg-purple-50",
        borderClass: "border-purple-500",
        activeColorClass: "text-purple-600 bg-purple-50 border-b-2 border-purple-600",
    },
    {
        id: "section3",
        title: "Offer",
        icon: Package,
        colorClass: "text-green-600",
        bgClass: "bg-green-50",
        borderClass: "border-green-500",
        activeColorClass: "text-green-600 bg-green-50 border-b-2 border-green-600",
    },
    {
        id: "section4",
        title: "Beliefs",
        icon: Lightbulb,
        colorClass: "text-amber-600",
        bgClass: "bg-amber-50",
        borderClass: "border-amber-500",
        activeColorClass: "text-amber-600 bg-amber-50 border-b-2 border-amber-600",
    },
    {
        id: "section5",
        title: "CTA",
        icon: Target,
        colorClass: "text-rose-600",
        bgClass: "bg-rose-50",
        borderClass: "border-rose-500",
        activeColorClass: "text-rose-600 bg-rose-50 border-b-2 border-rose-600",
    },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface BusinessProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessProfile: BusinessProfile;
    projectId: string;
    initialSection?: string;
    onProfileUpdate: (updatedProfile: BusinessProfile) => void;
}

export function BusinessProfileEditModal({
    isOpen,
    onClose,
    businessProfile,
    projectId,
    initialSection = "section1",
    onProfileUpdate,
}: BusinessProfileEditModalProps) {
    const [activeTab, setActiveTab] = useState<SectionId>(initialSection as SectionId);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [localProfile, setLocalProfile] = useState<BusinessProfile>(businessProfile);
    const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingChangesRef = useRef<{
        sectionId: SectionId;
        data: SectionData;
    } | null>(null);

    // Reset to initial section when modal opens
    useEffect(() => {
        if (isOpen && initialSection) {
            setActiveTab(initialSection as SectionId);
        }
    }, [isOpen, initialSection]);

    // Update local profile when businessProfile prop changes
    useEffect(() => {
        setLocalProfile(businessProfile);
    }, [businessProfile]);

    // Clear autosave timeout on unmount
    useEffect(() => {
        return () => {
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, []);

    // Perform autosave
    const performAutosave = useCallback(
        async (sectionId: SectionId, sectionData: SectionData) => {
            setSaveStatus("saving");
            setSaveError(null);

            try {
                const response = await fetch("/api/context/business-profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId,
                        sectionId,
                        sectionData,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Failed to save changes");
                }

                // Update local profile with server response
                if (result.profile) {
                    setLocalProfile(result.profile);
                    onProfileUpdate(result.profile);
                }

                setSaveStatus("saved");
                logger.info({ sectionId }, "Section saved successfully");

                // Reset to idle after 2 seconds
                setTimeout(() => {
                    setSaveStatus("idle");
                }, 2000);
            } catch (error) {
                logger.error({ error, sectionId }, "Failed to save section");
                setSaveStatus("error");
                setSaveError(
                    error instanceof Error ? error.message : "Failed to save changes"
                );
            }
        },
        [projectId, onProfileUpdate]
    );

    // Handle field change with autosave trigger
    const handleFieldChange = useCallback(
        (fieldKey: string, value: unknown) => {
            // Update local state immediately
            setLocalProfile((prev) => ({
                ...prev,
                [fieldKey]: value,
            }));

            // Clear existing timeout
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }

            // Build section data for the current tab
            const sectionDef = SECTION_DEFINITIONS[activeTab];
            const sectionData: Record<string, unknown> = {};

            // Include all fields from the section
            for (const field of sectionDef.fields) {
                if (field.key === fieldKey) {
                    sectionData[field.key] = value;
                } else {
                    sectionData[field.key] =
                        localProfile[field.key as keyof BusinessProfile];
                }
            }

            // Include context field
            const contextKey = `${activeTab}_context`;
            sectionData[contextKey] =
                fieldKey === contextKey
                    ? value
                    : localProfile[contextKey as keyof BusinessProfile];

            pendingChangesRef.current = {
                sectionId: activeTab,
                data: sectionData as SectionData,
            };

            // Set new timeout for autosave
            autosaveTimeoutRef.current = setTimeout(() => {
                if (pendingChangesRef.current) {
                    performAutosave(
                        pendingChangesRef.current.sectionId,
                        pendingChangesRef.current.data
                    );
                    pendingChangesRef.current = null;
                }
            }, AUTOSAVE_DELAY);
        },
        [activeTab, localProfile, performAutosave]
    );

    // Get current section definition and tab
    const currentSection = SECTION_DEFINITIONS[activeTab];
    const currentTab = TAB_CONFIG.find((t) => t.id === activeTab)!;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
                {/* Header */}
                <DialogHeader
                    className={`border-b border-border p-6 pb-4 ${currentTab.bgClass}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <currentTab.icon
                                    className={`h-5 w-5 ${currentTab.colorClass}`}
                                />
                                {currentSection.title}
                            </DialogTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {currentSection.description}
                            </p>
                        </div>
                        {/* Save Status Indicator */}
                        <SaveStatusIndicator status={saveStatus} error={saveError} />
                    </div>
                </DialogHeader>

                {/* Tabs */}
                <div className="border-b border-border px-6">
                    <div className="flex gap-1 overflow-x-auto">
                        {TAB_CONFIG.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                                        isActive
                                            ? tab.activeColorClass
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.title}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[calc(90vh-220px)] overflow-y-auto p-6">
                    <SectionEditor
                        sectionId={activeTab}
                        profile={localProfile}
                        onFieldChange={handleFieldChange}
                    />
                </div>

                {/* Footer */}
                <div className="border-t border-border p-4 px-6">
                    <div className="flex justify-end">
                        <Button onClick={onClose} variant="outline">
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Save Status Indicator Component
function SaveStatusIndicator({
    status,
    error,
}: {
    status: SaveStatus;
    error: string | null;
}) {
    if (status === "idle") return null;

    return (
        <div className="flex items-center gap-2 text-sm">
            {status === "saving" && (
                <>
                    <Cloud className="h-4 w-4 animate-pulse text-muted-foreground" />
                    <span className="text-muted-foreground">Saving...</span>
                </>
            )}
            {status === "saved" && (
                <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Saved</span>
                </>
            )}
            {status === "error" && (
                <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">{error || "Error saving"}</span>
                </>
            )}
        </div>
    );
}

// Section Editor Component
function SectionEditor({
    sectionId,
    profile,
    onFieldChange,
}: {
    sectionId: SectionId;
    profile: BusinessProfile;
    onFieldChange: (fieldKey: string, value: unknown) => void;
}) {
    const sectionDef = SECTION_DEFINITIONS[sectionId];

    return (
        <div className="space-y-6">
            {sectionDef.fields.map((field) => {
                const value = profile[field.key as keyof BusinessProfile];
                const fieldType = field.type as string;

                return (
                    <FieldEditor
                        key={field.key}
                        fieldKey={field.key}
                        label={field.label}
                        type={fieldType}
                        value={value}
                        onChange={onFieldChange}
                        subfields={
                            "subfields" in field ? [...field.subfields] : undefined
                        }
                    />
                );
            })}
        </div>
    );
}

// Field Editor Component
function FieldEditor({
    fieldKey,
    label,
    type,
    value,
    onChange,
    subfields,
}: {
    fieldKey: string;
    label: string;
    type: string;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    subfields?: Array<{ key: string; label: string }>;
}) {
    const handleChange = useCallback(
        (newValue: unknown) => {
            onChange(fieldKey, newValue);
        },
        [fieldKey, onChange]
    );

    // Pricing field
    if (type === "pricing") {
        const pricing = (value as Pricing) || { regular: null, webinar: null };
        return (
            <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
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
                                    handleChange({
                                        ...pricing,
                                        regular: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    })
                                }
                                placeholder="0"
                                className="pl-7"
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
                                    handleChange({
                                        ...pricing,
                                        webinar: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    })
                                }
                                placeholder="0"
                                className="pl-7"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Objections field
    if (type === "objections") {
        const objections = (value as Objection[]) || [];
        const addObjection = () => {
            handleChange([...objections, { objection: "", response: "" }]);
        };
        const updateObjection = (
            index: number,
            field: "objection" | "response",
            newValue: string
        ) => {
            const updated = [...objections];
            updated[index] = { ...updated[index], [field]: newValue };
            handleChange(updated);
        };
        const removeObjection = (index: number) => {
            handleChange(objections.filter((_, i) => i !== index));
        };

        return (
            <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <div className="space-y-4">
                    {objections.map((obj, index) => (
                        <div key={index} className="rounded-lg border p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Objection {index + 1}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeObjection(index)}
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
                    className="w-full"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Objection
                </Button>
            </div>
        );
    }

    // Array field (poll questions)
    if (type === "array") {
        const items = (value as string[]) || [];
        const addItem = () => handleChange([...items, ""]);
        const updateItem = (index: number, newValue: string) => {
            const updated = [...items];
            updated[index] = newValue;
            handleChange(updated);
        };
        const removeItem = (index: number) => {
            handleChange(items.filter((_, i) => i !== index));
        };

        return (
            <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                value={item}
                                onChange={(e) => updateItem(index, e.target.value)}
                                placeholder={`Item ${index + 1}`}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
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
                    className="w-full"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </div>
        );
    }

    // Belief shift field
    if (type === "belief_shift" && subfields) {
        const data =
            (value as
                | Partial<VehicleBeliefShift>
                | Partial<InternalBeliefShift>
                | Partial<ExternalBeliefShift>) || {};

        const handleSubfieldChange = (key: string, newValue: unknown) => {
            handleChange({ ...data, [key]: newValue });
        };

        return (
            <div className="space-y-4">
                <Label className="text-base font-semibold text-foreground">
                    {label}
                </Label>
                <div className="space-y-4 rounded-lg border p-4">
                    {subfields.map((subfield) => {
                        const subValue = data[subfield.key as keyof typeof data];
                        const isArrayField =
                            subfield.key === "key_insights" ||
                            subfield.key === "mindset_reframes";

                        if (isArrayField) {
                            const items = Array.isArray(subValue) ? subValue : [];
                            const addItem = () =>
                                handleSubfieldChange(subfield.key, [...items, ""]);
                            const updateItem = (index: number, val: string) => {
                                const updated = [...items];
                                updated[index] = val;
                                handleSubfieldChange(subfield.key, updated);
                            };
                            const removeItem = (index: number) => {
                                handleSubfieldChange(
                                    subfield.key,
                                    items.filter((_, i) => i !== index)
                                );
                            };

                            return (
                                <div key={subfield.key} className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">
                                        {subfield.label}
                                    </Label>
                                    <div className="space-y-2">
                                        {items.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2"
                                            >
                                                <Input
                                                    value={item}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            index,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder={`Item ${index + 1}`}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(index)}
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
                                        className="w-full"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Item
                                    </Button>
                                </div>
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
                                        handleSubfieldChange(
                                            subfield.key,
                                            e.target.value
                                        )
                                    }
                                    placeholder={`Enter ${subfield.label.toLowerCase()}...`}
                                    className="min-h-[80px]"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Default: text or textarea
    return (
        <div className="space-y-2">
            <Label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
                {label}
            </Label>
            {type === "textarea" ? (
                <Textarea
                    id={fieldKey}
                    value={(value as string) || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    className="min-h-[100px] resize-y"
                />
            ) : (
                <Input
                    id={fieldKey}
                    value={(value as string) || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                />
            )}
        </div>
    );
}
