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
        <div className="min-h-screen bg-gradient-to-br gradient-hero">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-16">
                {/* Header */}
                <div className="mb-8 sm:mb-12 text-center">
                    <h1 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground px-2">
                        {page.headline}
                    </h1>
                    {page.subheadline && (
                        <p className="text-lg sm:text-xl text-foreground px-4">
                            {page.subheadline}
                        </p>
                    )}
                </div>

                {/* Registration Form */}
                <Card className="mx-auto max-w-2xl">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                        {/* Benefits */}
                        {bulletPoints.length > 0 && (
                            <div className="mb-6 sm:mb-8">
                                <p className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-foreground">
                                    In this training, you'll discover:
                                </p>
                                <ul className="space-y-2 sm:space-y-3">
                                    {bulletPoints.map(
                                        (bullet: string, index: number) => (
                                            <li
                                                key={index}
                                                className="flex items-start"
                                            >
                                                <CheckCircle className="mr-2 sm:mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                                                <span className="text-sm sm:text-base text-foreground">
                                                    {bullet}
                                                </span>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Form */}
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-4 sm:space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm sm:text-base font-medium text-foreground mb-2"
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
                                    className="text-base min-h-[48px]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm sm:text-base font-medium text-foreground mb-2"
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
                                    className="text-base min-h-[48px]"
                                    autoComplete="email"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full min-h-[52px] text-base sm:text-lg"
                                size="lg"
                            >
                                {isSubmitting
                                    ? "Registering..."
                                    : page.cta_config?.text || "Register Now"}
                            </Button>
                        </form>

                        {/* Trust Statement */}
                        {page.trust_statement && (
                            <p className="mt-6 text-center text-sm text-muted-foreground">
                                {page.trust_statement}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Powered by Genie AI
                </p>
            </div>
        </div>
    );
}
