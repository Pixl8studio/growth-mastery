/**
 * Type definitions for the AI Editor feature
 */

export interface UserMessage {
    role: "user";
    content: string;
}

export interface AIMessageAction {
    title: string;
    description: string;
    editType: "text" | "style" | "structure" | "attribute";
    status: "pending" | "applied" | "rejected";
}

export interface AIMessage {
    role: "ai";
    content: string;
    actions?: AIMessageAction[];
}

export interface ConversationMessage {
    role: "user" | "ai";
    content: string;
    timestamp: string;
    actions?: AIMessageAction[];
}

export interface AIEditorPage {
    id: string;
    user_id: string;
    funnel_project_id: string;
    page_type: "registration" | "watch" | "enrollment";
    title: string;
    slug: string;
    html_content: string;
    status: "draft" | "published";
    version: number;
    created_at: string;
    updated_at: string;
}

export interface AIEditorConversation {
    id: string;
    page_id: string;
    messages: ConversationMessage[];
    total_edits: number;
    created_at: string;
    updated_at: string;
}

export interface AIEditorVersion {
    id: string;
    page_id: string;
    version: number;
    html_content: string;
    change_description: string;
    created_at: string;
}

export interface GeneratePageRequest {
    projectId: string;
    pageType: "registration" | "watch" | "enrollment";
    customPrompt?: string;
}

export interface GeneratePageResponse {
    success: boolean;
    pageId: string;
    html: string;
    title: string;
    generationTime: number;
    sectionsGenerated: string[];
    validation: {
        isValid: boolean;
        warnings: string[];
    };
}

export interface ChatEditRequest {
    pageId: string;
    message: string;
    currentHtml: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ChatEditResponse {
    success: boolean;
    response: string;
    updatedHtml: string;
    editsApplied: number;
    suggestions: string[];
    processingTime: number;
    version: number;
}
