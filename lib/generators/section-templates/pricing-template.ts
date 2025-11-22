/**
 * Pricing Section Template
 * Single pricing card with features
 */

import { getIconSvg } from "@/lib/utils/icon-mapper";

interface PricingTemplateOptions {
    title?: string;
    price?: string;
    period?: string;
    features?: string[];
    ctaText?: string;
    theme?: {
        primary: string;
    };
}

export function generatePricingTemplate(options: PricingTemplateOptions = {}): string {
    const {
        title = "Complete Access",
        price = "$997",
        period = "one-time",
        features = [
            "Full framework access",
            "Weekly live coaching",
            "Private community",
            "All templates & tools",
            "Lifetime updates",
        ],
        ctaText = "Enroll Now",
        theme = { primary: "hsl(103 89% 29%)" },
    } = options;

    const featuresHTML = features
        .map(
            (feature) => `
        <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3);">
            <div style="width: 20px; height: 20px; color: hsl(103 89% 29%); flex-shrink: 0;">
                ${getIconSvg("star")}
            </div>
            <span data-editable="true" style="color: hsl(0 0% 25%);">
                ${feature}
            </span>
        </div>
    `
        )
        .join("");

    return `
<section class="block pricing-section" data-block-type="pricing" style="padding: var(--space-24) var(--space-8); background: white;">
    <div style="max-width: 500px; margin: 0 auto;">
        <div class="pricing-card" style="background: linear-gradient(135deg, hsl(48 38% 97%), hsl(120 30% 92%)); border-radius: 1rem; padding: var(--space-8); box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center;">
            <h3 data-editable="true" style="font-size: 1.75rem; font-weight: 700; color: hsl(0 0% 12%); margin-bottom: var(--space-4);">
                ${title}
            </h3>
            <div style="margin-bottom: var(--space-6);">
                <span data-editable="true" style="font-size: 3.5rem; font-weight: 900; color: ${theme.primary};">
                    ${price}
                </span>
                <span data-editable="true" style="color: hsl(0 0% 45%); margin-left: var(--space-2);">
                    ${period}
                </span>
            </div>
            <div style="text-align: left; margin-bottom: var(--space-8);">
                ${featuresHTML}
            </div>
            <button class="btn" data-editable="true" style="background: ${theme.primary}; color: white; padding: 1rem 2.5rem; border-radius: 0.375rem; font-size: 1.125rem; font-weight: 600; border: none; cursor: pointer; width: 100%; transition: all 0.2s; box-shadow: 0 4px 12px ${theme.primary}33;">
                ${ctaText}
            </button>
        </div>
    </div>
</section>
`;
}
