/**
 * Badge component for page types with color coding
 */

import type { PageType } from "@/types/pages";

interface PageTypeBadgeProps {
    type: PageType;
}

export function PageTypeBadge({ type }: PageTypeBadgeProps) {
    const config: Record<PageType, { label: string; className: string }> = {
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
        confirmation: {
            label: "Confirmation",
            className: "bg-emerald-100 text-emerald-800",
        },
        call_booking: {
            label: "Call Booking",
            className: "bg-blue-100 text-blue-800",
        },
        checkout: {
            label: "Checkout",
            className: "bg-amber-100 text-amber-800",
        },
        upsell: {
            label: "Upsell",
            className: "bg-orange-100 text-orange-800",
        },
        thank_you: {
            label: "Thank You",
            className: "bg-teal-100 text-teal-800",
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
