/**
 * Marketing Content Engine Types
 * TypeScript interfaces for the organic social content generation system
 */

// ===========================================
// ENUMS
// ===========================================

export type MarketingPlatform = "instagram" | "facebook" | "linkedin" | "twitter";

export type MarketingFormat = "post" | "carousel" | "reel" | "story" | "article";

export type MarketingStoryFramework =
    | "founder_saga"
    | "myth_buster"
    | "philosophy_pov"
    | "current_event"
    | "how_to";

export type MarketingPublishStatus =
    | "draft"
    | "scheduled"
    | "published"
    | "failed"
    | "archived";

export type MarketingBriefStatus =
    | "draft"
    | "generating"
    | "ready"
    | "scheduled"
    | "published";

export type MarketingSpace = "sandbox" | "production";

export type MarketingApprovalStatus = "pending" | "approved" | "rejected";

export type ExperimentStatus = "draft" | "running" | "completed" | "paused";

// ===========================================
// CORE INTERFACES
// ===========================================

export interface MarketingProfile {
    id: string;
    user_id: string;
    funnel_project_id: string | null;
    name: string;
    brand_voice: string | null;
    tone_settings: ToneSettings;
    echo_mode_config: EchoModeConfig;
    story_themes: string[];
    visual_preferences: VisualPreferences;
    business_context: BusinessContext;
    product_knowledge: ProductKnowledge;
    is_active: boolean;
    last_calibrated_at: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface ToneSettings {
    conversational_professional: number; // 0-100
    warmth: number; // 0-100
    urgency: number; // 0-100
    empathy: number; // 0-100
    confidence: number; // 0-100
}

export interface EchoModeConfig {
    enabled: boolean;
    voice_characteristics: string[];
    pacing: "slow" | "moderate" | "fast";
    cadence: "rhythmic" | "balanced" | "varied";
    signature_phrases: string[];
}

export interface VisualPreferences {
    brand_colors: string[];
    logo_url: string | null;
    style_guide_url: string | null;
}

export interface BusinessContext {
    business_name: string;
    industry: string;
    target_audience: string;
    main_challenge: string;
    desired_outcome: string;
}

export interface ProductKnowledge {
    product_name: string;
    tagline: string;
    promise: string;
    features: string[];
    guarantee: string;
}

// ===========================================
// PLATFORM SPECIFICATIONS
// ===========================================

export interface PlatformSpec {
    id: string;
    platform: MarketingPlatform;
    spec_version: string;
    max_text_length: number;
    max_hashtags: number;
    media_specs: MediaSpecs;
    hashtag_rules: HashtagRules;
    best_practices: BestPractices;
    accessibility_requirements: AccessibilityRequirements;
    last_updated: string;
    created_at: string;
}

export interface MediaSpecs {
    image: {
        max_size_mb: number;
        recommended_dimensions: string;
        formats: string[];
    };
    video: {
        max_size_mb: number;
        max_duration_seconds: number;
        formats: string[];
    };
}

export interface HashtagRules {
    max_per_post: number;
    optimal_count: number;
    placement: string;
}

export interface BestPractices {
    optimal_post_length: number;
    cta_placement: string;
    link_handling: string;
}

export interface AccessibilityRequirements {
    alt_text_required: boolean;
    caption_required: boolean;
    max_reading_level: number;
}

// ===========================================
// CONTENT BRIEFS
// ===========================================

export interface ContentBrief {
    id: string;
    user_id: string;
    funnel_project_id: string | null;
    marketing_profile_id: string | null;
    name: string;
    goal: string;
    funnel_entry_point: string;
    topic: string;
    icp_description: string | null;
    tone_constraints: string | null;
    transformation_focus: string | null;
    target_platforms: MarketingPlatform[];
    preferred_framework: MarketingStoryFramework;
    generation_config: GenerationConfig;
    status: MarketingBriefStatus;
    space: MarketingSpace;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface GenerationConfig {
    generate_variants: boolean;
    variant_count: number;
    include_media_suggestions: boolean;
    apply_echo_mode: boolean;
}

export interface CreateBriefInput {
    name: string;
    goal: string;
    topic: string;
    funnel_project_id?: string;
    marketing_profile_id?: string;
    icp_description?: string;
    tone_constraints?: string;
    transformation_focus?: string;
    target_platforms?: MarketingPlatform[];
    preferred_framework?: MarketingStoryFramework;
    funnel_entry_point?: string;
    space?: MarketingSpace;
}

// ===========================================
// POST VARIANTS
// ===========================================

export interface PostVariant {
    id: string;
    content_brief_id: string;
    user_id: string;
    platform: MarketingPlatform;
    format_type: MarketingFormat;
    copy_text: string;
    media_urls: string[];
    alt_text: string | null;
    hashtags: string[];
    caption: string | null;
    cta_config: CTAConfig;
    link_strategy: LinkStrategy;
    story_framework: MarketingStoryFramework | null;
    story_angle: string | null;
    approval_status: MarketingApprovalStatus;
    approval_notes: string | null;
    approved_by: string | null;
    approved_at: string | null;
    preflight_status: PreflightStatus;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface CTAConfig {
    text: string;
    type: "bio_link" | "dm_keyword" | "comment_trigger" | "direct_link";
    url: string | null;
    dm_keyword: string | null;
    comment_trigger: string | null;
}

export interface LinkStrategy {
    primary_url: string | null;
    utm_parameters: UTMParameters;
    tracking_enabled: boolean;
}

export interface UTMParameters {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
}

export interface PreflightStatus {
    passed: boolean;
    compliance_check: "pending" | "passed" | "failed";
    accessibility_check: "pending" | "passed" | "failed";
    brand_voice_check: "pending" | "passed" | "failed";
    character_limit_check: "pending" | "passed" | "failed";
    issues: string[];
}

export interface UpdateVariantInput {
    copy_text?: string;
    media_urls?: string[];
    alt_text?: string;
    hashtags?: string[];
    caption?: string;
    cta_config?: Partial<CTAConfig>;
    link_strategy?: Partial<LinkStrategy>;
}

// ===========================================
// CONTENT CALENDAR
// ===========================================

export interface ContentCalendar {
    id: string;
    post_variant_id: string;
    user_id: string;
    scheduled_publish_at: string;
    actual_published_at: string | null;
    publish_status: MarketingPublishStatus;
    provider_post_id: string | null;
    space: MarketingSpace;
    retry_config: RetryConfig;
    publish_notes: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface RetryConfig {
    enabled: boolean;
    max_attempts: number;
    attempt_count: number;
    last_error: string | null;
}

export interface SchedulePostInput {
    post_variant_id: string;
    scheduled_publish_at: string;
    space?: MarketingSpace;
    publish_notes?: string;
}

// ===========================================
// TREND SIGNALS
// ===========================================

export interface TrendSignal {
    id: string;
    user_id: string | null;
    topic: string;
    source: string;
    relevance_score: number;
    matched_niches: string[];
    suggested_angles: SuggestedAngles;
    status: "active" | "used" | "dismissed";
    dismissed_by: string | null;
    dismissed_at: string | null;
    times_used: number;
    metadata: Record<string, any>;
    discovered_at: string;
    expires_at: string | null;
    created_at: string;
}

export interface SuggestedAngles {
    founder_perspective: string;
    myth_buster: string;
    industry_pov: string;
}

// ===========================================
// NICHE MODELS
// ===========================================

export interface NicheModel {
    id: string;
    user_id: string;
    niche: string;
    best_formats: FormatPerformance;
    best_times: BestTimes;
    conversion_rates: ConversionRates;
    platform_insights: PlatformInsights;
    bandit_allocation: BanditAllocation;
    total_posts: number;
    total_opt_ins: number;
    overall_oi_1000: number;
    metadata: Record<string, any>;
    last_trained_at: string;
    created_at: string;
    updated_at: string;
}

export interface FormatPerformance {
    post: { conversion_rate: number; sample_size: number };
    carousel: { conversion_rate: number; sample_size: number };
    reel: { conversion_rate: number; sample_size: number };
    story: { conversion_rate: number; sample_size: number };
    article: { conversion_rate: number; sample_size: number };
}

export interface BestTimes {
    instagram: string[];
    facebook: string[];
    linkedin: string[];
    twitter: string[];
}

export interface ConversionRates {
    founder_saga: number;
    myth_buster: number;
    philosophy_pov: number;
    current_event: number;
    how_to: number;
}

export interface PlatformInsights {
    instagram: Record<string, any>;
    facebook: Record<string, any>;
    linkedin: Record<string, any>;
    twitter: Record<string, any>;
}

export interface BanditAllocation {
    top_performers: string[];
    experiments: string[];
    top_percentage: number;
    experiment_percentage: number;
}

// ===========================================
// ANALYTICS
// ===========================================

export interface MarketingAnalytics {
    id: string;
    post_variant_id: string;
    user_id: string;
    impressions: number;
    saves: number;
    shares: number;
    comments: number;
    likes: number;
    dm_triggers: number;
    watch_through_pct: number;
    opt_ins: number;
    time_to_opt_in: number[];
    oi_1000: number; // North-star metric
    link_clicks: number;
    cta_clicks: number;
    attributed_revenue: number;
    platform_metrics: Record<string, any>;
    metadata: Record<string, any>;
    last_synced_at: string;
    created_at: string;
    updated_at: string;
}

export interface AnalyticsDashboard {
    overview: {
        total_posts: number;
        total_impressions: number;
        total_opt_ins: number;
        overall_oi_1000: number;
        avg_engagement_rate: number;
    };
    by_platform: Record<
        MarketingPlatform,
        {
            posts: number;
            impressions: number;
            opt_ins: number;
            oi_1000: number;
        }
    >;
    by_framework: Record<
        MarketingStoryFramework,
        {
            posts: number;
            impressions: number;
            opt_ins: number;
            oi_1000: number;
        }
    >;
    top_performers: Array<{
        post_variant_id: string;
        platform: MarketingPlatform;
        oi_1000: number;
        impressions: number;
        opt_ins: number;
    }>;
    experiments: ExperimentSummary[];
}

// ===========================================
// EXPERIMENTS
// ===========================================

export interface MarketingExperiment {
    id: string;
    user_id: string;
    content_brief_id: string | null;
    name: string;
    hypothesis: string | null;
    experiment_type: "story_framework" | "cta_variant" | "timing" | "platform";
    variant_post_ids: string[];
    traffic_split: Record<string, number>;
    results: Record<string, ExperimentResults>;
    confidence_level: number | null;
    is_significant: boolean;
    winner_variant: string | null;
    status: ExperimentStatus;
    started_at: string | null;
    completed_at: string | null;
    auto_scale_config: AutoScaleConfig;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface ExperimentResults {
    impressions: number;
    opt_ins: number;
    oi_1000: number;
}

export interface AutoScaleConfig {
    enabled: boolean;
    scale_winners: boolean;
    pause_losers: boolean;
    min_sample_size: number;
}

export interface ExperimentSummary {
    experiment_id: string;
    name: string;
    status: ExperimentStatus;
    winner_variant: string | null;
    is_significant: boolean;
    variants: Array<{
        name: string;
        oi_1000: number;
    }>;
}

// ===========================================
// GENERATION OUTPUTS
// ===========================================

export interface StoryAngle {
    angle: "Founder" | "Myth-Buster" | "Industry POV";
    framework: MarketingStoryFramework;
    hook: string;
    story_outline: string;
    key_message: string;
    estimated_length: number;
}

export interface GeneratedContent {
    story_angles: StoryAngle[];
    selected_angle?: StoryAngle;
    platform_variants?: Record<MarketingPlatform, PostVariant>;
}

export interface PreflightResult {
    passed: boolean;
    checks: {
        compliance: { passed: boolean; issues: string[] };
        accessibility: { passed: boolean; issues: string[] };
        brand_voice: { passed: boolean; issues: string[] };
        character_limit: { passed: boolean; issues: string[] };
    };
}

// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

export interface CreateProfileRequest {
    name: string;
    funnel_project_id?: string;
    brand_voice?: string;
    tone_settings?: Partial<ToneSettings>;
    story_themes?: string[];
}

export interface CreateProfileResponse {
    success: boolean;
    profile?: MarketingProfile;
    error?: string;
}

export interface GenerateContentRequest {
    brief_id: string;
    selected_angle?: string;
    platforms?: MarketingPlatform[];
}

export interface GenerateContentResponse {
    success: boolean;
    story_angles?: StoryAngle[];
    variants?: PostVariant[];
    error?: string;
}

export interface PublishRequest {
    post_variant_id: string;
    platform: MarketingPlatform;
    scheduled_at?: string;
    space?: MarketingSpace;
}

export interface PublishResponse {
    success: boolean;
    calendar_entry?: ContentCalendar;
    provider_post_id?: string;
    error?: string;
}

export interface AnalyticsRequest {
    funnel_project_id?: string;
    start_date?: string;
    end_date?: string;
    platform?: MarketingPlatform;
}

export interface AnalyticsResponse {
    success: boolean;
    dashboard?: AnalyticsDashboard;
    error?: string;
}
