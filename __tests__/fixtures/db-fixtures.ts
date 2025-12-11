/**
 * Database Fixtures
 *
 * Reusable test data factories for common entity types.
 * All functions return plain objects that can be used with Supabase mocks.
 */

// Generate unique IDs for test isolation
let idCounter = 0;
export function generateId(prefix = "test"): string {
    idCounter++;
    return `${prefix}-${Date.now()}-${idCounter}`;
}

export function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ============================================================================
// User Fixtures
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    const id = overrides.id ?? generateUUID();
    return {
        id,
        email: overrides.email ?? `user-${id.slice(0, 8)}@test.com`,
        created_at: overrides.created_at ?? new Date().toISOString(),
        updated_at: overrides.updated_at ?? new Date().toISOString(),
    };
}

// ============================================================================
// Funnel Project Fixtures
// ============================================================================

export interface TestFunnelProject {
    id: string;
    user_id: string;
    name: string;
    status: "draft" | "active" | "archived";
    created_at: string;
    updated_at: string;
}

export function createTestFunnelProject(
    overrides: Partial<TestFunnelProject> = {}
): TestFunnelProject {
    return {
        id: overrides.id ?? generateUUID(),
        user_id: overrides.user_id ?? generateUUID(),
        name: overrides.name ?? "Test Funnel Project",
        status: overrides.status ?? "draft",
        created_at: overrides.created_at ?? new Date().toISOString(),
        updated_at: overrides.updated_at ?? new Date().toISOString(),
    };
}

// ============================================================================
// Offer Fixtures
// ============================================================================

export interface TestOffer {
    id: string;
    funnel_project_id: string;
    user_id: string;
    name: string;
    tagline: string;
    price: number;
    currency: string;
    features: string[];
    bonuses: string[];
    guarantee: string;
    promise: string;
    person: string;
    process: string;
    purpose: string;
    pathway: string;
    max_features: number;
    max_bonuses: number;
    created_at: string;
}

export function createTestOffer(overrides: Partial<TestOffer> = {}): TestOffer {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        user_id: overrides.user_id ?? generateUUID(),
        name: overrides.name ?? "Premium Coaching Program",
        tagline: overrides.tagline ?? "Transform Your Business",
        price: overrides.price ?? 997,
        currency: overrides.currency ?? "USD",
        features: overrides.features ?? ["Feature 1", "Feature 2", "Feature 3"],
        bonuses: overrides.bonuses ?? ["Bonus 1", "Bonus 2"],
        guarantee: overrides.guarantee ?? "30-day money back",
        promise: overrides.promise ?? "Transform your business in 90 days",
        person: overrides.person ?? "Struggling entrepreneurs",
        process: overrides.process ?? "Our proven framework",
        purpose: overrides.purpose ?? "To help you achieve freedom",
        pathway: overrides.pathway ?? "direct_purchase",
        max_features: overrides.max_features ?? 6,
        max_bonuses: overrides.max_bonuses ?? 5,
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

// ============================================================================
// Transcript Fixtures
// ============================================================================

export interface TestTranscript {
    id: string;
    user_id: string;
    funnel_project_id: string;
    transcript_text: string;
    extracted_data: Record<string, unknown>;
    created_at: string;
}

export function createTestTranscript(
    overrides: Partial<TestTranscript> = {}
): TestTranscript {
    return {
        id: overrides.id ?? generateUUID(),
        user_id: overrides.user_id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        transcript_text:
            overrides.transcript_text ??
            "Sample transcript text about business coaching",
        extracted_data: overrides.extracted_data ?? {
            niche: "coaching",
            target_audience: "entrepreneurs",
        },
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

// ============================================================================
// Page Fixtures
// ============================================================================

export interface TestPage {
    id: string;
    funnel_project_id: string;
    headline: string;
    is_published: boolean;
    vanity_slug: string;
    created_at: string;
    updated_at: string;
    funnel_projects?: { id: string; name: string };
}

export function createTestEnrollmentPage(overrides: Partial<TestPage> = {}): TestPage {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        headline: overrides.headline ?? "Join Our Masterclass",
        is_published: overrides.is_published ?? false,
        vanity_slug: overrides.vanity_slug ?? "join-masterclass",
        created_at: overrides.created_at ?? new Date().toISOString(),
        updated_at: overrides.updated_at ?? new Date().toISOString(),
        funnel_projects: overrides.funnel_projects,
    };
}

export function createTestWatchPage(overrides: Partial<TestPage> = {}): TestPage {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        headline: overrides.headline ?? "Watch Our Training",
        is_published: overrides.is_published ?? false,
        vanity_slug: overrides.vanity_slug ?? "watch-training",
        created_at: overrides.created_at ?? new Date().toISOString(),
        updated_at: overrides.updated_at ?? new Date().toISOString(),
        funnel_projects: overrides.funnel_projects,
    };
}

export function createTestRegistrationPage(
    overrides: Partial<TestPage> = {}
): TestPage {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        headline: overrides.headline ?? "Register for Event",
        is_published: overrides.is_published ?? false,
        vanity_slug: overrides.vanity_slug ?? "register-event",
        created_at: overrides.created_at ?? new Date().toISOString(),
        updated_at: overrides.updated_at ?? new Date().toISOString(),
        funnel_projects: overrides.funnel_projects,
    };
}

