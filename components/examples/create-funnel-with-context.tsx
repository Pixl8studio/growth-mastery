/**
 * Example: Create Funnel Page with AI Assistant Context
 *
 * This demonstrates how to register page context so the AI assistant
 * can help users fill in the form conversationally.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { usePageContextRegistration } from "@/hooks/use-page-context";
import { PageContext } from "@/lib/ai-assistant/page-context";

export default function CreateFunnelWithContextExample() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [businessNiche, setBusinessNiche] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Register page context for AI assistant
    const pageContext: PageContext = {
        pageId: "create-funnel",
        pageName: "Create New Funnel",
        pageType: "form",
        description:
            "Create a new funnel project to start building your magnetic masterclass",

        step: 1,
        totalSteps: 1,

        forms: [
            {
                id: "create-funnel-form",
                name: "Funnel Creation Form",
                fields: [
                    {
                        id: "name",
                        name: "name",
                        type: "text",
                        label: "Funnel Name",
                        value: name,
                        required: true,
                        placeholder: "My Awesome Funnel",
                        helpText: "A memorable name for your funnel project",
                    },
                    {
                        id: "description",
                        name: "description",
                        type: "textarea",
                        label: "Description",
                        value: description,
                        required: false,
                        placeholder: "What is this funnel about?",
                        helpText: "Brief description of your funnel's purpose",
                    },
                    {
                        id: "targetAudience",
                        name: "targetAudience",
                        type: "text",
                        label: "Target Audience",
                        value: targetAudience,
                        required: false,
                        placeholder: "e.g., Small business owners",
                        helpText: "Who is this funnel designed for?",
                    },
                    {
                        id: "businessNiche",
                        name: "businessNiche",
                        type: "text",
                        label: "Business Niche",
                        value: businessNiche,
                        required: false,
                        placeholder: "e.g., Digital Marketing",
                        helpText: "What industry or niche does this serve?",
                    },
                ],
            },
        ],

        actions: [
            {
                id: "create_funnel",
                label: "Create Funnel",
                description: "Create the funnel project with provided information",
                handler: async (params?: { autoNavigate?: boolean }) => {
                    setIsCreating(true);
                    try {
                        // Actual creation logic would go here
                        await new Promise((resolve) => setTimeout(resolve, 1000));

                        if (params?.autoNavigate) {
                            router.push("/funnel-builder");
                        }
                    } finally {
                        setIsCreating(false);
                    }
                },
                parameters: [
                    {
                        name: "autoNavigate",
                        type: "boolean",
                        required: false,
                        description:
                            "Automatically navigate to funnel builder after creation",
                    },
                ],
            },
        ],

        helpTopics: [
            "How to choose a good funnel name",
            "What makes a compelling description",
            "Defining your target audience",
            "Selecting the right business niche",
            "What happens after creating a funnel",
        ],

        commonQuestions: [
            "Can I change the funnel name later?",
            "Do I need to fill in all fields?",
            "What's the difference between target audience and business niche?",
            "How long does it take to create a funnel?",
        ],
    };

    usePageContextRegistration(pageContext);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert("Please enter a funnel name");
            return;
        }

        setIsCreating(true);
        try {
            // Actual creation logic
            await new Promise((resolve) => setTimeout(resolve, 1000));
            router.push("/funnel-builder");
        } catch (error) {
            console.error("Failed to create funnel:", error);
            alert("Failed to create funnel. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Funnel</CardTitle>
                    <CardDescription>
                        Start building your magnetic masterclass funnel. The AI
                        assistant can help you fill in these fields!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="name">
                                Funnel Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Awesome Funnel"
                                required
                                className="mt-1"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                A memorable name for your funnel project
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this funnel about?"
                                rows={3}
                                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Brief description of your funnel's purpose
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="targetAudience">Target Audience</Label>
                            <Input
                                id="targetAudience"
                                type="text"
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="e.g., Small business owners"
                                className="mt-1"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Who is this funnel designed for?
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="businessNiche">Business Niche</Label>
                            <Input
                                id="businessNiche"
                                type="text"
                                value={businessNiche}
                                onChange={(e) => setBusinessNiche(e.target.value)}
                                placeholder="e.g., Digital Marketing"
                                className="mt-1"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                What industry or niche does this serve?
                            </p>
                        </div>

                        <Button type="submit" disabled={isCreating} className="w-full">
                            {isCreating ? "Creating..." : "Create Funnel"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Hint about AI assistant */}
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary">
                    💡 <strong>Tip:</strong> Click the AI assistant button in the
                    bottom-right corner! The AI can help you fill in these fields by
                    asking you questions about your business naturally.
                </p>
            </div>
        </div>
    );
}
