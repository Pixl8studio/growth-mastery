/**
 * Intake Data Viewer Component
 * Modal viewer that displays all intake data in organized tabs
 */

"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Copy,
    Check,
    FileText,
    Palette,
    DollarSign,
    Database,
    Search,
    X,
    Edit2,
    Save,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { BrandDataDisplay } from "./brand-data-display";
import { PricingDisplay } from "./pricing-display";
import { MetadataDisplay } from "./metadata-display";

interface IntakeSession {
    id: string;
    call_id: string;
    transcript_text: string;
    call_duration: number;
    call_status: string;
    created_at: string;
    extracted_data?: {
        pricing?: Array<{
            amount: number;
            currency: string;
            context: string;
            confidence: "high" | "medium" | "low";
        }>;
    };
    brand_data?: {
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            background: string;
            text: string;
        };
        fonts: {
            primary?: string;
            secondary?: string;
            weights: string[];
        };
        style: {
            borderRadius?: string;
            shadows?: boolean;
            gradients?: boolean;
        };
        confidence: {
            colors: number;
            fonts: number;
            overall: number;
        };
    };
    intake_method: string;
    session_name?: string;
    file_urls?: string[];
    scraped_url?: string;
    metadata?: Record<string, unknown>;
}

type TabType = "customer" | "story" | "offer" | "beliefs" | "cta";

interface IntakeDataViewerProps {
    session: IntakeSession | null;
    isOpen: boolean;
    onClose: () => void;
}

