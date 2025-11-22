/**
 * Features Section Template
 * 3-column feature grid with icons
 */

import { getIconSvg } from "@/lib/utils/icon-mapper";

interface Feature {
    icon: string;
    title: string;
    description: string;
}

interface FeaturesTemplateOptions {
    sectionTitle?: string;
    features?: Feature[];
}

export function generateFeaturesTemplate(
    options: FeaturesTemplateOptions = {}
): string {
    const {
        sectionTitle = "Everything You Need to Succeed",
        features = [
            {
                icon: "target",
                title: "Strategic Framework",
                description:
                    "Follow our proven step-by-step process to achieve your goals faster",
            },
            {
                icon: "zap",
                title: "Quick Implementation",
                description:
                    "Get results in days, not months, with our streamlined approach",
            },
            {
                icon: "rocket",
                title: "Scalable Growth",
                description: "Build systems that grow with you and compound over time",
            },
        ],
    } = options;

    const featuresHTML = features
        .map(
            (feature) => `
        <div class="feature-card" style="text-align: center; padding: var(--space-6); background: white; border-radius: 0.75rem; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: transform 0.2s;">
            <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">
                ${getIconSvg(feature.icon)}
            </div>
            <h3 class="feature-title" data-editable="true" style="font-size: 1.25rem; font-weight: 700; color: hsl(0 0% 12%); margin-bottom: var(--space-3);">
                ${feature.title}
            </h3>
            <p class="feature-description" data-editable="true" style="color: hsl(0 0% 45%); line-height: 1.6;">
                ${feature.description}
            </p>
        </div>
    `
        )
        .join("");

    return `
<section class="block features-section" data-block-type="features" style="padding: var(--space-24) var(--space-8); background: linear-gradient(135deg, hsl(120 30% 96%), hsl(48 38% 98%));">
    <div style="max-width: 1200px; margin: 0 auto;">
        <h2 data-editable="true" style="text-align: center; font-size: 2.5rem; font-weight: 800; color: hsl(0 0% 12%); margin-bottom: var(--space-12);">
            ${sectionTitle}
        </h2>
        <div class="features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-8);">
            ${featuresHTML}
        </div>
    </div>
</section>
`;
}
