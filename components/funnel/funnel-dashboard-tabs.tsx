/**
 * Funnel Dashboard Tabs Component
 *
 * Main tabbed interface for the funnel dashboard showing Dashboard, Pages,
 * AI Followup, Contacts, and Settings tabs.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Users, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import { FunnelAnalyticsDashboard } from "@/components/funnel/analytics-dashboard";
import { FunnelPagesView } from "@/components/funnel/funnel-pages-view";
import { FunnelFollowupView } from "@/components/funnel/funnel-followup-view";
import { FunnelContactsView } from "@/components/funnel/funnel-contacts-view";
import { FunnelSettingsView } from "@/components/funnel/funnel-settings-view";
import {
    getStepCompletionStatus,
    getMasterStepCompletionStatus,
} from "@/app/funnel-builder/completion-utils";
import { MasterSectionCard } from "@/components/funnel-builder/master-section-card";
import { HorizontalMasterSteps } from "@/components/funnel/horizontal-master-steps";
import type { MasterStepProgress } from "@/app/funnel-builder/completion-types";

interface FunnelDashboardTabsProps {
    projectId: string;
    username: string;
    currentStep: number;
}

export function FunnelDashboardTabs({
    projectId,
    username,
    currentStep,
}: FunnelDashboardTabsProps) {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [masterStepProgress, setMasterStepProgress] =
        useState<MasterStepProgress | null>(null);
    const [loading, setLoading] = useState(true);

    const loadCompletionStatus = useCallback(async () => {
        try {
            const status = await getStepCompletionStatus(projectId);
            const completed = status.filter((s) => s.isCompleted).map((s) => s.step);
            const masterProgress = await getMasterStepCompletionStatus(projectId);

            setCompletedSteps(completed);
            setMasterStepProgress(masterProgress);
        } catch (error) {
            console.error("Failed to load completion status", error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadCompletionStatus();
    }, [loadCompletionStatus]);

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="dashboard">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                </TabsTrigger>
                <TabsTrigger value="pages">
                    <FileText className="h-4 w-4 mr-2" />
                    Pages
                </TabsTrigger>
                <TabsTrigger value="followup">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    AI Followup
                </TabsTrigger>
                <TabsTrigger value="contacts">
                    <Users className="h-4 w-4 mr-2" />
                    Contacts
                </TabsTrigger>
                <TabsTrigger value="settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-6 space-y-6">
                {/* Overall Progress Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Funnel Builder Progress</CardTitle>
                                <CardDescription>
                                    {loading
                                        ? "Loading..."
                                        : masterStepProgress
                                          ? `${masterStepProgress.completedMasterSteps} of ${masterStepProgress.totalMasterSteps} sections complete • ${Math.round((completedSteps.length / 15) * 100)}% done`
                                          : "Complete each section to build your funnel"}
                                </CardDescription>
                            </div>
                            <Link
                                href={`/funnel-builder/${projectId}/step/${currentStep}`}
                            >
                                <Button>Continue Building</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-4 animate-pulse rounded-full bg-gray-200" />
                        ) : masterStepProgress ? (
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                                        style={{
                                            width: `${Math.round((completedSteps.length / 14) * 100)}%`,
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>
                                        {completedSteps.length} of 14 steps completed
                                    </span>
                                    <span className="font-bold text-primary">
                                        {Math.round((completedSteps.length / 14) * 100)}
                                        %
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                {/* Master Section Cards - Horizontal on Desktop, Vertical on Mobile */}

                {/* Desktop: Horizontal Master Steps */}
                <div className="hidden md:block">
                    {loading ? (
                        <Card className="h-32 animate-pulse bg-gray-200" />
                    ) : masterStepProgress ? (
                        <HorizontalMasterSteps
                            projectId={projectId}
                            masterStepCompletions={
                                masterStepProgress.masterStepCompletions
                            }
                            completedSubSteps={completedSteps}
                        />
                    ) : null}
                </div>

                {/* Mobile: Vertical Master Section Cards */}
                <div className="md:hidden space-y-4">
                    {loading ? (
                        <>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Card
                                    key={i}
                                    className="h-48 animate-pulse bg-gray-200"
                                />
                            ))}
                        </>
                    ) : (
                        masterStepProgress?.masterStepCompletions.map((completion) => (
                            <MasterSectionCard
                                key={completion.masterStepId}
                                masterStepId={completion.masterStepId}
                                completion={completion}
                                completedSubSteps={completedSteps}
                                projectId={projectId}
                                subStepDetails={[]}
                            />
                        ))
                    )}
                </div>

                {/* Analytics Dashboard */}
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Dashboard</CardTitle>
                        <CardDescription>
                            Track your funnel's performance and conversion metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FunnelAnalyticsDashboard projectId={projectId} />
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages" className="mt-6">
                <FunnelPagesView projectId={projectId} username={username} />
            </TabsContent>

            {/* AI Followup Tab */}
            <TabsContent value="followup" className="mt-6">
                <FunnelFollowupView projectId={projectId} />
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-6">
                <FunnelContactsView projectId={projectId} />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-6">
                <FunnelSettingsView projectId={projectId} />
            </TabsContent>
        </Tabs>
    );
}
