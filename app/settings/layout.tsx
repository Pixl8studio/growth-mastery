/**
 * Settings Layout
 * Layout wrapper for all settings pages
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";

export const metadata = {
    title: "Settings | Growth Mastery AI",
    description: "Manage your account settings and integrations",
};

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = await getCurrentUserWithProfile();

    // If not authenticated, this will redirect via requireAuth
    if (!user) {
        redirect("/login?redirect=/settings");
    }

    const navigation = [
        { name: "Profile", href: "/settings/profile", icon: "user" },
        { name: "Integrations", href: "/settings/integrations", icon: "link" },
        { name: "Payments", href: "/settings/payments", icon: "credit-card" },
        { name: "Domains", href: "/settings/domains", icon: "globe" },
        { name: "Trash", href: "/settings/trash", icon: "trash" },
    ];

    return (
        <div className="min-h-screen bg-muted/50">
            <Header />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Sidebar Navigation */}
                    <aside className="lg:col-span-3">
                        <nav className="space-y-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted hover:text-foreground"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-9">
                        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
