"use client";

/**
 * Admin Reports Page
 * Generate and export reports
 */

import { useState } from "react";
import Link from "next/link";
import { logger } from "@/lib/client-logger";

type ReportType =
    | "user_summary"
    | "monthly_billing"
    | "error_report"
    | "engagement_report"
    | "churn_risk";

interface ReportConfig {
    type: ReportType;
    title: string;
    description: string;
    formats: ("pdf" | "csv")[];
}

const REPORTS: ReportConfig[] = [
    {
        type: "user_summary",
        title: "User Summary",
        description: "All users with health scores, usage, and status",
        formats: ["pdf", "csv"],
    },
    {
        type: "monthly_billing",
        title: "Monthly Billing",
        description: "Cost breakdown by user and service",
        formats: ["pdf", "csv"],
    },
    {
        type: "error_report",
        title: "Error Report",
        description: "All errors grouped by type and user",
        formats: ["pdf"],
    },
    {
        type: "engagement_report",
        title: "Engagement Report",
        description: "Login frequency, feature usage, and trends",
        formats: ["pdf"],
    },
    {
        type: "churn_risk",
        title: "Churn Risk",
        description: "At-risk users with recommended actions",
        formats: ["pdf"],
    },
];

export default function AdminReportsPage() {
    const [generating, setGenerating] = useState<string | null>(null);

    const handleGenerateReport = async (
        reportType: ReportType,
        format: "pdf" | "csv"
    ) => {
        const key = `${reportType}_${format}`;
        setGenerating(key);

        try {
            // TODO: Implement actual report generation
            // This would call an API endpoint that generates the report
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Simulate download
            logger.info({ reportType, format }, "Report generated");
            alert(
                `Report "${reportType}" would be generated as ${format.toUpperCase()} and downloaded.`
            );
        } catch (err) {
            logger.error({ error: err }, "Failed to generate report");
        } finally {
            setGenerating(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Generate Reports
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Export data and summaries for analysis and compliance
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {REPORTS.map((report) => (
                    <div
                        key={report.type}
                        className="rounded-lg border border-border bg-card p-4"
                    >
                        <h3 className="font-semibold text-foreground">
                            {report.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {report.description}
                        </p>

                        <div className="mt-4 flex space-x-2">
                            {report.formats.map((format) => (
                                <button
                                    key={format}
                                    onClick={() =>
                                        handleGenerateReport(report.type, format)
                                    }
                                    disabled={generating !== null}
                                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                                >
                                    {generating === `${report.type}_${format}`
                                        ? "Generating..."
                                        : `Export ${format.toUpperCase()}`}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Scheduled Reports Info */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="font-semibold text-foreground">Scheduled Reports</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Super admins can configure automated weekly and monthly report
                    delivery. Go to{" "}
                    <Link
                        href="/settings/admin/settings"
                        className="text-primary hover:underline"
                    >
                        Admin Settings
                    </Link>{" "}
                    to configure.
                </p>
            </div>
        </div>
    );
}
