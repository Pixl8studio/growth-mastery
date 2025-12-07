/**
 * Framework Loader
 * Loads page frameworks for Registration, Watch, and Enrollment pages
 */

import { logger } from "@/lib/logger";

export type PageType = "registration" | "watch" | "enrollment";

export interface PageFramework {
    pageType: PageType;
    sections: SectionSpec[];
    designSystem: DesignSystemSpec;
    copyPrinciples: CopyPrinciplesSpec;
    conversionPatterns: string[];
}

export interface SectionSpec {
    order: number;
    name: string;
    purpose: string;
    structure: string;
    copyFormulas?: string[];
}

export interface DesignSystemSpec {
    colorArchitecture: string;
    typography: string;
    spacing: string;
    visualEffects: string;
    componentPatterns: string;
}

export interface CopyPrinciplesSpec {
    headlines: string;
    bodyVoice: string;
    ctaOptimization: string;
}

/**
 * Get framework for a specific page type
 */
export function getPageFramework(pageType: PageType): PageFramework {
    switch (pageType) {
        case "registration":
            return getRegistrationFramework();
        case "watch":
            return getWatchFramework();
        case "enrollment":
            return getEnrollmentFramework();
        default:
            throw new Error(`Unknown page type: ${pageType}`);
    }
}

/**
 * Format framework as a prompt-ready string
 */
