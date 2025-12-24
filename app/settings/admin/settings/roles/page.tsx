"use client";

/**
 * Role Permissions Configuration
 * Placeholder for detailed role permission management
 */

import Link from "next/link";

export default function AdminRolesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Role Permissions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Configure what each admin role can access
                </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
                <div className="space-y-4">
                    <div className="border-b border-border pb-4">
                        <h3 className="font-medium text-foreground">support</h3>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>View users and their profiles</li>
                            <li>View funnels (read-only)</li>
                            <li>View health scores and metrics</li>
                            <li>View notifications</li>
                        </ul>
                    </div>

                    <div className="border-b border-border pb-4">
                        <h3 className="font-medium text-foreground">admin</h3>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>All support permissions</li>
                            <li>Impersonate users</li>
                            <li>Take actions on behalf of users</li>
                            <li>Acknowledge notifications</li>
                            <li>Approve/reject email drafts</li>
                            <li>Add notes to user profiles</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-medium text-foreground">super_admin</h3>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>All admin permissions</li>
                            <li>Manage admin roles</li>
                            <li>Configure notification recipients</li>
                            <li>Modify system settings</li>
                            <li>View audit logs</li>
                        </ul>
                    </div>
                </div>
            </div>

            <Link
                href="/settings/admin/settings"
                className="inline-block text-sm text-primary hover:underline"
            >
                Back to settings
            </Link>
        </div>
    );
}
