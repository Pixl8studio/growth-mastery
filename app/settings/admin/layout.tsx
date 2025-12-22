/**
 * Admin Dashboard Layout
 * Layout for all admin pages with role-based access control
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import { requireAdminAccess, isSuperAdmin } from "@/lib/admin/roles";
import { logViewAction } from "@/lib/admin/audit";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminRole } from "@/types/admin";

export const metadata = {
    title: "Admin Dashboard | Growth Mastery AI",
    description: "Admin dashboard for user support and monitoring",
};

interface AdminNavItem {
    name: string;
    href: string;
    description: string;
    requiredRole?: AdminRole;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, profile } = await getCurrentUserWithProfile();

    if (!user) {
        redirect("/login?redirect=/settings/admin");
    }

    // Require admin access - silently redirects non-admins to /settings
    const adminUser = await requireAdminAccess(user.id);

    // Log admin access
    logViewAction(adminUser.id, adminUser.id, "accessed_admin_dashboard");

    const navigation: AdminNavItem[] = [
        {
            name: "Overview",
            href: "/settings/admin/overview",
            description: "Dashboard metrics and attention feed",
        },
        {
            name: "Users",
            href: "/settings/admin/users",
            description: "User list and management",
        },
        {
            name: "Notifications",
            href: "/settings/admin/notifications",
            description: "Notification center",
        },
        {
            name: "Costs",
            href: "/settings/admin/costs",
            description: "API usage and cost monitoring",
        },
        {
            name: "Emails",
            href: "/settings/admin/emails",
            description: "AI-drafted email approvals",
        },
        {
            name: "SLA",
            href: "/settings/admin/sla",
            description: "Support response metrics",
        },
        {
            name: "Feedback",
            href: "/settings/admin/feedback",
            description: "NPS and user feedback",
        },
        {
            name: "Reports",
            href: "/settings/admin/reports",
            description: "Generate reports",
        },
    ];

    // Add settings section for super admins
    const superAdminNavigation: AdminNavItem[] = isSuperAdmin(adminUser.role)
        ? [
              {
                  name: "Settings",
                  href: "/settings/admin/settings",
                  description: "Admin configuration",
                  requiredRole: "super_admin",
              },
          ]
        : [];

    const allNavigation = [...navigation, ...superAdminNavigation];

    return (
        <div className="space-y-6" role="main" aria-label="Admin Dashboard">
            {/* Admin Header */}
            <header className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Admin Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Monitor users, manage support, and track platform health
                        </p>
                    </div>
                    <div
                        className="flex items-center space-x-2 text-sm text-muted-foreground"
                        aria-label="Current admin user information"
                    >
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                adminUser.role === "super_admin"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                    : adminUser.role === "admin"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                            }`}
                            role="status"
                            aria-label={`Your role: ${adminUser.role.replace("_", " ")}`}
                        >
                            {adminUser.role}
                        </span>
                        <span aria-label={`Logged in as ${adminUser.email}`}>
                            {adminUser.email}
                        </span>
                    </div>
                </div>
            </header>

            {/* Admin Sub-Navigation */}
            <nav
                className="flex flex-wrap gap-2 border-b border-border pb-4"
                aria-label="Admin dashboard sections"
            >
                {allNavigation.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        title={item.description}
                        aria-label={`${item.name}: ${item.description}`}
                    >
                        {item.name}
                    </Link>
                ))}
            </nav>

            {/* Admin Content */}
            <div role="region" aria-label="Admin content area">
                {children}
            </div>
        </div>
    );
}
