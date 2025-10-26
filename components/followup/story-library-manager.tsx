/**
 * Story Library Manager Component
 *
 * Manages proof stories, testimonials, and case studies.
 * Simplified UI for story library management.
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StoryLibraryManager() {
    return (
        <Card className="p-6">
            <div className="mb-4">
                <h2 className="text-2xl font-bold">Story Library</h2>
                <p className="text-gray-600 mt-1">
                    Proof stories, testimonials, and case studies for objection handling
                </p>
            </div>

            <div className="space-y-4">
                <div className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-semibold">ROI in 60 Days</h3>
                            <p className="text-sm text-gray-600">
                                Client recovered investment within 2 months
                            </p>
                        </div>
                        <Badge>Testimonial</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        <div>🎯 Objection: price_concern</div>
                        <div>🏢 Niche: coaching, consulting</div>
                        <div>💰 Price Band: mid</div>
                        <div>📊 Effectiveness: 92.5%</div>
                        <div>📈 Used: 15 times</div>
                    </div>
                </div>

                <div className="text-center text-gray-500 py-4">
                    Stories can be added and managed via API endpoints
                </div>
            </div>
        </Card>
    );
}
