/**
 * Funnel Builder Dashboard
 * Lists all user's funnel projects
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { FUNNEL_CONFIG } from "@/lib/config";
import { Plus, BarChart3, Users, Zap } from "lucide-react";
import { PagesList } from "@/components/funnel-builder/pages-list";

export const metadata = {
    title: "Funnel Builder | Genie AI",
    description: "Create high-converting pitch video funnels with AI",
};

export default async function FunnelBuilderPage() {
    const { user, profile } = await getCurrentUserWithProfile();
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <Link
                                href="/dashboard"
                                className="text-xl font-bold text-gray-900"
                            >
                                Genie AI
                            </Link>
                            <p className="mt-1 text-sm text-gray-600">Funnel Builder</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                                {profile.full_name || user.email}
                            </span>
                            <Link href="/settings">
                                <Button variant="outline" size="sm">
                                    Settings
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="mb-12 text-center">
                    <h1 className="mb-4 text-4xl font-bold text-gray-900">
                        AI-Powered Pitch Video Funnels
                    </h1>
                    <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
                        From conversation to conversion in under 45 minutes. Create
                        complete sales funnels with AI-generated content, pitch videos,
                        and optimized pages.
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
                                    <p className="text-sm font-medium text-gray-600">
                                        Total Funnels
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-gray-900">
                                        {totalProjects}
                                    </p>
                                </div>
                                <div className="rounded-full bg-blue-100 p-3">
                                    <BarChart3 className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        Active Funnels
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-gray-900">
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
                                    <p className="text-sm font-medium text-gray-600">
                                        Draft Funnels
                                    </p>
                                    <p className="mt-2 text-3xl font-bold text-gray-900">
                                        {draftProjects}
                                    </p>
                                </div>
                                <div className="rounded-full bg-gray-100 p-3">
                                    <Users className="h-6 w-6 text-gray-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Projects List */}
                <div className="mb-12">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Your Funnels
                        </h2>
                        <Link href="/funnel-builder/create">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Funnel
                            </Button>
                        </Link>
                    </div>

                    {projects && projects.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project) => (
                                <Card
                                    key={project.id}
                                    className="transition-shadow hover:shadow-md"
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">
                                                {project.name}
                                            </CardTitle>
                                            <Badge
                                                variant={
                                                    project.status === "active"
                                                        ? "success"
                                                        : project.status === "archived"
                                                          ? "secondary"
                                                          : "default"
                                                }
                                            >
                                                {project.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Progress
                                                </span>
                                                <span className="font-medium text-blue-600">
                                                    Step {project.current_step} of 11
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Last updated
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {formatDate(project.updated_at)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex space-x-2">
                                            <Link
                                                href={`/funnel-builder/${project.id}`}
                                                className="flex-1"
                                            >
                                                <Button
                                                    variant="default"
                                                    className="w-full"
                                                    size="sm"
                                                >
                                                    Continue
                                                </Button>
                                            </Link>
                                            {project.status === "active" && (
                                                <Link
                                                    href={`/funnel-builder/${project.id}/analytics`}
                                                    className="flex-1"
                                                >
                                                    <Button
                                                        variant="outline"
                                                        className="w-full"
                                                        size="sm"
                                                    >
                                                        Analytics
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Create New Card */}
                            <Link href="/funnel-builder/create">
                                <Card className="flex h-full cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 transition-colors hover:border-gray-400 hover:bg-gray-50">
                                    <CardContent className="py-12 text-center">
                                        <Plus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                                            Create New Funnel
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Start building your next funnel
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    ) : (
                        <Card className="border-2 border-dashed border-gray-300">
                            <CardContent className="py-12 text-center">
                                <BarChart3 className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                                    No funnels yet
                                </h3>
                                <p className="mb-6 text-gray-600">
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

                {/* Recent Pages */}
                <div className="mb-12">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">Your Pages</h2>
                    </div>
                    <PagesList userId={user.id} username={profile.username || ""} />
                </div>

                {/* Process Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">
                            11-Step Funnel Creation Process
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                            {FUNNEL_CONFIG.stepNames.map((stepName, index) => (
                                <div key={index} className="text-center">
                                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                                        <span className="font-bold text-blue-600">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-900">
                                        {stepName}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
