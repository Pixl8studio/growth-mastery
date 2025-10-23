"use client";

/**
 * Step 5: Enrollment Page
 * AI-generated sales page with two types: Direct Purchase or Book Call
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, ShoppingCart, Phone } from "lucide-react";

type PageType = "direct_purchase" | "book_call";

interface FunnelProject {
    id: string;
    name: string;
    current_step: number;
}

interface FunnelOffer {
    id: string;
    name: string;
    price?: number;
}

interface EnrollmentPage {
    id: string;
    page_type: PageType;
    headline: string;
    subheadline?: string;
    cta_config?: {
        text?: string;
        url?: string;
    };
}

export default function Step5Page() {
    const params = useParams();
    const projectId = params.projectId as string;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const [project, setProject] = useState<FunnelProject | null>(null);
    const [offers, setOffers] = useState<FunnelOffer[]>([]);
    const [selectedOfferId, setSelectedOfferId] = useState<string>("");
    const [enrollmentPage, setEnrollmentPage] = useState<EnrollmentPage | null>(null);

    const [pageType, setPageType] = useState<PageType>("direct_purchase");
    const [headline, setHeadline] = useState("");
    const [subheadline, setSubheadline] = useState("");
    const [ctaText, setCtaText] = useState("");
    const [ctaUrl, setCtaUrl] = useState("");

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();

            // Get project
            const { data: projectData } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .single();

            setProject(projectData);

            // Get offers
            const { data: offersData } = await supabase
                .from("offers")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false });

            setOffers(offersData || []);

            if (offersData && offersData.length > 0) {
                setSelectedOfferId(offersData[0].id);
                // Auto-select page type based on price
                const offerPrice = offersData[0].price || 0;
                setPageType(offerPrice >= 2000 ? "book_call" : "direct_purchase");
            }

            // Get existing enrollment page
            const { data: pageData } = await supabase
                .from("enrollment_pages")
                .select("*")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (pageData) {
                setEnrollmentPage(pageData);
                setPageType(pageData.page_type);
                setHeadline(pageData.headline);
                setSubheadline(pageData.subheadline || "");
                setCtaText(pageData.cta_config?.text || "");
                setCtaUrl(pageData.cta_config?.url || "");
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleGenerate = async () => {
        setGenerating(true);
        logger.info(
            { projectId, offerId: selectedOfferId, pageType },
            "Generating enrollment copy"
        );

        try {
            // TODO: Call AI generation API
            // Simulate generation
            if (pageType === "direct_purchase") {
                setHeadline("Transform Your Pitch and Close More Deals");
                setSubheadline(
                    "Join hundreds of founders who've raised millions with compelling pitch decks"
                );
                setCtaText("Get Instant Access Now");
                setCtaUrl("");
            } else {
                setHeadline("Book Your Strategy Session Today");
                setSubheadline(
                    "Let's discuss how we can help you create a pitch that investors can't ignore"
                );
                setCtaText("Schedule Your Free Call");
                setCtaUrl("https://calendly.com/your-calendar");
            }

            logger.info({}, "Enrollment copy generated");
        } catch (err) {
            logger.error({ error: err }, "Failed to generate enrollment copy");
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const pageData = {
                funnel_project_id: projectId,
                user_id: user.id,
                offer_id: selectedOfferId,
                page_type: pageType,
                headline,
                subheadline,
                content_sections: {},
                cta_config: {
                    text: ctaText,
                    url: ctaUrl,
                    type: pageType === "direct_purchase" ? "payment" : "calendar",
                },
            };

            if (enrollmentPage) {
                await supabase
                    .from("enrollment_pages")
                    .update(pageData)
                    .eq("id", enrollmentPage.id);
            } else {
                await supabase.from("enrollment_pages").insert(pageData);
            }

            logger.info({ projectId }, "Enrollment page saved");
            await loadData();
        } catch (err) {
            logger.error({ error: err }, "Failed to save enrollment page");
        } finally {
            setSaving(false);
        }
    };

    const hasOffer = offers.length > 0;
    const hasEnrollmentPage = !!enrollmentPage;

    if (loading) {
        return (
            <StepLayout
                projectId={projectId}
                currentStep={5}
                stepTitle="Enrollment Page"
                stepDescription="Loading..."
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </StepLayout>
        );
    }

    return (
        <StepLayout
            projectId={projectId}
            currentStep={5}
            stepTitle="Enrollment Page"
            stepDescription="Create your sales page with AI-generated copy"
            funnelName={project?.name}
            nextDisabled={!hasEnrollmentPage}
            nextLabel="Continue to Talk Track"
        >
            <div className="space-y-6">
                {/* Dependency Check */}
                {!hasOffer && (
                    <DependencyWarning
                        missingStep={2}
                        missingStepName="Craft Offer"
                        projectId={projectId}
                        message="Create your offer before building the enrollment page"
                    />
                )}

                {hasOffer && (
                    <>
                        {/* Page Type Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Enrollment Page Type</CardTitle>
                                <CardDescription>
                                    Choose based on your offer price
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs
                                    value={pageType}
                                    onValueChange={(v) => setPageType(v as PageType)}
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="direct_purchase">
                                            <ShoppingCart className="mr-2 h-4 w-4" />
                                            Direct Purchase
                                        </TabsTrigger>
                                        <TabsTrigger value="book_call">
                                            <Phone className="mr-2 h-4 w-4" />
                                            Book Call
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent
                                        value="direct_purchase"
                                        className="mt-4"
                                    >
                                        <div className="rounded-md bg-blue-50 p-4">
                                            <p className="text-sm text-blue-900">
                                                <strong>Direct Purchase</strong> - Best
                                                for offers under $2,000
                                            </p>
                                            <p className="mt-1 text-sm text-blue-800">
                                                Full sales page with immediate payment
                                                integration
                                            </p>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="book_call" className="mt-4">
                                        <div className="rounded-md bg-purple-50 p-4">
                                            <p className="text-sm text-purple-900">
                                                <strong>Book Call</strong> - Best for
                                                offers over $2,000
                                            </p>
                                            <p className="mt-1 text-sm text-purple-800">
                                                Streamlined page with calendar booking
                                                integration
                                            </p>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* AI Generation */}
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                                    AI Copy Generation
                                </CardTitle>
                                <CardDescription>
                                    Generate sales copy optimized for{" "}
                                    {pageType === "direct_purchase"
                                        ? "direct purchase"
                                        : "booking calls"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Select Offer</Label>
                                    <Select
                                        value={selectedOfferId}
                                        onValueChange={setSelectedOfferId}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select an offer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {offers.map((offer) => (
                                                <SelectItem
                                                    key={offer.id}
                                                    value={offer.id}
                                                >
                                                    {offer.name} - ${offer.price}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating || !selectedOfferId}
                                    className="w-full"
                                >
                                    {generating
                                        ? "Generating Copy..."
                                        : "Generate Sales Copy"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Copy Editor */}
                        {headline && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Enrollment Page Content</CardTitle>
                                    <CardDescription>
                                        Edit and customize your sales copy
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="headline">Headline *</Label>
                                        <Input
                                            id="headline"
                                            value={headline}
                                            onChange={(e) =>
                                                setHeadline(e.target.value)
                                            }
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="subheadline">Subheadline</Label>
                                        <Textarea
                                            id="subheadline"
                                            value={subheadline}
                                            onChange={(e) =>
                                                setSubheadline(e.target.value)
                                            }
                                            className="mt-1"
                                            rows={2}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="ctaText">
                                            CTA Button Text *
                                        </Label>
                                        <Input
                                            id="ctaText"
                                            value={ctaText}
                                            onChange={(e) => setCtaText(e.target.value)}
                                            placeholder={
                                                pageType === "direct_purchase"
                                                    ? "Get Instant Access"
                                                    : "Book Your Call"
                                            }
                                            className="mt-1"
                                        />
                                    </div>

                                    {pageType === "book_call" && (
                                        <div>
                                            <Label htmlFor="ctaUrl">
                                                Calendar Booking URL *
                                            </Label>
                                            <Input
                                                id="ctaUrl"
                                                type="url"
                                                value={ctaUrl}
                                                onChange={(e) =>
                                                    setCtaUrl(e.target.value)
                                                }
                                                placeholder="https://calendly.com/your-calendar"
                                                className="mt-1"
                                            />
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !headline || !ctaText}
                                        className="w-full"
                                    >
                                        {saving
                                            ? "Saving..."
                                            : hasEnrollmentPage
                                              ? "Update Page"
                                              : "Save Page"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </StepLayout>
    );
}
