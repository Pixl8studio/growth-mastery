/**
 * Segment-Aware Message Templates
 *
 * Templates that adapt based on prospect segment (watch percentage).
 * Follows config.md specification for tone, CTA, and content focus.
 */

export interface MessageTemplate {
    type:
        | "opening"
        | "value_story"
        | "social_proof"
        | "objection"
        | "offer_recap"
        | "urgency"
        | "closing"
        | "sms_checkin";
    channel: "email" | "sms";
    subjectLineTemplate: string;
    bodyTemplate: string;
    ctaText: string;
    ctaUrl: string;
}

export interface SegmentPersonalization {
    tone: string;
    ctaFocus: string;
    length: "short" | "medium" | "long";
    emphasis: string;
}

/**
 * Segment-specific personalization rules
 */
export const SEGMENT_RULES: Record<string, SegmentPersonalization> = {
    no_show: {
        tone: "gentle, curious",
        ctaFocus: "watch_replay",
        length: "long",
        emphasis: "Value of content they missed, key takeaways",
    },
    skimmer: {
        tone: "curiosity-building",
        ctaFocus: "complete_watch",
        length: "medium",
        emphasis: "Highlight what they'll discover",
    },
    sampler: {
        tone: "value reinforcement",
        ctaFocus: "complete_watch",
        length: "medium",
        emphasis: "Build on what they've seen",
    },
    engaged: {
        tone: "conversion-focused",
        ctaFocus: "book_call",
        length: "short",
        emphasis: "Remove objections, show path forward",
    },
    hot: {
        tone: "urgent, direct",
        ctaFocus: "claim_offer",
        length: "short",
        emphasis: "Price/ROI, deadline, bonus",
    },
};

/**
 * Opening message templates (Day 0)
 */
export function getOpeningTemplate(segment: string): MessageTemplate {
    const _rules = SEGMENT_RULES[segment] || SEGMENT_RULES.sampler;

    if (segment === "no_show") {
        return {
            type: "opening",
            channel: "email",
            subjectLineTemplate:
                "{first_name}, here's what you missed from {webinar_title}",
            bodyTemplate: `Hey {first_name},

I noticed you registered for {webinar_title} but couldn't make it. Life gets busy—I totally understand.

Here's the good news: I saved the 3 most valuable takeaways that directly address {challenge_notes}:

1. The exact framework we covered in the first 15 minutes
2. The live demo that showed how to solve {challenge_notes}
3. The resources and next steps everyone asked about

Want me to send you the 10-minute highlight reel that covers these? It's the fastest way to get the value without watching the full replay.

Just reply "SEND IT" and I'll get that over to you.

Talk soon!`,
            ctaText: "Watch 10-Minute Highlights",
            ctaUrl: "{replay_link}",
        };
    }

    if (segment === "skimmer") {
        return {
            type: "opening",
            channel: "email",
            subjectLineTemplate: "Quick question about {webinar_title}, {first_name}",
            bodyTemplate: `Hey {first_name},

Thanks for joining {webinar_title}! I noticed you caught about {watch_pct}% of the session.

You mentioned {challenge_notes} in your registration, and the exact solution to that was covered in the segment you might have missed (around the {minutes_watched}-minute mark).

Here's the specific part I'm talking about: [timestamp link to that exact segment]

It's only 7 minutes and directly addresses your goal of {goal_notes}.

Want me to send you just that part? Or if you're curious about the full picture, the complete replay is here: {replay_link}

What would be most helpful?`,
            ctaText: "Watch Key Segment",
            ctaUrl: "{replay_link}",
        };
    }

    if (segment === "engaged" || segment === "hot") {
        return {
            type: "opening",
            channel: "email",
            subjectLineTemplate: "Quick follow-up on {webinar_title}, {first_name}",
            bodyTemplate: `Hey {first_name},

Thanks for watching {webinar_title} today! You stayed for {watch_pct}% of it, which tells me this resonates with your goal of {goal_notes}.

Quick question: Based on what you saw about solving {challenge_notes}, what's the one thing you'd want to change in the next 30 days?

Hit reply and let me know. I'll tailor a plan specifically for your situation and answer any questions you have.

Looking forward to hearing from you!`,
            ctaText: "Let's Talk",
            ctaUrl: "{next_step}",
        };
    }

    // Default: sampler
    return {
        type: "opening",
        channel: "email",
        subjectLineTemplate: "About that {webinar_title} session, {first_name}",
        bodyTemplate: `Hey {first_name},

Thanks for watching part of {webinar_title} today! You caught about {watch_pct}% of it and mentioned you're working on {challenge_notes}.

The good news: You saw the foundation. The part coming up next directly addresses {goal_notes} with the exact step-by-step approach.

Here's the 5-minute segment I'd recommend watching next: [specific timestamp]

After that, everything clicks into place. Want me to send you that clip?

Or if you'd rather see the full picture, here's the complete replay: {replay_link}

Let me know what's most helpful!`,
        ctaText: "Complete The Training",
        ctaUrl: "{replay_link}",
    };
}

