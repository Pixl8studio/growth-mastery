/**
 * Settings Layout
 * Layout wrapper for all settings pages
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Settings | Genie AI",
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
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/dashboard"
                            className="text-2xl font-bold text-gray-900"
                        >
                            Genie AI
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Sidebar Navigation */}
                    <aside className="lg:col-span-3">
                        <nav className="space-y-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-9">
                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
