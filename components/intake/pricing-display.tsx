/**
 * Pricing Display Component
 * Shows extracted pricing information with context and confidence scores
 */

import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";

interface ExtractedPrice {
    amount: number;
    currency: string;
    context: string;
    confidence: "high" | "medium" | "low";
}

interface PricingDisplayProps {
    pricing: ExtractedPrice[] | null | undefined;
}

export function PricingDisplay({ pricing }: PricingDisplayProps) {
    if (!pricing || pricing.length === 0) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                <DollarSign className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>No pricing information detected.</p>
                <p className="mt-2 text-sm">
                    Pricing is automatically extracted from web scraping when available.
                </p>
            </div>
        );
    }

    const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
        const styles = {
            high: "bg-green-100 text-green-800",
            medium: "bg-yellow-100 text-yellow-800",
            low: "bg-red-100 text-red-800",
        };

        return (
            <span
                className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${styles[confidence]}`}
            >
                {confidence}
            </span>
        );
    };

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
        }).format(amount);
    };

    // Sort by confidence and amount
    const sortedPricing = [...pricing].sort((a, b) => {
        const confidenceOrder = { high: 0, medium: 1, low: 2 };
        if (a.confidence !== b.confidence) {
            return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
        }
        return b.amount - a.amount;
    });

    const highestConfidencePrice = sortedPricing.find((p) => p.confidence === "high");

    return (
        <div className="space-y-6">
            {/* Summary Card */}
            {highestConfidencePrice && (
                <Card className="border-2 border-primary/20 bg-primary/5 p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                Most Likely Price
                            </div>
                            <div className="text-3xl font-bold text-foreground">
                                {formatPrice(
                                    highestConfidencePrice.amount,
                                    highestConfidencePrice.currency
                                )}
                            </div>
                            {highestConfidencePrice.context && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                    {highestConfidencePrice.context.slice(0, 100)}
                                    {highestConfidencePrice.context.length > 100 &&
                                        "..."}
                                </div>
                            )}
                        </div>
                        {getConfidenceBadge(highestConfidencePrice.confidence)}
                    </div>
                </Card>
            )}

            {/* All Prices Table */}
            <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground">
                    All Detected Prices ({pricing.length})
                </h3>

                <div className="space-y-3">
                    {sortedPricing.map((price, idx) => (
                        <Card key={idx} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl font-bold text-foreground">
                                            {formatPrice(price.amount, price.currency)}
                                        </div>
                                        {getConfidenceBadge(price.confidence)}
                                    </div>

                                    {price.context && (
                                        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                                            <div className="mb-1 font-medium text-foreground">
                                                Context:
                                            </div>
                                            {price.context}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Pricing Insights */}
            {pricing.length > 1 && (
                <Card className="bg-muted/50 p-4">
                    <h4 className="mb-2 font-semibold text-foreground">
                        Pricing Insights
                    </h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                            Found {pricing.length} price
                            {pricing.length !== 1 ? "s" : ""} on this page
                        </p>
                        <p>
                            Range:{" "}
                            {formatPrice(
                                Math.min(...pricing.map((p) => p.amount)),
                                pricing[0].currency
                            )}{" "}
                            -{" "}
                            {formatPrice(
                                Math.max(...pricing.map((p) => p.amount)),
                                pricing[0].currency
                            )}
                        </p>
                        <p>
                            High confidence prices:{" "}
                            {pricing.filter((p) => p.confidence === "high").length}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
