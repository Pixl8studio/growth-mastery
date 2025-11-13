/**
 * Funnel Builder Dashboard
 * Lists all user's funnel projects
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BarChart3, Users, Zap } from "lucide-react";
import { Header } from "@/components/layout/header";
import { ProjectCard } from "@/components/funnel-builder/project-card";

export const metadata = {
    title: "Funnel Builder | Genie AI",
    description: "Create high-converting pitch video funnels with AI",
};

export default async function FunnelBuilderPage() {
    const { user } = await getCurrentUserWithProfile();
    const supabase = await createClient();

    // Fetch user's funnel projects
    const { data: projects, error } = await supabase
        .from("funnel_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching funnel projects:", error);
    }

    // Get quick stats
    const totalProjects = projects?.length || 0;
    const activeProjects = projects?.filter((p) => p.status === "active").length || 0;
    const draftProjects = projects?.filter((p) => p.status === "draft").length || 0;

    return (
        <div className="min-h-screen bg-muted/50">
            <Header />

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="mb-12 text-center">
                    <h1 className="mb-4 text-4xl font-bold text-foreground">
                        Create Your AI-Powered Magnetic Masterclass Funnel.
                    </h1>
                    <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
                        Create complete sales funnels with AI-generated content, pitch
                        videos, and optimized pages.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <Link href="/funnel-builder/create">
                            <Button size="lg">
                                <Plus className="mr-2 h-5 w-5" />
                                Create New Funnel
                            </Button>
                        </Link>
                        <Link href="/contacts">
                            <Button size="lg" variant="outline">
                                <Users className="mr-2 h-5 w-5" />
                                View Contacts
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="mb-12 grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Total Funnels
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">
                                        {totalProjects}
                                    </p>
                                </div>
                                <div className="rounded-full bg-primary/10 p-3">
                                    <BarChart3 className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Active Funnels
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">
                                        {activeProjects}
                                    </p>
                                </div>
                                <div className="rounded-full bg-green-100 p-3">
                                    <Zap className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Draft Funnels
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-foreground">
                                        {draftProjects}
                                    </p>
                                </div>
                                <div className="rounded-full bg-muted p-3">
                                    <Users className="h-6 w-6 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Projects List */}
                <div className="mb-12">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-foreground">
                            Your Funnels
                        </h2>
                    </div>

                    {projects && projects.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project) => (
                                <ProjectCard key={project.id} project={project} />
                            ))}

                            {/* Create New Card */}
                            <Link href="/funnel-builder/create">
                                <Card className="flex h-full cursor-pointer items-center justify-center border-2 border-dashed border-border transition-colors hover:border-gray-400 hover:bg-muted/50">
                                    <CardContent className="py-12 text-center">
                                        <Plus className="mx-auto mb-4 h-12 w-12 text-primary" />
                                        <h3 className="mb-2 text-lg font-medium text-foreground">
                                            Create New Funnel
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Start building your next funnel
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    ) : (
                        <Card className="border-2 border-dashed border-border">
                            <CardContent className="py-12 text-center">
                                <BarChart3 className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                                <h3 className="mb-2 text-xl font-semibold text-foreground">
                                    No funnels yet
                                </h3>
                                <p className="mb-6 text-muted-foreground">
                                    Create your first funnel to get started!
                                </p>
                                <Link href="/funnel-builder/create">
                                    <Button size="lg">
                                        <Plus className="mr-2 h-5 w-5" />
                                        Create Your First Funnel
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
