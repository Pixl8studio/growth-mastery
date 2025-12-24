/**
 * Admin Input Validation
 * Zod schemas for validating admin query parameters and inputs
 */

import { z } from "zod";

/**
 * Valid sort fields for users list
 */
export const UserSortFieldSchema = z.enum([
    "email",
    "healthScore",
    "funnelCount",
    "createdAt",
    "monthlyCostCents",
]);
export type UserSortField = z.infer<typeof UserSortFieldSchema>;

/**
 * Valid sort orders
 */
export const SortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Valid health filters for users list
 */
export const HealthFilterSchema = z.enum(["all", "healthy", "at-risk", "critical"]);
export type HealthFilter = z.infer<typeof HealthFilterSchema>;

/**
 * Users list query parameters schema
 * Validates and sanitizes search/filter/sort parameters
 */
export const UsersQuerySchema = z.object({
    search: z
        .string()
        .max(100, "Search query too long")
        .optional()
        .transform((val) => val?.trim()),
    sort: UserSortFieldSchema.optional().default("createdAt"),
    order: SortOrderSchema.optional().default("desc"),
    filter: HealthFilterSchema.optional().default("all"),
});
export type UsersQueryParams = z.infer<typeof UsersQuerySchema>;

/**
 * Parse and validate users query parameters
 * Returns validated params or defaults for invalid values
 */
export function parseUsersQuery(searchParams: {
    search?: string;
    sort?: string;
    order?: string;
    filter?: string;
}): UsersQueryParams {
    const result = UsersQuerySchema.safeParse(searchParams);

    if (result.success) {
        return result.data;
    }

    // Return defaults for invalid input - don't expose validation errors
    return {
        search: undefined,
        sort: "createdAt",
        order: "desc",
        filter: "all",
    };
}

/**
 * Email draft action schema
 */
export const EmailDraftActionSchema = z.object({
    draftId: z.string().uuid("Invalid draft ID"),
    action: z.enum(["approve", "reject", "edit"]),
    editedSubject: z.string().max(200).optional(),
    editedBody: z.string().max(10000).optional(),
});
export type EmailDraftAction = z.infer<typeof EmailDraftActionSchema>;

/**
 * User note creation schema
 */
export const UserNoteSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    content: z.string().min(1, "Note content required").max(5000, "Note too long"),
    followUpDate: z.string().date().optional(),
});
export type UserNoteInput = z.infer<typeof UserNoteSchema>;

/**
 * Role update schema
 */
export const RoleUpdateSchema = z.object({
    targetUserId: z.string().uuid("Invalid target user ID"),
    newRole: z.enum(["user", "support", "admin", "super_admin"]),
});
export type RoleUpdateInput = z.infer<typeof RoleUpdateSchema>;

/**
 * Notification acknowledgment schema
 */
export const NotificationAckSchema = z.object({
    notificationId: z.string().uuid("Invalid notification ID"),
});
export type NotificationAckInput = z.infer<typeof NotificationAckSchema>;
