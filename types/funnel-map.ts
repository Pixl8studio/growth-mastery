/**
 * Funnel Map Types
 * Types for the Step 2 Visual Funnel Co-Creation Experience
 *
 * Enhanced with Issue #407 features:
 * - New node types (registration_confirmation, call_booking_confirmation, upsell_1, upsell_2)
 * - Complete field definitions per specification
 * - Approval workflow types
 * - Industry benchmarks
 * - Conditional node logic
 */

// ============================================
// NODE TYPES
// ============================================

export type FunnelNodeType =
    | "traffic_source"
    | "registration"
    | "registration_confirmation"
    | "masterclass"
    | "core_offer"
    | "checkout"
    | "upsell_1"
    | "upsell_2"
    | "order_bump"
    | "call_booking"
    | "call_booking_confirmation"
    | "sales_call"
    | "thank_you";

export type PathwayType = "direct_purchase" | "book_call";

export type NodeStatus = "draft" | "in_progress" | "refined" | "completed";

export type AccessType = "immediate" | "live" | "scheduled";

// ============================================
// NODE DEFINITIONS
// ============================================

export interface FunnelNodeDefinition {
    id: FunnelNodeType;
    title: string;
    description: string;
    icon: string;
    color: string;
    // Which pathways include this node
    pathways: PathwayType[];
    // Framework or methodology for this node
    framework?: string;
    // Fields to generate/refine
    fields: FunnelNodeField[];
    // Conditional visibility function
    isConditional?: boolean;
    // Condition for showing this node
    showCondition?: (registrationConfig: RegistrationConfig | null) => boolean;
    // Industry benchmark for this node
    benchmark?: FunnelBenchmark;
}

export interface FunnelNodeField {
    key: string;
    label: string;
    type: "text" | "textarea" | "list" | "pricing" | "select" | "datetime";
    required?: boolean;
    aiPrompt?: string;
    // For select fields
    options?: { value: string; label: string }[];
    // Help text shown below field
    helpText?: string;
    // Placeholder text
    placeholder?: string;
}

// ============================================
// NODE DATA (from database)
// ============================================

