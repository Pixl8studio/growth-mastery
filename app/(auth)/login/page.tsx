"use client";

/**
 * Login Page
 * User authentication with Supabase
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/funnel-builder";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            const { data, error: signInError } = await supabase.auth.signInWithPassword(
                {
                    email,
                    password,
                }
            );

            if (signInError) {
                throw signInError;
            }

            logger.info({ userId: data.user?.id }, "User logged in successfully");

            // Redirect to intended page or dashboard
            router.push(redirect);
            router.refresh();
        } catch (err) {
            // Use userError for expected auth failures - these are user errors, not bugs
            logger.userError({ error: err, email }, "Login failed");

            // Provide user-friendly error messages for common auth issues
            const errorMessage = err instanceof Error ? err.message : "";

            if (errorMessage.toLowerCase().includes("email not confirmed")) {
                setError(
                    "Please confirm your email address before signing in. Check your inbox for a confirmation link."
                );
            } else if (
                errorMessage.toLowerCase().includes("invalid login credentials")
            ) {
                setError(
                    "Invalid email or password. Please check your credentials and try again."
                );
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to sign in. Please try again."
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Sign in to continue building your funnels
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-md bg-destructive/10 p-3 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-foreground"
                    >
                        Email address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-soft placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-foreground"
                        >
                            Password
                        </label>
                        <Link
                            href="/reset-password"
                            className="text-sm text-primary hover:text-primary/80 transition-smooth"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-soft placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-float transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-background px-2 text-muted-foreground">
                            New to GrowthMastery.ai?
                        </span>
                    </div>
                </div>

                <div className="mt-6">
                    <Link
                        href="/signup"
                        className="flex w-full justify-center rounded-md border-2 border-primary bg-background px-4 py-2 text-sm font-semibold text-primary shadow-soft hover:bg-primary hover:text-primary-foreground transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        Create an account
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center">
                    <div className="text-gray-500">Loading...</div>
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
