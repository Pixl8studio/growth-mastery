/**
 * Admin Audit Logging
 * Functions for logging and retrieving admin actions
 */

import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { AuditActionType, AuditLogEntry, AuditLogInsert } from "@/types/admin";
import type { Json } from "@/types/database";

/**
 * Log an admin action to the audit log
 * This is fire-and-forget - errors are logged but don't block the main operation
 */
export async function logAdminAction(entry: AuditLogInsert): Promise<void> {
    void (async () => {
        try {
            const supabase = await createClient();

            const { error } = await supabase.from("admin_audit_logs").insert({
                admin_user_id: entry.admin_user_id,
                target_user_id: entry.target_user_id || null,
                action: entry.action,
                action_type: entry.action_type,
                details: entry.details || {},
            });

            if (error) {
                logger.error(
                    { error, entry },
                    "Failed to log admin action to audit log"
                );
                Sentry.captureException(error, {
                    tags: { component: "admin", action: "audit_log" },
                    extra: { entry },
                });
            } else {
                logger.info(
                    {
                        adminUserId: entry.admin_user_id,
                        targetUserId: entry.target_user_id,
                        action: entry.action,
                        actionType: entry.action_type,
                    },
                    "Admin action logged"
                );
            }
        } catch (error) {
            logger.error({ error, entry }, "Exception logging admin action");
            Sentry.captureException(error, {
                tags: { component: "admin", action: "audit_log" },
            });
        }
    })();
}

/**
 * Log a view action (viewing user profile, funnels, etc.)
 */
export function logViewAction(
    adminUserId: string,
    targetUserId: string,
    action: string,
    details?: Record<string, unknown>
): void {
    logAdminAction({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action,
        action_type: "view",
        details: details as Json,
    });
}

/**
 * Log an edit action (making changes on behalf of user)
 */
export function logEditAction(
    adminUserId: string,
    targetUserId: string,
    action: string,
    details?: Record<string, unknown>
): void {
    logAdminAction({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action,
        action_type: "edit",
        details: details as Json,
    });
}

/**
 * Log an impersonation action
 */
export function logImpersonationAction(
    adminUserId: string,
    targetUserId: string,
    action: "started" | "ended",
    details?: Record<string, unknown>
): void {
    logAdminAction({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action: `impersonation_${action}`,
        action_type: "impersonate",
        details: details as Json,
    });
}

/**
 * Log an admin role change
 */
export function logAdminChangeAction(
    adminUserId: string,
    targetUserId: string,
    action: string,
    details?: Record<string, unknown>
): void {
    logAdminAction({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action,
        action_type: "admin_change",
        details: details as Json,
    });
}

/**
 * Log an email sent to user
 */
export function logEmailSentAction(
    adminUserId: string,
    targetUserId: string,
    subject: string,
    details?: Record<string, unknown>
): void {
    logAdminAction({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action: `email_sent: ${subject}`,
        action_type: "email_sent",
        details: details as Json,
    });
}

/**
 * Log a general action taken on behalf of user (reset password, extend trial, etc.)
 */
export function logActionTaken(
    adminUserId: string,
    targetUserId: string,
    action: string,
    details?: Record<string, unknown>
): void {
    logAdminAction({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action,
        action_type: "action_taken",
        details: details as Json,
    });
}

/**
 * Get audit logs with filtering (super_admin only)
 */
export async function getAuditLogs(options: {
    adminUserId?: string;
    targetUserId?: string;
    actionType?: AuditActionType;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const supabase = await createClient();

    let query = supabase
        .from("admin_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

    if (options.adminUserId) {
        query = query.eq("admin_user_id", options.adminUserId);
    }

    if (options.targetUserId) {
        query = query.eq("target_user_id", options.targetUserId);
    }

    if (options.actionType) {
        query = query.eq("action_type", options.actionType);
    }

    if (options.startDate) {
        query = query.gte("created_at", options.startDate);
    }

    if (options.endDate) {
        query = query.lte("created_at", options.endDate);
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        logger.error({ error, options }, "Failed to get audit logs");
        return { logs: [], total: 0 };
    }

    return {
        logs: data as AuditLogEntry[],
        total: count || 0,
    };
}

/**
 * Get recent audit logs for a specific user (for user detail page)
 */
export async function getRecentLogsForUser(
    targetUserId: string,
    limit: number = 10
): Promise<AuditLogEntry[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .eq("target_user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        logger.error({ error, targetUserId }, "Failed to get recent logs for user");
        return [];
    }

    return data as AuditLogEntry[];
}
