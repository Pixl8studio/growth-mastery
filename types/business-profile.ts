/**
 * Business Profile Types
 * Types for the AI-assisted Context Wizard and unified Business Profile
 */

// ===========================================
// SECTION DEFINITIONS
// ===========================================

export const SECTION_DEFINITIONS = {
    section1: {
        id: "section1",
        title: "Ideal Customer & Core Problem",
        description: "Define who you serve and the problems you solve",
        contextPrompt:
            "Tell us about your ideal customer - who they are, what they struggle with, and what transformation they're seeking...",
        fields: [
            {
                key: "ideal_customer",
                label: "Who is your ideal customer?",
                type: "text",
            },
            {
                key: "transformation",
                label: "What transformation do you help them achieve?",
                type: "text",
            },
            {
                key: "perceived_problem",
                label: "What problem do they think they have?",
                type: "text",
            },
            {
                key: "root_cause",
                label: "What is the real root cause of that problem?",
                type: "text",
            },
            {
                key: "daily_pain_points",
                label: "What daily pain points do they experience?",
                type: "textarea",
            },
            {
                key: "secret_desires",
                label: "What desires are they secretly craving?",
                type: "textarea",
            },
            {
                key: "common_mistakes",
                label: "What common mistakes do they keep making?",
                type: "textarea",
            },
            {
                key: "limiting_beliefs",
                label: "What false or limiting beliefs keep them stuck?",
                type: "textarea",
            },
            {
                key: "empowering_truths",
                label: "What empowering truths do they need to believe instead?",
                type: "textarea",
            },
        ],
    },
    section2: {
        id: "section2",
        title: "Your Story & Signature Method",
        description: "Share your journey and unique approach",
        contextPrompt:
            "Share your story - your struggles, breakthrough, and the method you've developed to help others...",
        fields: [
            {
                key: "struggle_story",
                label: "What is your relatable struggle story?",
                type: "textarea",
            },
            {
                key: "breakthrough_moment",
                label: "What was your breakthrough moment?",
                type: "textarea",
            },
            {
                key: "life_now",
                label: "What is your life or business like now?",
                type: "textarea",
            },
            {
                key: "credibility_experience",
                label: "What experience do you have that drives credibility in your offering?",
                type: "textarea",
            },
            {
                key: "signature_method",
                label: "What method, system, or process did you create? (Name it if possible)",
                type: "textarea",
            },
        ],
    },
    section3: {
        id: "section3",
        title: "Your Offer & Proof",
        description: "Define your offer and social proof",
        contextPrompt:
            "Describe your offer - what it includes, who it's for, the results it delivers, and proof that it works...",
        fields: [
            { key: "offer_name", label: "What is your offer called?", type: "text" },
            {
                key: "offer_type",
                label: "What type of offer is it? (group, 1:1, hybrid, SaaS, service, etc.)",
                type: "text",
            },
            {
                key: "deliverables",
                label: "What are the main deliverables or features?",
                type: "textarea",
            },
            {
                key: "delivery_process",
                label: "What is the delivery process?",
                type: "textarea",
            },
            {
                key: "problem_solved",
                label: "What problem does the offer solve for your customer?",
                type: "textarea",
            },
            {
                key: "promise_outcome",
                label: "What promise or outcome does your offer make?",
                type: "textarea",
            },
            {
                key: "pricing",
                label: "What is the regular price AND the webinar price?",
                type: "pricing",
            },
            {
                key: "guarantee",
                label: "Do you offer a guarantee? If yes, what are the terms?",
                type: "textarea",
            },
            {
                key: "testimonials",
                label: "What are your best testimonials or success stories?",
                type: "textarea",
            },
            {
                key: "bonuses",
                label: "What bonuses can you include to drive urgency?",
                type: "textarea",
            },
        ],
    },
    section4: {
        id: "section4",
        title: "Teaching Content (Belief Shifts)",
        description: "Content for shifting beliefs during your presentation",
        contextPrompt:
            "Describe the belief shifts you need your audience to make - about your method (vehicle), about themselves (internal), and about their resources (external)...",
        fields: [
            {
                key: "vehicle_belief_shift",
                label: "Vehicle Belief Shift (Old Model → New Model)",
                type: "belief_shift",
                subfields: [
                    {
                        key: "outdated_model",
                        label: "What outdated model is your audience using?",
                    },
                    { key: "model_flaws", label: "Why is that model flawed?" },
                    {
                        key: "proof_data",
                        label: "What proof or data shows it no longer works?",
                    },
                    {
                        key: "new_model",
                        label: "What is the new model you're teaching?",
                    },
                    {
                        key: "key_insights",
                        label: "What are the 3 most important insights you want to teach?",
                    },
                    {
                        key: "quick_win",
                        label: "What quick win can you give to prove this new model works?",
                    },
                    {
                        key: "myths_to_bust",
                        label: "What myths about this model do you want to bust?",
                    },
                    {
                        key: "success_story",
                        label: "Share one short success story proving the new model.",
                    },
                ],
            },
            {
                key: "internal_belief_shift",
                label: "Internal Belief Shift (Self-Doubt → Self-Belief)",
                type: "belief_shift",
                subfields: [
                    {
                        key: "limiting_belief",
                        label: "What is the biggest self-limiting belief your audience has?",
                    },
                    { key: "perceived_lack", label: "What do they believe they lack?" },
                    {
                        key: "fear_of_failure",
                        label: "What do they fear will happen if they fail?",
                    },
                    {
                        key: "mindset_reframes",
                        label: "What 2-3 mindset reframes do you want them to adopt?",
                    },
                    {
                        key: "micro_action",
                        label: "What small micro-action builds confidence fast?",
                    },
                    {
                        key: "beginner_success_proof",
                        label: "What proof shows beginners succeed using your method?",
                    },
                    {
                        key: "success_story",
                        label: "Share one short success story showing internal transformation.",
                    },
                ],
            },
            {
                key: "external_belief_shift",
                label: "External Belief Shift (Resources → Resourcefulness)",
                type: "belief_shift",
                subfields: [
                    {
                        key: "external_obstacles",
                        label: "What external obstacles do they believe are stopping them?",
                    },
                    {
                        key: "success_evidence",
                        label: "What evidence proves success is possible despite these obstacles?",
                    },
                    {
                        key: "tools_shortcuts",
                        label: "What tools, hacks, or shortcuts solve these external issues?",
                    },
                    {
                        key: "fastest_path",
                        label: "What is the 'fastest path' you want them to recognize?",
                    },
                    {
                        key: "success_story",
                        label: "Share one short story showing someone succeeding despite limitations.",
                    },
                    {
                        key: "resource_myths",
                        label: "What myths about time, money, or resources should be dismantled?",
                    },
                ],
            },
            {
                key: "poll_questions",
                label: "What poll questions would you like to ask your audience?",
                type: "array",
            },
        ],
    },
    section5: {
        id: "section5",
        title: "Call to Action & Objections",
        description: "Define your CTA and handle objections",
        contextPrompt:
            "Describe your call to action - what you want them to do, any incentives, and the common objections you hear...",
        fields: [
            {
                key: "call_to_action",
                label: "What one action do you want attendees to take after the masterclass?",
                type: "textarea",
            },
            {
                key: "incentive",
                label: "Do you want an incentive such as a deadline, discount, bonus, or scholarship?",
                type: "textarea",
            },
            {
                key: "pricing_disclosure",
                label: "Do you want pricing disclosed on the masterclass or only on a call/application?",
                type: "text",
            },
            {
                key: "path_options",
                label: "Are you offering a single path or multiple options?",
                type: "text",
            },
            {
                key: "top_objections",
                label: "What are the top 3-5 objections people bring up before buying?",
                type: "objections",
            },
        ],
    },
} as const;

