/**
 * Dashboard Page
 * Main landing page for authenticated users
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
    const { user, profile } = await getCurrentUserWithProfile();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Genie AI
                            </h1>
                            <p className="text-sm text-gray-600">
                                Welcome back, {profile.full_name || "User"}!
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/settings"
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Settings
                            </Link>
                            <form action="/api/auth/logout" method="POST">
                                <button
                                    type="submit"
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Sign out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
                    <p className="mt-2 text-gray-600">
                        Manage your funnels, contacts, and settings
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="mb-8 grid gap-6 md:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Total Funnels
                                </p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    0
                                </p>
                            </div>
                            <div className="rounded-full bg-blue-100 p-3">
                                <svg
                                    className="h-6 w-6 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Total Contacts
                                </p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    0
                                </p>
                            </div>
                            <div className="rounded-full bg-green-100 p-3">
                                <svg
                                    className="h-6 w-6 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    Active Funnels
                                </p>
                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    0
                                </p>
                            </div>
                            <div className="rounded-full bg-purple-100 p-3">
                                <svg
                                    className="h-6 w-6 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        Quick Actions
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Link
                            href="/funnel-builder/create"
                            className="flex items-center space-x-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="rounded-full bg-blue-100 p-3">
                                <svg
                                    className="h-6 w-6 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">
                                    Create New Funnel
                                </p>
                                <p className="text-sm text-gray-600">
                                    Start building a new funnel
                                </p>
                            </div>
                        </Link>

                        <Link
                            href="/funnel-builder"
                            className="flex items-center space-x-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="rounded-full bg-green-100 p-3">
                                <svg
                                    className="h-6 w-6 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">
                                    View All Funnels
                                </p>
                                <p className="text-sm text-gray-600">
                                    Manage your funnels
                                </p>
                            </div>
                        </Link>

                        <Link
                            href="/contacts"
                            className="flex items-center space-x-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="rounded-full bg-purple-100 p-3">
                                <svg
                                    className="h-6 w-6 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">
                                    View Contacts
                                </p>
                                <p className="text-sm text-gray-600">
                                    Manage your leads
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Account Info */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        Account Information
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Email:</span>
                            <span className="text-sm font-medium text-gray-900">
                                {user.email}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Username:</span>
                            <span className="text-sm font-medium text-gray-900">
                                @{profile.username}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Member since:</span>
                            <span className="text-sm font-medium text-gray-900">
                                {formatDate(profile.created_at)}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 flex space-x-4">
                        <Link
                            href="/settings/profile"
                            className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                            Edit Profile →
                        </Link>
                        <Link
                            href="/settings/integrations"
                            className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                            Configure Integrations →
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
