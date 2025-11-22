/**
 * Enrollment Page HTML Generator
 * Generates editor-ready HTML for sales/enrollment pages with offer integration
 */

import type { Slide } from "@/lib/ai/types";
import { getIconSvg } from "@/lib/utils/icon-mapper";

interface Theme {
    primary: string;
    secondary: string;
    background: string;
    text: string;
}

interface DeckStructureData {
    id: string;
    slides: Slide[];
    metadata?: {
        title?: string;
        [key: string]: unknown;
    };
    total_slides?: number;
}

interface OfferData {
    id: string;
    name: string;
    tagline?: string | null;
    description?: string | null;
    price: number;
    currency: string;
    features?: Array<{
        title: string;
        description: string;
        value?: string;
    }>;
}

interface EnrollmentPageGeneratorOptions {
    projectId: string;
    offer: OfferData;
    deckStructure: DeckStructureData;
    theme: Theme;
    templateType?: "urgency-convert" | "premium-elegant" | "value-focused";
}

/**
 * Extract testimonials from deck structure
 */
function extractTestimonialsFromDeck(slides: Slide[]): Array<{
    quote: string;
    content: string;
    author: string;
    role: string;
}> {
    // Look for slides with quotes or testimonial-like content
    const testimonialSlides = slides.filter(
        (s) => s.description?.includes('"') || s.title?.includes('"')
    );

    if (testimonialSlides.length === 0) {
        return [
            {
                quote: "This program paid for itself in the first week!",
                content:
                    "I implemented just one strategy from this program and generated an additional $15,000 in revenue within 7 days. The ROI is incredible and the content is actionable from day one.",
                author: "Sarah Johnson",
                role: "Marketing Consultant",
            },
            {
                quote: "Finally, a program that actually delivers results",
                content:
                    "I've tried dozens of courses before this one. This is the first program that gave me a clear, step-by-step path to success. I went from struggling to thriving in just 90 days.",
                author: "Michael Chen",
                role: "Business Owner",
            },
        ];
    }

    return testimonialSlides.slice(0, 3).map((slide, idx) => ({
        quote:
            slide.title || ["Amazing results", "Game changer", "Best investment"][idx],
        content: slide.description || "This program transformed my business",
        author: ["Sarah Johnson", "Michael Chen", "Lisa Rodriguez"][idx],
        role: ["Marketing Consultant", "Business Owner", "CEO"][idx],
    }));
}

/**
 * Get template-specific styling
 */
function getTemplateStyle(
    templateType: string,
    theme: Theme
): {
    heroStyle: string;
    buttonColor: string;
    accent: string;
} {
    const templates = {
        "urgency-convert": {
            heroStyle: `background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);`,
            buttonColor: theme.primary,
            accent: theme.secondary,
        },
        "premium-elegant": {
            heroStyle: `background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%);`,
            buttonColor: "#c084fc",
            accent: "#7c3aed",
        },
        "value-focused": {
            heroStyle: `background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);`,
            buttonColor: theme.secondary,
            accent: theme.primary,
        },
    };

    return (
        templates[templateType as keyof typeof templates] ||
        templates["urgency-convert"]
    );
}

/**
 * Generate complete enrollment page HTML with editor-ready blocks
 */
