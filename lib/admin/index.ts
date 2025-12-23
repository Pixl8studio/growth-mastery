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

// Configuration
export {
    getAdminSettings,
    getAdminSetting,
    estimateActiveToday,
    ESTIMATED_DAILY_ACTIVE_RATE,
    type AdminConfig,
    type HealthScoreWeights,
} from "./config";

// Validation schemas
export {
    UserSortFieldSchema,
    SortOrderSchema,
    HealthFilterSchema,
    UsersQuerySchema,
    EmailDraftActionSchema,
    UserNoteSchema,
    RoleUpdateSchema,
    NotificationAckSchema,
    parseUsersQuery,
    type UserSortField,
    type SortOrder,
    type HealthFilter,
    type UsersQueryParams,
    type EmailDraftAction,
    type UserNoteInput,
    type RoleUpdateInput,
    type NotificationAckInput,
} from "./validation";

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
