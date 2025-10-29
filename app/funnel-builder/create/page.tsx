"use client";

/**
 * Create Funnel Project Page
 * Form to create a new funnel project
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function CreateFunnelPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setError(null);

        try {
            const supabase = createClient();

            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Not authenticated");
            }

            // Generate unique slug from name
            const baseSlug = generateSlug(name);

            // Check for existing slugs and increment if needed
            const { data: existingProjects } = await supabase
                .from("funnel_projects")
                .select("slug")
                .eq("user_id", user.id)
                .like("slug", `${baseSlug}%`);

            let slug = baseSlug;
            if (existingProjects && existingProjects.length > 0) {
                const slugs = existingProjects.map((p) => p.slug);
                let counter = 2;
                while (slugs.includes(slug)) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }
            }

            // Create project
            const { data: project, error: createError } = await supabase
                .from("funnel_projects")
                .insert({
                    user_id: user.id,
                    user_email: user.email!,
                    name,
                    slug,
                    status: "draft",
                    current_step: 1,
                })
                .select()
                .single();

            if (createError) throw createError;

            logger.info(
                { projectId: project.id, projectName: name },
                "Funnel project created"
            );

            // Redirect to Step 1
            router.push(`/funnel-builder/${project.id}/step/1`);
        } catch (err) {
            logger.error({ error: err }, "Failed to create funnel project");
            setError(err instanceof Error ? err.message : "Failed to create funnel");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <Link
                        href="/funnel-builder"
                        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Funnels
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8 text-center">
                    <h1 className="mb-2 text-3xl font-bold text-gray-900">
                        Create New Funnel
                    </h1>
                    <p className="text-gray-600">
                        Give your funnel a name and let's get started
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Your Funnel</CardTitle>
                        <CardDescription>
                            Give your funnel a name to get started
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-6 rounded-md bg-red-50 p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <Label htmlFor="name">Funnel Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Pitch Deck Mastery Program"
                                    className="mt-1"
                                    autoFocus
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Choose a name that describes your offer
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <Link href="/funnel-builder">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={isCreating || !name}>
                                    {isCreating ? "Creating..." : "Create Funnel"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Process Preview */}
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>What Happens Next?</CardTitle>
                        <CardDescription>
                            After creating your funnel, you'll be guided through 11
                            steps
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ol className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start">
                                <span className="mr-2 font-bold text-blue-600">1.</span>
                                AI Intake Call - Have a conversation about your business
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 font-bold text-blue-600">2.</span>
                                Craft Offer - AI generates your pricing and features
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 font-bold text-blue-600">3.</span>
                                Create 55-slide presentation structure
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 font-bold text-blue-600">4.</span>
                                Generate beautiful Gamma presentation
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 font-bold text-blue-600">5.</span>
                                Create enrollment page with AI-written sales copy
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 font-bold text-blue-600">
                                    ...
                                </span>
                                And 6 more steps to complete your funnel!
                            </li>
                        </ol>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
