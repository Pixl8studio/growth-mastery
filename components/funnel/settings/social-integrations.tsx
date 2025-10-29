/**
 * Social Integrations Component
 *
 * Container for all social media integrations (Facebook, Instagram, X, Gmail).
 */

"use client";

import { FacebookIntegration } from "@/components/funnel/settings/facebook-integration";
import { InstagramIntegration } from "@/components/funnel/settings/instagram-integration";
import { TwitterIntegration } from "@/components/funnel/settings/twitter-integration";
import { GmailIntegration } from "@/components/funnel/settings/gmail-integration";

interface SocialIntegrationsProps {
    projectId: string;
}

export function SocialIntegrations({ projectId }: SocialIntegrationsProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">
                    Social Media Integrations
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                    Connect your social media accounts to enable posting and engagement
                    features
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <FacebookIntegration projectId={projectId} />
                <InstagramIntegration projectId={projectId} />
                <TwitterIntegration projectId={projectId} />
                <GmailIntegration projectId={projectId} />
            </div>
        </div>
    );
}
