/**
 * Testimonial/Quote Section Template
 * Featured testimonial with quote format
 */

import { getIconSvg } from "@/lib/utils/icon-mapper";

interface TestimonialTemplateOptions {
    quote?: string;
    author?: string;
    role?: string;
    company?: string;
}

export function generateTestimonialTemplate(
    options: TestimonialTemplateOptions = {}
): string {
    const {
        quote = "This program completely transformed how I run my business. The results were beyond what I imagined possible.",
        author = "Sarah Johnson",
        role = "CEO",
        company = "TechStart Inc.",
    } = options;

    return `
<section class="block testimonial-section" data-block-type="quote" style="padding: var(--space-24) var(--space-8); background: white;">
    <div style="max-width: 900px; margin: 0 auto; text-align: center;">
        <div style="width: 60px; height: 60px; margin: 0 auto var(--space-6); color: hsl(45 93% 58%);">
            ${getIconSvg("message-square")}
        </div>
        <blockquote data-editable="true" style="font-size: 1.5rem; line-height: 1.6; color: hsl(0 0% 12%); font-style: italic; margin-bottom: var(--space-6); font-weight: 500;">
            "${quote}"
        </blockquote>
        <div style="margin-top: var(--space-8);">
            <p data-editable="true" style="font-weight: 700; color: hsl(0 0% 12%); margin-bottom: var(--space-2);">
                ${author}
            </p>
            <p data-editable="true" style="color: hsl(0 0% 45%); font-size: 0.9375rem;">
                ${role} at ${company}
            </p>
        </div>
    </div>
</section>
`;
}