export type SectionId = keyof typeof SECTION_DEFINITIONS;

// ===========================================
// BELIEF SHIFT TYPES
// ===========================================

export interface VehicleBeliefShift {
    outdated_model: string | null;
    model_flaws: string | null;
    proof_data: string | null;
    new_model: string | null;
    key_insights: string[];
    quick_win: string | null;
    myths_to_bust: string | null;
    success_story: string | null;
}

export interface InternalBeliefShift {
    limiting_belief: string | null;
    perceived_lack: string | null;
    fear_of_failure: string | null;
    mindset_reframes: string[];
    micro_action: string | null;
    beginner_success_proof: string | null;
    success_story: string | null;
}

export interface ExternalBeliefShift {
    external_obstacles: string | null;
    success_evidence: string | null;
    tools_shortcuts: string | null;
    fastest_path: string | null;
    success_story: string | null;
    resource_myths: string | null;
}

export interface Objection {
    objection: string;
    response: string;
}

export interface Pricing {
    regular: number | null;
    webinar: number | null;
}

export interface CompletionStatus {
    section1: number;
    section2: number;
    section3: number;
    section4: number;
    section5: number;
    overall: number;
}

// ===========================================
// MAIN BUSINESS PROFILE TYPE
// ===========================================

export interface BusinessProfile {
    id: string;
    user_id: string;
    funnel_project_id: string | null;

