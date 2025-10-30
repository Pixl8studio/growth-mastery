/**
 * Enrollment Page Template
 * Public sales/enrollment page
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { logger } from "@/lib/client-logger";

interface EnrollmentPageOffer {
    features?: string[];
    bonuses?: string[];
    price?: number;
    tagline?: string;
    guarantee?: string;
}

interface EnrollmentPageData {
    id: string;
    page_type: string;
    headline: string;
    subheadline?: string;
    offers?: EnrollmentPageOffer;
    cta_config?: {
        text?: string;
        url?: string;
    };
}

interface EnrollmentPageProps {
    page: EnrollmentPageData;
}

export function EnrollmentPageTemplate({ page }: EnrollmentPageProps) {
    const offer = page.offers;
    const isBookCall = page.page_type === "book_call";

    const handleCTAClick = () => {
        logger.info(
            { pageId: page.id, pageType: page.page_type },
            "Enrollment CTA clicked"
        );

        if (isBookCall && page.cta_config?.url) {
            // Redirect to calendar
            window.open(page.cta_config.url, "_blank");
        } else {
            // TODO: Initiate payment flow
            alert("Payment integration coming soon!");
        }
    };

    const features = offer?.features || [];
    const bonuses = offer?.bonuses || [];

    return (
        <div className="min-h-screen bg-muted/50">
            <div className="mx-auto max-w-4xl px-4 py-16">
                {/* Header */}
                <div className="mb-12 text-center">
                    <h1 className="mb-4 text-5xl font-bold text-foreground">
                        {page.headline}
                    </h1>
                    {page.subheadline && (
                        <p className="text-xl text-foreground">{page.subheadline}</p>
                    )}
                </div>

                {/* Price */}
                {offer && !isBookCall && (
                    <div className="mb-8 text-center">
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                            Investment:
                        </p>
                        <p className="text-6xl font-bold text-primary">
                            {formatCurrency(offer.price || 0)}
                        </p>
                        {offer.tagline && (
                            <p className="mt-2 text-muted-foreground">
                                {offer.tagline}
                            </p>
                        )}
                    </div>
                )}

                {/* Features */}
                {features.length > 0 && (
                    <Card className="mb-8">
                        <CardContent className="p-8">
                            <h2 className="mb-6 text-2xl font-bold text-foreground">
                                What's Included:
                            </h2>
                            <ul className="space-y-4">
                                {features.map((feature: string, index: number) => (
                                    <li key={index} className="flex items-start">
                                        <CheckCircle className="mr-3 mt-0.5 h-6 w-6 flex-shrink-0 text-green-600" />
                                        <span className="text-lg text-foreground">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {/* Bonuses */}
                {bonuses.length > 0 && (
                    <Card className="mb-8 border-2 border-yellow-300 bg-yellow-50">
                        <CardContent className="p-8">
                            <div className="mb-4 text-center">
                                <Badge variant="warning" className="text-base">
                                    EXCLUSIVE BONUSES
                                </Badge>
                            </div>
                            <ul className="space-y-3">
                                {bonuses.map((bonus: string, index: number) => (
                                    <li key={index} className="flex items-start">
                                        <CheckCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-700" />
                                        <span className="text-foreground">{bonus}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {/* Guarantee */}
                {offer?.guarantee && !isBookCall && (
                    <Card className="mb-8 border-2 border-green-300 bg-green-50">
                        <CardContent className="p-6">
                            <div className="flex items-start">
                                <Shield className="mr-3 h-6 w-6 flex-shrink-0 text-green-600" />
                                <div>
                                    <p className="font-semibold text-green-900">
                                        Our Guarantee:
                                    </p>
                                    <p className="mt-1 text-green-800">
                                        {offer.guarantee}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* CTA */}
                <div className="text-center">
                    <Button
                        size="lg"
                        onClick={handleCTAClick}
                        className="min-w-[300px] text-lg"
                    >
                        {page.cta_config?.text ||
                            (isBookCall ? "Schedule Your Call" : "Get Instant Access")}
                    </Button>
                </div>

                {/* Footer */}
                <p className="mt-12 text-center text-sm text-muted-foreground">
                    Powered by Genie AI
                </p>
            </div>
        </div>
    );
}
