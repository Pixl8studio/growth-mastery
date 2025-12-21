/**
 * Funnel Settings View Component
 *
 * Main settings interface for funnel-level configurations including
 * domain, social integrations, and calendar connections.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Share2, Calendar, Settings, Mail } from "lucide-react";
import { DomainSettings } from "@/components/funnel/settings/domain-settings";
import { SocialIntegrations } from "@/components/funnel/settings/social-integrations";
import { CalendarIntegration } from "@/components/funnel/settings/calendar-integration";
import { EmailDomainSettings } from "@/components/funnel/settings/email-domain-settings";
import { GeneralSettings } from "@/components/funnel/settings/general-settings";

interface FunnelSettingsViewProps {
    projectId: string;
}

export function FunnelSettingsView({ projectId }: FunnelSettingsViewProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Funnel Settings</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Configure domain, social media, and calendar integrations for this
                    funnel
                </p>
            </div>

            <Tabs defaultValue="domain" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="domain">
                        <Globe className="h-4 w-4 mr-2" />
                        Domain
                    </TabsTrigger>
                    <TabsTrigger value="email">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Domain
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

                <TabsContent value="email" className="mt-6">
                    <EmailDomainSettings projectId={projectId} />
                </TabsContent>

                <TabsContent value="social" className="mt-6">
                    <SocialIntegrations projectId={projectId} />
                </TabsContent>

                <TabsContent value="calendar" className="mt-6">
                    <CalendarIntegration projectId={projectId} />
                </TabsContent>

                <TabsContent value="general" className="mt-6">
                    <GeneralSettings projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
