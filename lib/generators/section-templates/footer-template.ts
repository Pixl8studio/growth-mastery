/**
 * Footer Section Template
 * Simple footer with copyright and links
 */

interface FooterTemplateOptions {
    companyName?: string;
    links?: Array<{ text: string; url: string }>;
    year?: number;
}

export function generateFooterTemplate(options: FooterTemplateOptions = {}): string {
    const {
        companyName = "Your Company",
        links = [
            { text: "Privacy Policy", url: "#privacy" },
            { text: "Terms of Service", url: "#terms" },
            { text: "Contact Us", url: "#contact" },
        ],
        year = new Date().getFullYear(),
    } = options;

    const linksHTML = links
        .map(
            (link) => `
        <a href="${link.url}" data-editable="true" style="color: rgba(255, 255, 255, 0.8); text-decoration: none; transition: color 0.2s; hover: color: white;">
            ${link.text}
        </a>
    `
        )
        .join(
            '<span style="margin: 0 var(--space-3); color: rgba(255, 255, 255, 0.4);">•</span>'
        );

    return `
<footer class="block footer-section" data-block-type="foot" style="background: linear-gradient(135deg, hsl(152 88% 15%), hsl(103 89% 29%)); padding: var(--space-12) var(--space-8); text-align: center;">
    <div style="max-width: 1200px; margin: 0 auto;">
        <div style="margin-bottom: var(--space-6); display: flex; justify-content: center; gap: var(--space-2); flex-wrap: wrap;">
            ${linksHTML}
        </div>
        <p data-editable="true" style="color: rgba(255, 255, 255, 0.7); font-size: 0.875rem;">
            © ${year} ${companyName}. All rights reserved.
        </p>
    </div>
</footer>
`;
}
