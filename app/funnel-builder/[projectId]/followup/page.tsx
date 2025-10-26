/**
 * AI Follow-Up Management Page
 *
 * Main interface for managing AI-powered post-webinar follow-up.
 * Includes prospects, sequences, messages, and story library.
 */

"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProspectList } from "@/components/followup/prospect-list";
import { SequenceManager } from "@/components/followup/sequence-manager";
import { StoryLibraryManager } from "@/components/followup/story-library-manager";

export default function FollowupManagementPage() {
    const params = useParams();
    const projectId = params?.projectId as string;
    const [activeTab, setActiveTab] = useState("prospects");

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">AI Follow-Up Engine</h1>
                <p className="text-gray-600 mt-2">
                    Intelligent, personalized post-webinar engagement automation
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="prospects">Prospects</TabsTrigger>
                    <TabsTrigger value="sequences">Sequences</TabsTrigger>
                    <TabsTrigger value="stories">Story Library</TabsTrigger>
                </TabsList>

                <TabsContent value="prospects" className="mt-6">
                    <ProspectList funnelProjectId={projectId} />
                </TabsContent>

                <TabsContent value="sequences" className="mt-6">
                    <SequenceManager funnelProjectId={projectId} />
                </TabsContent>

                <TabsContent value="stories" className="mt-6">
                    <StoryLibraryManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
