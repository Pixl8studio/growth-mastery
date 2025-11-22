/**
 * Hero Section Template
 * Clean, modern hero with headline, subheadline, and CTA
 */

import { getIconSvg } from "@/lib/utils/icon-mapper";

interface HeroTemplateOptions {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    theme?: {
        primary: string;
        secondary: string;
    };
}

export function generateHeroTemplate(options: HeroTemplateOptions = {}): string {
    const {
        headline = "Transform Your Business in 90 Days",
        subheadline = "Join thousands of entrepreneurs who have achieved breakthrough results with our proven framework",
        ctaText = "Get Started Free",
        theme = { primary: "hsl(103 89% 29%)", secondary: "hsl(45 93% 58%)" },
    } = options;

    return `
<section class="block hero-section" data-block-type="hero" style="background: linear-gradient(135deg, hsl(48 38% 97%), hsl(145 40% 88%)); padding: var(--space-24) var(--space-8); text-align: center;">
    <div style="max-width: 900px; margin: 0 auto;">
        <h1 data-editable="true" style="font-size: 3rem; font-weight: 900; line-height: 1.2; color: hsl(0 0% 12%); margin-bottom: var(--space-6);">
            ${headline}
        </h1>
        <p data-editable="true" style="font-size: 1.25rem; line-height: 1.6; color: hsl(0 0% 25%); margin-bottom: var(--space-8); max-width: 700px; margin-left: auto; margin-right: auto;">
            ${subheadline}
        </p>
        <button class="btn" data-editable="true" style="background: ${theme.primary}; color: white; padding: 1rem 2.5rem; border-radius: 0.375rem; font-size: 1.125rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px ${theme.primary}33;">
            ${ctaText}
        </button>
    </div>
</section>
`;
}
