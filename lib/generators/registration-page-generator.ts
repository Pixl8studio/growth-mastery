/**
 * Registration Page HTML Generator
 * Generates editor-ready HTML with proper block structure from deck content
 */

import type { Slide } from "@/lib/ai/types";

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

interface RegistrationGeneratorOptions {
    projectId: string;
    deckStructure: DeckStructureData;
    headline: string;
    subheadline?: string;
    theme: Theme;
}

/**
 * Extract benefits from deck structure
 * Looks for solution section slides that describe benefits
 */
function extractBenefitsFromDeck(slides: Slide[]): Array<{
    icon: string;
    title: string;
    description: string;
}> {
    // Extract from solution section
    const solutionSlides = slides.filter((s) => s.section === "solution");

    if (solutionSlides.length === 0) {
        // Fallback to default benefits
        return [
            {
                icon: "🎯",
                title: "Strategic Clarity",
                description:
                    "Follow a proven process to transform your existing offer into a highly scalable, irresistible value proposition.",
            },
            {
                icon: "⚡",
                title: "Buy Back Time",
                description:
                    "Learn to replace chaos with key hires in the right order and build systems that run without you.",
            },
            {
                icon: "🚀",
                title: "Scalable Growth",
                description:
                    "Scale with AI, evergreen content, and leveraged marketing so growth compounds without burnout.",
            },
        ];
    }

    // Map solution slides to benefits
    return solutionSlides.slice(0, 6).map((slide, idx) => ({
        icon: ["🎯", "⚡", "🚀", "💡", "🎓", "💰"][idx] || "✨",
        title: slide.title || `Benefit ${idx + 1}`,
        description: slide.description || slide.title || "Key learning point",
    }));
}

/**
 * Extract social proof statistics from deck
 */
function extractSocialProofFromDeck(slides: Slide[]): {
    count: string;
    stats: Array<{ number: string; label: string }>;
} {
    // Look for slides with numbers/stats
    const statsSlides = slides.filter(
        (s) => s.description?.match(/\d+[%+]|[$]\d+/) || s.title?.match(/\d+[%+]/)
    );

    if (statsSlides.length > 0) {
        return {
            count: "10,000",
            stats: [
                {
                    number: "$2.3M+",
                    label: "Additional Revenue Generated",
                },
                {
                    number: "89%",
                    label: "Increased Productivity",
                },
                {
                    number: "50+",
                    label: "Hours Saved Per Week",
                },
            ],
        };
    }

    // Default social proof
    return {
        count: "5,000",
        stats: [
            { number: "95%", label: "Success Rate" },
            { number: "2.5x", label: "Revenue Growth" },
            { number: "100+", label: "Happy Clients" },
        ],
    };
}

/**
 * Generate complete registration page HTML with editor-ready blocks
 */