/**
 * Value/Story message templates
 */
export function getValueStoryTemplate(segment: string): MessageTemplate {
    const _rules = SEGMENT_RULES[segment] || SEGMENT_RULES.sampler;

    return {
        type: "value_story",
        channel: "email",
        subjectLineTemplate: `How {client_name} solved {challenge_notes} in weeks`,
        bodyTemplate: `Hey {first_name},

Quick story that might resonate with your situation around {challenge_notes}...

{client_name} was in a similar spot—working on {goal_notes} but hitting the same wall you described.

Here's what changed:

They implemented the exact framework from {webinar_title}, starting with just the first step. No massive overhaul, just one focused action.

Within 18 days: {specific_result}

The thing that surprised them most? It wasn't the result—it was how straightforward the path was once they had the right framework.

That's what we covered in the training. If you want to see how this applies to your specific situation with {challenge_notes}, we should talk.

Want me to map this out for you?`,
        ctaText:
            segment === "hot" || segment === "engaged"
                ? "Yes, Map It Out"
                : "Learn More",
        ctaUrl: "{next_step}",
    };
}

/**
 * Social proof template
 */
export function getSocialProofTemplate(_segment: string): MessageTemplate {
    return {
        type: "social_proof",
        channel: "email",
        subjectLineTemplate: "Real results from people like you, {first_name}",
        bodyTemplate: `Hey {first_name},

I wanted to share something encouraging about {challenge_notes}...

Three people from last month's cohort had the exact same challenge you mentioned. Here's what happened:

**Sarah** (similar business to yours):
"I was skeptical about {goal_notes}, but the framework made it click. Implemented in 2 weeks, saw results in 4."

**Marcus** (same industry):
"The approach to {challenge_notes} was exactly what I needed. Wish I'd found this 6 months ago."

**Jamie**:
"Clear, actionable, no fluff. Did exactly what was outlined and got exactly the results promised."

These aren't outliers. This is what happens when you have the right approach for {challenge_notes}.

If you're serious about {goal_notes}, we should talk about your specific situation.

Ready to map this out?`,
        ctaText: "See If This Fits",
        ctaUrl: "{next_step}",
    };
}

/**
 * Objection handling template
 */
export function getObjectionTemplate(segment: string): MessageTemplate {
    const isHighIntent = segment === "engaged" || segment === "hot";

    return {
        type: "objection",
        channel: "email",
        subjectLineTemplate: isHighIntent
            ? "Quick ROI math for you, {first_name}"
            : "Common questions about {webinar_title}",
        bodyTemplate: isHighIntent
            ? `Hey {first_name},

Let's talk numbers for a second because {goal_notes} deserves a clear ROI conversation.

{offer_name}: {offer_price}

Your goal: {goal_notes} related to {challenge_notes}

Quick math:
- If you keep doing what you're doing: current trajectory
- If you implement this framework: {projected_outcome} in {timeline}

Payback: Typically 4-8 weeks based on your situation

The real cost isn't the investment—it's the time you spend trying to figure this out alone while {challenge_notes} continues to be a blocker.

Two options:
1. {checkout_url} - Enroll now and start this week
2. {book_call_url} - 15-min call to map your specific situation first

Which makes sense for you?`
            : `Hey {first_name},

A few common questions I get after {webinar_title}:

**"Will this actually work for my situation?"**
If you're dealing with {challenge_notes} and working toward {goal_notes}, yes. The framework adapts to your specific context.

**"How long does implementation take?"**
Most people see their first results within 2-3 weeks. Full implementation: 4-6 weeks.

**"What if I'm not sure this is right for me?"**
That's exactly why we offer {book_call_url}. Let's map your situation and see if this fits.

The framework from {webinar_title} works—you just need to see how it applies to {challenge_notes} specifically.

Want to walk through that together?`,
        ctaText: isHighIntent ? "Let's Talk ROI" : "Map My Situation",
        ctaUrl: "{next_step}",
    };
}

/**
 * Offer recap template
 */
