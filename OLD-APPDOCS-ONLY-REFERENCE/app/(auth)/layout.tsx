/**
 * Auth Layout
 * Layout for authentication pages (login, signup)
 */

import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
    title: "Sign In | GrowthMastery.ai",
    description: "Access your GrowthMastery.ai account",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gradient-hero px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated background particles */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: "2s" }}
                />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <Image
                            src="/assets/growth-mastery-logo.png"
                            alt="GrowthMastery.ai"
                            width={60}
                            height={60}
                        />
                    </div>
                    <h1 className="text-4xl font-display font-bold text-foreground">
                        GrowthMastery.ai
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        AI-Powered Funnel Builder
                    </p>
                </div>

                {/* Auth Form */}
                <div className="rounded-lg bg-card px-8 py-10 shadow-float border border-border">
                    {children}
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-muted-foreground">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}
