"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Users, Target, DollarSign } from "lucide-react";

interface AudienceBuilderProps {
    projectId: string;
    onConfigured: (config: any, budget: number) => void;
    initialBudget?: number;
}

export function AudienceBuilder({
    projectId,
    onConfigured,
    initialBudget = 1000,
}: AudienceBuilderProps) {
    const [audienceType, setAudienceType] = useState<"interest" | "lookalike">(
        "interest"
    );
    const [idealCustomer, setIdealCustomer] = useState("");
    const [customerList, setCustomerList] = useState<File | null>(null);
    const [dailyBudget, setDailyBudget] = useState(initialBudget);
    const [estimatedReach, setEstimatedReach] = useState<{
        lower: number;
        upper: number;
    } | null>(null);

    // Function must be declared before useEffect that calls it
    const configureInterestAudience = () => {
        const config = {
            type: "interest",
            description: idealCustomer,
            targeting: {
                geo_locations: {
                    countries: ["US"],
                },
                age_min: 25,
                age_max: 65,
            },
        };

        onConfigured(config, dailyBudget);
        setEstimatedReach({ lower: 50000, upper: 200000 }); // Mock estimate
    };

    // Auto-configure when inputs change
    useEffect(() => {
        if (audienceType === "interest" && idealCustomer.trim()) {
            requestAnimationFrame(() => {
                configureInterestAudience();
            });
        }
    }, [idealCustomer, audienceType, configureInterestAudience]);

    const handleBudgetChange = (value: number[]) => {
        const newBudget = value[0];
        setDailyBudget(newBudget);

        if (audienceType === "interest" && idealCustomer.trim()) {
            configureInterestAudience();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCustomerList(file);

            const config = {
                type: "lookalike",
                source_file: file.name,
                targeting: {
                    geo_locations: {
                        countries: ["US"],
                    },
                },
            };

            onConfigured(config, dailyBudget);
            setEstimatedReach({ lower: 100000, upper: 500000 }); // Mock estimate
        }
    };

    return (
        <div className="space-y-6">
            {/* Audience Type Selection */}
            <div>
                <Label className="mb-3 block">Audience Type</Label>
                <RadioGroup
                    value={audienceType}
                    onValueChange={(v: any) => setAudienceType(v)}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card
                            className={`cursor-pointer transition-colors ${
                                audienceType === "interest"
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-accent"
                            }`}
                            onClick={() => setAudienceType("interest")}
                        >
                            <CardContent className="flex items-start gap-3 p-4">
                                <RadioGroupItem
                                    value="interest"
                                    id="interest"
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label
                                        htmlFor="interest"
                                        className="cursor-pointer font-semibold"
                                    >
                                        <Target className="inline h-4 w-4 mr-1" />
                                        Interest Targeting
                                    </Label>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Describe your ideal customer and we'll suggest
                                        targeting options
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-colors ${
                                audienceType === "lookalike"
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-accent"
                            }`}
                            onClick={() => setAudienceType("lookalike")}
                        >
                            <CardContent className="flex items-start gap-3 p-4">
                                <RadioGroupItem
                                    value="lookalike"
                                    id="lookalike"
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <Label
                                        htmlFor="lookalike"
                                        className="cursor-pointer font-semibold"
                                    >
                                        <Users className="inline h-4 w-4 mr-1" />
                                        Lookalike Audience
                                    </Label>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Upload a customer list to find similar people
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </RadioGroup>
            </div>

            {/* Interest Targeting Input */}
            {audienceType === "interest" && (
                <div>
                    <Label htmlFor="idealCustomer">Describe Your Ideal Customer</Label>
                    <Textarea
                        id="idealCustomer"
                        placeholder="E.g., Business owners aged 30-50 interested in digital marketing, entrepreneurship, and online courses..."
                        value={idealCustomer}
                        onChange={(e) => setIdealCustomer(e.target.value)}
                        className="mt-2"
                        rows={4}
                    />
                    <p className="mt-2 text-sm text-muted-foreground">
                        Our AI will analyze this and create precise targeting parameters
                    </p>
                </div>
            )}

            {/* Lookalike Audience Upload */}
            {audienceType === "lookalike" && (
                <div>
                    <Label htmlFor="customerList">Upload Customer List</Label>
                    <div className="mt-2">
                        <Input
                            id="customerList"
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                            className="cursor-pointer"
                        />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Upload a CSV with email addresses or phone numbers. We'll create
                        a lookalike audience of 1-2% similarity.
                    </p>
                    {customerList && (
                        <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3">
                            <p className="text-sm text-green-800">
                                ✓ File uploaded: {customerList.name}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Budget Configuration */}
            <div className="space-y-4">
                <div>
                    <Label>Daily Budget: ${(dailyBudget / 100).toFixed(2)}/day</Label>
                    <Slider
                        value={[dailyBudget]}
                        onValueChange={handleBudgetChange}
                        min={500}
                        max={10000}
                        step={100}
                        className="mt-4"
                    />
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>$5/day</span>
                        <span>$100/day</span>
                    </div>
                </div>

                {/* Budget Projection */}
                <Card className="bg-accent/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">
                                Budget Projection
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Daily</p>
                                <p className="font-semibold">
                                    ${(dailyBudget / 100).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Weekly</p>
                                <p className="font-semibold">
                                    ${((dailyBudget * 7) / 100).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Monthly</p>
                                <p className="font-semibold">
                                    ${((dailyBudget * 30) / 100).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Estimated Reach */}
            {estimatedReach && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">
                                Estimated Reach
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {estimatedReach.lower.toLocaleString()} -{" "}
                            {estimatedReach.upper.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            People who could see your ads based on this targeting
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
