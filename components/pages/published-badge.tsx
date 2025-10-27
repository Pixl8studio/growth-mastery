/**
 * Badge component for published status
 */

import { Check } from "lucide-react";

interface PublishedBadgeProps {
    isPublished: boolean;
}

export function PublishedBadge({ isPublished }: PublishedBadgeProps) {
    if (isPublished) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <Check className="h-3 w-3" />
                Published
            </span>
        );
    }

    return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            Draft
        </span>
    );
}
