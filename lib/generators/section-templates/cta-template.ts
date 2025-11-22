/**
 * Call-to-Action Section Template
 * Compelling CTA with headline and button
 */

interface CTATemplateOptions {
    headline?: string;
    description?: string;
    buttonText?: string;
    theme?: {
        primary: string;
    };
}

export function generateCTATemplate(options: CTATemplateOptions = {}): string {
    const {
        headline = "Ready to Get Started?",
        description = "Join thousands of successful entrepreneurs who have transformed their business with our proven system",
        buttonText = "Start Your Journey Today",
        theme = { primary: "hsl(103 89% 29%)" },
    } = options;

    return `
<section class="block cta-section" data-block-type="cta" style="background: linear-gradient(135deg, ${theme.primary}, hsl(103 89% 35%)); padding: var(--space-24) var(--space-8); text-align: center;">
    <div style="max-width: 800px; margin: 0 auto;">
        <h2 data-editable="true" style="font-size: 2.5rem; font-weight: 800; line-height: 1.2; color: white; margin-bottom: var(--space-6);">
            ${headline}
        </h2>
        <p data-editable="true" style="font-size: 1.125rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9); margin-bottom: var(--space-8);">
            ${description}
        </p>
        <button class="btn" data-editable="true" style="background: white; color: ${theme.primary}; padding: 1rem 2.5rem; border-radius: 0.375rem; font-size: 1.125rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            ${buttonText}
        </button>
    </div>
</section>
`;
}
