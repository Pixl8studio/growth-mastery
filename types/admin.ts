/**
 * Admin Dashboard Types
 * Types for admin system, roles, notifications, and monitoring
 */

import type { Json } from "./database";

// ===========================================
// Role Types
// ===========================================

export type AdminRole = "user" | "support" | "admin" | "super_admin";

export const ADMIN_ROLES: AdminRole[] = ["support", "admin", "super_admin"];

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: AdminRole;
    avatar_url: string | null;
    created_at: string;
}

// ===========================================
// Audit Log Types
// ===========================================

export type AuditActionType =
    | "view"
    | "edit"
    | "impersonate"
    | "admin_change"
    | "email_sent"
    | "action_taken";

export interface AuditLogEntry {
    id: string;
    admin_user_id: string;
    target_user_id: string | null;
    action: string;
    action_type: AuditActionType;
    details: Json;
    created_at: string;
}

export interface AuditLogInsert {
    admin_user_id: string;
    target_user_id?: string | null;
    action: string;
    action_type: AuditActionType;
    details?: Json;
}

// ===========================================
// Notification Types
// ===========================================

export type NotificationType =
    | "error_spike"
    | "cost_alert"
    | "payment_failed"
    | "user_struggling"
    | "ai_suggestion"
    | "new_user"
    | "milestone"
    | "follow_up_due"
    | "nps_detractor";

export type NotificationPriority = "urgent" | "normal";

export interface AdminNotification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    target_user_id: string | null;
    metadata: Json;
    requires_acknowledgment: boolean;
    acknowledged_by: string | null;
    acknowledged_at: string | null;
    created_at: string;
}

export interface AdminNotificationInsert {
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    target_user_id?: string | null;
    metadata?: Json;
    requires_acknowledgment?: boolean;
}

// ===========================================
// Health Score Types
// ===========================================

export interface HealthScoreFactors {
    logins_per_week?: number;
    time_in_app_minutes?: number;
    actions_taken?: number;
    funnels_published?: number;
    pages_live?: number;
    conversions?: number;
    error_count?: number;
    failed_api_calls?: number;
    payment_status?: "current" | "overdue" | "failed";
    approaching_limits?: boolean;
}

export interface UserHealthScore {
    id: string;
    user_id: string;
    overall_score: number;
    engagement_score: number | null;
    success_score: number | null;
    technical_score: number | null;
    billing_score: number | null;
    factors: HealthScoreFactors;
    calculated_at: string;
}

// ===========================================
// API Usage Types
// ===========================================

export type ApiService =
    | "openai"
    | "claude"
    | "stripe"
    | "cloudflare"
    | "email"
    | "vapi"
    | "gamma"
    | "other";

export interface ApiUsageLog {
    id: string;
    user_id: string;
    service: ApiService;
    endpoint: string | null;
    tokens_used: number;
    cost_cents: number;
    metadata: Json;
    created_at: string;
}

export interface ApiUsageHourly {
    id: string;
    user_id: string;
    service: string;
    hour: string;
    total_calls: number;
    total_tokens: number;
    total_cost_cents: number;
}

export interface ApiUsageMonthly {
    id: string;
    user_id: string;
    month: string;
    service: string;
    total_calls: number;
    total_tokens: number;
    total_cost_cents: number;
}

// ===========================================
// Email Draft Types
// ===========================================

export type EmailDraftStatus = "pending" | "approved" | "sent" | "rejected";

export interface AdminEmailDraft {
    id: string;
    target_user_id: string;
    trigger_reason: string;
    subject: string;
    body: string;
    status: EmailDraftStatus;
    approved_by: string | null;
    approved_at: string | null;
    sent_at: string | null;
    created_at: string;
}

// ===========================================
// User Notes Types
// ===========================================

export interface AdminUserNote {
    id: string;
    user_id: string;
    admin_user_id: string;
    content: string;
    follow_up_date: string | null;
    follow_up_completed: boolean;
    follow_up_completed_by: string | null;
    follow_up_completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface AdminUserNoteInsert {
    user_id: string;
    admin_user_id: string;
    content: string;
    follow_up_date?: string | null;
}

// ===========================================
// SLA Types
// ===========================================

export type SupportInteractionType =
    | "error_response"
    | "outreach"
    | "ticket_response"
    | "proactive_support";

export interface AdminSupportInteraction {
    id: string;
    user_id: string;
    admin_user_id: string | null;
    type: SupportInteractionType;
    trigger_notification_id: string | null;
    issue_detected_at: string;
    first_response_at: string | null;
    resolved_at: string | null;
    response_time_minutes: number | null;
    resolution_time_minutes: number | null;
    notes: string | null;
    created_at: string;
}

export interface AdminSlaDaily {
    id: string;
    admin_user_id: string;
    date: string;
    interactions_count: number;
    avg_response_time_minutes: number | null;
    avg_resolution_time_minutes: number | null;
    issues_unresolved: number;
}

// ===========================================
// NPS & Feedback Types
// ===========================================

export type NpsSurveyType = "quarterly" | "milestone" | "churn_prevention";

export interface NpsResponse {
    id: string;
    user_id: string;
    score: number;
    feedback: string | null;
    survey_type: NpsSurveyType;
    created_at: string;
}

export interface SupportFeedback {
    id: string;
    user_id: string;
    interaction_id: string | null;
    rating: number;
    feedback: string | null;
    created_at: string;
}

// ===========================================
// Admin Settings Types
// ===========================================

export interface AdminSettings {
    cost_alert_threshold_cents: number;
    health_score_weights: {
        engagement: number;
        success: number;
        technical: number;
        billing: number;
    };
    error_spike_threshold: number;
    nps_survey_interval_days: number;
}

// ===========================================
// Admin User List Types
// ===========================================

export interface AdminUserListItem {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: AdminRole;
    created_at: string;
    updated_at: string;
    // Computed fields
    health_score?: number;
    funnel_count?: number;
    last_active?: string;
    monthly_cost_cents?: number;
    has_errors?: boolean;
}

export interface AdminUserDetail extends AdminUserListItem {
    // Profile fields
    username: string | null;
    onboarding_completed: boolean;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean;
    stripe_payouts_enabled: boolean;
    stripe_connected_at: string | null;
    // Health details
    health_scores?: UserHealthScore;
    // Usage details
    monthly_usage?: ApiUsageMonthly[];
    // Recent activity
    recent_errors?: number;
    recent_funnels?: Array<{
        id: string;
        name: string;
        status: string;
        created_at: string;
    }>;
}

// ===========================================
// Impersonation Types
// ===========================================

export interface ImpersonationSession {
    admin_user_id: string;
    target_user_id: string;
    started_at: string;
    edit_mode_enabled: boolean;
    pages_viewed: string[];
}
