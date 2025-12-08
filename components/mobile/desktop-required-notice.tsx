"use client";

/**
 * Desktop Required Notice Component
 * Shows when users try to access complex features on mobile
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Mail, ArrowLeft, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DesktopRequiredNoticeProps {
    featureName: string;
    description?: string;
    returnPath?: string;
}

export function DesktopRequiredNotice({
    featureName,
    description = "This feature requires a larger screen for the best experience.",
    returnPath = "/funnel-builder",
}: DesktopRequiredNoticeProps) {
    const [currentUrl, setCurrentUrl] = useState("");

    useEffect(() => {
        requestAnimationFrame(() => {
            setCurrentUrl(window.location.href);
        });
    }, []);

    const handleEmailSelf = () => {
        const subject = encodeURIComponent(
            `Open ${featureName} on Desktop - GrowthMastery.ai`
        );
        const body = encodeURIComponent(
            `Hi there!\n\nYou tried to access ${featureName} on your mobile device. This feature works best on desktop.\n\nOpen this link on your computer:\n${currentUrl}\n\nBest regards,\nGrowthMastery.ai`
        );
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    return (
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
            <Card className="max-w-lg w-full shadow-float">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit">
                        <Monitor className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl md:text-3xl">
                        Desktop Required
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Feature Info */}
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">
                            {featureName}
                        </h3>
                        <p className="text-muted-foreground">{description}</p>
                    </div>

                    {/* Why Desktop Section */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-primary" />
                            Why Desktop?
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>Complex editors need more screen space</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>
                                    Drag-and-drop features work better with a mouse
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>
                                    Multiple panels and tools are easier to navigate
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* What You CAN Do on Mobile */}
                    <div className="bg-accent/10 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-foreground">
                            What You CAN Do on Mobile:
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-accent font-bold">✓</span>
                                <span>View your funnels and projects</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-accent font-bold">✓</span>
                                <span>Create new funnels</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-accent font-bold">✓</span>
                                <span>Manage contacts</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-accent font-bold">✓</span>
                                <span>View analytics and settings</span>
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                        <Button
                            onClick={handleEmailSelf}
                            variant="default"
                            className="w-full h-12"
                            size="lg"
                        >
                            <Mail className="mr-2 h-5 w-5" />
                            Email This Link to Myself
                        </Button>

                        <Link href={returnPath} className="block">
                            <Button variant="outline" className="w-full h-12" size="lg">
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>

                    {/* Helpful Tip */}
                    <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                        <p>
                            💡 Tip: Bookmark this page on your desktop for quick access
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
