/**
 * AI Follow-Up Engine TypeScript Types
 *
 * Types for the AI-powered post-webinar follow-up system.
 * Supports prospect tracking, engagement monitoring, intent scoring,
 * and automated message sequencing.
 */

// ===========================================
// ENUMS
// ===========================================

export type FollowupSegment = "no_show" | "skimmer" | "sampler" | "engaged" | "hot";

export type FollowupConsentState =
    | "opt_in"
    | "implied"
    | "opted_out"
    | "bounced"
    | "complained";

export type FollowupChannel = "email" | "sms";

export type FollowupDeliveryStatus =
    | "pending"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "replied"
    | "bounced"
    | "complained"
    | "failed";

export type EngagementLevel = "cold" | "warm" | "hot";

export type SequenceType = "3_day_discount" | "nurture" | "reengagement";

export type ExperimentStatus = "draft" | "running" | "completed" | "paused";

export type StoryType = "micro_story" | "proof_element" | "testimonial" | "case_study";

export type PriceBand = "low" | "mid" | "high";

// ===========================================
// AGENT CONFIGURATION
// ===========================================

export interface VoiceConfig {
    tone: string;
    personality: string;
    empathy_level: string;
    urgency_level: string;
}

export interface KnowledgeBase {
    business_context: string[];
    product_details: string[];
    common_objections: string[];
    proof_elements: string[];
    testimonials: string[];
}

export interface OutcomeGoals {
    primary: string;
    secondary: string[];
    kpis: string[];
}

export interface SegmentRules {
    watch_pct: [number, number];
    touch_count: number;
    cadence_hours: number[];
}

export interface SegmentationRules {
    no_show: SegmentRules;
    skimmer: SegmentRules;
    sampler: SegmentRules;
    engaged: SegmentRules;
    hot: SegmentRules;
}

export interface ObjectionHandling {
    [key: string]: {
        reframe: string;
        proof_story_id: string | null;
    };
}

export interface ScoringConfig {
    intent_factors: {
        watch_percentage: number;
        replay_count: number;
        cta_clicks: number;
        email_engagement: number;
        response_speed: number;
    };
    fit_factors: {
        business_match: number;
        budget_indication: number;
        authority_level: number;
        need_urgency: number;
    };
}

export interface ChannelConfig {
    email: {
        enabled: boolean;
        max_per_day: number;
    };
    sms: {
        enabled: boolean;
        max_per_day: number;
        requires_high_intent: boolean;
    };
}

export interface ABTestConfig {
    enabled: boolean;
    variants: string[];
    split_percentage: number;
}

export interface ComplianceConfig {
    auto_stop_on_reply: boolean;
    max_touches_without_engagement: number;
    respect_timezone: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
}

export interface FollowupAgentConfig {
    id: string;
    user_id: string;
    funnel_project_id: string | null;
    offer_id: string | null;
    name: string;
    description: string | null;
    voice_config: VoiceConfig;
    knowledge_base: KnowledgeBase;
    outcome_goals: OutcomeGoals;
    segmentation_rules: SegmentationRules;
    objection_handling: ObjectionHandling;
    scoring_config: ScoringConfig;
    crm_field_mappings: Record<string, unknown>;
    channel_config: ChannelConfig;
    ab_test_config: ABTestConfig;
    compliance_config: ComplianceConfig;
    is_active: boolean;
    automation_enabled: boolean;
    created_at: string;
    updated_at: string;
}

// ===========================================
// PROSPECT TRACKING
// ===========================================

