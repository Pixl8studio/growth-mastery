/**
 * Sequence Manager Component
 *
 * Manages follow-up sequences and messages.
 * Simplified UI for sequence configuration.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SequenceManager({ funnelProjectId }: { funnelProjectId: string }) {
    return (
        <Card className="p-6">
            <div className="mb-4">
                <h2 className="text-2xl font-bold">Message Sequences</h2>
                <p className="text-gray-600 mt-1">
                    Configure automated follow-up sequences with personalized messaging
                </p>
            </div>

            <div className="space-y-4">
                <div className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-semibold">3-Day Discount Sequence</h3>
                            <p className="text-sm text-gray-600">
                                5 touches over 72 hours
                            </p>
                        </div>
                        <Badge>Active</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        <div>📨 4 emails + 1 SMS</div>
                        <div>🎯 Targets: Sampler, Engaged, Hot segments</div>
                        <div>⏰ Triggers: Webinar end</div>
                    </div>
                </div>

                <div className="text-center text-gray-500 py-4">
                    Additional sequences can be configured via API or future UI
                    enhancements
                </div>
            </div>
        </Card>
    );
}
