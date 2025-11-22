/**
 * Proof/Credibility Section Template
 * Stats and social proof
 */

import { getIconSvg } from "@/lib/utils/icon-mapper";

interface Stat {
    number: string;
    label: string;
    icon: string;
}

interface ProofTemplateOptions {
    sectionTitle?: string;
    stats?: Stat[];
}

export function generateProofTemplate(options: ProofTemplateOptions = {}): string {
    const {
        sectionTitle = "Trusted by Thousands",
        stats = [
            { number: "10,000+", label: "Happy Clients", icon: "user" },
            { number: "$50M+", label: "Revenue Generated", icon: "dollar-sign" },
            { number: "98%", label: "Success Rate", icon: "bar-chart-3" },
        ],
    } = options;

    const statsHTML = stats
        .map(
            (stat) => `
        <div class="stat-card" style="text-align: center; padding: var(--space-6);">
            <div style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(45 93% 58%);">
                ${getIconSvg(stat.icon)}
            </div>
            <div data-editable="true" style="font-size: 2.5rem; font-weight: 900; color: hsl(103 89% 29%); margin-bottom: var(--space-2);">
                ${stat.number}
            </div>
            <div data-editable="true" style="color: hsl(0 0% 45%); font-weight: 600;">
                ${stat.label}
            </div>
        </div>
    `
        )
        .join("");

    return `
<section class="block proof-section" data-block-type="social-proof" style="padding: var(--space-24) var(--space-8); background: linear-gradient(135deg, hsl(103 89% 95%), hsl(45 93% 90%));">
    <div style="max-width: 1200px; margin: 0 auto;">
        <h2 data-editable="true" style="text-align: center; font-size: 2.5rem; font-weight: 800; color: hsl(0 0% 12%); margin-bottom: var(--space-12);">
            ${sectionTitle}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-8);">
            ${statsHTML}
        </div>
    </div>
</section>
`;
}
