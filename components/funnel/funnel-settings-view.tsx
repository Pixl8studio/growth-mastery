/**
 * Funnel Settings View Component
 *
 * Main settings interface for funnel-level configurations including
 * domain, social integrations, and calendar connections.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Share2, Calendar, Settings } from "lucide-react";
import { DomainSettings } from "@/components/funnel/settings/domain-settings";
import { SocialIntegrations } from "@/components/funnel/settings/social-integrations";
import { CalendarIntegration } from "@/components/funnel/settings/calendar-integration";

interface FunnelSettingsViewProps {
    projectId: string;
}

export function FunnelSettingsView({ projectId }: FunnelSettingsViewProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Funnel Settings</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Configure domain, social media, and calendar integrations for this
                    funnel
                </p>
            </div>

            <Tabs defaultValue="domain" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="domain">
                        <Globe className="h-4 w-4 mr-2" />
                        Domain
                    </TabsTrigger>
                    <TabsTrigger value="social">
                        <Share2 className="h-4 w-4 mr-2" />
                        Social Media
                    </TabsTrigger>
                    <TabsTrigger value="calendar">
                        <Calendar className="h-4 w-4 mr-2" />
                        Calendar
                    </TabsTrigger>
                    <TabsTrigger value="general">
                        <Settings className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="domain" className="mt-6">
                    <DomainSettings projectId={projectId} />
                </TabsContent>

                <TabsContent value="social" className="mt-6">
                    <SocialIntegrations projectId={projectId} />
                </TabsContent>

                <TabsContent value="calendar" className="mt-6">
                    <CalendarIntegration projectId={projectId} />
                </TabsContent>

                <TabsContent value="general" className="mt-6">
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">
                            General Settings
                        </h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Additional funnel settings coming soon
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
