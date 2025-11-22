/**
 * FAQ Section Template
 * Collapsible FAQ items
 */

import { getIconSvg } from "@/lib/utils/icon-mapper";

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQTemplateOptions {
    sectionTitle?: string;
    items?: FAQItem[];
}

export function generateFAQTemplate(options: FAQTemplateOptions = {}): string {
    const {
        sectionTitle = "Frequently Asked Questions",
        items = [
            {
                question: "How long does it take to see results?",
                answer: "Most clients see significant progress within the first 30 days of implementing our framework.",
            },
            {
                question: "Is this right for my business?",
                answer: "Our proven system works for businesses of all sizes, from startups to established companies.",
            },
            {
                question: "What kind of support do I get?",
                answer: "You'll receive comprehensive support including weekly coaching, community access, and 24/7 resources.",
            },
        ],
    } = options;

    const faqItemsHTML = items
        .map(
            (item, index) => `
        <div class="faq-item" style="background: white; border-radius: 0.75rem; padding: var(--space-6); margin-bottom: var(--space-4); box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer; transition: all 0.2s;" data-faq-index="${index}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3 data-editable="true" style="font-size: 1.125rem; font-weight: 700; color: hsl(0 0% 12%); flex: 1;">
                    ${item.question}
                </h3>
                <div style="width: 24px; height: 24px; color: hsl(103 89% 29%); flex-shrink: 0; margin-left: var(--space-4);">
                    ${getIconSvg("help-circle")}
                </div>
            </div>
            <p class="faq-answer" data-editable="true" style="color: hsl(0 0% 45%); line-height: 1.6; margin-top: var(--space-4); display: none;">
                ${item.answer}
            </p>
        </div>
    `
        )
        .join("");

    return `
<section class="block faq-section" data-block-type="faq" style="padding: var(--space-24) var(--space-8); background: linear-gradient(135deg, hsl(120 30% 96%), hsl(48 38% 98%));">
    <div style="max-width: 900px; margin: 0 auto;">
        <h2 data-editable="true" style="text-align: center; font-size: 2.5rem; font-weight: 800; color: hsl(0 0% 12%); margin-bottom: var(--space-12);">
            ${sectionTitle}
        </h2>
        <div class="faq-list">
            ${faqItemsHTML}
        </div>
    </div>
</section>
`;
}
