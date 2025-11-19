"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { logger } from "@/lib/client-logger";
import type { MetaAdAccount } from "@/types/ads";

interface MetaAccountSelectorProps {
    projectId: string;
    onSelectAccount: (adAccountId: string) => void;
    selectedAccount: string | null;
}

export function MetaAccountSelector({
    projectId,
    onSelectAccount,
    selectedAccount,
}: MetaAccountSelectorProps) {
    const [loading, setLoading] = useState(true);
    const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAdAccounts();
    }, [projectId]);

    const loadAdAccounts = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/ads/accounts?funnel_project_id=${projectId}`
            );

            if (!response.ok) {
                throw new Error("Failed to load ad accounts");
            }

            const data = await response.json();
            setAdAccounts(data.accounts || []);

            // Auto-select first account if only one exists
            if (data.accounts?.length === 1) {
                onSelectAccount(data.accounts[0].meta_ad_account_id);
            }
        } catch (err) {
            logger.error({ error: err }, "Error loading Meta ad accounts");
            setError("Failed to load ad accounts. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                    Loading ad accounts...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
            </div>
        );
    }

    if (adAccounts.length === 0) {
        return (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
                <p className="text-sm text-orange-800">
                    No ad accounts found. Please make sure your Facebook account has
                    access to at least one Meta Ad Account.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Label>Select Meta Ad Account</Label>

            <RadioGroup
                value={selectedAccount || undefined}
                onValueChange={onSelectAccount}
            >
                <div className="space-y-3">
                    {adAccounts.map((account) => (
                        <Card
                            key={account.id}
                            className={`cursor-pointer transition-colors ${
                                selectedAccount === account.meta_ad_account_id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-accent"
                            }`}
                            onClick={() => onSelectAccount(account.meta_ad_account_id)}
                        >
                            <CardContent className="flex items-center gap-4 p-4">
                                <RadioGroupItem
                                    value={account.meta_ad_account_id}
                                    id={account.id}
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Label
                                            htmlFor={account.id}
                                            className="cursor-pointer font-semibold"
                                        >
                                            {account.account_name ||
                                                account.meta_ad_account_id}
                                        </Label>
                                        {account.is_active && (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        ID: {account.meta_ad_account_id} •{" "}
                                        {account.currency} • {account.timezone}
                                    </p>
                                    {account.account_status && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Status: {account.account_status}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </RadioGroup>
        </div>
    );
}
