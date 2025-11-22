/**
 * Story/About Section Template
 * Two-column layout with image and text
 */

interface StoryTemplateOptions {
    headline?: string;
    paragraphs?: string[];
}

export function generateStoryTemplate(options: StoryTemplateOptions = {}): string {
    const {
        headline = "Our Mission",
        paragraphs = [
            "We started this company because we saw too many entrepreneurs struggling with the same challenges we once faced. We knew there had to be a better way.",
            "After years of trial and error, we developed a framework that works. Now we're on a mission to help others achieve the success they deserve.",
        ],
    } = options;

    const paragraphsHTML = paragraphs
        .map(
            (paragraph) => `
        <p data-editable="true" style="color: hsl(0 0% 25%); line-height: 1.8; margin-bottom: var(--space-6);">
            ${paragraph}
        </p>
    `
        )
        .join("");

    return `
<section class="block story-section" data-block-type="story" style="padding: var(--space-24) var(--space-8); background: white;">
    <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-12); align-items: center;">
        <div>
            <h2 data-editable="true" style="font-size: 2.5rem; font-weight: 800; color: hsl(0 0% 12%); margin-bottom: var(--space-6);">
                ${headline}
            </h2>
            ${paragraphsHTML}
        </div>
        <div style="aspect-ratio: 4/3; background: hsl(120 30% 92%); border-radius: 1rem; display: flex; align-items: center; justify-content: center; color: hsl(0 0% 45%);">
            [Image Placeholder]
        </div>
    </div>
</section>
`;
}