export interface FunnelNodeData {
    id: string;
    funnel_project_id: string;
    user_id: string;
    node_type: FunnelNodeType;
    draft_content: Record<string, unknown>;
    refined_content: Record<string, unknown>;
    conversation_history: ConversationMessage[];
    status: NodeStatus;
    is_active: boolean;
    pathway_type: PathwayType | null;
    // Approval workflow
    is_approved: boolean;
    approved_at: string | null;
    approved_content: Record<string, unknown>;
    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface FunnelMapConfig {
    id: string;
    funnel_project_id: string;
    user_id: string;
    pathway_type: PathwayType;
    drafts_generated: boolean;
    drafts_generated_at: string | null;
    completion_percentage: number;
    is_step2_complete: boolean;
    // Approval tracking
    nodes_approved_count: number;
    total_nodes_count: number;
    all_nodes_approved: boolean;
    // Timestamps
    created_at: string;
    updated_at: string;
}

// ============================================
// REGISTRATION CONFIG
// ============================================

export interface RegistrationConfig {
    id: string;
    funnel_project_id: string;
    user_id: string;
    access_type: AccessType;
    event_datetime: string | null;
    event_timezone: string;
    headline: string | null;
    subheadline: string | null;
    bullet_points: string[];
    cta_text: string;
    confirmation_headline: string | null;
    confirmation_message: string | null;
    calendar_integration: Record<string, unknown>;
    theme_overrides: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export interface ConversationMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    // If assistant suggested changes
    suggestedChanges?: Record<string, unknown>;
}

// ============================================
// INDUSTRY BENCHMARKS
// ============================================

export interface FunnelBenchmark {
    node_type: FunnelNodeType;
    pathway_type: PathwayType | "all";
    metric_name: string;
    metric_description: string;
    conversion_rate_low: number;
    conversion_rate_median: number;
    conversion_rate_high: number;
    conversion_rate_elite: number;
    source: string;
}

// Hardcoded benchmarks (from database default values)
export const FUNNEL_BENCHMARKS: FunnelBenchmark[] = [
    {
        node_type: "registration",
        pathway_type: "all",
        metric_name: "landing_page_conversion",
        metric_description: "Visitors who register for masterclass",
        conversion_rate_low: 15,
        conversion_rate_median: 25,
        conversion_rate_high: 40,
        conversion_rate_elite: 55,
        source: "Industry Average",
    },
    {
        node_type: "masterclass",
        pathway_type: "all",
        metric_name: "show_up_rate",
        metric_description: "Registrants who watch masterclass",
        conversion_rate_low: 20,
        conversion_rate_median: 35,
        conversion_rate_high: 50,
        conversion_rate_elite: 70,
        source: "Industry Average",
    },
    {
        node_type: "core_offer",
        pathway_type: "direct_purchase",
        metric_name: "offer_click_rate",
        metric_description: "Viewers who click to offer page",
        conversion_rate_low: 10,
        conversion_rate_median: 20,
        conversion_rate_high: 35,
        conversion_rate_elite: 50,
        source: "Industry Average",
    },
    {
        node_type: "core_offer",
        pathway_type: "book_call",
        metric_name: "offer_click_rate",
        metric_description: "Viewers who click to book call",
        conversion_rate_low: 5,
        conversion_rate_median: 12,
        conversion_rate_high: 22,
        conversion_rate_elite: 35,
        source: "Industry Average",
    },
    {
        node_type: "checkout",
        pathway_type: "direct_purchase",
        metric_name: "sales_conversion",
        metric_description: "Offer viewers who purchase",
        conversion_rate_low: 2,
        conversion_rate_median: 5,
        conversion_rate_high: 10,
        conversion_rate_elite: 18,
        source: "Industry Average",
    },
    {
        node_type: "call_booking",
        pathway_type: "book_call",
        metric_name: "booking_rate",
        metric_description: "Offer viewers who book a call",
        conversion_rate_low: 8,
        conversion_rate_median: 15,
        conversion_rate_high: 25,
        conversion_rate_elite: 40,
        source: "Industry Average",
    },
    {
        node_type: "sales_call",
        pathway_type: "book_call",
        metric_name: "close_rate",
        metric_description: "Booked calls that close",
        conversion_rate_low: 15,
        conversion_rate_median: 25,
        conversion_rate_high: 40,
        conversion_rate_elite: 60,
        source: "Industry Average",
    },
    {
        node_type: "upsell_1",
        pathway_type: "all",
        metric_name: "upsell_take_rate",
        metric_description: "Buyers who accept upsell 1",
        conversion_rate_low: 10,
        conversion_rate_median: 20,
        conversion_rate_high: 35,
        conversion_rate_elite: 50,
        source: "Industry Average",
    },
    {
        node_type: "upsell_2",
        pathway_type: "all",
        metric_name: "upsell_take_rate",
        metric_description: "Upsell 1 buyers who accept upsell 2",
        conversion_rate_low: 8,
        conversion_rate_median: 15,
        conversion_rate_high: 25,
        conversion_rate_elite: 40,
        source: "Industry Average",
    },
    {
        node_type: "order_bump",
        pathway_type: "all",
        metric_name: "bump_take_rate",
        metric_description: "Checkout visitors who add order bump",
        conversion_rate_low: 20,
        conversion_rate_median: 35,
        conversion_rate_high: 50,
        conversion_rate_elite: 65,
        source: "Industry Average",
    },
];

// ============================================
// LOADING MESSAGES
// ============================================

export const LOADING_MESSAGES = [
    "Analyzing your business profile...",
    "Crafting your unique value proposition...",
    "Designing your perfect webinar flow...",
    "Building your offer stack...",
    "Optimizing conversion touchpoints...",
    "Applying proven frameworks...",
    "Personalizing your funnel elements...",
    "Generating compelling copy...",
    "Structuring your sales narrative...",
    "Finalizing your funnel blueprint...",
];

// ============================================
// NODE DEFINITIONS CONFIG
// ============================================

export const FUNNEL_NODE_DEFINITIONS: FunnelNodeDefinition[] = [
    {
        id: "traffic_source",
        title: "Traffic Source",
        description: "Where your ideal customers come from",
        icon: "Globe",
        color: "blue",
        pathways: ["direct_purchase", "book_call"],
        fields: [
            {
                key: "primary_source",
                label: "Primary Traffic Source",
                type: "select",
                options: [
                    { value: "facebook_ads", label: "Facebook/Instagram Ads" },
                    { value: "google_ads", label: "Google Ads" },
                    { value: "youtube_ads", label: "YouTube Ads" },
                    { value: "organic_social", label: "Organic Social Media" },
                    { value: "email_list", label: "Email List" },
                    { value: "affiliates", label: "Affiliate Partners" },
                    { value: "organic_search", label: "Organic Search (SEO)" },
                    { value: "podcast", label: "Podcast" },
                    { value: "other", label: "Other" },
                ],
                aiPrompt: "What is the main channel driving traffic?",
            },
            {
                key: "audience_targeting",
                label: "Audience Targeting",
                type: "textarea",
                aiPrompt: "Describe your ideal customer targeting",
                placeholder:
                    "Who are you targeting? What demographics, interests, or behaviors?",
            },
            {
                key: "ad_angle",
                label: "Ad Angle / Hook",
                type: "textarea",
                aiPrompt: "What hook will capture attention?",
                placeholder: "What's the main angle or hook for your ads?",
            },
            {
                key: "traffic_budget",
                label: "Monthly Ad Budget",
                type: "text",
                placeholder: "e.g., $5,000/month",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find(
            (b) => b.node_type === "registration"
        )!,
    },
    {
        id: "registration",
        title: "Registration Page",
        description: "Where visitors sign up for your masterclass",
        icon: "UserPlus",
        color: "green",
        pathways: ["direct_purchase", "book_call"],
        fields: [
            {
                key: "access_type",
                label: "Access Type",
                type: "select",
                required: true,
                options: [
                    {
                        value: "immediate",
                        label: "Immediate Access (On-Demand)",
                    },
                    { value: "live", label: "Live Event" },
                    { value: "scheduled", label: "Scheduled Replay" },
                ],
                helpText:
                    "Choose how attendees will access your masterclass. Live/Scheduled shows a confirmation page.",
            },
            {
                key: "event_datetime",
                label: "Event Date & Time",
                type: "datetime",
                helpText: "When is the live event or scheduled replay?",
            },
            {
                key: "headline",
                label: "Main Headline",
                type: "text",
                required: true,
                placeholder: "The transformation promise in one powerful line",
            },
            {
                key: "subheadline",
                label: "Subheadline",
                type: "text",
                placeholder: "Supporting detail that adds credibility or urgency",
            },
            {
                key: "bullet_points",
                label: "Key Benefits",
                type: "list",
                helpText: "3-5 compelling reasons to attend",
            },
            {
                key: "social_proof",
                label: "Social Proof Element",
                type: "textarea",
                placeholder:
                    "e.g., 'Join 10,000+ entrepreneurs who have...'",
            },
            {
                key: "cta_text",
                label: "Call-to-Action Button Text",
                type: "text",
                placeholder: "e.g., 'Reserve My Free Seat'",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find(
            (b) => b.node_type === "registration"
        )!,
    },
    {
        id: "registration_confirmation",
        title: "Registration Confirmation",
        description: "Confirmation page for live/scheduled events",
        icon: "CheckCircle",
        color: "teal",
        pathways: ["direct_purchase", "book_call"],
        isConditional: true,
        showCondition: (config) =>
            config?.access_type !== "immediate" && config?.access_type != null,
        fields: [
            {
                key: "confirmation_headline",
                label: "Confirmation Headline",
                type: "text",
                required: true,
                placeholder: "e.g., 'You're Registered!'",
            },
            {
                key: "confirmation_message",
                label: "Confirmation Message",
                type: "textarea",
                placeholder: "Thank them and set expectations for the event",
            },
            {
                key: "calendar_instructions",
                label: "Calendar Instructions",
                type: "textarea",
                placeholder: "How to add to calendar, what to expect",
            },
            {
                key: "pre_event_content",
                label: "Pre-Event Content",
                type: "textarea",
                helpText:
                    "Optional content to engage registrants before the event",
            },
            {
                key: "share_prompt",
                label: "Social Share Prompt",
                type: "text",
                placeholder: "Encourage sharing with friends",
            },
        ],
    },
    {
        id: "masterclass",
        title: "Watch Masterclass",
        description: "The strategic heart - your presentation content",
        icon: "Play",
        color: "purple",
        pathways: ["direct_purchase", "book_call"],
        framework: "Perfect Webinar Framework",
        fields: [
            {
                key: "title",
                label: "Masterclass Title",
                type: "text",
                required: true,
                placeholder: "The big promise of your presentation",
            },
            {
                key: "promise",
                label: "The Big Promise",
                type: "textarea",
                helpText: "What transformation will they achieve?",
            },
            {
                key: "hook",
                label: "Opening Hook",
                type: "textarea",
                placeholder:
                    "The attention-grabbing opening that pulls them in",
            },
            {
                key: "origin_story",
                label: "Your Origin Story",
                type: "textarea",
                helpText: "How you discovered this solution",
            },
            {
                key: "content_pillars",
                label: "3 Key Steps/Secrets",
                type: "list",
                helpText: "The 3 main teaching points that lead to the offer",
            },
            {
                key: "poll_questions",
                label: "Engagement Poll Questions",
                type: "list",
                helpText: "Questions to engage viewers during the presentation",
            },
            {
                key: "belief_shifts",
                label: "Belief Shifts",
                type: "textarea",
                helpText: "Vehicle, Internal, External beliefs to address",
            },
            {
                key: "transition_to_offer",
                label: "Transition to Offer",
                type: "textarea",
                placeholder: "How you bridge from content to pitch",
            },
            {
                key: "offer_messaging",
                label: "Offer Messaging Preview",
                type: "textarea",
                helpText: "Key points that set up the offer reveal",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find(
            (b) => b.node_type === "masterclass"
        )!,
    },
    {
        id: "core_offer",
        title: "Core Offer Enrollment",
        description: "Present your offer using the 7 Ps framework",
        icon: "Gift",
        color: "orange",
        pathways: ["direct_purchase", "book_call"],
        framework: "7 Ps Framework",
        fields: [
            {
                key: "promise",
                label: "Promise - What outcome do you guarantee?",
                type: "textarea",
                required: true,
                helpText:
                    "The specific, measurable result they'll achieve",
            },
            {
                key: "person",
                label: "Person - Who is this specifically for?",
                type: "textarea",
                helpText: "Paint a vivid picture of your ideal customer",
            },
            {
                key: "problem",
                label: "Problem - What painful problem does this solve?",
                type: "textarea",
                helpText: "The core frustration driving them to seek a solution",
            },
            {
                key: "product",
                label: "Product - What exactly do they get?",
                type: "textarea",
                helpText: "Modules, deliverables, access details",
            },
            {
                key: "process",
                label: "Process - How does the transformation work?",
                type: "textarea",
                helpText: "The step-by-step journey from A to B",
            },
            {
                key: "proof",
                label: "Proof - What results have others achieved?",
                type: "textarea",
                helpText: "Testimonials, case studies, credentials",
            },
            {
                key: "price",
                label: "Price",
                type: "pricing",
            },
            {
                key: "guarantee",
                label: "Guarantee",
                type: "textarea",
                placeholder: "Your risk reversal offer",
            },
            {
                key: "urgency",
                label: "Urgency/Scarcity Element",
                type: "text",
                placeholder: "Why act now?",
            },
            {
                key: "bonuses",
                label: "Bonuses",
                type: "list",
                helpText: "Additional value included with the offer",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find(
            (b) =>
                b.node_type === "core_offer" &&
                b.pathway_type === "direct_purchase"
        )!,
    },
    {
        id: "checkout",
        title: "Checkout Page",
        description: "Secure payment processing",
        icon: "CreditCard",
        color: "emerald",
        pathways: ["direct_purchase", "book_call"],
        fields: [
            {
                key: "headline",
                label: "Checkout Headline",
                type: "text",
                placeholder: "e.g., 'Complete Your Order'",
            },
            {
                key: "order_summary",
                label: "Order Summary Text",
                type: "textarea",
                helpText: "Reinforce value at point of purchase",
            },
            {
                key: "guarantee_reminder",
                label: "Guarantee Reminder",
                type: "textarea",
                placeholder: "Reassure them about the risk-free purchase",
            },
            {
                key: "urgency_element",
                label: "Urgency/Scarcity Element",
                type: "text",
                placeholder: "Limited time or availability messaging",
            },
            {
                key: "trust_elements",
                label: "Trust Elements",
                type: "list",
                helpText: "Security badges, testimonials, guarantees to display",
            },
            {
                key: "payment_options",
                label: "Payment Options",
                type: "textarea",
                helpText: "Payment plans, methods available",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find((b) => b.node_type === "checkout")!,
    },
    {
        id: "order_bump",
        title: "Order Bump",
        description: "One-click add-on at checkout",
        icon: "Plus",
        color: "lime",
        pathways: ["direct_purchase", "book_call"],
        framework: "7 Ps Framework",
        fields: [
            {
                key: "headline",
                label: "Order Bump Headline",
                type: "text",
                required: true,
                placeholder: "Short, compelling headline",
            },
            {
                key: "description",
                label: "Description",
                type: "textarea",
                helpText: "1-2 sentences explaining the value",
            },
            {
                key: "promise",
                label: "Promise",
                type: "text",
                placeholder: "What quick win does this provide?",
            },
            {
                key: "price",
                label: "Price",
                type: "pricing",
            },
            {
                key: "original_value",
                label: "Original Value",
                type: "text",
                placeholder: "Show the perceived value (e.g., $297 Value)",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find((b) => b.node_type === "order_bump")!,
    },
    {
        id: "upsell_1",
        title: "Upsell 1",
        description: "Primary upsell offer after purchase",
        icon: "TrendingUp",
        color: "amber",
        pathways: ["direct_purchase", "book_call"],
        framework: "7 Ps Framework",
        fields: [
            {
                key: "headline",
                label: "Upsell Headline",
                type: "text",
                required: true,
                placeholder: "Wait! Before you go...",
            },
            {
                key: "promise",
                label: "Promise - Additional outcome",
                type: "textarea",
                helpText: "What additional result will this provide?",
            },
            {
                key: "person",
                label: "Person - Who needs this upgrade?",
                type: "textarea",
            },
            {
                key: "problem",
                label: "Problem - What gap does this fill?",
                type: "textarea",
            },
            {
                key: "product",
                label: "Product - What do they get?",
                type: "textarea",
            },
            {
                key: "process",
                label: "Process - How does it enhance results?",
                type: "textarea",
            },
            {
                key: "proof",
                label: "Proof - Success stories",
                type: "textarea",
            },
            {
                key: "price",
                label: "Price",
                type: "pricing",
            },
            {
                key: "time_limit",
                label: "Time Limit",
                type: "text",
                placeholder: "e.g., 'This offer expires in 15 minutes'",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find((b) => b.node_type === "upsell_1")!,
    },
    {
        id: "upsell_2",
        title: "Upsell 2",
        description: "Secondary upsell or downsell offer",
        icon: "ArrowUp",
        color: "yellow",
        pathways: ["direct_purchase", "book_call"],
        framework: "7 Ps Framework",
        fields: [
            {
                key: "headline",
                label: "Upsell Headline",
                type: "text",
                required: true,
            },
            {
                key: "promise",
                label: "Promise",
                type: "textarea",
            },
            {
                key: "person",
                label: "Person",
                type: "textarea",
            },
            {
                key: "problem",
                label: "Problem",
                type: "textarea",
            },
            {
                key: "product",
                label: "Product",
                type: "textarea",
            },
            {
                key: "process",
                label: "Process",
                type: "textarea",
            },
            {
                key: "proof",
                label: "Proof",
                type: "textarea",
            },
            {
                key: "price",
                label: "Price",
                type: "pricing",
            },
            {
                key: "is_downsell",
                label: "Offer as Downsell?",
                type: "select",
                options: [
                    { value: "no", label: "No - Show as Upsell" },
                    {
                        value: "yes",
                        label: "Yes - Show if Upsell 1 declined",
                    },
                ],
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find((b) => b.node_type === "upsell_2")!,
    },
    {
        id: "call_booking",
        title: "Call Booking",
        description: "Schedule a call with your sales team",
        icon: "Calendar",
        color: "indigo",
        pathways: ["book_call"],
        fields: [
            {
                key: "booking_headline",
                label: "Booking Page Headline",
                type: "text",
                placeholder: "e.g., 'Schedule Your Strategy Call'",
            },
            {
                key: "call_description",
                label: "What to Expect on the Call",
                type: "textarea",
                helpText: "Set expectations for what the call covers",
            },
            {
                key: "call_duration",
                label: "Call Duration",
                type: "select",
                options: [
                    { value: "15", label: "15 minutes" },
                    { value: "30", label: "30 minutes" },
                    { value: "45", label: "45 minutes" },
                    { value: "60", label: "60 minutes" },
                ],
            },
            {
                key: "qualification_questions",
                label: "Pre-Call Qualification Questions",
                type: "list",
                helpText: "Questions to screen and prepare prospects",
            },
            {
                key: "calendar_type",
                label: "Calendar Integration",
                type: "select",
                options: [
                    { value: "calendly", label: "Calendly" },
                    { value: "acuity", label: "Acuity Scheduling" },
                    { value: "hubspot", label: "HubSpot Meetings" },
                    { value: "custom", label: "Custom Integration" },
                ],
            },
            {
                key: "calendar_url",
                label: "Calendar URL",
                type: "text",
                placeholder: "Your scheduling link",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find(
            (b) => b.node_type === "call_booking"
        )!,
    },
    {
        id: "call_booking_confirmation",
        title: "Call Booking Confirmation",
        description: "Confirmation after booking a sales call",
        icon: "CalendarCheck",
        color: "violet",
        pathways: ["book_call"],
        fields: [
            {
                key: "confirmation_headline",
                label: "Confirmation Headline",
                type: "text",
                required: true,
                placeholder: "e.g., 'Your Call is Booked!'",
            },
            {
                key: "confirmation_message",
                label: "Confirmation Message",
                type: "textarea",
                placeholder: "Thank them and prep them for the call",
            },
            {
                key: "preparation_steps",
                label: "How to Prepare for the Call",
                type: "list",
                helpText: "Steps they should take before the call",
            },
            {
                key: "pre_call_content",
                label: "Pre-Call Content",
                type: "textarea",
                helpText: "Video, PDF, or resource to watch before call",
            },
            {
                key: "what_to_bring",
                label: "What to Bring/Have Ready",
                type: "list",
            },
        ],
    },
    {
        id: "sales_call",
        title: "Sales Call",
        description: "Close high-ticket offers on the call",
        icon: "Phone",
        color: "rose",
        pathways: ["book_call"],
        fields: [
            {
                key: "call_script_outline",
                label: "Call Script Outline",
                type: "textarea",
                helpText: "Key talking points and flow of the call",
            },
            {
                key: "discovery_questions",
                label: "Discovery Questions",
                type: "list",
                helpText: "Questions to understand their situation",
            },
            {
                key: "objection_handlers",
                label: "Key Objection Handlers",
                type: "list",
                helpText: "Common objections and how to address them",
            },
            {
                key: "close_technique",
                label: "Closing Technique",
                type: "textarea",
                placeholder: "Your method for asking for the sale",
            },
            {
                key: "follow_up_sequence",
                label: "Follow-up Sequence",
                type: "textarea",
                helpText: "What happens after the call",
            },
        ],
        benchmark: FUNNEL_BENCHMARKS.find((b) => b.node_type === "sales_call")!,
    },
    {
        id: "thank_you",
        title: "Thank You Page",
        description: "Post-purchase confirmation and next steps",
        icon: "Heart",
        color: "pink",
        pathways: ["direct_purchase", "book_call"],
        fields: [
            {
                key: "headline",
                label: "Thank You Headline",
                type: "text",
                placeholder: "e.g., 'Welcome to the Family!'",
            },
            {
                key: "confirmation_message",
                label: "Confirmation Message",
                type: "textarea",
                placeholder: "Celebrate their decision and set expectations",
            },
            {
                key: "next_steps",
                label: "Next Steps",
                type: "list",
                helpText: "What they should do right now",
            },
            {
                key: "access_instructions",
                label: "Access Instructions",
                type: "textarea",
                helpText: "How to access what they purchased",
            },
            {
                key: "community_invite",
                label: "Community Invitation",
                type: "textarea",
                placeholder: "Invite to Facebook group, Slack, etc.",
            },
            {
                key: "share_prompt",
                label: "Social Share Prompt",
                type: "text",
                helpText: "Encourage them to share their purchase",
            },
        ],
    },
];

// ============================================
// PATHWAY DEFINITIONS
// ============================================

export const PATHWAY_DEFINITIONS: Record<
    PathwayType,
    {
        title: string;
        description: string;
        priceThreshold: string;
        nodeSequence: FunnelNodeType[];
    }
> = {
    direct_purchase: {
        title: "Direct Purchase",
        description: "Best for offers under $2,000",
        priceThreshold: "< $2,000",
        nodeSequence: [
            "traffic_source",
            "registration",
            "registration_confirmation", // Conditional
            "masterclass",
            "core_offer",
            "checkout",
            "order_bump",
            "upsell_1",
            "upsell_2",
            "thank_you",
        ],
    },
    book_call: {
        title: "Book a Call",
        description: "Best for high-ticket offers $2,000+",
        priceThreshold: ">= $2,000",
        nodeSequence: [
            "traffic_source",
            "registration",
            "registration_confirmation", // Conditional
            "masterclass",
            "core_offer",
            "call_booking",
            "call_booking_confirmation",
            "sales_call",
            "checkout",
            "order_bump",
            "upsell_1",
            "upsell_2",
            "thank_you",
        ],
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getNodeDefinition(
    nodeType: FunnelNodeType
): FunnelNodeDefinition | undefined {
    return FUNNEL_NODE_DEFINITIONS.find((n) => n.id === nodeType);
}

export function getNodesForPathway(
    pathway: PathwayType,
    registrationConfig?: RegistrationConfig | null
): FunnelNodeDefinition[] {
    const sequence = PATHWAY_DEFINITIONS[pathway].nodeSequence;
    return sequence
        .map((nodeType) => getNodeDefinition(nodeType))
        .filter((n): n is FunnelNodeDefinition => {
            if (!n) return false;
            // Check conditional visibility
            if (n.isConditional && n.showCondition) {
                return n.showCondition(registrationConfig ?? null);
            }
            return true;
        });
}

export function determinePathwayFromPrice(price: number | null): PathwayType {
    if (price === null) return "direct_purchase";
    return price >= 2000 ? "book_call" : "direct_purchase";
}

export function getBenchmarkForNode(
    nodeType: FunnelNodeType,
    pathwayType: PathwayType
): FunnelBenchmark | undefined {
    // First try pathway-specific
    let benchmark = FUNNEL_BENCHMARKS.find(
        (b) => b.node_type === nodeType && b.pathway_type === pathwayType
    );
    // Fall back to 'all' pathway
    if (!benchmark) {
        benchmark = FUNNEL_BENCHMARKS.find(
            (b) => b.node_type === nodeType && b.pathway_type === "all"
        );
    }
    return benchmark;
}

export function calculateApprovalProgress(
    nodeData: Map<FunnelNodeType, FunnelNodeData>
): { approved: number; total: number; percentage: number } {
    const nodes = Array.from(nodeData.values());
    const approved = nodes.filter((n) => n.is_approved).length;
    const total = nodes.length;
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { approved, total, percentage };
}

export function calculateFieldCompletion(
    content: Record<string, unknown>,
    fields: FunnelNodeField[]
): number {
    if (fields.length === 0) return 100;

    const filledFields = fields.filter((field) => {
        const value = content[field.key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "string") return value.trim().length > 0;
        if (typeof value === "number") return true;
        return value !== null && value !== undefined;
    });

    return Math.round((filledFields.length / fields.length) * 100);
}

// ============================================
// DRAFT QUALITY VALIDATION
// ============================================

export interface DraftQualityIssue {
    field: string;
    issue: "empty" | "too_short" | "placeholder" | "generic";
    message: string;
}

export function validateDraftQuality(
    content: Record<string, unknown>,
    fields: FunnelNodeField[]
): DraftQualityIssue[] {
    const issues: DraftQualityIssue[] = [];

    for (const field of fields) {
        const value = content[field.key];

        // Check empty required fields
        if (field.required) {
            if (!value || (typeof value === "string" && !value.trim())) {
                issues.push({
                    field: field.key,
                    issue: "empty",
                    message: `${field.label} is required but empty`,
                });
                continue;
            }
        }

        // Check for too short content
        if (
            typeof value === "string" &&
            value.trim().length > 0 &&
            value.trim().length < 10 &&
            field.type === "textarea"
        ) {
            issues.push({
                field: field.key,
                issue: "too_short",
                message: `${field.label} seems too brief`,
            });
        }

        // Check for placeholder-like content
        if (typeof value === "string") {
            const placeholderPatterns = [
                /\[.*\]/,
                /lorem ipsum/i,
                /placeholder/i,
                /TODO/i,
                /TBD/i,
            ];
            if (placeholderPatterns.some((p) => p.test(value))) {
                issues.push({
                    field: field.key,
                    issue: "placeholder",
                    message: `${field.label} contains placeholder text`,
                });
            }
        }
    }

    return issues;
}