export function getOfferRecapTemplate(segment: string): MessageTemplate {
    const isHighIntent = segment === "engaged" || segment === "hot";

    return {
        type: "offer_recap",
        channel: "email",
        subjectLineTemplate: isHighIntent
            ? "Your offer expires tomorrow, {first_name}"
            : "Here's what you get with {offer_name}",
        bodyTemplate: `Hey {first_name},

${
    isHighIntent
        ? `Quick reminder: Your special offer from {webinar_title} expires tomorrow at 11:59 PM {timezone}.`
        : `Based on your goal of {goal_notes}, here's what {offer_name} includes:`
}

**What you get:**
→ The complete {webinar_title} framework
→ Step-by-step implementation guide for {challenge_notes}
→ Templates and resources (ready to use)
→ Support to make sure this works for your situation
→ {bonuses}

**Investment:** {offer_price}
${isHighIntent ? `\n**Deadline:** Tomorrow 11:59 PM {timezone}` : ""}

**Guarantee:** {guarantee_terms} - If this doesn't help you make progress on {goal_notes}, you get your investment back.

${
    isHighIntent
        ? `This offer was created specifically for attendees of {webinar_title}. After tomorrow, it goes back to standard pricing.`
        : `This is designed to help you go from dealing with {challenge_notes} to achieving {goal_notes}.`
}

Two ways forward:
1. {checkout_url} - Enroll now and get started
2. {book_call_url} - Quick call to answer any questions first

What makes sense for you?`,
        ctaText: isHighIntent ? "Enroll Before Deadline" : "Review Full Details",
        ctaUrl: "{checkout_url}",
    };
}

/**
 * Urgency template (for near-deadline messages)
 */
export function getUrgencyTemplate(_segment: string): MessageTemplate {
    return {
        type: "urgency",
        channel: "email",
        subjectLineTemplate: "Last call: {offer_name} deadline tonight",
        bodyTemplate: `Hey {first_name},

This is it—your special access to {offer_name} expires tonight at 11:59 PM {timezone}.

After tonight:
- Offer goes back to standard pricing
- Special bonuses are removed
- This window closes

I created this specifically for {webinar_title} attendees working on {challenge_notes}. You watched {watch_pct}% of the training, so you know the framework works.

The question is simple: Do you want to implement this for {goal_notes} or keep trying to figure it out alone?

**Enroll now:** {checkout_url}
**Quick questions first:** {book_call_url}

You have until 11:59 PM {timezone} tonight.

After that, this opportunity is gone.`,
        ctaText: "Claim This Now",
        ctaUrl: "{checkout_url}",
    };
}

/**
 * Closing/Mission template (final message)
 */
export function getClosingTemplate(segment: string): MessageTemplate {
    const isHighIntent = segment === "engaged" || segment === "hot";

    return {
        type: "closing",
        channel: "email",
        subjectLineTemplate: isHighIntent
            ? "Our mission + your next step, {first_name}"
            : "Final thoughts on {webinar_title}, {first_name}",
        bodyTemplate: isHighIntent
            ? `Hey {first_name},

I want to be straight with you about why I built {offer_name}.

I've watched too many people struggle with {challenge_notes}—spending months trying to figure out what could be solved in weeks with the right framework.

That's why {webinar_title} exists. That's why this offer exists.

You told me you want to achieve {goal_notes}. I showed you the exact framework that makes that possible. Now it's decision time.

You watched {watch_pct}% of the training. ${segment === "hot" ? "You've seen this works. The only question left: Are you ready to implement it?" : "The path forward is clear."}

Two final options:
1. {checkout_url} - Enroll and start this week
2. {book_call_url} - One final call to answer anything

Whatever you decide, I'm proud to have shared this framework with you.

If this is your moment, I'm here to help.`
            : `Hey {first_name},

Thanks for taking the time with {webinar_title}.

Here's what I know: {challenge_notes} is solvable. {goal_notes} is achievable. You just need the right framework and the willingness to implement it.

That's what we covered in the training.

${segment === "no_show" || segment === "skimmer" ? "If you want to see the full picture, here's the replay: {replay_link}" : "If you want help implementing this for your specific situation, I'm here: {next_step}"}

Whatever path you choose, I wish you the best with {goal_notes}.

Keep moving forward.`,
        ctaText: isHighIntent ? "Let's Do This" : "Explore Options",
        ctaUrl: "{next_step}",
    };
}

/**
 * SMS check-in template
 */
export function getSMSCheckinTemplate(
    segment: string,
    position: "early" | "middle" | "late"
): MessageTemplate {
    if (position === "early") {
        return {
            type: "sms_checkin",
            channel: "sms",
            subjectLineTemplate: "",
            bodyTemplate: `{first_name}, thanks for joining {webinar_title}. Want the 7-min summary or the full breakdown? Reply 1 for summary, 2 for full.`,
            ctaText: "",
            ctaUrl: "",
        };
    }

    if (position === "middle") {
        return {
            type: "sms_checkin",
            channel: "sms",
            subjectLineTemplate: "",
            bodyTemplate: `Hey {first_name} - quick q: Based on {challenge_notes}, want me to send the exact next step you should take? Reply YES and I'll text it back.`,
            ctaText: "",
            ctaUrl: "",
        };
    }

    // late position
    const isHighIntent = segment === "engaged" || segment === "hot";
    return {
        type: "sms_checkin",
        channel: "sms",
        subjectLineTemplate: "",
        bodyTemplate: isHighIntent
            ? `{first_name}, offer ends tonight at 11:59 PM. Want the link to enroll or one quick answer before deciding? Reply L for link, Q for question.`
            : `{first_name} - {offer_name} closes soon. Want to talk through whether this fits your situation? Reply YES and I'll send the calendar link.`,
        ctaText: "",
        ctaUrl: "",
    };
}
