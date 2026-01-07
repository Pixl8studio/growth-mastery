"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";

interface OfferData {
    name: string;
    description: string | null;
    price: number | string;
    currency: string;
    features: string[];
    bonuses: string[];
    guarantee?: string | null;
    // Irresistible Offer Framework
    promise?: string;
    person?: string;
    process?: string;
    purpose?: string;
    pathway?: "book_call" | "direct_purchase";
    max_features?: number;
    max_bonuses?: number;
}

interface OfferEditorProps {
    initialOffer: OfferData;
    onSave?: (updates: Partial<OfferData>) => Promise<void>;
    readOnly?: boolean;
}

type TabType = "core" | "framework" | "features";

export function OfferEditor({
    initialOffer,
    onSave,
    readOnly = false,
}: OfferEditorProps) {
    const [offer, setOffer] = useState<OfferData>(initialOffer);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("core");

    const features = offer.features || [];
    const bonuses = offer.bonuses || [];
    const guarantee = offer.guarantee || "";
    const maxFeatures = offer.max_features || 6;
    const maxBonuses = offer.max_bonuses || 5;

    const priceNum =
        typeof offer.price === "string" ? parseFloat(offer.price) : offer.price;
    const suggestedPathway = priceNum >= 2000 ? "book_call" : "direct_purchase";

    const handleAddFeature = () => {
        if (features.length >= maxFeatures) return;
        setOffer({
            ...offer,
            features: [...features, "New feature"],
        });
    };

    const handleUpdateFeature = (index: number, value: string) => {
        const newFeatures = [...features];
        newFeatures[index] = value;
        setOffer({
            ...offer,
            features: newFeatures,
        });
    };

    const handleRemoveFeature = (index: number) => {
        const newFeatures = features.filter((_, i) => i !== index);
        setOffer({
            ...offer,
            features: newFeatures,
        });
    };

    const handleAddBonus = () => {
        if (bonuses.length >= maxBonuses) return;
        setOffer({
            ...offer,
            bonuses: [...bonuses, "Bonus item"],
        });
    };

    const handleUpdateBonus = (index: number, value: string) => {
        const newBonuses = [...bonuses];
        newBonuses[index] = value;
        setOffer({
            ...offer,
            bonuses: newBonuses,
        });
    };

    const handleRemoveBonus = (index: number) => {
        const newBonuses = bonuses.filter((_, i) => i !== index);
        setOffer({
            ...offer,
            bonuses: newBonuses,
        });
    };

    const handleSave = async () => {
        if (!onSave || readOnly) return;

        setSaving(true);
        try {
            await onSave({
                name: offer.name,
                description: offer.description,
                price:
                    typeof offer.price === "string"
                        ? parseFloat(offer.price)
                        : offer.price,
                features: offer.features,
                bonuses: offer.bonuses,
                guarantee: offer.guarantee,
                promise: offer.promise,
                person: offer.person,
                process: offer.process,
                purpose: offer.purpose,
                pathway: offer.pathway,
            });
        } catch (error) {
            logger.error({ error }, "Failed to save offer");
            alert("Failed to save offer. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: "core" as TabType, label: "Core Offer", emoji: "💰" },
        {
            id: "framework" as TabType,
            label: "Irresistible Offer Framework",
            emoji: "🎯",
        },
        { id: "features" as TabType, label: "Features & Bonuses", emoji: "✨" },
    ];

    return (
        <div className="space-y-6">
            {/* Save Button */}
            {!readOnly && (
                <div className="sticky top-0 z-10 flex items-center justify-end rounded-lg border border-border bg-card p-4 shadow-soft">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Offer"}
                    </Button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex space-x-2 border-b border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                            activeTab === tab.id
                                ? "border-b-2 border-primary text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <span>{tab.emoji}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {/* CORE OFFER TAB */}
                {activeTab === "core" && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <h3 className="mb-4 text-lg font-semibold text-foreground">
                                Basic Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Offer Name
                                    </label>
                                    <input
                                        type="text"
                                        value={offer.name}
                                        onChange={(e) =>
                                            setOffer({ ...offer, name: e.target.value })
                                        }
                                        disabled={readOnly}
                                        className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                        placeholder="Ultimate Transformation Program"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Tagline/Description
                                    </label>
                                    <input
                                        type="text"
                                        value={offer.description || ""}
                                        onChange={(e) =>
                                            setOffer({
                                                ...offer,
                                                description: e.target.value,
                                            })
                                        }
                                        disabled={readOnly}
                                        className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                        placeholder="Get results in 30 days or your money back"
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">
                                            Price
                                        </label>
                                        <input
                                            type="number"
                                            value={offer.price}
                                            onChange={(e) => {
                                                const newPrice = e.target.value;
                                                const newPathway =
                                                    parseFloat(newPrice) >= 2000
                                                        ? "book_call"
                                                        : "direct_purchase";
                                                setOffer({
                                                    ...offer,
                                                    price: newPrice,
                                                    pathway:
                                                        offer.pathway || newPathway,
                                                });
                                            }}
                                            disabled={readOnly}
                                            className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                            placeholder="997"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">
                                            Currency
                                        </label>
                                        <input
                                            type="text"
                                            value={offer.currency}
                                            onChange={(e) =>
                                                setOffer({
                                                    ...offer,
                                                    currency: e.target.value,
                                                })
                                            }
                                            disabled={readOnly}
                                            className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                            placeholder="USD"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pathway Selection */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <h3 className="mb-4 text-lg font-semibold text-foreground">
                                Purchase Pathway
                            </h3>
                            <div className="space-y-4">
                                <div className="rounded-lg bg-primary/5 p-4">
                                    <p className="text-sm text-primary">
                                        💡 <strong>Suggested:</strong>{" "}
                                        {suggestedPathway === "book_call"
                                            ? "Book Call"
                                            : "Direct Purchase"}{" "}
                                        based on your price point (${priceNum})
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="pathway"
                                            value="direct_purchase"
                                            checked={
                                                offer.pathway === "direct_purchase"
                                            }
                                            onChange={(e) =>
                                                setOffer({
                                                    ...offer,
                                                    pathway: e.target.value as any,
                                                })
                                            }
                                            disabled={readOnly}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="font-medium text-foreground">
                                                Direct Purchase
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Self-serve enrollment • Best for offers
                                                under $2,000 • 1.5-10% conversion •
                                                Fully automated
                                            </div>
                                        </div>
                                    </label>

                                    <label className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="pathway"
                                            value="book_call"
                                            checked={offer.pathway === "book_call"}
                                            onChange={(e) =>
                                                setOffer({
                                                    ...offer,
                                                    pathway: e.target.value as any,
                                                })
                                            }
                                            disabled={readOnly}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="font-medium text-foreground">
                                                Book Call
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                High-touch sales • Best for offers
                                                $2,000+ • 20-50% close rate on calls •
                                                Requires sales team
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* IRRESISTIBLE OFFER FRAMEWORK TAB */}
                {activeTab === "framework" && (
                    <div className="space-y-6">
                        {/* Promise */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                Promise - The Transformation
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                The clear, measurable outcome your client will achieve.
                                Be specific and emotionally resonant.
                            </p>
                            <textarea
                                value={offer.promise || ""}
                                onChange={(e) =>
                                    setOffer({ ...offer, promise: e.target.value })
                                }
                                disabled={readOnly}
                                rows={3}
                                className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                placeholder="You'll launch a profitable online course in 90 days, generating your first $10k in revenue while working just 2 hours per day."
                            />
                        </div>

                        {/* Person */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                Person - The Ideal Client
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Narrowly defined ideal client actively experiencing the
                                problem and ready to take action.
                            </p>
                            <textarea
                                value={offer.person || ""}
                                onChange={(e) =>
                                    setOffer({ ...offer, person: e.target.value })
                                }
                                disabled={readOnly}
                                rows={3}
                                className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                placeholder="Experienced coaches and consultants who have proven expertise but struggle to package and scale their knowledge into a digital product."
                            />
                        </div>

                        {/* Process */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                Process - The Method
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Your unique method, system, or framework that delivers
                                the promised outcome. This builds confidence.
                            </p>
                            <textarea
                                value={offer.process || ""}
                                onChange={(e) =>
                                    setOffer({ ...offer, process: e.target.value })
                                }
                                disabled={readOnly}
                                rows={3}
                                className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                placeholder="The 5-Phase Launch Framework: Extract (knowledge capture), Structure (curriculum design), Create (content production), Market (audience building), and Launch (sales execution)."
                            />
                        </div>

                        {/* Purpose */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                Purpose - The Deeper Why
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                The mission or belief fueling your work. This connects
                                emotionally and attracts aligned clients.
                            </p>
                            <textarea
                                value={offer.purpose || ""}
                                onChange={(e) =>
                                    setOffer({ ...offer, purpose: e.target.value })
                                }
                                disabled={readOnly}
                                rows={3}
                                className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                placeholder="We believe experts deserve to be rewarded for their knowledge, not trapped trading time for money. Online courses create freedom, impact, and legacy."
                            />
                        </div>
                    </div>
                )}

                {/* FEATURES & BONUSES TAB */}
                {activeTab === "features" && (
                    <div className="space-y-6">
                        {/* Features */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Features
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {features.length} of {maxFeatures} features (3-6
                                        recommended)
                                    </p>
                                </div>
                                {!readOnly && features.length < maxFeatures && (
                                    <Button
                                        onClick={handleAddFeature}
                                        size="sm"
                                        variant="outline"
                                    >
                                        + Add Feature
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {features.map((feature, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <input
                                            type="text"
                                            value={feature}
                                            onChange={(e) =>
                                                handleUpdateFeature(idx, e.target.value)
                                            }
                                            disabled={readOnly}
                                            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                        />
                                        {!readOnly && (
                                            <Button
                                                onClick={() => handleRemoveFeature(idx)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {features.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">
                                        No features yet. Add your first feature above.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Bonuses */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Bonuses
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {bonuses.length} of {maxBonuses} bonuses (3-5
                                        recommended)
                                    </p>
                                </div>
                                {!readOnly && bonuses.length < maxBonuses && (
                                    <Button
                                        onClick={handleAddBonus}
                                        size="sm"
                                        variant="outline"
                                    >
                                        + Add Bonus
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {bonuses.map((bonus, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <input
                                            type="text"
                                            value={bonus}
                                            onChange={(e) =>
                                                handleUpdateBonus(idx, e.target.value)
                                            }
                                            disabled={readOnly}
                                            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                        />
                                        {!readOnly && (
                                            <Button
                                                onClick={() => handleRemoveBonus(idx)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {bonuses.length === 0 && (
                                    <p className="text-center text-muted-foreground py-4">
                                        No bonuses yet. Add your first bonus above.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Guarantee (Proof) */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                Guarantee (Proof)
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Strong risk reversal that removes all objections. Be
                                specific, not generic.
                            </p>
                            <textarea
                                value={guarantee}
                                onChange={(e) =>
                                    setOffer({
                                        ...offer,
                                        guarantee: e.target.value,
                                    })
                                }
                                disabled={readOnly}
                                rows={3}
                                className="w-full rounded-lg border border-border bg-card px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted"
                                placeholder="100% money-back guarantee within 30 days. No questions asked."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
