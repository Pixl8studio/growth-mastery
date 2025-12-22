/**
 * Admin Module
 * Centralized exports for admin functionality
 */

// Role utilities
export {
    hasMinimumRole,
    isAdmin,
    canPerformAdminActions,
    isSuperAdmin,
    getUserRole,
    getAdminUser,
    requireAdminAccess,
    requireAdminAccessForAPI,
    getAllAdminUsers,
    updateUserRole,
} from "./roles";

// Audit logging
export {
    logAdminAction,
    logViewAction,
    logEditAction,
    logImpersonationAction,
    logAdminChangeAction,
    logEmailSentAction,
    logActionTaken,
    getAuditLogs,
    getRecentLogsForUser,
} from "./audit";

// Re-export types
export type {
    AdminRole,
    AdminUser,
    AuditActionType,
    AuditLogEntry,
    AuditLogInsert,
    NotificationType,
    NotificationPriority,
    AdminNotification,
    AdminNotificationInsert,
    HealthScoreFactors,
    UserHealthScore,
    ApiService,
    ApiUsageLog,
    ApiUsageHourly,
    ApiUsageMonthly,
    EmailDraftStatus,
    AdminEmailDraft,
    AdminUserNote,
    AdminUserNoteInsert,
    SupportInteractionType,
    AdminSupportInteraction,
    AdminSlaDaily,
    NpsSurveyType,
    NpsResponse,
    SupportFeedback,
    AdminSettings,
    AdminUserListItem,
    AdminUserDetail,
    ImpersonationSession,
} from "@/types/admin";