export function generateEnrollmentHTML(
    options: EnrollmentPageGeneratorOptions
): string {
    const { offer, deckStructure, theme, templateType = "urgency-convert" } = options;

    const style = getTemplateStyle(templateType, theme);
    const testimonials = extractTestimonialsFromDeck(deckStructure.slides);

    // Process offer features
    const offerFeatures = offer.features || [
        {
            title: "Complete Training Modules",
            description:
                "Step-by-step video training covering every aspect of building and scaling your business.",
            value: "$2,997",
        },
        {
            title: "Done-for-You Templates",
            description:
                "Ready-to-use templates, scripts, and frameworks that you can implement immediately.",
            value: "$1,497",
        },
        {
            title: "Private Community Access",
            description:
                "Join an exclusive community of entrepreneurs and get ongoing support from peers.",
            value: "$997",
        },
    ];

    const totalValue = offerFeatures.reduce((sum, f) => {
        const value = parseInt(f.value?.replace(/[^0-9]/g, "") || "0");
        return sum + value;
    }, 0);

    return `
<div class="page-container">
    <!-- Hero Sales Section -->
    <div class="block hero-block bg-hero" data-block-type="hero" style="${style.heroStyle} padding: var(--space-16) 0;">
        <div class="container">
            <div class="hero-content" style="text-align: center; max-width: 700px; margin: 0 auto;">
                <h1 class="hero-title" data-editable="true" style="color: white; font-size: 3rem; font-weight: 800; margin-bottom: var(--space-6);">
                    ${offer.name}
                </h1>
                <h2 class="hero-subtitle" data-editable="true" style="color: white; font-size: 1.5rem; margin-bottom: var(--space-8); opacity: 0.95;">
                    ${offer.tagline || offer.description || "Transform your business with our proven system"}
                </h2>
                <div class="price-section" style="background: rgba(255,255,255,0.1); padding: var(--space-8); border-radius: 12px; margin-bottom: var(--space-8);">
                    <div class="price-display" style="text-align: center;">
                        <span style="color: white; font-size: 0.9rem; text-decoration: line-through; opacity: 0.8;">${offer.currency} ${(offer.price * 1.5).toLocaleString()}</span>
                        <div class="current-price" style="color: white; font-size: 3rem; font-weight: 800; margin: var(--space-2) 0;">
                            ${offer.currency} ${offer.price.toLocaleString()}
                        </div>
                        <p style="color: white; font-size: 0.9rem; opacity: 0.9;" data-editable="true">Limited Time Offer - Save 33%</p>
                    </div>
                </div>
                <button class="btn btn-primary btn-large" data-editable="true"
                        style="background: white; color: ${style.accent}; padding: 1.2rem 2rem; font-size: 1.1rem; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
                    ENROLL NOW - SECURE YOUR SPOT
                </button>
                <p style="color: white; margin-top: var(--space-4); font-size: 0.9rem; opacity: 0.9;" data-editable="true">
                    Secure checkout • 30-day money-back guarantee • Instant access
                </p>
            </div>
        </div>
    </div>

    <!-- Value Proposition Section -->
    <div class="block bg-section-1" data-block-type="value-prop" style="padding: var(--space-20) 0; background: white;">
        <div class="container">
            <div class="heading-block" style="text-align: center; margin-bottom: var(--space-12);">
                <h2 class="heading-2" data-editable="true" style="font-size: 2.5rem; font-weight: 800; color: #1f2937;">
                    What You Get <strong style="color: ${theme.primary};">Inside</strong>
                </h2>
            </div>
            <div class="features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-8); max-width: 1200px; margin: 0 auto;">
                ${offerFeatures
                    .map(
                        (feature) => `
                    <div class="feature-card" style="background: #f9fafb; padding: var(--space-6); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                        <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${getIconSvg('book-open')}</div>
                        <h3 class="feature-title" data-editable="true" style="margin-bottom: var(--space-4); font-size: 1.3rem; font-weight: 700; color: #1f2937;">${feature.title}</h3>
                        <p class="feature-description" data-editable="true" style="color: #6b7280; margin-bottom: var(--space-3); line-height: 1.6;">${feature.description}</p>
                        <div class="feature-value" data-editable="true" style="font-weight: 600; color: ${theme.primary}; margin-top: var(--space-3);">Value: ${feature.value}</div>
                    </div>
                `
                    )
                    .join("")}
            </div>

            <div class="total-value" style="text-align: center; margin-top: var(--space-12); padding: var(--space-8); background: #f9fafb; border-radius: 12px;">
                <h3 data-editable="true" style="margin-bottom: var(--space-4); font-size: 1.3rem; color: #6b7280;">Total Value: <span style="color: ${theme.primary};">$${totalValue.toLocaleString()}</span></h3>
                <h2 data-editable="true" style="font-size: 2rem; margin-bottom: var(--space-4); font-weight: 800; color: #1f2937;">Your Investment Today: <strong style="color: ${theme.primary};">${offer.currency} ${offer.price.toLocaleString()}</strong></h2>
                <p data-editable="true" style="color: #6b7280;">You save over 80% when you enroll today!</p>
            </div>
        </div>
    </div>

    <!-- Testimonials Section -->
    <div class="block testimonial-block bg-section-2" data-block-type="testimonial" style="padding: var(--space-20) 0; background: #f9fafb;">
        <div class="container">
            <div class="heading-block" style="text-align: center; margin-bottom: var(--space-12);">
                <h2 class="heading-2" data-editable="true" style="font-size: 2.5rem; font-weight: 800; color: #1f2937;">
                    Success <strong style="color: ${theme.primary};">Stories</strong>
                </h2>
            </div>
            <div class="testimonial-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: var(--space-8); max-width: 1200px; margin: 0 auto;">
                ${testimonials
                    .map(
                        (testimonial) => `
                    <div class="testimonial-card" style="background: white; padding: var(--space-6); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                        <div class="stars" style="color: #fbbf24; margin-bottom: var(--space-4); font-size: 1.2rem;">★★★★★</div>
                        <p class="testimonial-quote" data-editable="true" style="font-size: 1.1rem; font-weight: 600; color: ${theme.primary}; margin-bottom: var(--space-4);">"${testimonial.quote}"</p>
                        <p style="margin-bottom: var(--space-4); color: #6b7280; line-height: 1.6;" data-editable="true">"${testimonial.content}"</p>
                        <div class="testimonial-author" style="display: flex; align-items: center; gap: var(--space-3);">
                            <div class="testimonial-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, ${theme.primary}, ${theme.secondary});"></div>
                            <div class="testimonial-info">
                                <h4 data-editable="true" style="margin: 0; font-weight: 600; color: #1f2937;">${testimonial.author}</h4>
                                <p data-editable="true" style="margin: 0; color: #6b7280; font-size: 0.9rem;">${testimonial.role}</p>
                            </div>
                        </div>
                    </div>
                `
                    )
                    .join("")}
            </div>
        </div>
    </div>

    <!-- Urgency Section -->
    <div class="block bg-urgency" data-block-type="urgency" style="background: #fee2e2; padding: var(--space-16) 0; border-left: 4px solid ${style.buttonColor};">
        <div class="container">
            <div style="text-align: center; max-width: 600px; margin: 0 auto;">
                <h2 data-editable="true" style="color: #dc2626; margin-bottom: var(--space-4); font-size: 1.8rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <span style="width: 28px; height: 28px; display: inline-flex; align-items: center;">${getIconSvg('clock')}</span>
                    <strong>Limited Time Offer</strong>
                </h2>
                <p data-editable="true" style="color: #7f1d1d; margin-bottom: var(--space-6); font-size: 1.1rem;">
                    This special pricing expires in 24 hours. After that, the price returns to $${(offer.price * 1.5).toLocaleString()}.
                </p>
                <div class="countdown-timer" style="display: flex; justify-content: center; gap: var(--space-4); margin-bottom: var(--space-8);">
                    <div class="timer-block" style="background: white; padding: var(--space-4); border-radius: 8px; min-width: 60px;">
                        <div class="timer-number" style="font-size: 1.5rem; font-weight: 800; color: ${style.accent};">23</div>
                        <div class="timer-label" style="font-size: 0.8rem; color: #6b7280;">HOURS</div>
                    </div>
                    <div class="timer-block" style="background: white; padding: var(--space-4); border-radius: 8px; min-width: 60px;">
                        <div class="timer-number" style="font-size: 1.5rem; font-weight: 800; color: ${style.accent};">47</div>
                        <div class="timer-label" style="font-size: 0.8rem; color: #6b7280;">MINUTES</div>
                    </div>
                    <div class="timer-block" style="background: white; padding: var(--space-4); border-radius: 8px; min-width: 60px;">
                        <div class="timer-number" style="font-size: 1.5rem; font-weight: 800; color: ${style.accent};">32</div>
                        <div class="timer-label" style="font-size: 0.8rem; color: #6b7280;">SECONDS</div>
                    </div>
                </div>
                <p data-editable="true" style="color: #7f1d1d; font-weight: 600;">Don't miss out on this incredible opportunity!</p>
            </div>
        </div>
    </div>

    <!-- Final CTA Section -->
    <div class="block bg-cta" data-block-type="final-cta" style="background: ${style.heroStyle} padding: var(--space-20) 0; text-align: center;">
        <div class="container">
            <h2 class="heading-2" data-editable="true" style="color: white; margin-bottom: var(--space-6); font-size: 2.5rem; font-weight: 800;">
                Ready to <strong>Transform Your Business?</strong>
            </h2>
            <p style="color: white; font-size: 1.2rem; margin-bottom: var(--space-8); opacity: 0.95;" data-editable="true">
                Join thousands of successful entrepreneurs who have already transformed their businesses.
            </p>

            <!-- Payment Form Placeholder -->
            <div class="payment-form" style="background: white; padding: var(--space-8); border-radius: 12px; max-width: 500px; margin: 0 auto var(--space-8);">
                <h3 data-editable="true" style="color: #1f2937; margin-bottom: var(--space-6); font-size: 1.3rem; font-weight: 700;">Secure Checkout</h3>
                <div class="form-group" style="margin-bottom: var(--space-4); text-align: left;">
                    <label style="display: block; margin-bottom: var(--space-2); color: #374151; font-weight: 500;">Full Name</label>
                    <input type="text" placeholder="Enter your full name"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
                </div>
                <div class="form-group" style="margin-bottom: var(--space-4); text-align: left;">
                    <label style="display: block; margin-bottom: var(--space-2); color: #374151; font-weight: 500;">Email Address</label>
                    <input type="email" placeholder="Enter your email"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
                </div>
                <div class="form-group" style="margin-bottom: var(--space-6); text-align: left;">
                    <label style="display: block; margin-bottom: var(--space-2); color: #374151; font-weight: 500;">Card Information</label>
                    <input type="text" placeholder="1234 5678 9012 3456"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
                </div>

                <button class="btn btn-primary btn-large" data-editable="true"
                        style="background: ${style.buttonColor}; color: white; padding: 1rem 2rem; font-size: 1.1rem; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                    COMPLETE YOUR ENROLLMENT - ${offer.currency} ${offer.price.toLocaleString()}
                </button>
                <p style="margin-top: var(--space-4); color: #6b7280; font-size: 0.8rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap;" data-editable="true">
                    <span style="display: inline-flex; align-items: center; gap: 0.25rem;"><span style="width: 14px; height: 14px;">${getIconSvg('lock')}</span> SSL secured</span> •
                    <span style="display: inline-flex; align-items: center; gap: 0.25rem;"><span style="width: 14px; height: 14px;">${getIconSvg('credit-card')}</span> All major cards accepted</span> •
                    <span style="display: inline-flex; align-items: center; gap: 0.25rem;"><span style="width: 14px; height: 14px;">${getIconSvg('shield-check')}</span> Money-back guarantee</span>
                </p>
            </div>

            <p style="color: white; font-size: 0.9rem; opacity: 0.9;" data-editable="true">
                Questions? Email us at support@example.com or call 1-800-123-4567
            </p>
        </div>
    </div>
</div>
    `.trim();
}
