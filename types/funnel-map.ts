/**
 * Funnel Map Types
 * Types for the Step 2 Visual Funnel Co-Creation Experience
 */

// ============================================
// NODE TYPES
// ============================================

export type FunnelNodeType =
    | "traffic_source"
    | "registration"
    | "masterclass"
    | "core_offer"
    | "checkout"
    | "upsells"
    | "call_booking"
    | "sales_call"
    | "thank_you";

export type PathwayType = "direct_purchase" | "book_call";

export type NodeStatus = "draft" | "in_progress" | "refined" | "completed";

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
}

export interface FunnelNodeField {
    key: string;
    label: string;
    type: "text" | "textarea" | "list" | "pricing";
    required?: boolean;
    aiPrompt?: string;
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
                type: "text",
                aiPrompt: "What is the main channel driving traffic?",
            },
            {
                key: "audience_targeting",
                label: "Audience Targeting",
                type: "textarea",
                aiPrompt: "Describe your ideal customer targeting",
            },
            {
                key: "ad_angle",
                label: "Ad Angle / Hook",
                type: "textarea",
                aiPrompt: "What hook will capture attention?",
            },
        ],
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
                key: "headline",
                label: "Main Headline",
                type: "text",
                required: true,
            },
            {
                key: "subheadline",
                label: "Subheadline",
                type: "text",
            },
            {
                key: "bullet_points",
                label: "Key Benefits (bullet points)",
                type: "list",
            },
            {
                key: "cta_text",
                label: "Call-to-Action Button Text",
                type: "text",
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
            },
            {
                key: "hook",
                label: "Opening Hook",
                type: "textarea",
            },
            {
                key: "story",
                label: "Your Story Arc",
                type: "textarea",
            },
            {
                key: "content_pillars",
                label: "3 Content Pillars",
                type: "list",
            },
            {
                key: "transition_to_offer",
                label: "Transition to Offer",
                type: "textarea",
            },
        ],
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
            },
            {
                key: "person",
                label: "Person - Who is this for?",
                type: "textarea",
            },
            {
                key: "problem",
                label: "Problem - What problem does it solve?",
                type: "textarea",
            },
            {
                key: "product",
                label: "Product - What do they get?",
                type: "textarea",
            },
            {
                key: "process",
                label: "Process - How does it work?",
                type: "textarea",
            },
            {
                key: "proof",
                label: "Proof - What results have others achieved?",
                type: "textarea",
            },
            {
                key: "price",
                label: "Price",
                type: "pricing",
            },
        ],
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
                key: "order_summary",
                label: "Order Summary Text",
                type: "textarea",
            },
            {
                key: "guarantee_reminder",
                label: "Guarantee Reminder",
                type: "textarea",
            },
            {
                key: "urgency_element",
                label: "Urgency/Scarcity Element",
                type: "text",
            },
        ],
    },
    {
        id: "upsells",
        title: "Upsells / Order Bumps",
        description: "Additional offers to increase order value",
        icon: "TrendingUp",
        color: "amber",
        pathways: ["direct_purchase", "book_call"],
        fields: [
            {
                key: "upsell_1",
                label: "Primary Upsell",
                type: "textarea",
            },
            {
                key: "upsell_2",
                label: "Secondary Upsell",
                type: "textarea",
            },
            {
                key: "order_bump",
                label: "Order Bump",
                type: "textarea",
            },
        ],
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
            },
            {
                key: "call_description",
                label: "What to Expect on the Call",
                type: "textarea",
            },
            {
                key: "qualification_questions",
                label: "Pre-Call Qualification Questions",
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
            },
            {
                key: "objection_handlers",
                label: "Key Objection Handlers",
                type: "list",
            },
            {
                key: "close_technique",
                label: "Closing Technique",
                type: "textarea",
            },
        ],
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
                key: "confirmation_message",
                label: "Confirmation Message",
                type: "textarea",
            },
            {
                key: "next_steps",
                label: "Next Steps",
                type: "list",
            },
            {
                key: "community_invite",
                label: "Community Invitation",
                type: "textarea",
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
            "masterclass",
            "core_offer",
            "checkout",
            "upsells",
            "thank_you",
        ],
    },
    book_call: {
        title: "Book a Call",
        description: "Best for high-ticket offers $2,000+",
        priceThreshold: "≥ $2,000",
        nodeSequence: [
            "traffic_source",
            "registration",
            "masterclass",
            "core_offer",
            "call_booking",
            "sales_call",
            "checkout",
            "upsells",
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

export function getNodesForPathway(pathway: PathwayType): FunnelNodeDefinition[] {
    const sequence = PATHWAY_DEFINITIONS[pathway].nodeSequence;
    return sequence
        .map((nodeType) => getNodeDefinition(nodeType))
        .filter((n): n is FunnelNodeDefinition => n !== undefined);
}

export function determinePathwayFromPrice(price: number | null): PathwayType {
    if (price === null) return "direct_purchase";
    return price >= 2000 ? "book_call" : "direct_purchase";
}
