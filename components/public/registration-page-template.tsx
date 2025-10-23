/**
 * Registration Page Template
 * Public registration/lead capture page
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { logger } from "@/lib/client-logger";

interface RegistrationPageData {
    id: string;
    headline: string;
    subheadline?: string;
    benefit_bullets?: string[];
    cta_config?: {
        text?: string;
    };
    trust_statement?: string;
}

interface RegistrationPageProps {
    page: RegistrationPageData;
}

export function RegistrationPageTemplate({ page }: RegistrationPageProps) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            logger.info({ pageId: page.id, email }, "Registration submitted");

            // TODO: Save to contacts and analytics
            // TODO: Send webhook to user's CRM
            // TODO: Get watch page UUID from flow
            // For now, show success message

            // Redirect to watch page (would be from flow in real implementation)
            // router.push(`/watch-page-uuid`);

            alert(`Thanks ${name}! Check your email for next steps.`);
        } catch (err) {
            logger.error({ error: err }, "Registration failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const bulletPoints = page.benefit_bullets || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="mx-auto max-w-4xl px-4 py-16">
                {/* Header */}
                <div className="mb-12 text-center">
                    <h1 className="mb-4 text-5xl font-bold text-gray-900">
                        {page.headline}
                    </h1>
                    {page.subheadline && (
                        <p className="text-xl text-gray-700">{page.subheadline}</p>
                    )}
                </div>

                {/* Registration Form */}
                <Card className="mx-auto max-w-2xl">
                    <CardContent className="p-8">
                        {/* Benefits */}
                        {bulletPoints.length > 0 && (
                            <div className="mb-8">
                                <p className="mb-4 text-lg font-semibold text-gray-900">
                                    In this training, you'll discover:
                                </p>
                                <ul className="space-y-3">
                                    {bulletPoints.map(
                                        (bullet: string, index: number) => (
                                            <li
                                                key={index}
                                                className="flex items-start"
                                            >
                                                <CheckCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                                                <span className="text-gray-700">
                                                    {bullet}
                                                </span>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Full Name
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Email Address
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="mt-1"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                                size="lg"
                            >
                                {isSubmitting
                                    ? "Registering..."
                                    : page.cta_config?.text || "Register Now"}
                            </Button>
                        </form>

                        {/* Trust Statement */}
                        {page.trust_statement && (
                            <p className="mt-6 text-center text-sm text-gray-600">
                                {page.trust_statement}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="mt-8 text-center text-sm text-gray-600">
                    Powered by Genie AI
                </p>
            </div>
        </div>
    );
}
