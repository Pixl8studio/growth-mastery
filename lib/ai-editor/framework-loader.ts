/**
 * Framework Loader
 * Loads page frameworks for all funnel page types
 */

import { logger } from "@/lib/logger";
import type { PageType } from "@/types/pages";

// Re-export PageType for backward compatibility
export type { PageType };

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
        case "confirmation":
            return getConfirmationFramework();
        case "call_booking":
            return getCallBookingFramework();
        case "checkout":
            return getCheckoutFramework();
        case "upsell":
            return getUpsellFramework();
        case "thank_you":
            return getThankYouFramework();
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
 * Confirmation Page Framework
 * Post-registration confirmation with event prep
 */
function getConfirmationFramework(): PageFramework {
    return {
        pageType: "confirmation",
        sections: [
            {
                order: 1,
                name: "Confirmation Hero",
                purpose: "Celebrate registration success, confirm next steps",
                structure: `
[CHECKMARK ICON] - Large success indicator
[HEADLINE] - "You're In! See You at the Training."
[SUBHEADLINE] - "We just sent a confirmation email to [EMAIL]. Check your inbox!"
[EVENT DETAILS] - Date, Time, Duration in a card format`,
            },
            {
                order: 2,
                name: "Add to Calendar",
                purpose: "Increase show-up rate with calendar integration",
                structure: `
[HEADLINE] - "Add This to Your Calendar"
[CALENDAR BUTTONS] - Google Calendar, Apple Calendar, Outlook
[REMINDER TEXT] - "We'll also send you a reminder 15 minutes before we start."`,
            },
            {
                order: 3,
                name: "What to Expect",
                purpose: "Set expectations, build anticipation",
                structure: `
[HEADLINE] - "What to Expect in This Training"
[EXPECTATION CARDS] - 3-4 cards with:
  - Icon
  - Title (What they'll learn/get)
  - Description
[DURATION STATEMENT] - "The full training is [X] minutes of pure value."`,
            },
            {
                order: 4,
                name: "Preparation Checklist",
                purpose: "Engagement pre-work, increase commitment",
                structure: `
[HEADLINE] - "Get Ready for Maximum Results"
[CHECKLIST ITEMS] - 3-5 items with checkboxes:
  - Check your email for the access link
  - Set aside uninterrupted time
  - Prepare questions
  - Have a notebook ready
  - Clear your calendar`,
            },
            {
                order: 5,
                name: "Share Section",
                purpose: "Viral growth through social sharing",
                structure: `
[HEADLINE] - "Know Someone Who Needs This?"
[SUBHEADLINE] - "Share this training with a friend or colleague"
[SHARE BUTTONS] - Twitter, LinkedIn, Facebook, Email
[SHARE TEXT] - Pre-populated social share message`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--success: Green/emerald for confirmation
--primary: Brand color for CTAs
--background: Light, celebratory feel
--card: White elevated cards
--muted: Subtle backgrounds`,
            typography: `
H1: text-5xl md:text-6xl font-bold
H2: text-3xl md:text-4xl font-bold
H3: text-xl md:text-2xl font-semibold
Body: text-base md:text-lg leading-relaxed
Button: text-base md:text-lg font-semibold`,
            spacing: `
Section padding: py-16 md:py-24
Container: max-w-3xl (focused content)
Card padding: p-6 md:p-8
Element gaps: gap-6 md:gap-8`,
            visualEffects: `
Success animation: Checkmark with scale-in and fade
Confetti or celebration visual element
Card shadows: shadow-soft with hover:shadow-float
Button hover: scale-105 transition`,
            componentPatterns: `
Success Icon: w-20 h-20 rounded-full bg-success/10 with checkmark
Event Card: p-6 rounded-xl bg-card border-2 border-success/20
Calendar Buttons: Grid of 3 buttons with calendar icons
Checklist Items: Interactive checkboxes with check animation`,
        },
        copyPrinciples: {
            headlines: `
- Celebratory tone: "You're In!" vs. "Registration Confirmed"
- Action-oriented: Tell them what to do next
- Personal: Use their email/name when available`,
            bodyVoice: `
- Excited and enthusiastic
- Clear next steps
- Helpful and supportive
- Build anticipation for the event`,
            ctaOptimization: `
- Calendar CTAs: "Add to [Platform] Calendar"
- Share CTAs: "Share with a Friend"
- Next step focus: Make it easy to complete the journey`,
        },
        conversionPatterns: [
            "Immediate confirmation reduces anxiety",
            "Calendar integration increases show-up rate by 40%+",
            "What to Expect section builds anticipation",
            "Checklist creates commitment through micro-actions",
            "Social sharing drives viral growth",
        ],
    };
}

/**
 * Call Booking Page Framework
 * Professional call booking with qualification
 */
function getCallBookingFramework(): PageFramework {
    return {
        pageType: "call_booking",
        sections: [
            {
                order: 1,
                name: "Booking Hero",
                purpose: "Set context, communicate value of the call",
                structure: `
[HEADLINE] - "Let's Build Your [OUTCOME] Together"
[SUBHEADLINE] - "Book a free [DURATION]-minute strategy call to discuss your goals and see if we're a fit."
[VALUE PROPS] - 3 bullets of what they'll get on the call`,
            },
            {
                order: 2,
                name: "Call Value Proposition",
                purpose: "Make the call feel valuable, not salesy",
                structure: `
[HEADLINE] - "What You'll Get on This Call"
[BENEFIT CARDS] - 3-4 cards with:
  - Icon
  - Title (benefit/outcome)
  - Description (what happens)
[NO PRESSURE STATEMENT] - "This is a strategy call, not a sales pitch. We'll give you value whether you join or not."`,
            },
            {
                order: 3,
                name: "Qualification Questions",
                purpose: "Pre-qualify leads, set expectations",
                structure: `
[HEADLINE] - "Help Us Prepare for Your Call"
[FORM FIELDS] -
  - Name (required)
  - Email (required)
  - Phone (optional)
  - Business/Role (required)
  - Primary Challenge (textarea, required)
  - Revenue/Team Size (optional dropdown)
[SUBMIT BUTTON] - "Choose Your Time"`,
            },
            {
                order: 4,
                name: "Calendar Display",
                purpose: "Show availability, enable booking",
                structure: `
[HEADLINE] - "Pick a Time That Works for You"
[CALENDAR WIDGET] - Availability display (placeholder for booking tool integration)
[TIME ZONE SELECTOR] - Auto-detect with manual override
[BOOKING CONFIRMATION] - Selected time display before final confirmation`,
            },
            {
                order: 5,
                name: "Trust Builders",
                purpose: "Reduce booking friction, build confidence",
                structure: `
[HEADLINE] - "You're in Good Hands"
[TRUST ELEMENTS] -
  - Testimonial quote from past call participant
  - Photo of call host with credentials
  - "No pressure, no obligation" guarantee
  - Average call satisfaction rating`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--primary: Professional, trustworthy color
--background: Clean, professional
--card: White cards with subtle borders
--accent: Secondary brand color for highlights`,
            typography: `
H1: text-4xl md:text-5xl font-bold
H2: text-2xl md:text-3xl font-semibold
Body: text-base leading-relaxed
Form labels: text-sm font-medium
Button: text-lg font-semibold`,
            spacing: `
Section padding: py-12 md:py-20
Container: max-w-4xl
Form spacing: space-y-4
Card padding: p-6`,
            visualEffects: `
Form focus states: ring-2 ring-primary
Calendar hover: Subtle highlight on available slots
Button hover: Slight scale and shadow
Professional aesthetic, not flashy`,
            componentPatterns: `
Form Input: p-3 rounded-lg border border-border focus:ring-2
Benefit Card: p-6 rounded-xl bg-card shadow-soft
Calendar Slot: p-3 rounded hover:bg-primary/10 transition
Trust Badge: flex items-center gap-3 with icon`,
        },
        copyPrinciples: {
            headlines: `
- Collaborative tone: "Let's build together"
- Clear value: What they get from the call
- Low pressure: Strategy call, not sales`,
            bodyVoice: `
- Professional but warm
- Consultative, not salesy
- Focused on their success
- Transparent about the process`,
            ctaOptimization: `
- Form CTA: "Choose Your Time" (next step)
- Final CTA: "Book My Call" (clear action)
- Micro-copy: "Takes 30 seconds to complete"`,
        },
        conversionPatterns: [
            "Value-first positioning reduces booking friction",
            "Qualification questions pre-frame the conversation",
            "Trust builders overcome skepticism",
            "Clear availability reduces back-and-forth",
            "No pressure messaging increases quality bookings",
        ],
    };
}

/**
 * Checkout Page Framework
 * Order summary and payment processing
 */
function getCheckoutFramework(): PageFramework {
    return {
        pageType: "checkout",
        sections: [
            {
                order: 1,
                name: "Checkout Header",
                purpose: "Trust and progress indication",
                structure: `
[LOGO] - Brand logo linked to home
[PROGRESS BAR] - Step indicator (Cart → Checkout → Confirmation)
[SECURITY BADGES] - SSL, payment processor badges`,
            },
            {
                order: 2,
                name: "Order Summary",
                purpose: "Clarity on what they're purchasing",
                structure: `
[HEADLINE] - "Order Summary"
[PRODUCT CARD] -
  - Product name and description
  - Quantity selector (if applicable)
  - Unit price
  - Total price
[ORDER BUMP] - Optional add-on offer (if configured)
[SUBTOTAL/TAX/TOTAL] - Clear pricing breakdown`,
            },
            {
                order: 3,
                name: "Payment Form",
                purpose: "Collect payment information securely",
                structure: `
[HEADLINE] - "Payment Information"
[STRIPE EMBED] - Stripe Elements for card input (placeholder for integration)
[BILLING ADDRESS] -
  - Full name
  - Email
  - Address fields (if physical product)
[SAVE INFO CHECKBOX] - "Save payment info for future purchases"`,
            },
            {
                order: 4,
                name: "Trust & Guarantee",
                purpose: "Final objection handling, reduce cart abandonment",
                structure: `
[TRUST ROW] -
  - 🔒 Secure checkout icon + text
  - ✓ Money-back guarantee badge
  - 💳 Accepted payment methods
[GUARANTEE TEXT] - "30-day money-back guarantee. If you're not satisfied, we'll refund you 100%."
[SUPPORT LINK] - "Questions? Contact support"`,
            },
            {
                order: 5,
                name: "Checkout CTA",
                purpose: "Complete the purchase",
                structure: `
[BUTTON] - Large, prominent "Complete Purchase" or "Pay $X,XXX"
[MICRO-COPY] - "By clicking, you agree to our Terms of Service and Privacy Policy"
[LOADING STATE] - Processing animation when clicked`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--primary: Trust-building color (blue/green)
--background: Clean, minimal
--card: White with subtle shadow
--success: Green for trust elements
--border: Subtle borders for form fields`,
            typography: `
H1: text-3xl md:text-4xl font-bold
H2: text-xl md:text-2xl font-semibold
Body: text-base leading-normal
Price: text-2xl md:text-3xl font-bold
Button: text-lg md:text-xl font-bold`,
            spacing: `
Section padding: py-8 md:py-12
Container: max-w-5xl (two-column layout)
Form spacing: space-y-3
Card padding: p-6 md:p-8`,
            visualEffects: `
Minimal distractions - focus on conversion
Form focus: Ring effect on active input
Button hover: Slight darkening, no aggressive effects
Trust badges: Subtle, professional appearance`,
            componentPatterns: `
Two-column layout: Order summary (sticky) | Payment form
Order item: flex justify-between items-center p-4
Form input: p-3 rounded-md border focus:ring-2
Payment button: Full-width, high-contrast, large padding
Security badges: Grayscale with opacity`,
        },
        copyPrinciples: {
            headlines: `
- Clear and direct: "Complete Your Order"
- Trust-building: Emphasize security
- No surprises: Transparent pricing`,
            bodyVoice: `
- Professional and trustworthy
- Clear and concise
- Reassuring about security
- Transparent about policies`,
            ctaOptimization: `
- Button shows exact price: "Pay $1,997"
- Loading state: "Processing..." with spinner
- Error states: Clear, actionable error messages`,
        },
        conversionPatterns: [
            "Sticky order summary keeps price visible",
            "Progress bar reduces abandonment",
            "Trust badges above the fold",
            "Guarantee reduces purchase anxiety",
            "Order bump increases AOV by 20-40%",
            "Minimal distractions keep focus on completing purchase",
        ],
    };
}

/**
 * Upsell Page Framework
 * One-time offer post-purchase
 */
function getUpsellFramework(): PageFramework {
    return {
        pageType: "upsell",
        sections: [
            {
                order: 1,
                name: "Urgency Header",
                purpose: "Create time pressure, highlight exclusivity",
                structure: `
[BADGE] - "⚡ ONE-TIME OFFER - This Page Expires in 10 Minutes"
[COUNTDOWN TIMER] - Visual countdown (10:00)
[WARNING] - "This offer will NOT be available again at this price."`,
            },
            {
                order: 2,
                name: "Upsell Hero",
                purpose: "Present the offer with immediate value",
                structure: `
[HEADLINE] - "Wait! Add [PRODUCT] for Just $XXX (Save $XXX)"
[SUBHEADLINE] - "You just got [MAIN_PRODUCT]. Add [UPSELL_PRODUCT] now and [BIGGER_BENEFIT]."
[VALUE STACK] - Show original price crossed out, upsell price highlighted`,
            },
            {
                order: 3,
                name: "Value Proposition",
                purpose: "Justify the additional purchase",
                structure: `
[HEADLINE] - "Here's What You're Adding"
[PRODUCT DETAILS] -
  - What it is
  - What it does
  - What results it creates
[FEATURE LIST] - Checkmark list of key features/benefits (5-7 items)`,
            },
            {
                order: 4,
                name: "Stack Visualization",
                purpose: "Show total value, create FOMO",
                structure: `
[HEADLINE] - "Your Complete Stack"
[STACK ITEMS] -
  ✓ [MAIN_PRODUCT] - $X,XXX value
  ✓ [UPSELL_PRODUCT] - $X,XXX value
[TOTAL VALUE] - "Total Value: $X,XXX"
[TODAY'S PRICE] - "Your Price Today: $XXX" (highlighted, large)
[SAVINGS] - "You Save: $X,XXX (XX%)"`,
            },
            {
                order: 5,
                name: "Social Proof",
                purpose: "Validation that others took this offer",
                structure: `
[HEADLINE] - "XX% of Customers Add This"
[TESTIMONIAL] - 1-2 short testimonials from customers who got both
[STAT] - "Customers who add [UPSELL] are 3x more likely to [RESULT]"`,
            },
            {
                order: 6,
                name: "Decision CTAs",
                purpose: "Make it easy to say yes or no",
                structure: `
[YES BUTTON] - Large, prominent "YES! Add [PRODUCT] for $XXX"
[NO LINK] - Smaller, plain text "No thanks, I don't want [BENEFIT]"
[GUARANTEE] - "Protected by the same 30-day guarantee"`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--urgency: Orange/red for countdown and warnings
--primary: Brand color for yes button
--background: High-contrast for focus
--success: Green for checkmarks
--muted: Gray for no thanks link`,
            typography: `
H1: text-4xl md:text-6xl font-bold
H2: text-2xl md:text-3xl font-bold
Price: text-5xl md:text-6xl font-black
Crossed-out price: text-2xl line-through opacity-60
Button: text-xl md:text-2xl font-bold`,
            spacing: `
Tight sections: py-12 md:py-16 (keep it above fold)
Container: max-w-4xl
Countdown: Large, impossible to miss
CTA spacing: gap-4 between yes/no`,
            visualEffects: `
Countdown: Pulsing red when under 2 minutes
Yes button: Pulse animation, glow effect
Price highlight: Gradient background, shadow-glow
Urgency indicators: Red/orange accents throughout`,
            componentPatterns: `
Countdown: text-6xl font-mono bg-urgency/10 p-6 rounded-xl
Value Stack: p-8 bg-card rounded-2xl border-2 border-primary
Yes Button: Full-width or prominent, animated pulse
No Link: text-sm text-muted hover:text-foreground underline
Checkmark List: Large checkmarks (text-success) with bold text`,
        },
        copyPrinciples: {
            headlines: `
- Urgency-driven: "Wait!", "One-Time Only"
- Benefit-focused: What they'll miss if they decline
- Clear savings: Show exact dollar and percentage savings`,
            bodyVoice: `
- Urgent but not aggressive
- Benefit-stacking: "And" language
- FOMO: "This won't be available again"
- Reassuring: Same guarantee applies`,
            ctaOptimization: `
- Yes button: "YES! Add to My Order for $XXX"
- No link uses negative framing: "No thanks, I don't want [benefit]"
- One-click purchase (payment already on file)`,
        },
        conversionPatterns: [
            "Countdown timer creates genuine urgency",
            "One-time-only positioning increases conversion",
            "Value stack makes price feel small",
            "Social proof validates the decision",
            "Framing the 'no' option as losing value",
            "One-click yes button (payment already captured)",
            "10-minute timer optimal (not too long, not too short)",
        ],
    };
}

/**
 * Thank You Page Framework
 * Post-purchase confirmation and onboarding
 */
function getThankYouFramework(): PageFramework {
    return {
        pageType: "thank_you",
        sections: [
            {
                order: 1,
                name: "Celebration Hero",
                purpose: "Confirm purchase, celebrate decision",
                structure: `
[CONFETTI/CELEBRATION VISUAL] - Animated success indicator
[HEADLINE] - "🎉 Welcome to [PRODUCT_NAME]!"
[SUBHEADLINE] - "You're officially part of [COMMUNITY/PROGRAM]. Here's what happens next."
[ORDER CONFIRMATION] - Order number, receipt link`,
            },
            {
                order: 2,
                name: "What to Expect",
                purpose: "Set expectations, reduce buyer's remorse",
                structure: `
[HEADLINE] - "What Happens Next"
[TIMELINE CARDS] - 3-4 cards showing immediate next steps:
  1. "📧 Check your email" - "We just sent your access details to [email]"
  2. "🚀 Get started" - "Log in and start [action] in the next 10 minutes"
  3. "📞 Join our community" - "Connect with other members"
  4. "🎓 First milestone" - "Complete [action] in the next 24 hours"`,
            },
            {
                order: 3,
                name: "Access Instructions",
                purpose: "Make it easy to access their purchase",
                structure: `
[HEADLINE] - "Access Your [PRODUCT]"
[ACCESS CARD] - Product-specific instructions:
  - For courses: "Click the button below to access your course dashboard"
  - For software: "Download the app or log in to the web platform"
  - For coaching: "Book your first session using the link below"
  - For community: "Join the private Slack/Discord/Facebook group"
[PRIMARY CTA] - "Access Now" / "Get Started" / "Book Session"`,
            },
            {
                order: 4,
                name: "Quick Start Guide",
                purpose: "Drive immediate engagement, first value",
                structure: `
[HEADLINE] - "Get Your First Win in the Next 10 Minutes"
[QUICK START CHECKLIST] - 3-5 simple tasks:
  ✓ Watch the welcome video
  ✓ Complete your profile
  ✓ Download the starter template
  ✓ Join the community
  ✓ Complete module 1 / first action
[COMPLETION INCENTIVE] - "Members who complete this checklist are 5x more likely to [outcome]"`,
            },
            {
                order: 5,
                name: "Support & Community",
                purpose: "Show them they're not alone",
                structure: `
[HEADLINE] - "We're Here to Help"
[SUPPORT OPTIONS] -
  - 💬 Community: Link to community platform
  - 📧 Email: Support email address
  - 📚 Help Center: Knowledge base link
  - 📅 Office Hours: Live Q&A schedule (if applicable)
[COMMUNITY INVITATION] - "Join 10,000+ members in our private community"`,
            },
            {
                order: 6,
                name: "Social Share",
                purpose: "Viral growth through happy customers",
                structure: `
[HEADLINE] - "Spread the Word"
[SUBHEADLINE] - "Know someone who'd benefit from [PRODUCT]? Share your excitement!"
[SHARE BUTTONS] - Pre-populated social shares
[AFFILIATE CTA] - "Want to earn commission? Join our affiliate program" (if applicable)`,
            },
        ],
        designSystem: {
            colorArchitecture: `
--success: Green/emerald for celebration
--primary: Brand color for CTAs
--background: Light, positive, welcoming
--card: White elevated cards
--accent: Secondary highlights`,
            typography: `
H1: text-5xl md:text-7xl font-bold
H2: text-3xl md:text-4xl font-bold
H3: text-xl md:text-2xl font-semibold
Body: text-base md:text-lg leading-relaxed
Timeline: text-base font-medium`,
            spacing: `
Section padding: py-16 md:py-24
Container: max-w-4xl
Card padding: p-6 md:p-8
Timeline gaps: gap-8`,
            visualEffects: `
Confetti animation on page load
Success checkmarks with subtle animation
Card hover: Lift effect (shadow-float)
Progress indicators for checklist
Warm, welcoming color palette`,
            componentPatterns: `
Celebration Icon: Large animated checkmark or confetti
Timeline Card: p-6 rounded-xl bg-card border-l-4 border-success
Access Button: Large, prominent, gradient background
Checklist Item: Interactive checkbox with check animation
Support Card: Icon + heading + description in grid layout`,
        },
        copyPrinciples: {
            headlines: `
- Celebratory: "Welcome!", "Congratulations!"
- Clear next steps: "What happens next"
- Specific: Use their email, product name, order details`,
            bodyVoice: `
- Excited and welcoming
- Clear and actionable
- Supportive and reassuring
- Community-focused
- Anticipation-building`,
            ctaOptimization: `
- Access CTA: "Access Now" / "Get Started"
- Community CTA: "Join the Community"
- Support CTA: "Get Help"
- Each CTA action-oriented and benefit-clear`,
        },
        conversionPatterns: [
            "Immediate celebration reduces buyer's remorse",
            "Clear next steps drive engagement",
            "Quick start checklist creates momentum",
            "Access instructions reduce support tickets",
            "Community invitation increases retention",
            "Social sharing drives referral growth",
            "First value in 10 minutes increases lifetime value",
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
