"use client";

/**
 * Signup Page
 * User registration with Supabase
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

export default function SignupPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        // Validate password length
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setIsLoading(false);
            return;
        }

        try {
            const supabase = createClient();

            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (signUpError) {
                throw signUpError;
            }

            logger.info({ userId: data.user?.id }, "User signed up successfully");

            // Redirect to dashboard (user profile will be auto-created via trigger)
            router.push("/funnel-builder");
            router.refresh();
        } catch (err) {
            logger.error({ error: err }, "Signup failed");
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to create account. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                    Create your account
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Start building high-converting funnels with AI
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-md bg-destructive/10 p-3 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
                <div>
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-foreground"
                    >
                        Full name
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-soft placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        placeholder="John Doe"
                    />
                </div>

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
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-foreground"
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-soft placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        placeholder="••••••••"
                        minLength={6}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        Must be at least 6 characters
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-foreground"
                    >
                        Confirm password
                    </label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-soft placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-float transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading ? "Creating account..." : "Create account"}
                </button>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-background px-2 text-muted-foreground">
                            Already have an account?
                        </span>
                    </div>
                </div>

                <div className="mt-6">
                    <Link
                        href="/login"
                        className="flex w-full justify-center rounded-md border-2 border-primary bg-background px-4 py-2 text-sm font-semibold text-primary shadow-soft hover:bg-primary hover:text-primary-foreground transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        Sign in instead
                    </Link>
                </div>
            </div>
        </div>
    );
}