// ============================================================================
// Marketing Fixtures
// ============================================================================

export interface TestMarketingProfile {
    id: string;
    funnel_project_id: string;
    name: string;
    brand_voice: string;
    tone: string;
    created_at: string;
}

export function createTestMarketingProfile(
    overrides: Partial<TestMarketingProfile> = {}
): TestMarketingProfile {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        name: overrides.name ?? "Test Marketing Profile",
        brand_voice: overrides.brand_voice ?? "Professional and approachable",
        tone: overrides.tone ?? "friendly",
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

export interface TestContentBrief {
    id: string;
    user_id: string;
    funnel_project_id: string;
    meta_campaign_id: string | null;
    status: "draft" | "active" | "paused" | "completed";
    created_at: string;
}

export function createTestContentBrief(
    overrides: Partial<TestContentBrief> = {}
): TestContentBrief {
    return {
        id: overrides.id ?? generateUUID(),
        user_id: overrides.user_id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        meta_campaign_id: overrides.meta_campaign_id ?? null,
        status: overrides.status ?? "draft",
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

export interface TestPostVariant {
    id: string;
    brief_id: string;
    meta_ad_id: string | null;
    story_framework: string;
    content: string;
    status: "draft" | "published" | "paused";
    created_at: string;
}

export function createTestPostVariant(
    overrides: Partial<TestPostVariant> = {}
): TestPostVariant {
    return {
        id: overrides.id ?? generateUUID(),
        brief_id: overrides.brief_id ?? generateUUID(),
        meta_ad_id: overrides.meta_ad_id ?? null,
        story_framework: overrides.story_framework ?? "plus_minus",
        content: overrides.content ?? "Test post content",
        status: overrides.status ?? "draft",
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

export interface TestMarketingAnalytics {
    id: string;
    post_variant_id: string;
    impressions: number;
    clicks: number;
    leads_count: number;
    spend_cents: number;
    cost_per_lead_cents: number;
    ctr_percent: number;
    recorded_at: string;
}

export function createTestMarketingAnalytics(
    overrides: Partial<TestMarketingAnalytics> = {}
): TestMarketingAnalytics {
    const impressions = overrides.impressions ?? 10000;
    const clicks = overrides.clicks ?? 150;
    const leads = overrides.leads_count ?? 5;
    const spend = overrides.spend_cents ?? 5000;

    return {
        id: overrides.id ?? generateUUID(),
        post_variant_id: overrides.post_variant_id ?? generateUUID(),
        impressions,
        clicks,
        leads_count: leads,
        spend_cents: spend,
        cost_per_lead_cents:
            overrides.cost_per_lead_cents ??
            (leads > 0 ? Math.round(spend / leads) : 0),
        ctr_percent:
            overrides.ctr_percent ??
            (impressions > 0 ? (clicks / impressions) * 100 : 0),
        recorded_at: overrides.recorded_at ?? new Date().toISOString(),
    };
}

// ============================================================================
// Followup Fixtures
// ============================================================================

export interface TestProspect {
    id: string;
    funnel_project_id: string;
    email: string;
    first_name: string;
    last_name: string;
    segment: "hot" | "warm" | "cold";
    status: "new" | "contacted" | "converted";
    created_at: string;
}

export function createTestProspect(
    overrides: Partial<TestProspect> = {}
): TestProspect {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        email: overrides.email ?? `prospect-${generateId()}@test.com`,
        first_name: overrides.first_name ?? "John",
        last_name: overrides.last_name ?? "Doe",
        segment: overrides.segment ?? "warm",
        status: overrides.status ?? "new",
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

export interface TestSequence {
    id: string;
    funnel_project_id: string;
    name: string;
    status: "draft" | "active" | "paused";
    messages_count: number;
    created_at: string;
}

export function createTestSequence(
    overrides: Partial<TestSequence> = {}
): TestSequence {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        name: overrides.name ?? "Welcome Sequence",
        status: overrides.status ?? "draft",
        messages_count: overrides.messages_count ?? 3,
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

export interface TestMessage {
    id: string;
    sequence_id: string;
    prospect_id: string;
    subject: string;
    body: string;
    status: "draft" | "scheduled" | "sent" | "failed";
    sent_at: string | null;
    created_at: string;
}

export function createTestMessage(overrides: Partial<TestMessage> = {}): TestMessage {
    return {
        id: overrides.id ?? generateUUID(),
        sequence_id: overrides.sequence_id ?? generateUUID(),
        prospect_id: overrides.prospect_id ?? generateUUID(),
        subject: overrides.subject ?? "Test Subject",
        body: overrides.body ?? "Test message body content",
        status: overrides.status ?? "draft",
        sent_at: overrides.sent_at ?? null,
        created_at: overrides.created_at ?? new Date().toISOString(),
    };
}

// ============================================================================
// Brand Design Fixtures
// ============================================================================

export interface TestBrandDesign {
    id: string;
    funnel_project_id: string;
    user_id: string;
    brand_name: string | null;
    primary_color: string;
    secondary_color: string | null;
    accent_color: string | null;
    background_color: string;
    text_color: string;
    scraped_url: string | null;
    design_style: string | null;
    personality_traits: {
        tone?: string;
        mood?: string;
        energy?: string;
        values?: string[];
    };
    is_ai_generated: boolean;
    input_method: "manual" | "wizard" | "website";
    brand_voice?: {
        primary_tone?: string;
        secondary_tone?: string;
    };
    messaging_framework?: {
        value_proposition?: string;
    };
    created_at: string;
    updated_at: string;
}

export function createTestBrandDesign(
    overrides: Partial<TestBrandDesign> = {}
): TestBrandDesign {
    return {
        id: overrides.id ?? generateUUID(),
        funnel_project_id: overrides.funnel_project_id ?? generateUUID(),
        user_id: overrides.user_id ?? generateUUID(),
        brand_name: overrides.brand_name ?? "Test Brand",
        primary_color: overrides.primary_color ?? "#3b82f6",
        secondary_color: overrides.secondary_color ?? "#8b5cf6",
        accent_color: overrides.accent_color ?? "#ec4899",
        background_color: overrides.background_color ?? "#ffffff",
        text_color: overrides.text_color ?? "#1f2937",
        scraped_url: overrides.scraped_url ?? null,
        design_style: overrides.design_style ?? "modern",
        personality_traits: overrides.personality_traits ?? {
            tone: "professional",
            mood: "confident",
            energy: "dynamic",
        },
        is_ai_generated: overrides.is_ai_generated ?? false,
        input_method: overrides.input_method ?? "manual",
        brand_voice: overrides.brand_voice,
        messaging_framework: overrides.messaging_framework,
        created_at: overrides.created_at ?? new Date().toISOString(),
        updated_at: overrides.updated_at ?? new Date().toISOString(),
    };
}

// ============================================================================
// Reset helper for test isolation
// ============================================================================

export function resetIdCounter(): void {
    idCounter = 0;
}
