/**
 * Intake Completion Card Component
 * Shows a success card after intake completion with extracted data summary
 * and clear indication that Step 2 is now accessible
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    CheckCircle,
    ArrowRight,
    FileText,
    Palette,
    DollarSign,
    Eye,
    X,
} from "lucide-react";

interface IntakeSession {
    id: string;
    call_id: string;
    transcript_text: string;
    call_duration: number;
    call_status: string;
    created_at: string;
    extracted_data?: {
        pricing?: Array<{
            amount: number;
            currency: string;
            context: string;
            confidence: "high" | "medium" | "low";
        }>;
    };
    brand_data?: {
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            background: string;
            text: string;
        };
        fonts: {
            primary?: string;
            secondary?: string;
            weights: string[];
        };
        style: {
            borderRadius?: string;
            shadows?: boolean;
            gradients?: boolean;
        };
        confidence: {
            colors: number;
            fonts: number;
            overall: number;
        };
    };
    intake_method: string;
    session_name?: string;
    file_urls?: string[];
    scraped_url?: string;
    metadata?: Record<string, unknown>;
}

interface IntakeCompletionCardProps {
    session: IntakeSession;
    projectId: string;
    onViewDetails?: () => void;
    onDismiss?: () => void;
}

export function IntakeCompletionCard({
    session,
    projectId,
    onViewDetails,
    onDismiss,
}: IntakeCompletionCardProps) {
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed) return null;

    const handleDismiss = () => {
        setIsDismissed(true);
        onDismiss?.();
    };

    const getMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            voice: "Voice Call",
            paste: "Pasted Content",
            upload: "Document Upload",
            scrape: "Web Scraping",
            google_drive: "Google Drive",
            wizard: "Guided Wizard",
            gpt_paste: "GPT Response",
        };
        return labels[method] || "Intake";
    };

    const isSimulatedSession = session.id.startsWith("wizard-");
    const wordCount = session.transcript_text
        ? session.transcript_text.split(/\s+/).length
        : 0;

    const hasBrandData = !!session.brand_data;
    const hasPricing =
        session.extracted_data?.pricing && session.extracted_data.pricing.length > 0;

    return (
        <Card className="relative overflow-hidden border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-lg">
            {/* Dismiss button */}
            <button
                onClick={handleDismiss}
                className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>

            {/* Success header */}
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-green-900">
                        Intake Complete!
                    </h3>
                    <p className="text-sm text-green-700">
                        Your {getMethodLabel(session.intake_method).toLowerCase()} has
                        been processed
                    </p>
                </div>
            </div>

            {/* Data summary - only show for real sessions with content */}
            {!isSimulatedSession && wordCount > 10 && (
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    {/* Content captured */}
                    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Content
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                                {wordCount.toLocaleString()} words
                            </p>
                        </div>
                    </div>

                    {/* Brand data */}
                    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2">
                        <Palette className="h-4 w-4 text-purple-600" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Brand Data
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                                {hasBrandData ? "Extracted" : "Not found"}
                            </p>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Pricing
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                                {hasPricing
                                    ? `${session.extracted_data!.pricing!.length} found`
                                    : "Not found"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Next step callout */}
            <div className="mb-4 rounded-lg border border-green-200 bg-white/80 p-4">
                <p className="mb-1 text-sm font-medium text-green-900">
                    Ready for Step 2: Define Your Offer
                </p>
                <p className="text-sm text-muted-foreground">
                    AI will use your intake data to generate a compelling offer. You can
                    now proceed to the next step.
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                <Link href={`/funnel-builder/${projectId}/step/2`}>
                    <Button className="gap-2 bg-green-600 hover:bg-green-700">
                        Continue to Step 2
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
                {onViewDetails && !isSimulatedSession && (
                    <Button variant="outline" onClick={onViewDetails} className="gap-2">
                        <Eye className="h-4 w-4" />
                        View Full Details
                    </Button>
                )}
            </div>
        </Card>
    );
}