export function IntakeDataViewer({ session, isOpen, onClose }: IntakeDataViewerProps) {
    const [activeTab, setActiveTab] = useState<TabType>("customer");
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedSection, setCopiedSection] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    if (!session) return null;

    const handleStartEdit = () => {
        setEditedContent(session.transcript_text || "");
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/intake/update-content", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intakeId: session.id,
                    transcriptText: editedContent,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save changes");
            }

            // Update the session object with the new content
            session.transcript_text = editedContent;
            setIsEditing(false);
        } catch (error) {
            // Error handling - in production would show a toast
            console.error("Failed to save:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedContent("");
    };

    const copyToClipboard = async (text: string, section: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
    };

    const tabs: {
        id: TabType;
        label: string;
        icon: React.ReactNode;
        badge?: string;
    }[] = [
        {
            id: "customer",
            label: "Customer",
            icon: <FileText className="h-4 w-4" />,
        },
        {
            id: "story",
            label: "Story",
            icon: <FileText className="h-4 w-4" />,
            badge: session.transcript_text
                ? `${Math.round(session.transcript_text.length / 1000)}k`
                : undefined,
        },
        {
            id: "offer",
            label: "Offer",
            icon: <DollarSign className="h-4 w-4" />,
            badge: session.extracted_data?.pricing?.length
                ? String(session.extracted_data.pricing.length)
                : undefined,
        },
        {
            id: "beliefs",
            label: "Beliefs",
            icon: <Palette className="h-4 w-4" />,
            badge: session.brand_data ? "✓" : undefined,
        },
        {
            id: "cta",
            label: "CTA",
            icon: <Database className="h-4 w-4" />,
        },
    ];

    const getMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            voice: "Voice Call",
            paste: "Pasted Text",
            upload: "File Upload",
            scrape: "Web Scraping",
            google_drive: "Google Drive",
        };
        return labels[method] || method;
    };

    const filteredContent = searchQuery
        ? session.transcript_text
              ?.split("\n")
              .filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
              .join("\n")
        : session.transcript_text;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
                {/* Header */}
                <DialogHeader className="border-b border-border p-6 pb-4">
                    <DialogTitle className="text-xl">
                        {session.session_name || "Intake Session"}
                    </DialogTitle>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {getMethodLabel(session.intake_method)}
                        </span>
                        <span>•</span>
                        <span>
                            {new Date(session.created_at).toLocaleDateString("en-US", {
                                dateStyle: "medium",
                            })}
                        </span>
                    </div>
                </DialogHeader>

                {/* Tabs */}
                <div className="border-b border-border px-6">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.badge && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
                    {/* Customer Tab (Overview) */}
                    {activeTab === "customer" && (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Card className="p-4">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Content Length
                                    </div>
                                    <div className="mt-1 text-2xl font-bold text-foreground">
                                        {session.transcript_text
                                            ? session.transcript_text.length.toLocaleString()
                                            : 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        characters
                                    </div>
                                </Card>

                                <Card className="p-4">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Word Count
                                    </div>
                                    <div className="mt-1 text-2xl font-bold text-foreground">
                                        {session.transcript_text
                                            ? session.transcript_text
                                                  .split(/\s+/)
                                                  .length.toLocaleString()
                                            : 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        words
                                    </div>
                                </Card>

                                <Card className="p-4">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Data Quality
                                    </div>
                                    <div className="mt-1 text-2xl font-bold text-foreground">
                                        {session.brand_data
                                            ? `${session.brand_data.confidence.overall}%`
                                            : "N/A"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        confidence
                                    </div>
                                </Card>
                            </div>

                            {/* Data Availability */}
                            <Card className="p-4">
                                <h3 className="mb-3 font-semibold text-foreground">
                                    Available Data
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {session.transcript_text && (
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                            ✓ Full Content
                                        </span>
                                    )}
                                    {session.brand_data && (
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                            ✓ Brand Data
                                        </span>
                                    )}
                                    {session.extracted_data?.pricing &&
                                        session.extracted_data.pricing.length > 0 && (
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                                ✓ Pricing (
                                                {session.extracted_data.pricing.length})
                                            </span>
                                        )}
                                    {session.scraped_url && (
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                            ✓ Source URL
                                        </span>
                                    )}
                                    {session.file_urls &&
                                        session.file_urls.length > 0 && (
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                                ✓ Uploaded Files (
                                                {session.file_urls.length})
                                            </span>
                                        )}
                                    {session.metadata &&
                                        Object.keys(session.metadata).length > 0 && (
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                                ✓ Metadata
                                            </span>
                                        )}
                                </div>
                            </Card>

                            {/* Quick Preview */}
                            {session.transcript_text && (
                                <Card className="p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="font-semibold text-foreground">
                                            Content Preview
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setActiveTab("story")}
                                        >
                                            View Full Content →
                                        </Button>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto rounded-md bg-muted p-3 text-sm text-muted-foreground">
                                        {session.transcript_text.slice(0, 500)}
                                        {session.transcript_text.length > 500 && "..."}
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Story Tab (Content) */}
                    {activeTab === "story" && (
                        <div className="space-y-4">
                            {/* Action Bar */}
                            <div className="flex items-center gap-2">
                                {!isEditing && (
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search within content..."
                                            value={searchQuery}
                                            onChange={(e) =>
                                                setSearchQuery(e.target.value)
                                            }
                                            className="pl-9"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="flex-1 text-sm text-muted-foreground">
                                        Editing content...
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleSaveEdit}
                                                disabled={isSaving}
                                            >
                                                <Save className="mr-2 h-4 w-4" />
                                                {isSaving ? "Saving..." : "Save"}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleStartEdit}
                                            >
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    copyToClipboard(
                                                        session.transcript_text || "",
                                                        "content"
                                                    )
                                                }
                                            >
                                                {copiedSection === "content" ? (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Content Display / Editor */}
                            <Card className="p-4">
                                {isEditing ? (
                                    <Textarea
                                        value={editedContent}
                                        onChange={(e) =>
                                            setEditedContent(e.target.value)
                                        }
                                        className="min-h-[500px] w-full resize-y font-sans text-sm"
                                        placeholder="Enter content..."
                                    />
                                ) : (
                                    <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                                        {filteredContent || "No content available"}
                                    </pre>
                                )}
                            </Card>

                            {!isEditing && searchQuery && (
                                <p className="text-sm text-muted-foreground">
                                    {filteredContent
                                        ? `Found results for "${searchQuery}"`
                                        : `No results found for "${searchQuery}"`}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Offer Tab (Pricing) */}
                    {activeTab === "offer" && (
                        <PricingDisplay
                            pricing={session.extracted_data?.pricing || null}
                        />
                    )}

                    {/* Beliefs Tab (Brand) */}
                    {activeTab === "beliefs" && (
                        <BrandDataDisplay brandData={session.brand_data || null} />
                    )}

                    {/* CTA Tab (Metadata + Raw) */}
                    {activeTab === "cta" && (
                        <div className="space-y-6">
                            {/* Metadata Section */}
                            <MetadataDisplay
                                metadata={session.metadata || null}
                                sessionName={session.session_name}
                                intakeMethod={session.intake_method}
                                createdAt={session.created_at}
                                scrapedUrl={session.scraped_url}
                                fileUrls={session.file_urls}
                            />

                            {/* Raw Data Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-foreground">
                                        Raw Data
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            copyToClipboard(
                                                JSON.stringify(session, null, 2),
                                                "raw"
                                            )
                                        }
                                    >
                                        {copiedSection === "raw" ? (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copy JSON
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <Card className="p-4">
                                    <pre className="max-h-[400px] overflow-auto text-xs">
                                        {JSON.stringify(session, null, 2)}
                                    </pre>
                                </Card>
                            </div>
                        </div>
                    )}
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
