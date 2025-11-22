/**
 * Three-Step Framework Template
 * Simple 3-step process visualization
 */

import { getIconSvg } from "@/lib/utils/icon-mapper";

interface Step {
    number: number;
    icon: string;
    title: string;
    description: string;
}

interface ThreeStepTemplateOptions {
    sectionTitle?: string;
    steps?: Step[];
}

export function generateThreeStepTemplate(
    options: ThreeStepTemplateOptions = {}
): string {
    const {
        sectionTitle = "How It Works",
        steps = [
            {
                number: 1,
                icon: "target",
                title: "Define Your Goals",
                description: "Start by clarifying exactly what you want to achieve",
            },
            {
                number: 2,
                icon: "zap",
                title: "Take Action",
                description: "Follow our proven framework to make rapid progress",
            },
            {
                number: 3,
                icon: "rocket",
                title: "Get Results",
                description: "Celebrate your success and scale to new heights",
            },
        ],
    } = options;

    const stepsHTML = steps
        .map(
            (step) => `
        <div class="step-card" style="text-align: center; padding: var(--space-6); background: white; border-radius: 0.75rem; position: relative;">
            <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); width: 40px; height: 40px; background: hsl(103 89% 29%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.25rem;">
                ${step.number}
            </div>
            <div class="step-icon" style="width: 48px; height: 48px; margin: var(--space-8) auto var(--space-4); color: hsl(45 93% 58%);">
                ${getIconSvg(step.icon)}
            </div>
            <h3 data-editable="true" style="font-size: 1.25rem; font-weight: 700; color: hsl(0 0% 12%); margin-bottom: var(--space-3);">
                ${step.title}
            </h3>
            <p data-editable="true" style="color: hsl(0 0% 45%); line-height: 1.6;">
                ${step.description}
            </p>
        </div>
    `
        )
        .join("");

    return `
<section class="block steps-section" data-block-type="process" style="padding: var(--space-24) var(--space-8); background: hsl(48 38% 97%);">
    <div style="max-width: 1200px; margin: 0 auto;">
        <h2 data-editable="true" style="text-align: center; font-size: 2.5rem; font-weight: 800; color: hsl(0 0% 12%); margin-bottom: var(--space-12);">
            ${sectionTitle}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-8);">
            ${stepsHTML}
        </div>
    </div>
</section>
`;
}
