/**
 * Default Follow-Up Templates
 *
 * Fallback templates used when AI generation fails or deck is unavailable.
 * Based on config.md 3-day discount sequence specification.
 */

import type { FollowupChannel } from "@/types/followup";

export interface DefaultMessageTemplate {
    name: string;
    message_order: number;
    channel: FollowupChannel;
    send_delay_hours: number;
    subject_line?: string;
    body_content: string;
    personalization_rules: {
        no_show: { tone: string; cta: string };
        skimmer: { tone: string; cta: string };
        sampler: { tone: string; cta: string };
        engaged: { tone: string; cta: string };
        hot: { tone: string; cta: string };
    };
    primary_cta: {
        text: string;
        url: string;
        tracking_enabled: boolean;
    };
}

export interface DefaultSequenceTemplate {
    name: string;
    description: string;
    sequence_type: string;
    trigger_event: string;
    deadline_hours: number;
    total_messages: number;
    messages: DefaultMessageTemplate[];
}

/**
 * Default 3-Day Webinar Follow-Up Sequence
 *
 * Day 0: Email + SMS (2 messages)
 * Day 1: Email (1 message)
 * Day 2: Email (1 message)
 * Day 3: Email (1 message)
 */
export const DEFAULT_3_DAY_SEQUENCE: DefaultSequenceTemplate = {
    name: "3-Day Webinar Follow-Up",
    description: "Default post-webinar engagement sequence with deadline urgency",
    sequence_type: "3_day_discount",
    trigger_event: "webinar_end",
    deadline_hours: 72,
    total_messages: 5,
    messages: [
        {
            name: "Day 0 - Thank You Email",
            message_order: 1,
            channel: "email",
            send_delay_hours: 0,
            subject_line: "Thanks for joining, {{first_name}}!",
            body_content: `Hi {{first_name}},

Thank you for attending today's webinar! I noticed you watched about {{watch_pct}}% of the presentation.

{{#if watch_pct >= 50}}
Since you stayed for most of the presentation, I wanted to reach out personally. Based on what you shared about {{challenge_notes}}, I think you'll find real value in what we covered.

Here's a quick summary of the offer and how it addresses your specific challenge. If you could change one thing in the next 30 days, what would it be? Hit reply—I'll tailor a plan and answer any questions.
{{else}}
I wanted to share the replay link so you can catch the parts you missed: {{replay_link}}

The section on solving {{challenge_notes}} starts around the 18-minute mark—definitely worth watching if that resonates with your situation.
{{/if}}

Looking forward to connecting,
[Your Name]

P.S. The special offer mentioned in the webinar is available for the next 3 days. Don't miss out!`,
            personalization_rules: {
                no_show: {
                    tone: "gentle_reminder",
                    cta: "watch_replay",
                },
                skimmer: {
                    tone: "curiosity_building",
                    cta: "key_moments",
                },
                sampler: {
                    tone: "value_reinforcement",
                    cta: "complete_watch",
                },
                engaged: {
                    tone: "conversion_focused",
                    cta: "book_call",
                },
                hot: {
                    tone: "urgency_driven",
                    cta: "claim_offer",
                },
            },
            primary_cta: {
                text: "{{next_step}}",
                url: "{{replay_link}}",
                tracking_enabled: true,
            },
        },
        {
            name: "Day 0 - Thank You SMS",
            message_order: 2,
            channel: "sms",
            send_delay_hours: 0,
            body_content: `Hey {{first_name}}! Thanks for joining today. Want the 7-min highlight or the full replay? Reply 1 for highlight, 2 for replay. —[Your Brand]`,
            personalization_rules: {
                no_show: {
                    tone: "gentle_reminder",
                    cta: "watch_replay",
                },
                skimmer: {
                    tone: "curiosity_building",
                    cta: "key_moments",
                },
                sampler: {
                    tone: "value_reinforcement",
                    cta: "complete_watch",
                },
                engaged: {
                    tone: "conversion_focused",
                    cta: "book_call",
                },
                hot: {
                    tone: "urgency_driven",
                    cta: "claim_offer",
                },
            },
            primary_cta: {
                text: "Get Replay",
                url: "{{replay_link}}",
                tracking_enabled: true,
            },
        },
        {
            name: "Day 1 - Value + Story",
            message_order: 3,
            channel: "email",
            send_delay_hours: 24,
            subject_line: "How [Client Name] solved {{challenge_notes}} in weeks",
            body_content: `Hi {{first_name}},

I wanted to share a quick story that might resonate with your situation around {{challenge_notes}}.

One of our clients, Sarah, was in the exact same position. She felt overwhelmed and wasn't sure if she could make it work with her schedule. But she started with just one 15-minute block per day.

In week 2, she booked 5 paid calls. Her first client covered the entire program cost. The shift wasn't "can I afford it?"—it was "can I afford NOT to compound this?"

The pattern I see with successful clients: they pick their one 15-minute block and protect it fiercely. That's it.

If you want the exact worksheet Sarah used, I'll send it over. Or we can line up a quick call to map this to your specific situation: {{book_call_url}}

Your next step matters more than being perfect.

Talk soon,
[Your Name]

P.S. The special offer ends in 2 days. This is your window.`,
            personalization_rules: {
                no_show: {
                    tone: "gentle_reminder",
                    cta: "watch_replay",
                },
                skimmer: {
                    tone: "curiosity_building",
                    cta: "key_moments",
                },
                sampler: {
                    tone: "value_reinforcement",
                    cta: "complete_watch",
                },
                engaged: {
                    tone: "conversion_focused",
                    cta: "book_call",
                },
                hot: {
                    tone: "urgency_driven",
                    cta: "claim_offer",
                },
            },
            primary_cta: {
                text: "{{next_step}}",
                url: "{{book_call_url}}",
                tracking_enabled: true,
            },
        },
        {
            name: "Day 2 - Offer Recap + Deadline",
            message_order: 4,
            channel: "email",
            send_delay_hours: 48,
            subject_line: "Your offer ends tomorrow—here's what you get",
            body_content: `{{first_name}},

Tomorrow at 11:59 PM {{timezone}}, the special offer from the webinar closes.

Here's exactly what's included:

✓ [Core Feature 1 with transformation promise]
✓ [Core Feature 2 with specific outcome]
✓ [Core Feature 3 with measurable result]
✓ [Core Feature 4 with unique differentiator]
✓ [Core Feature 5 with time-saving benefit]

BONUSES (available only during this window):
• [Bonus 1 with $ value]
• [Bonus 2 with urgency element]
• [Bonus 3 with exclusivity]

GUARANTEE: [Risk reversal guarantee - specific, not generic]

This is designed specifically for people dealing with {{challenge_notes}}. Based on what you shared, I believe this will give you the exact framework to achieve {{goal_notes}}.

{{#if watch_pct >= 50}}
Ready to start? Enroll here: {{checkout_url}}

Or book a quick call if you have questions: {{book_call_url}}
{{else}}
Want to see exactly how this works first? Watch the full webinar: {{replay_link}}

Then decide if it's right for you.
{{/if}}

One day left,
[Your Name]`,
            personalization_rules: {
                no_show: {
                    tone: "gentle_reminder",
                    cta: "watch_replay",
                },
                skimmer: {
                    tone: "curiosity_building",
                    cta: "key_moments",
                },
                sampler: {
                    tone: "value_reinforcement",
                    cta: "complete_watch",
                },
                engaged: {
                    tone: "conversion_focused",
                    cta: "book_call",
                },
                hot: {
                    tone: "urgency_driven",
                    cta: "claim_offer",
                },
            },
            primary_cta: {
                text: "Enroll Now",
                url: "{{checkout_url}}",
                tracking_enabled: true,
            },
        },
        {
            name: "Day 3 - Final Call",
            message_order: 5,
            channel: "email",
            send_delay_hours: 72,
            subject_line: "Our mission + your next step, {{first_name}}",
            body_content: `{{first_name}},

I built this because I was tired of seeing talented people stuck in the same patterns, knowing they could achieve more with the right system.

You mentioned {{challenge_notes}} during registration. That specific challenge? It's exactly what this program was designed to solve.

Today is the last day for the special offer. After tonight at 11:59 PM {{timezone}}, the bonuses disappear and the price goes up.

If this is your moment—if you're ready to finally solve {{challenge_notes}} and achieve {{goal_notes}}—then let's do this together.

ENROLL NOW: {{checkout_url}}

Or if you need one quick answer before deciding, hit reply. I'll get back to you within the hour.

I'm proud to help if this is your moment.

[Your Name]

P.S. This offer closes in hours, not days. Don't let hesitation steal your momentum.`,
            personalization_rules: {
                no_show: {
                    tone: "gentle_reminder",
                    cta: "watch_replay",
                },
                skimmer: {
                    tone: "curiosity_building",
                    cta: "key_moments",
                },
                sampler: {
                    tone: "value_reinforcement",
                    cta: "complete_watch",
                },
                engaged: {
                    tone: "conversion_focused",
                    cta: "book_call",
                },
                hot: {
                    tone: "urgency_driven",
                    cta: "claim_offer",
                },
            },
            primary_cta: {
                text: "Enroll Before Deadline",
                url: "{{checkout_url}}",
                tracking_enabled: true,
            },
        },
    ],
};

/**
 * Get default templates for a 3-day sequence.
 */
export function getDefault3DaySequence(): DefaultSequenceTemplate {
    return DEFAULT_3_DAY_SEQUENCE;
}
