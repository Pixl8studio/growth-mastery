/**
 * Metadata Display Component
 * Shows intake metadata in an organized key-value grid
 */

import { Card } from "@/components/ui/card";
import { Copy, Check, FileText, Calendar, Link2, Hash } from "lucide-react";
import { useState } from "react";

interface MetadataDisplayProps {
    metadata: Record<string, unknown> | null | undefined;
    sessionName?: string;
    intakeMethod?: string;
    createdAt?: string;
    scrapedUrl?: string;
    fileUrls?: string[];
}

export function MetadataDisplay({
    metadata,
    sessionName,
    intakeMethod,
    createdAt,
    scrapedUrl,
    fileUrls,
}: MetadataDisplayProps) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const copyToClipboard = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return "N/A";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        if (typeof value === "object") return JSON.stringify(value, null, 2);
        if (typeof value === "number") return value.toLocaleString();
        return String(value);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            dateStyle: "long",
            timeStyle: "short",
        }).format(date);
    };

    const getMethodIcon = (method: string) => {
        switch (method) {
            case "voice":
                return "🎤";
            case "paste":
                return "📝";
            case "upload":
                return "📎";
            case "scrape":
                return "🌐";
            case "google_drive":
                return "☁️";
            default:
                return "📄";
        }
    };

    return (
        <div className="space-y-6">
            {/* Session Overview */}
            <Card className="p-4">
                <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Session Overview
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    {sessionName && (
                        <div className="flex items-start gap-3">
                            <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Session Name
                                </div>
                                <div className="mt-1 text-foreground">
                                    {sessionName}
                                </div>
                            </div>
                        </div>
                    )}

                    {intakeMethod && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-xl flex-shrink-0">
                                {getMethodIcon(intakeMethod)}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Intake Method
                                </div>
                                <div className="mt-1 capitalize text-foreground">
                                    {intakeMethod.replace("_", " ")}
                                </div>
                            </div>
                        </div>
                    )}

                    {createdAt && (
                        <div className="flex items-start gap-3">
                            <Calendar className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Created
                                </div>
                                <div className="mt-1 text-foreground">
                                    {formatDate(createdAt)}
                                </div>
                            </div>
                        </div>
                    )}

                    {scrapedUrl && (
                        <div className="flex items-start gap-3">
                            <Link2 className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Source URL
                                </div>
                                <a
                                    href={scrapedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 block truncate text-primary hover:underline"
                                >
                                    {scrapedUrl}
                                </a>
                            </div>
                        </div>
                    )}

                    {fileUrls && fileUrls.length > 0 && (
                        <div className="flex items-start gap-3">
                            <Hash className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Uploaded Files
                                </div>
                                <div className="mt-1 text-foreground">
                                    {fileUrls.length} file
                                    {fileUrls.length !== 1 ? "s" : ""}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Metadata Fields */}
            {metadata && Object.keys(metadata).length > 0 && (
                <div>
                    <h3 className="mb-4 text-lg font-semibold text-foreground">
                        Technical Metadata
                    </h3>
                    <Card className="p-4">
                        <div className="space-y-3">
                            {Object.entries(metadata).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0"
                                >
                                    <div className="flex-1">
                                        <div className="mb-1 font-mono text-sm font-medium text-muted-foreground">
                                            {key}
                                        </div>
                                        <div className="break-words text-foreground">
                                            {typeof value === "object" ? (
                                                <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                                                    {formatValue(value)}
                                                </pre>
                                            ) : (
                                                formatValue(value)
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(formatValue(value), key)
                                        }
                                        className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        title="Copy value"
                                    >
                                        {copiedKey === key ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Empty State */}
            {(!metadata || Object.keys(metadata).length === 0) && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-muted-foreground">
                        No additional metadata available.
                    </p>
                </div>
            )}
        </div>
    );
}
