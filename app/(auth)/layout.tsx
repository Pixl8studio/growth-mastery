/**
 * Auth Layout
 * Layout for authentication pages (login, signup)
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | Genie AI",
    description: "Access your Genie AI account",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900">Genie AI</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        AI-Powered Funnel Builder
                    </p>
                </div>

                {/* Auth Form */}
                <div className="rounded-lg bg-white px-8 py-10 shadow-lg">
                    {children}
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}