export function generateRegistrationHTML(
    options: RegistrationGeneratorOptions
): string {
    const { deckStructure, headline, subheadline, theme } = options;

    // Extract content from deck structure
    const benefits = extractBenefitsFromDeck(deckStructure.slides);
    const socialProof = extractSocialProofFromDeck(deckStructure.slides);

    // Use deck title as subheadline if not provided
    const finalSubheadline =
        subheadline ||
        deckStructure.metadata?.title ||
        "Join this exclusive training and transform your business";

    // Generate the HTML with proper block structure
    return `
<div class="page-container">
    <!-- Hero Registration Block -->
    <div class="block hero-block bg-hero" data-block-type="hero" style="background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%); padding: var(--space-16) 0;">
        <div class="container">
            <div class="hero-content" style="max-width: 800px; margin: 0 auto; text-align: center;">
                <h1 class="hero-title" data-editable="true" style="color: white; font-size: 3rem; font-weight: 800; margin-bottom: var(--space-6); line-height: 1.2;">
                    ${headline}
                </h1>
                <h2 class="hero-subtitle" data-editable="true" style="color: white; font-size: 1.5rem; font-weight: 600; margin-bottom: var(--space-8); opacity: 0.95;">
                    ${finalSubheadline}
                </h2>
                <p class="subheading" data-editable="true" style="margin-bottom: 2rem; color: white; font-size: 1.1rem; opacity: 0.9;">
                    Join this exclusive webinar and discover the proven system to grow your business without the overwhelm.
                </p>

                <!-- Registration Form -->
                <div class="registration-form" style="background: white; padding: var(--space-8); border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                    <h3 data-editable="true" style="color: #1f2937; margin-bottom: var(--space-6); font-size: 1.3rem; font-weight: 600;">
                        Reserve Your Seat - FREE
                    </h3>

                    <form class="registration-inputs" style="display: flex; flex-direction: column; gap: var(--space-4);">
                        <input type="text" name="name" placeholder="Your Full Name" required
                               style="padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; width: 100%; box-sizing: border-box;">
                        <input type="email" name="email" placeholder="Your Best Email" required
                               style="padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; width: 100%; box-sizing: border-box;">
                        <button type="submit" class="btn btn-primary btn-large" data-editable="true"
                                style="background: ${theme.secondary}; color: white; padding: 1.2rem; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; width: 100%; margin-top: var(--space-2);">
                            SAVE MY SEAT NOW
                        </button>
                    </form>

                    <p style="margin-top: var(--space-4); color: #6b7280; font-size: 0.9rem; text-align: center;" data-editable="true">
                        <strong>Limited Seats Available</strong> • No spam, ever • Unsubscribe anytime
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Social Proof Section Block -->
    <div class="block bg-section-2" data-block-type="social-proof" style="padding: var(--space-16) 0; background: #f9fafb;">
        <div class="container">
            <div style="text-align: center; max-width: 800px; margin: 0 auto;">
                <h2 class="heading-2" data-editable="true" style="margin-bottom: var(--space-8); font-size: 2.5rem; font-weight: 800; color: #1f2937;">
                    Join <strong style="color: ${theme.primary};">${socialProof.count}+</strong> Business Owners
                </h2>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-8);">
                    ${socialProof.stats
                        .map(
                            (stat) => `
                        <div class="stat-item" style="text-align: center;">
                            <div class="stat-number" data-editable="true" style="font-size: 2.5rem; font-weight: 800; color: ${theme.primary}; margin-bottom: var(--space-2);">${stat.number}</div>
                            <div class="stat-label" data-editable="true" style="color: #6b7280; font-size: 0.95rem;">${stat.label}</div>
                        </div>
                    `
                        )
                        .join("")}
                </div>
            </div>
        </div>
    </div>

    <!-- What You'll Learn Section -->
    <div class="block bg-section-1" data-block-type="features" style="padding: var(--space-20) 0; background: white;">
        <div class="container">
            <div class="heading-block" style="text-align: center; margin-bottom: var(--space-12);">
                <h2 class="heading-2" data-editable="true" style="font-size: 2.5rem; font-weight: 800; color: #1f2937; margin-bottom: var(--space-4);">
                    What You'll Learn In This <strong style="color: ${theme.primary};">Free Webinar</strong>
                </h2>
            </div>
            <div class="features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-8); max-width: 1200px; margin: 0 auto;">
                ${benefits
                    .map(
                        (benefit) => `
                    <div class="feature-card" style="background: #f9fafb; padding: var(--space-6); border-radius: 12px; text-align: center; transition: transform 0.2s;">
                        <div class="feature-icon" style="font-size: 3rem; margin-bottom: var(--space-4);">${benefit.icon}</div>
                        <h3 class="feature-title" data-editable="true" style="font-size: 1.3rem; font-weight: 700; color: #1f2937; margin-bottom: var(--space-3);">${benefit.title}</h3>
                        <p class="feature-description" data-editable="true" style="color: #6b7280; font-size: 1rem; line-height: 1.6;">${benefit.description}</p>
                    </div>
                `
                    )
                    .join("")}
            </div>
        </div>
    </div>

    <!-- Testimonials Section -->
    <div class="block testimonial-block bg-section-1" data-block-type="testimonial" style="padding: var(--space-20) 0; background: #f9fafb;">
        <div class="container">
            <div class="heading-block" style="text-align: center; margin-bottom: var(--space-12);">
                <h2 class="heading-2" data-editable="true" style="font-size: 2.5rem; font-weight: 800; color: #1f2937;">
                    What Our <strong style="color: ${theme.primary};">Community Members</strong> Say
                </h2>
            </div>
            <div class="testimonial-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: var(--space-8); max-width: 1200px; margin: 0 auto;">
                <div class="testimonial-card" style="background: white; padding: var(--space-6); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                    <p class="testimonial-quote" data-editable="true" style="font-size: 1.2rem; font-weight: 700; color: ${theme.primary}; margin-bottom: var(--space-4);">"I am now on track to $1M in Revenue this year"</p>
                    <p style="margin-bottom: var(--space-4); color: #6b7280; line-height: 1.6;" data-editable="true">"I'm reconnected with my passion, and am remembering how great it is to collaborate with others in the community. Thanks to the simple delegation insights from Joe, I am now on track to $1M in revenue this year for the first time ever"</p>
                    <div class="testimonial-author" style="display: flex; align-items: center; gap: var(--space-3);">
                        <div class="testimonial-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, ${theme.primary}, ${theme.secondary});"></div>
                        <div class="testimonial-info">
                            <h4 data-editable="true" style="margin: 0; font-weight: 600; color: #1f2937;">John Beaudry</h4>
                            <p data-editable="true" style="margin: 0; color: #6b7280; font-size: 0.9rem;">CEO & Founder of Beaudry Garden Design</p>
                        </div>
                    </div>
                </div>
                <div class="testimonial-card" style="background: white; padding: var(--space-6); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                    <p class="testimonial-quote" data-editable="true" style="font-size: 1.2rem; font-weight: 700; color: ${theme.primary}; margin-bottom: var(--space-4);">"Game Changer for our business"</p>
                    <p style="margin-bottom: var(--space-4); color: #6b7280; line-height: 1.6;" data-editable="true">"This program transformed our business through creating automation, funnels, and marketing that generated more revenue, opportunity, and time freedom than ever before! Implementing our automated webinar funnel has been a game-changer."</p>
                    <div class="testimonial-author" style="display: flex; align-items: center; gap: var(--space-3);">
                        <div class="testimonial-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, ${theme.primary}, ${theme.secondary});"></div>
                        <div class="testimonial-info">
                            <h4 data-editable="true" style="margin: 0; font-weight: 600; color: #1f2937;">Kelly Krezek</h4>
                            <p data-editable="true" style="margin: 0; color: #6b7280; font-size: 0.9rem;">CEO & Founder of New Earth Development</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Final CTA Block -->
    <div class="block footer-block bg-footer" data-block-type="footer" style="background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%); padding: var(--space-20) 0; text-align: center;">
        <div class="container">
            <div class="footer-content" style="max-width: 700px; margin: 0 auto;">
                <h2 class="heading-2" data-editable="true" style="color: white; margin-bottom: var(--space-8); font-size: 2.5rem; font-weight: 800;">
                    Don't Miss Out - <strong>Register Now</strong>
                </h2>
                <a href="#registration" class="btn btn-primary btn-large" data-editable="true" style="background: white; color: ${theme.primary}; padding: 1.2rem 2.5rem; border-radius: 8px; text-decoration: none; font-size: 1.2rem; font-weight: 700; display: inline-block; margin-bottom: var(--space-6); transition: transform 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    CLAIM MY FREE SEAT NOW
                </a>
                <p style="color: white; margin-top: var(--space-4); font-size: 0.95rem; opacity: 0.9;" data-editable="true">
                    Limited seats available • This exclusive training won't be repeated
                </p>
            </div>
        </div>
    </div>
</div>
    `.trim();
}

/**
 * Generate default theme if none provided
 */
export function getDefaultTheme(): Theme {
    return {
        primary: "#2563eb",
        secondary: "#10b981",
        background: "#ffffff",
        text: "#1f2937",
    };
}
