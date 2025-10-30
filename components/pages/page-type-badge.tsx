/**
 * Badge component for page types with color coding
 */

import type { PageType } from "@/types/pages";

interface PageTypeBadgeProps {
    type: PageType;
}

export function PageTypeBadge({ type }: PageTypeBadgeProps) {
    const config = {
        enrollment: {
            label: "Enrollment",
            className: "bg-primary/10 text-primary",
        },
        watch: {
            label: "Watch",
            className: "bg-purple-100 text-purple-800",
        },
        registration: {
            label: "Registration",
            className: "bg-green-100 text-green-800",
        },
    };

    const { label, className } = config[type];

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
        >
            {label}
        </span>
    );
}