export function formatFrameworkForPrompt(framework: PageFramework): string {
    return `
# ${framework.pageType.toUpperCase()} PAGE FRAMEWORK

## Page Architecture (${framework.sections.length} Sections)

${framework.sections.map((s) => `### ${s.order}. ${s.name}\n**Purpose:** ${s.purpose}\n**Structure:**\n${s.structure}`).join("\n\n")}

## Design System

### Colors
${framework.designSystem.colorArchitecture}

### Typography
${framework.designSystem.typography}

### Spacing
${framework.designSystem.spacing}

### Visual Effects
${framework.designSystem.visualEffects}

### Component Patterns
${framework.designSystem.componentPatterns}

## Copy Principles

### Headlines
${framework.copyPrinciples.headlines}

### Body Voice
${framework.copyPrinciples.bodyVoice}

### CTA Optimization
${framework.copyPrinciples.ctaOptimization}

## Conversion Patterns
${framework.conversionPatterns.map((p) => `- ${p}`).join("\n")}
`.trim();
}

/**
 * Registration Page Framework
 * 9 sections focused on lead capture
 */
function getRegistrationFramework(): PageFramework {
    return {
        pageType: "registration",
        sections: [
            {
                order: 1,
                name: "Hero Section",
                purpose:
                    "Capture attention, state transformation promise, create immediate desire",
                structure: `
[HEADLINE] - {Desirable Outcome} + {Timeframe}
[SUBHEADLINE] - "A Free Training on How to [Primary Benefit] Using [Method] in [Timeframe] - Without [Pain Point 1], [Pain Point 2], or [Pain Point 3]."
[CTA BUTTON] - Action-oriented: "Watch the Training" / "Get Instant Access"
[AVAILABILITY STATEMENT] - "Full Training Recording Available Now"`,
                copyFormulas: [
                    "[Action Verb] a [Desirable Adjective] [Thing They Want] in a [Compressed Timeframe]",
                ],
            },
            {
                order: 2,
                name: "Registration Form",
                purpose: "Capture lead information with minimal friction",
                structure: `
[BADGE] - "Free Training Available"
[FORM HEADLINE] - "Get Instant Access"
[FORM FIELDS] - First Name, Email (required)
[SUBMIT BUTTON] - "Watch Now" / "Get Access"
[TRUST STATEMENT] - "No spam. Unsubscribe anytime."`,
            },
            {
                order: 3,
                name: "Learning Modules",
                purpose: "Preview value, create anticipation, demonstrate depth",
                structure: `
[SECTION HEADLINE] - "What You'll Discover in This Training"
[SECTION SUBHEADLINE] - "[Duration] and walk away with everything you need to [outcome]"
[MODULE CARDS] - 4 cards with Icon, Title, 3 Bullet Takeaways each
[CLOSING STATEMENT] - "By the end, you'll know exactly how to [outcome]"`,
            },
            {
                order: 4,
                name: "Qualification Section",
                purpose: "Self-selection, address 'is this for me?' objection",
                structure: `
[HEADLINE] - "This Is Perfect for You If You Have…"
[QUALIFICATION CARDS] - 3 cards with Checkmark Icon, Title, Description
[CTA BUTTON] - "SAVE YOUR SEAT NOW"`,
            },
            {
                order: 5,
                name: "Business Types",
                purpose: "Overcome 'Is this right for me?' by showing breadth",
                structure: `
[HEADLINE] - "Is This Right for My Business?"
[SUBHEADLINE] - "Yes. [Method] works across nearly every industry"
[APPLICABILITY GRID] - 15-20 items in responsive grid with icons
[CLOSING STATEMENT] - "If you [qualifier], this training is for you."`,
            },
            {
                order: 6,
                name: "Transformation Section",
                purpose: "Visual representation of the complete system/outcome",
                structure: `
[HEADLINE] - "A Faster, Smarter Way To [Verb]."
[SUBHEADLINE] - "Build a complete [deliverable] in the time it used to take just to [old painful process]."
[VISUAL ELEMENT] - Orbital diagram with center concept and 5 orbiting components`,
            },
            {
                order: 7,
                name: "Instructor Section",
                purpose: "Build authority, create personal connection, establish trust",
                structure: `
[LAYOUT] - Two-column (Photo | Content)
[PHOTO SIDE] - Professional headshot, Name, Title, Company
[HEADLINE] - "Meet Your Guide"
[ORIGIN STORY] - 3 paragraphs: The Leap, The Results, The Mission
[QUOTE] - Philosophy statement about the methodology`,
            },
            {
                order: 8,
                name: "Final CTA Section",
                purpose:
                    "Emotional close, mission-driven appeal, final conversion push",
                structure: `
[BADGE] - "The Future is Here"
[HEADLINE] - "You Were Born To [Higher Purpose]. Not [Painful Current Reality]."
[SUBHEADLINE] - "Let [method] handle the heavy lifting so you can [benefit]."
[CTA BUTTON] - "Join the Training"
[CLOSING TAGLINE] - "[Verb] your [asset]. [Verb] your [deliverable]. [Verb] your [mission]."`,
            },
            {
                order: 9,
                name: "Mobile Sticky CTA",
                purpose: "Persistent conversion opportunity on mobile",
                structure: `
[TRIGGER] - Appears after 300px scroll
[PLACEMENT] - Fixed bottom of viewport
[VISIBILITY] - Mobile only (hidden on desktop)
[BUTTON] - Full-width, high-contrast "Save My Spot"`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--primary: User's primary brand color
--primary-foreground: Contrasting text on primary
--accent: Secondary emphasis color
--background: Page background (light default)
--foreground: Primary text color
--muted: Subdued backgrounds
--card: Elevated surfaces`,
            typography: `
H1: text-5xl md:text-7xl lg:text-8xl font-black
H2: text-4xl md:text-5xl lg:text-6xl font-black
H3: text-2xl md:text-3xl font-bold
Body Large: text-xl md:text-2xl leading-relaxed
Body: text-lg leading-relaxed
Badge: text-sm font-semibold
Button: text-lg font-bold`,
            spacing: `
Section padding: py-24 px-4
Container: max-w-6xl (wide), max-w-4xl (focused), max-w-2xl (form)
Element gaps: space-y-8
Grid gaps: gap-8
Section headings: mb-16`,
            visualEffects: `
Gradients: Radial dark-to-darker backgrounds, Linear brand color for buttons
Shadows: shadow-soft (subtle), shadow-float (medium), shadow-glow (brand-colored)
Animations: fade-in entry, float subtle motion, pulse-slow breathing, hover:scale-105`,
            componentPatterns: `
Cards: p-8 rounded-2xl border-border/50 hover:shadow-emerald hover:-translate-y-2
Primary CTA: gradient-primary text-white hover:shadow-glow rounded-full hover:scale-105
Badges: inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10
Icon Containers: w-16 h-16 gradient-primary rounded-xl shadow-soft`,
        },
        copyPrinciples: {
            headlines: `
- Outcome + Timeframe: Always lead with transformation and speed
- Gradient Text: Apply to the most desirable part of the headline
- Non-Breaking Spaces: Use &nbsp; to prevent awkward line breaks`,
            bodyVoice: `
- Conversational Tone: Write like talking to a friend
- Short Paragraphs: 1-3 sentences maximum
- Leading Relaxed: Use leading-relaxed for readability
- Muted for Secondary: Use text-muted-foreground for supporting text`,
            ctaOptimization: `
- Action Verbs: Start with verbs (Watch, Get, Join, Save, Start)
- Benefit-Focused: Imply the result (Get Access vs. Submit)
- Urgency Words: Use sparingly and authentically`,
        },
        conversionPatterns: [
            "Hero captures 100vh minimum height",
            "Clear value proposition visible immediately",
            "Primary CTA accessible without scrolling",
            "Registration form appears early (section 2)",
            "Repeated CTA buttons throughout page",
            "Mobile sticky CTA ensures constant access",
            "Trust building sequence: Promise → Value Preview → Self-Selection → Authority → Final Push",
        ],
    };
}

