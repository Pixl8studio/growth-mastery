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
import { HorizontalProgress } from "@/components/funnel/horizontal-progress";
import { FunnelAnalyticsDashboard } from "@/components/funnel/analytics-dashboard";
import { FunnelPagesView } from "@/components/funnel/funnel-pages-view";
import { FunnelFollowupView } from "@/components/funnel/funnel-followup-view";
import { FunnelContactsView } from "@/components/funnel/funnel-contacts-view";
import { FunnelSettingsView } from "@/components/funnel/funnel-settings-view";
import { getStepCompletionStatus } from "@/app/funnel-builder/completion-utils";
import { calculateCompletionPercentage } from "@/app/funnel-builder/completion-types";
import { useEffect } from "react";

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
    const [completionPercentage, setCompletionPercentage] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadCompletionStatus = useCallback(async () => {
        try {
            const status = await getStepCompletionStatus(projectId);
            const percentage = calculateCompletionPercentage(status);
            const completed = status.filter((s) => s.isCompleted).map((s) => s.step);

            setCompletedSteps(completed);
            setCompletionPercentage(percentage);
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
                {/* Horizontal Progress Stepper */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Funnel Progress</CardTitle>
                                <CardDescription>
                                    {loading
                                        ? "Loading..."
                                        : `${completedSteps.length} of 12 steps complete • ${completionPercentage}% done`}
                                </CardDescription>
                            </div>
                            <Link
                                href={`/funnel-builder/${projectId}/step/${currentStep}`}
                            >
                                <Button>Build Funnel</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-24 animate-pulse rounded bg-gray-200" />
                        ) : (
                            <HorizontalProgress
                                projectId={projectId}
                                currentStep={currentStep}
                                completedSteps={completedSteps}
                            />
                        )}
                    </CardContent>
                </Card>

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
