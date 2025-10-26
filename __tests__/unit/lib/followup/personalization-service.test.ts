/**
 * Tests for Personalization Service
 */

import { describe, it, expect } from "vitest";
import {
    personalizeMessage,
    validateMessageTemplate,
    getAvailableTokens,
} from "@/lib/followup/personalization-service";
import type { FollowupMessage, FollowupProspect } from "@/types/followup";

describe("Personalization Service", () => {
    const mockProspect: FollowupProspect = {
        id: "prospect-123",
        user_id: "user-123",
        funnel_project_id: "funnel-123",
        contact_id: "contact-123",
        agent_config_id: "agent-123",
        email: "john@example.com",
        first_name: "John",
        phone: "+1234567890",
        watch_percentage: 75,
        watch_duration_seconds: 1800,
        last_watched_at: "2025-01-26T10:00:00Z",
        replay_count: 1,
        challenge_notes: "Struggling with lead generation",
        goal_notes: "Double revenue in 6 months",
        objection_hints: ["price_concern", "timing_concern"],
        offer_clicks: 2,
        segment: "engaged",
        intent_score: 75,
        fit_score: 60,
        combined_score: 70,
        engagement_level: "warm",
        timezone: "America/New_York",
        locale: "en-US",
        consent_state: "opt_in",
        consent_timestamp: "2025-01-26T09:00:00Z",
        opted_out_at: null,
        opt_out_reason: null,
        total_touches: 0,
        last_touch_at: null,
        next_scheduled_touch: null,
        converted: false,
        converted_at: null,
        conversion_value: null,
        metadata: {},
        created_at: "2025-01-26T09:00:00Z",
        updated_at: "2025-01-26T10:00:00Z",
    };

    const mockMessage: FollowupMessage = {
        id: "message-123",
        sequence_id: "sequence-123",
        name: "Day 1 Email",
        message_order: 1,
        channel: "email",
        send_delay_hours: 24,
        subject_line: "Hey {first_name}, quick question about {challenge}",
        body_content:
            "Hi {first_name},\n\nI noticed you watched {watch_pct}% of the webinar. Your goal to {goal_notes} is inspiring!\n\nClick here: {enrollment_link}",
        personalization_rules: {
            no_show: { tone: "gentle", cta: "watch_replay" },
            skimmer: { tone: "curious", cta: "key_moments" },
            sampler: { tone: "value", cta: "complete_watch" },
            engaged: { tone: "conversion", cta: "book_call" },
            hot: { tone: "urgency", cta: "claim_offer" },
        },
        ab_test_variant: null,
        variant_weight: 100,
        primary_cta: {
            text: "Get Started",
            url: "https://example.com/enroll",
            tracking_enabled: true,
        },
        metadata: {},
        created_at: "2025-01-26T09:00:00Z",
        updated_at: "2025-01-26T09:00:00Z",
    };

    describe("personalizeMessage", () => {
        it("replaces basic tokens in subject and body", () => {
            const result = personalizeMessage(mockMessage, mockProspect);

            expect(result.subject).toContain("John");
            expect(result.subject).toContain("Struggling with lead generation");
            expect(result.body).toContain("John");
            expect(result.body).toContain("75%");
            expect(result.body).toContain("Double revenue in 6 months");
        });

        it("handles missing first name with default", () => {
            const prospectNoName = { ...mockProspect, first_name: null };
            const messageWithToken: FollowupMessage = {
                ...mockMessage,
                subject_line: "Hey {first_name}",
                body_content: "Hi {first_name}",
            };

            const result = personalizeMessage(messageWithToken, prospectNoName);

            // When first_name is null, buildTokenValues defaults it to "there"
            expect(result.subject).toContain("there");
            expect(result.body).toContain("there");
        });

        it("handles missing challenge/goal notes gracefully", () => {
            const prospectNoNotes = {
                ...mockProspect,
                challenge_notes: null,
                goal_notes: null,
            };

            const result = personalizeMessage(mockMessage, prospectNoNotes);

            expect(result.body).toBeTruthy();
            expect(result.subject).toBeTruthy();
        });

        it("preserves URL placeholders for later replacement", () => {
            const result = personalizeMessage(mockMessage, mockProspect);

            expect(result.body).toContain("{ENROLLMENT_LINK}");
        });

        it("personalizes CTA text", () => {
            const messageWithTokenCTA: FollowupMessage = {
                ...mockMessage,
                primary_cta: {
                    text: "Start {goal_notes}",
                    url: "https://example.com",
                    tracking_enabled: true,
                },
            };

            const result = personalizeMessage(messageWithTokenCTA, mockProspect);

            expect(result.cta.text).toContain("Double revenue");
        });
    });

    describe("validateMessageTemplate", () => {
        it("returns valid for well-formed templates", () => {
            const template =
                "Hi {first_name}, you watched {watch_pct}% of the webinar.";

            const result = validateMessageTemplate(template);

            expect(result.valid).toBe(true);
        });

        it("warns when no tokens are present", () => {
            const template = "This is a generic message with no personalization.";

            const result = validateMessageTemplate(template);

            expect(result.valid).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings?.[0]).toContain("No personalization tokens");
        });

        it("suggests adding first_name for longer messages", () => {
            const template =
                "This is a long message without any personalization that goes on and on about various topics and should really include the person's name to make it more personal.";

            const result = validateMessageTemplate(template);

            expect(result.valid).toBe(true);
            expect(result.warnings?.some((w) => w.includes("first_name"))).toBe(true);
        });
    });

    describe("getAvailableTokens", () => {
        it("returns list of available tokens", () => {
            const tokens = getAvailableTokens();

            expect(tokens.length).toBeGreaterThan(0);
            expect(tokens.find((t) => t.token === "{first_name}")).toBeDefined();
            expect(tokens.find((t) => t.token === "{watch_pct}")).toBeDefined();
            expect(tokens.find((t) => t.token === "{challenge_notes}")).toBeDefined();
        });

        it("includes descriptions and examples for each token", () => {
            const tokens = getAvailableTokens();

            tokens.forEach((token) => {
                expect(token.token).toBeTruthy();
                expect(token.description).toBeTruthy();
                expect(token.example).toBeTruthy();
            });
        });
    });
});
