/**
 * AI Followup Dashboard Component
 *
 * Main dashboard with tab navigation for different views:
 * - Dashboard (analytics and metrics)
 * - List (simple list view)
 * - Table (comprehensive table)
 * - Kanban (board view by engagement)
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlobalDashboard } from "./global-dashboard";
import { GlobalProspectList } from "./global-prospect-list";
import { GlobalProspectsTable } from "./global-prospects-table";
import { ProspectsKanban } from "./prospects-kanban";

type ViewMode = "dashboard" | "list" | "table" | "kanban";

interface AIFollowupDashboardProps {
    userId: string;
}

export function AIFollowupDashboard({ userId }: AIFollowupDashboardProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <Card className="p-1">
                <div className="flex gap-1">
                    <Button
                        variant={viewMode === "dashboard" ? "default" : "ghost"}
                        onClick={() => setViewMode("dashboard")}
                        className="flex-1"
                    >
                        📊 Dashboard
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        onClick={() => setViewMode("list")}
                        className="flex-1"
                    >
                        📋 List
                    </Button>
                    <Button
                        variant={viewMode === "table" ? "default" : "ghost"}
                        onClick={() => setViewMode("table")}
                        className="flex-1"
                    >
                        📊 Table
                    </Button>
                    <Button
                        variant={viewMode === "kanban" ? "default" : "ghost"}
                        onClick={() => setViewMode("kanban")}
                        className="flex-1"
                    >
                        🎯 Kanban
                    </Button>
                </div>
            </Card>

            {/* View Content */}
            {viewMode === "dashboard" && <GlobalDashboard userId={userId} />}
            {viewMode === "list" && <GlobalProspectList userId={userId} />}
            {viewMode === "table" && <GlobalProspectsTable userId={userId} />}
            {viewMode === "kanban" && <ProspectsKanban userId={userId} />}
        </div>
    );
}
