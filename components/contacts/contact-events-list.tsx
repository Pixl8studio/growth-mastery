/**
 * Contact Events List Component
 * Display chronological list of contact activity events
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface ContactEvent {
    id: string;
    event_type: string;
    page_type: string | null;
    event_data: unknown;
    created_at: string;
}

interface ContactEventsListProps {
    events: ContactEvent[];
}

export function ContactEventsList({ events }: ContactEventsListProps) {
    const getEventIcon = (eventType: string): string => {
        switch (eventType) {
            case "page_view":
                return "👁️";
            case "video_start":
                return "▶️";
            case "video_progress":
                return "⏯️";
            case "video_complete":
                return "✅";
            case "cta_click":
                return "🖱️";
            case "form_submit":
                return "📝";
            default:
                return "📌";
        }
    };

    const getEventTitle = (event: ContactEvent): string => {
        const pageType = event.page_type || "page";
        switch (event.event_type) {
            case "page_view":
                return `Viewed ${pageType} page`;
            case "video_start":
                return "Started watching video";
            case "video_progress":
                return "Video progress";
            case "video_complete":
                return "Completed video";
            case "cta_click":
                return "Clicked CTA button";
            case "form_submit":
                return `Submitted ${pageType} form`;
            default:
                return event.event_type;
        }
    };

    const getEventVariant = (
        eventType: string
    ): "default" | "secondary" | "success" | "warning" => {
        switch (eventType) {
            case "video_complete":
            case "form_submit":
                return "success";
            case "video_start":
            case "cta_click":
                return "default";
            case "video_progress":
                return "warning";
            default:
                return "secondary";
        }
    };

    if (events.length === 0) {
        return (
            <div className="text-center text-sm text-gray-500">
                No activity events recorded
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {events.map((event, index) => (
                <div
                    key={event.id}
                    className={`flex items-start space-x-3 ${
                        index !== events.length - 1
                            ? "border-b border-gray-100 pb-4"
                            : ""
                    }`}
                >
                    {/* Icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg">
                        {getEventIcon(event.event_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                                {getEventTitle(event)}
                            </p>
                            <Badge variant={getEventVariant(event.event_type)}>
                                {event.event_type}
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            {formatDateTime(event.created_at)}
                        </p>
                        {event.event_data &&
                        typeof event.event_data === "object" &&
                        event.event_data !== null &&
                        Object.keys(event.event_data as Record<string, unknown>)
                            .length > 0 ? (
                            <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                                    View details
                                </summary>
                                <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                                    {JSON.stringify(event.event_data, null, 2)}
                                </pre>
                            </details>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}