/**
 * Watch Page Framework
 * 7 sections focused on video delivery and enrollment
 */
function getWatchFramework(): PageFramework {
    return {
        pageType: "watch",
        sections: [
            {
                order: 1,
                name: "Header/Navigation",
                purpose: "Brand recognition, navigation context",
                structure: `
[LOGO] - Left-aligned for brand recognition
[NAVIGATION] - Right-aligned, minimal
[CTA BUTTON] - "Enroll Now" / "Get Access"`,
            },
            {
                order: 2,
                name: "Video Hero",
                purpose: "Capture attention, deliver core content",
                structure: `
[HEADLINE] - [TOPIC/TRANSFORMATION] **[BOLD_KEYWORD]**
[SUBHEADLINE] - "Discover the [NUMBER]-step [SYSTEM] to [TRANSFORMATION] With a [DESIRABLE_OUTCOME] that [BENEFIT] while you [EFFORTLESS_STATE]."
[CTA BUTTON] - "[ACTION_VERB] In [OFFER_NAME]"`,
            },
            {
                order: 3,
                name: "Video Player",
                purpose: "Primary content delivery mechanism",
                structure: `
[VIDEO_WRAPPER] - Responsive 16:9 aspect ratio, dark background
[PLAY BUTTON] - Prominent if paused
[PROGRESS BAR] - With scrubbing capability
[CONTROLS] - Volume, fullscreen, playback speed`,
            },
            {
                order: 4,
                name: "CTA Strip",
                purpose: "Conversion opportunity post-video",
                structure: `
[CTA_BUTTON] - Primary action, high contrast, prominent
[SUPPORTING_TEXT] - Optional urgency statement`,
            },
            {
                order: 5,
                name: "Presenter Bio",
                purpose: "Build authority and trust",
                structure: `
[LAYOUT] - Two-column or single column
[PHOTO] - Professional headshot, circular frame
[NAME] - Bold, prominent
[TITLE/ROLE] - Founder & CEO of [Company]
[BIO_CONTENT] - 3 paragraphs: Origin Story, Credibility Stack, Mission Statement`,
            },
            {
                order: 6,
                name: "Secondary CTA",
                purpose: "Reinforced conversion opportunity",
                structure: `
[HEADLINE] - "Ready to [TRANSFORMATION]?"
[CTA_BUTTON] - Same or variation of primary
[SUPPORTING_ELEMENTS] - Trust badges, guarantee, contact`,
            },
            {
                order: 7,
                name: "Footer",
                purpose: "Legal, contact, brand consistency",
                structure: `
[LOGO] - Centered or left-aligned
[NAVIGATION_LINKS] - Contact, Privacy, Terms
[COPYRIGHT] - © [YEAR] [COMPANY]. All rights reserved.`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--primary: CTA and accent elements
--video-bg: Near black (0 0% 8%) for video area
--video-controls: White for control icons
--background: Light page background
--background-dark: Dark video section background`,
            typography: `
H1 (Video Title): text-4xl md:text-5xl lg:text-6xl font-display font-bold
H2 (Subheadline): text-xl md:text-2xl font-normal leading-relaxed
Name: text-2xl md:text-3xl font-display font-bold
Bio: text-base md:text-lg leading-relaxed
Button Text: text-lg md:text-xl font-semibold`,
            spacing: `
Compact sections: py-8 md:py-12 (header, CTA strip)
Standard sections: py-16 md:py-24 (presenter bio)
Video wrapper: py-4 md:py-8
Container: max-w-4xl (content), max-w-6xl (full-width video)`,
            visualEffects: `
Video shadow: 0 20px 60px rgba(0,0,0,0.4)
CTA shadow: 0 4px 20px with primary color
CTA glow animation on hover
Fade-in animation for content`,
            componentPatterns: `
Video Container: relative bg-black rounded-lg overflow-hidden shadow-video
CTA Button: inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-cta hover:scale-105
Presenter Card: flex flex-col md:flex-row gap-8 items-start`,
        },
        copyPrinciples: {
            headlines: `
- Concise: 2-4 words maximum for main headline
- Bold Emphasis: Use bold or gradient on transformation word
- Topic + Format: "[Topic] **[Format]**"`,
            bodyVoice: `
- Direct: Get to the value quickly
- Confident: The content speaks for itself
- Aspirational: Focus on transformation potential
- Minimal: Less copy, more video
- Bio in Third Person: "Joe has helped..."`,
            ctaOptimization: `
- Primary: [ENROLLMENT_VERB] [IN/THE] [OFFER_NAME]
- Action verbs: Enroll, Join, Get, Start
- High contrast colors
- Arrow icon for directional cue`,
        },
        conversionPatterns: [
            "Video as focal point captures and holds attention",
            "Value-first: Education before ask builds reciprocity",
            "Authority building: Credibility reduces skepticism",
            "Multiple conversion points at high-intent moments",
            "Minimal distraction: Clean design keeps focus on video",
            "Dark/neutral backgrounds around video for cinema focus",
            "CTA visible above fold or immediately after video",
        ],
    };
}

/**
 * Enrollment Page Framework
 * 13 sections for full sales page with AIDA psychology
 */
function getEnrollmentFramework(): PageFramework {
    return {
        pageType: "enrollment",
        sections: [
            {
                order: 1,
                name: "Hero",
                purpose: "Capture attention, state transformation promise",
                structure: `
[HEADLINE] - [OUTCOME] in [TIMEFRAME]. [BIGGER PROMISE].
[SUBHEADLINE] - The [SUPERLATIVE] [CATEGORY] that [DOES_X], [DOES_Y], and [DOES_Z] so you can [ULTIMATE_BENEFIT] in [TIMEFRAME], not [LONG_TIMEFRAME].
[PRIMARY CTA] - 🚀 [ACTION_VERB] Now
[SECONDARY CTA] - Watch Demo`,
            },
            {
                order: 2,
                name: "Video Demo",
                purpose: "Build credibility through demonstration",
                structure: `
[BADGE] - "See It In Action"
[HEADLINE] - "Watch Your [DELIVERABLE] [TRANSFORMATION_VERB]"
[SUBHEADLINE] - "See how [PRODUCT_NAME] transforms your [INPUT] into a complete [OUTPUT]."
[VIDEO EMBED] - Product demonstration
[TRUST INDICATORS] - 3 bullet points with pulsing dots`,
            },
            {
                order: 3,
                name: "How It Works",
                purpose: "Simplify the path to success",
                structure: `
[HEADLINE] - [NUMBER] Steps. [ASPIRATIONAL_OUTCOME].
[STEP CARDS] - 3-4 cards each with:
  - Step number
  - Title (Action-focused)
  - Description
  - Icon
Pattern: Input/Define → Build/Watch → Automate/Scale`,
            },
            {
                order: 4,
                name: "Feature Deep-Dive 1",
                purpose: "Expand on core capability (Marketing Engine)",
                structure: `
[EYEBROW] - "[BENEFIT_PROMISE] - [ADJECTIVE] & [OUTCOME_WORD]"
[HEADLINE] - "Your Entire Marketing Ecosystem - Automated"
[TAGLINE] - "Never [PAIN_POINT] again."
[BODY COPY] - What it does + How it works + Outcome
[FEATURE LIST] - Checkmark items
[CTA] - "[ACTION_VERB] My [DELIVERABLE]"`,
            },
            {
                order: 5,
                name: "Feature Deep-Dive 2",
                purpose: "Address 'offer clarity' objection (Offer Optimizer)",
                structure: `Similar to Feature 1 with alternating layout`,
            },
            {
                order: 6,
                name: "Feature Deep-Dive 3",
                purpose: "Show content creation solved (Presentation Builder)",
                structure: `Similar to Feature 1`,
            },
            {
                order: 7,
                name: "Feature Deep-Dive 4",
                purpose: "Address automation/time objection (Follow-Up Engine)",
                structure: `Similar to Feature 1 with alternating layout`,
            },
            {
                order: 8,
                name: "Feature Deep-Dive 5",
                purpose: "Show organic reach capability (Organic Marketing)",
                structure: `Similar to Feature 1`,
            },
            {
                order: 9,
                name: "Dashboard/Results",
                purpose: "Visualize success metrics, future pacing",
                structure: `
[HEADLINE] - "See Everything. Scale Intelligently."
[SUBHEADLINE] - "Operate with precision, guided by real-time data."
[METRICS DISPLAY] - 4-8 key metrics with values, labels, change indicators`,
            },
            {
                order: 10,
                name: "Founder Letter",
                purpose: "Build trust through authenticity",
                structure: `
[HEADER] - "Built by [IDENTITY_PLURAL], for [IDENTITY_PLURAL]"
[PULL QUOTE] - "We created [PRODUCT] to help [TARGET] [POSITIVE], not [NEGATIVE]."
[LETTER] - Opening Hook, Problem, Insight, Solution, Mission (bullet points), Emotional Close
[SIGNATURE] - Name, title, photo`,
            },
            {
                order: 11,
                name: "Pricing",
                purpose: "Present offer options with choice architecture",
                structure: `
[HEADLINE] - "Choose Your Growth Path"
[SUBHEADLINE] - "From DIY to done-for-you, we have the perfect solution"
[PRICING TIERS] - Good/Better/Best (3 tiers)
  Tier 1: Entry/DIY ($X,XXX)
  Tier 2: Mid/DFY ($X,XXX) - RECOMMENDED, highlighted
  Tier 3: Premium/Enterprise (Custom)
[CONSULTATION CARD] - "Talk to a Strategist"`,
            },
            {
                order: 12,
                name: "FAQ",
                purpose: "Handle remaining objections, risk reversal",
                structure: `
[HEADER] - "Frequently Asked Questions"
[FAQ ITEMS] - 5+ accordion items addressing:
  - Integration/Compatibility
  - Prerequisites
  - Speed/Timeline
  - Existing Assets
  - Support
[SUPPORT CTA] - "Still have questions? Contact Support"`,
            },
            {
                order: 13,
                name: "Final CTA",
                purpose: "Create urgency, final push",
                structure: `
[HEADLINE] - "Step Into Predictable Scale"
[SUBHEADLINE] - "Build your [ADJECTIVE], [TECHNOLOGY]-powered [DELIVERABLE] that [CONVERSION_ACTION] in [TIMEFRAME] or less."
[TRUST INDICATORS] - 3 icons with text (Setup, Guarantee, Speed)
[CTA BUTTON] - "Start Now"`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--primary: Brand color for CTAs, icons
--primary-foreground: Text on primary surfaces
--secondary: Dark backgrounds, depth
--accent: Highlights, badges, metrics
--background: Page background (cream/light)
--foreground: Primary text (charcoal)
--muted: Muted backgrounds
--emerald: Brand primary
--gold: Accent/highlight
--forest: Dark sections`,
            typography: `
Hero H1: text-7xl md:text-8xl font-bold
Section H2: text-4xl md:text-5xl lg:text-6xl font-bold
H3: text-2xl md:text-3xl font-bold
Body Large: text-lg md:text-xl leading-relaxed
Body: text-base leading-relaxed
Font families: Inter (body), Poppins (display)`,
            spacing: `
Section: py-24 (6rem)
Hero: py-20 / py-32 (large screens)
Container: max-w-4xl (content), max-w-7xl (pricing grid)
Component gaps: gap-4 (tight), gap-6 (related), gap-8 (section items)
Card padding: p-6 (standard), p-8 (large), p-12 (feature)`,
            visualEffects: `
Gradients: gradient-hero, gradient-emerald, gradient-gold, gradient-dark
Text gradient: background-clip text on transformation words
Floating orbs: Blurred circles with animate-float
Shadows: shadow-soft, shadow-float, shadow-glow
Animations: float, glow, fade-in, slide-up, scale-in`,
            componentPatterns: `
Card: p-8 rounded-2xl bg-card shadow-soft hover:shadow-float border border-border
Badge: inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10
Icon Container: p-4 rounded-2xl gradient-emerald shadow-glow
Metric Card: p-5 rounded-2xl bg-card/80 backdrop-blur-sm
Pricing Card: p-8 rounded-3xl, middle tier lg:scale-105 with highlight border`,
        },
        copyPrinciples: {
            headlines: `
- 4 U's: Useful, Urgent, Unique, Ultra-specific
- Outcome + Timeframe: "Launch in a Day. Scale Forever."
- Gradient Text on transformation words, not features
- Contrast patterns: "hours, not months"`,
            bodyVoice: `
- Confident but not arrogant
- Empathetic to pain points
- Aspirational about outcomes
- Clear and jargon-free
- Power Words: Launch, Scale, Automate, Transform, Unlock, AI-powered`,
            ctaOptimization: `
- Primary: [EMOJI] [ACTION] Now / Get [PRODUCT_NAME]
- Supporting text: [Verb] your [input] into [output] - [benefit].
- Arrow icon with group-hover:translate-x-1
- Multiple CTAs throughout but not overwhelming`,
        },
        conversionPatterns: [
            "AIDA flow: Attention → Interest → Desire → Conviction → Action",
            "Pattern interrupt (Hero) - Bold promise stops scroll",
            "Demonstration (Video) - Shows real results",
            "Cognitive ease (3 Steps) - Simplicity increases confidence",
            "Objection handling (Features) - Each section removes a barrier",
            "Authority + Likability (Founder Letter) - Human connection",
            "Choice architecture (Pricing) - Good/Better/Best removes 'if', replaces with 'which'",
            "Risk reversal (FAQ + Guarantees) - Removes final friction",
            "Urgency/Scarcity (Final CTA) - Motivates immediate action",
            "Trust building sequence through the page",
            "Multiple CTAs at decision points",
            "Middle pricing tier highlighted (lg:scale-105)",
        ],
    };
}

/**
 * Get just the section structure for a quick reference
 */
export function getSectionOverview(pageType: PageType): string {
    const framework = getPageFramework(pageType);
    return framework.sections
        .map((s) => `${s.order}. ${s.name} - ${s.purpose}`)
        .join("\n");
}

/**
 * Load framework as a formatted string for AI prompts
 * This is the primary function used by the generator
 */
export async function loadPageFramework(pageType: PageType): Promise<string> {
    const framework = getPageFramework(pageType);
    return formatFrameworkForPrompt(framework);
}
