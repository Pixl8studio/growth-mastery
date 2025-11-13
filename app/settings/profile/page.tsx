"use client";

/**
 * Profile Settings Page
 * Manage user profile information and username
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { isValidUsername } from "@/lib/utils";

export default function ProfileSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: profile, error: profileError } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;

            setEmail(user.email || "");
            setFullName(profile.full_name || "");
            setUsername(profile.username || "");
        } catch (err) {
            logger.error({ error: err }, "Failed to load profile");
            setError("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value);
        setUsernameError(null);

        // Validate username format
        if (value && !isValidUsername(value)) {
            setUsernameError(
                "Username must be 3-30 characters, lowercase letters, numbers, and hyphens only"
            );
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Validate username
            if (usernameError) {
                setError(usernameError);
                setSaving(false);
                return;
            }

            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("Not authenticated");
                return;
            }

            // Check if username is already taken
            const { data: existingUser } = await supabase
                .from("user_profiles")
                .select("id")
                .eq("username", username)
                .neq("id", user.id)
                .single();

            if (existingUser) {
                setError("Username is already taken");
                setSaving(false);
                return;
            }

            // Update profile
            const { error: updateError } = await supabase
                .from("user_profiles")
                .update({
                    full_name: fullName,
                    username: username,
                })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setSuccess("Profile updated successfully!");
            logger.info({ userId: user.id }, "Profile updated");
        } catch (err) {
            logger.error({ error: err }, "Failed to update profile");
            setError(err instanceof Error ? err.message : "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Profile Settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage your account information and username
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 rounded-md bg-green-50 p-3">
                    <p className="text-sm text-green-800">{success}</p>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-foreground"
                    >
                        Email address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="mt-1 block w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-muted-foreground"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        Email cannot be changed
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="fullName"
                        className="block text-sm font-medium text-foreground"
                    >
                        Full name
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label
                        htmlFor="username"
                        className="block text-sm font-medium text-foreground"
                    >
                        Username
                    </label>
                    <div className="mt-1 flex rounded-md shadow-soft">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted/50 px-3 text-sm text-muted-foreground">
                            @
                        </span>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            className="block w-full rounded-r-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="your-username"
                        />
                    </div>
                    {usernameError && (
                        <p className="mt-1 text-xs text-red-600">{usernameError}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                        Your public URL will be: genieai.com/{username}/[page-name]
                    </p>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={loadProfile}
                        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-smooth shadow-soft hover:shadow-float"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !!usernameError}
                        className="rounded-md gradient-emerald px-4 py-2 text-sm font-semibold text-primary-foreground hover:shadow-glow transition-smooth disabled:cursor-not-allowed disabled:opacity-50 shadow-soft"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
