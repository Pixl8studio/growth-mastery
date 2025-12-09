"use client";

import { Phone, Upload, FileText, Globe, Cloud, MessageSquare } from "lucide-react";

interface IntakeSession {
    id: string;
    session_name?: string;
    created_at: string;
    intake_method: string;
    call_status: string;
}

interface YourIntakeSessionsProps {
    sessions: IntakeSession[];
    onSessionClick?: (session: IntakeSession) => void;
}

export function YourIntakeSessions({
    sessions,
    onSessionClick,
}: YourIntakeSessionsProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const getMethodIcon = (method: string) => {
        switch (method) {
            case "voice":
                return <Phone className="h-4 w-4" />;
            case "upload":
                return <Upload className="h-4 w-4" />;
            case "paste":
                return <FileText className="h-4 w-4" />;
            case "scrape":
                return <Globe className="h-4 w-4" />;
            case "google_drive":
                return <Cloud className="h-4 w-4" />;
            default:
                return <MessageSquare className="h-4 w-4" />;
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case "voice":
                return "Voice Call";
            case "upload":
                return "Document Upload";
            case "paste":
                return "Pasted Content";
            case "scrape":
                return "Web Scraping";
            case "google_drive":
                return "Google Drive";
            default:
                return "Unknown";
        }
    };

    return (
        <div className="rounded-lg border border-border bg-card shadow-soft">
            <div className="border-b border-border p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-foreground">
                        Your Intake Sessions
                    </h3>
                    <span className="text-sm text-muted-foreground">
                        {sessions.length} completed
                    </span>
                </div>
            </div>

            <div className="p-6">
                {sessions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>
                            No intake sessions yet. Complete one above to get started!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSessionClick?.(session)}
                                className="cursor-pointer rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="mb-2 flex items-center gap-3">
                                            <div
                                                className={`h-3 w-3 flex-shrink-0 rounded-full ${
                                                    session.call_status === "completed"
                                                        ? "bg-green-500"
                                                        : session.call_status ===
                                                            "in_progress"
                                                          ? "bg-primary/50"
                                                          : "bg-red-500"
                                                }`}
                                            />
                                            <h4 className="text-lg font-semibold text-foreground">
                                                {session.session_name ||
                                                    formatDate(session.created_at)}
                                            </h4>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-2">
                                                {getMethodIcon(
                                                    session.intake_method || "voice"
                                                )}
                                                {getMethodLabel(
                                                    session.intake_method || "voice"
                                                )}
                                            </span>
                                            <span>
                                                {formatDate(session.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
