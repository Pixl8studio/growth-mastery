/**
 * Compliance Validator Component
 * Validation component for preflight checks
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Shield } from "lucide-react";

interface ValidationResult {
    passed: boolean;
    compliance_check: "pass" | "fail" | "pending";
    accessibility_check: "pass" | "fail" | "pending";
    brand_voice_check: "pass" | "fail" | "pending";
    character_limit_check: "pass" | "fail" | "pending";
    issues: Array<{
        type: string;
        message: string;
        severity: "error" | "warning" | "info";
    }>;
}

interface ComplianceValidatorProps {
    variantId?: string;
    content?: {
        copy_text: string;
        platform: string;
        hashtags?: string[];
        alt_text?: string;
    };
    onValidationComplete?: (result: ValidationResult) => void;
    embedded?: boolean;
}

export function ComplianceValidator({
    variantId,
    content,
    onValidationComplete,
    embedded = false,
}: ComplianceValidatorProps) {
    const { toast } = useToast();
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<ValidationResult | null>(null);

    const runValidation = async () => {
        setValidating(true);

        try {
            let response;

            if (variantId) {
                // Validate existing variant via API
                response = await fetch(`/api/marketing/validate/${variantId}`, {
                    method: "POST",
                });
            } else if (content) {
                // Validate content directly
                response = await fetch("/api/marketing/validate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(content),
                });
            } else {
                throw new Error("No variant ID or content provided");
            }

            const data = await response.json();

            if (data.success) {
                setResult(data.validation_result);
                if (onValidationComplete) {
                    onValidationComplete(data.validation_result);
                }

                if (data.validation_result.passed) {
                    toast({
                        title: "Validation Passed",
                        description: "All checks passed successfully",
                    });
                } else {
                    toast({
                        title: "Validation Issues Found",
                        description: `${data.validation_result.issues.length} issues detected`,
                        variant: "destructive",
                    });
                }
            } else {
                throw new Error(data.error || "Validation failed");
            }
        } catch (error) {
            logger.error({ error }, "Validation failed");
            toast({
                title: "Validation Error",
                description:
                    error instanceof Error ? error.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setValidating(false);
        }
    };

    const getCheckIcon = (status: "pass" | "fail" | "pending") => {
        switch (status) {
            case "pass":
                return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case "fail":
                return <XCircle className="h-5 w-5 text-red-600" />;
            case "pending":
                return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getSeverityColor = (severity: "error" | "warning" | "info"): string => {
        switch (severity) {
            case "error":
                return "text-red-600 bg-red-50 border-red-200";
            case "warning":
                return "text-orange-600 bg-orange-50 border-orange-200";
            case "info":
                return "text-primary bg-primary/5 border-primary/20";
        }
    };

    const WrapperComponent = embedded ? "div" : Card;
    const wrapperProps = embedded ? {} : { className: "p-4" };

    return (
        <WrapperComponent {...wrapperProps}>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-500" />
                        <h3 className="font-semibold">Preflight Validation</h3>
                    </div>
                    <Button
                        onClick={runValidation}
                        disabled={validating}
                        size="sm"
                        variant="outline"
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${validating ? "animate-spin" : ""}`}
                        />
                        {validating ? "Validating..." : "Run Validation"}
                    </Button>
                </div>

                {result && (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <span className="text-sm font-medium">
                                    Compliance Check
                                </span>
                                {getCheckIcon(result.compliance_check)}
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <span className="text-sm font-medium">
                                    Accessibility Check
                                </span>
                                {getCheckIcon(result.accessibility_check)}
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <span className="text-sm font-medium">
                                    Brand Voice Check
                                </span>
                                {getCheckIcon(result.brand_voice_check)}
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <span className="text-sm font-medium">
                                    Character Limit Check
                                </span>
                                {getCheckIcon(result.character_limit_check)}
                            </div>
                        </div>

                        {result.issues.length > 0 && (
                            <div className="pt-3 border-t">
                                <h4 className="text-sm font-semibold mb-2">
                                    Issues ({result.issues.length})
                                </h4>
                                <div className="space-y-2">
                                    {result.issues.map((issue, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded border text-sm ${getSeverityColor(issue.severity)}`}
                                        >
                                            <div className="font-medium mb-1">
                                                {issue.type}
                                            </div>
                                            <div className="text-xs">
                                                {issue.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.passed && result.issues.length === 0 && (
                            <div className="p-4 rounded bg-green-50 border border-green-200 text-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm font-medium text-green-900">
                                    All Validation Checks Passed
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                    This content is ready for publishing
                                </p>
                            </div>
                        )}
                    </>
                )}

                {!result && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">
                            Click "Run Validation" to check content
                        </p>
                    </div>
                )}
            </div>
        </WrapperComponent>
    );
}