export interface FollowupProspect {
    id: string;
    user_id: string;
    funnel_project_id: string | null;
    contact_id: string | null;
    agent_config_id: string | null;
    email: string;
    first_name: string | null;
    phone: string | null;
    watch_percentage: number;
    watch_duration_seconds: number;
    last_watched_at: string | null;
    replay_count: number;
    challenge_notes: string | null;
    goal_notes: string | null;
    objection_hints: string[] | null;
    offer_clicks: number;
    segment: FollowupSegment;
    intent_score: number;
    fit_score: number;
    combined_score: number;
    engagement_level: EngagementLevel;
    timezone: string;
    locale: string;
    consent_state: FollowupConsentState;
    consent_timestamp: string | null;
    opted_out_at: string | null;
    opt_out_reason: string | null;
    total_touches: number;
    last_touch_at: string | null;
    next_scheduled_touch: string | null;
    converted: boolean;
    converted_at: string | null;
    conversion_value: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateProspectInput {
    funnel_project_id: string;
    contact_id?: string;
    agent_config_id?: string;
    email: string;
    first_name?: string;
    phone?: string;
    timezone?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateProspectWatchData {
    watch_percentage: number;
    watch_duration_seconds: number;
    last_watched_at: string;
    replay_count?: number;
}

export interface UpdateProspectIntakeData {
    challenge_notes?: string;
    goal_notes?: string;
    objection_hints?: string[];
}

// ===========================================
// ENGAGEMENT TRACKING
// ===========================================

export interface FollowupEvent {
    id: string;
    prospect_id: string;
    delivery_id: string | null;
    event_type: string;
    event_subtype: string | null;
    event_data: Record<string, unknown>;
    user_agent: string | null;
    ip_address: string | null;
    created_at: string;
}

export interface TrackEngagementInput {
    prospect_id: string;
    event_type:
        | "video_watch"
        | "video_replay"
        | "offer_click"
        | "email_open"
        | "link_click"
        | "reply"
        | "conversion";
    event_subtype?: string;
    event_data?: Record<string, unknown>;
    user_agent?: string;
    ip_address?: string;
}

export interface EngagementSummary {
    total_deliveries: number;
    total_opens: number;
    total_clicks: number;
    last_engagement: string | null;
    channels_used: FollowupChannel[];
    open_rate: number;
    click_rate: number;
}

// ===========================================
// INTENT SCORING
// ===========================================

export interface IntentScoreFactors {
    watch_percentage_contribution: number;
    replay_count_contribution: number;
    cta_clicks_contribution: number;
    email_engagement_contribution: number;
    response_speed_contribution: number;
}

export interface FollowupIntentScore {
    id: string;
    prospect_id: string;
    intent_score: number;
    fit_score: number;
    combined_score: number;
    score_factors: IntentScoreFactors;
    change_reason: string | null;
    change_delta: number | null;
    created_at: string;
}

export interface CalculateIntentScoreInput {
    watch_percentage: number;
    replay_count: number;
    offer_clicks: number;
    email_opens: number;
    email_clicks: number;
    response_speed_hours: number;
}

// ===========================================
// SEQUENCES
// ===========================================

export interface BranchingRules {
    high_engagement_branch: {
        condition: string;
        sequence_override: string | null;
    };
    conversion_branch: {
        condition: string;
        action: string;
    };
    opt_out_branch: {
        condition: string;
        action: string;
    };
}

export interface FollowupSequence {
    id: string;
    agent_config_id: string;
    name: string;
    description: string | null;
    sequence_type: SequenceType;
    trigger_event: string;
    trigger_delay_hours: number;
    deadline_hours: number;
    total_messages: number;
    target_segments: FollowupSegment[];
    min_intent_score: number;
    max_intent_score: number;
    branching_rules: BranchingRules;
    stop_on_reply: boolean;
    stop_on_conversion: boolean;
    stop_on_high_engagement: boolean;
    max_touches_without_engagement: number;
    requires_manual_approval: boolean;
    is_automated: boolean;
    is_active: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ===========================================
// MESSAGES
// ===========================================

export interface PersonalizationRules {
    no_show: { tone: string; cta: string };
    skimmer: { tone: string; cta: string };
    sampler: { tone: string; cta: string };
    engaged: { tone: string; cta: string };
    hot: { tone: string; cta: string };
}

export interface PrimaryCTA {
    text: string;
    url: string;
    tracking_enabled: boolean;
}

export interface FollowupMessage {
    id: string;
    sequence_id: string;
    name: string;
    message_order: number;
    channel: FollowupChannel;
    send_delay_hours: number;
    subject_line: string | null;
    body_content: string;
    personalization_rules: PersonalizationRules;
    ab_test_variant: string | null;
    variant_weight: number;
    primary_cta: PrimaryCTA;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ===========================================
// DELIVERIES
// ===========================================

export interface FollowupDelivery {
    id: string;
    prospect_id: string;
    message_id: string;
    channel: FollowupChannel;
    personalized_subject: string | null;
    personalized_body: string;
    personalized_cta: PrimaryCTA | null;
    scheduled_send_at: string;
    actual_sent_at: string | null;
    delivery_status: FollowupDeliveryStatus;
    opened_at: string | null;
    first_click_at: string | null;
    total_clicks: number;
    replied_at: string | null;
    email_provider_id: string | null;
    sms_provider_id: string | null;
    bounce_type: string | null;
    bounce_reason: string | null;
    error_message: string | null;
    ab_test_variant: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ===========================================
// SERVICE RESPONSES
// ===========================================

export interface ProspectServiceResponse {
    success: boolean;
    prospect?: FollowupProspect;
    error?: string;
}

export interface EngagementServiceResponse {
    success: boolean;
    event?: FollowupEvent;
    score_updated?: boolean;
    new_score?: number;
    error?: string;
}

export interface ScoringServiceResponse {
    success: boolean;
    intent_score: number;
    fit_score: number;
    combined_score: number;
    factors: IntentScoreFactors;
    segment: FollowupSegment;
    engagement_level: EngagementLevel;
}