    // Section 1: Ideal Customer & Core Problem
    section1_context: string | null;
    ideal_customer: string | null;
    transformation: string | null;
    perceived_problem: string | null;
    root_cause: string | null;
    daily_pain_points: string | null;
    secret_desires: string | null;
    common_mistakes: string | null;
    limiting_beliefs: string | null;
    empowering_truths: string | null;

    // Section 2: Story & Signature Method
    section2_context: string | null;
    struggle_story: string | null;
    breakthrough_moment: string | null;
    life_now: string | null;
    credibility_experience: string | null;
    signature_method: string | null;

    // Section 3: Offer & Proof
    section3_context: string | null;
    offer_name: string | null;
    offer_type: string | null;
    deliverables: string | null;
    delivery_process: string | null;
    problem_solved: string | null;
    promise_outcome: string | null;
    pricing: Pricing;
    guarantee: string | null;
    testimonials: string | null;
    bonuses: string | null;

    // Section 4: Teaching Content (Belief Shifts)
    section4_context: string | null;
    vehicle_belief_shift: VehicleBeliefShift;
    internal_belief_shift: InternalBeliefShift;
    external_belief_shift: ExternalBeliefShift;
    poll_questions: string[];

    // Section 5: CTA & Objections
    section5_context: string | null;
    call_to_action: string | null;
    incentive: string | null;
    pricing_disclosure: string | null;
    path_options: string | null;
    top_objections: Objection[];

    // Metadata
    completion_status: CompletionStatus;
    source: "wizard" | "voice" | "gpt_paste" | "import";
    ai_generated_fields: string[];

    // Timestamps
    created_at: string;
    updated_at: string;
}

// ===========================================
// INSERT/UPDATE TYPES
// ===========================================

export type BusinessProfileInsert = Omit<
    BusinessProfile,
    "id" | "created_at" | "updated_at"
> & {
    id?: string;
};

export type BusinessProfileUpdate = Partial<
    Omit<BusinessProfile, "id" | "user_id" | "created_at" | "updated_at">
>;

// ===========================================
// SECTION DATA TYPES (for API)
// ===========================================

export interface Section1Data {
    section1_context?: string;
    ideal_customer?: string;
    transformation?: string;
    perceived_problem?: string;
    root_cause?: string;
    daily_pain_points?: string;
    secret_desires?: string;
    common_mistakes?: string;
    limiting_beliefs?: string;
    empowering_truths?: string;
}

export interface Section2Data {
    section2_context?: string;
    struggle_story?: string;
    breakthrough_moment?: string;
    life_now?: string;
    credibility_experience?: string;
    signature_method?: string;
}

export interface Section3Data {
    section3_context?: string;
    offer_name?: string;
    offer_type?: string;
    deliverables?: string;
    delivery_process?: string;
    problem_solved?: string;
    promise_outcome?: string;
    pricing?: Pricing;
    guarantee?: string;
    testimonials?: string;
    bonuses?: string;
}

export interface Section4Data {
    section4_context?: string;
    vehicle_belief_shift?: Partial<VehicleBeliefShift>;
    internal_belief_shift?: Partial<InternalBeliefShift>;
    external_belief_shift?: Partial<ExternalBeliefShift>;
    poll_questions?: string[];
}

export interface Section5Data {
    section5_context?: string;
    call_to_action?: string;
    incentive?: string;
    pricing_disclosure?: string;
    path_options?: string;
    top_objections?: Objection[];
}

export type SectionData =
    | Section1Data
    | Section2Data
    | Section3Data
    | Section4Data
    | Section5Data;

// ===========================================
// GENERATION REQUEST/RESPONSE TYPES
// ===========================================

export interface GenerateSectionRequest {
    projectId: string;
    sectionId: SectionId;
    context: string;
    existingData?: Partial<BusinessProfile>;
}

export interface GenerateSectionResponse {
    success: boolean;
    data?: SectionData;
    error?: string;
}

// ===========================================
// CONTEXT METHOD TYPES
// ===========================================

export type ContextMethod = "wizard" | "voice" | "gpt_paste";

export interface ContextMethodOption {
    id: ContextMethod;
    title: string;
    description: string;
    icon: string;
}

export const CONTEXT_METHOD_OPTIONS: ContextMethodOption[] = [
    {
        id: "wizard",
        title: "Build Together Step-by-Step",
        description:
            "Answer questions section by section with AI assistance to generate your content",
        icon: "Wand2",
    },
    {
        id: "voice",
        title: "Complete a Voice Call",
        description:
            "Have a conversation with our AI assistant who will guide you through all the questions",
        icon: "Phone",
    },
    {
        id: "gpt_paste",
        title: "I Already Have a Trained GPT",
        description:
            "Copy prompts for each section, get answers from your GPT, and paste them back",
        icon: "MessageSquare",
    },
];
