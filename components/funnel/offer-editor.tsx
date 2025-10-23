"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface OfferData {
    name: string;
    description: string | null;
    price: number | string;
    currency: string;
    features: {
        features?: string[];
        bonuses?: string[];
        guarantee?: string;
    };
}

interface OfferEditorProps {
    initialOffer: OfferData;
    onSave?: (updates: Partial<OfferData>) => Promise<void>;
    readOnly?: boolean;
}

export function OfferEditor({
    initialOffer,
    onSave,
    readOnly = false,
}: OfferEditorProps) {
    const [offer, setOffer] = useState<OfferData>(initialOffer);
    const [saving, setSaving] = useState(false);

    const features = offer.features.features || [];
    const bonuses = offer.features.bonuses || [];
    const guarantee = offer.features.guarantee || "";

    const handleAddFeature = () => {
        setOffer({
            ...offer,
            features: {
                ...offer.features,
                features: [...features, "New feature"],
            },
        });
    };

    const handleUpdateFeature = (index: number, value: string) => {
        const newFeatures = [...features];
        newFeatures[index] = value;
        setOffer({
            ...offer,
            features: {
                ...offer.features,
                features: newFeatures,
            },
        });
    };

    const handleRemoveFeature = (index: number) => {
        const newFeatures = features.filter((_, i) => i !== index);
        setOffer({
            ...offer,
            features: {
                ...offer.features,
                features: newFeatures,
            },
        });
    };

    const handleAddBonus = () => {
        setOffer({
            ...offer,
            features: {
                ...offer.features,
                bonuses: [...bonuses, "Bonus item"],
            },
        });
    };

    const handleUpdateBonus = (index: number, value: string) => {
        const newBonuses = [...bonuses];
        newBonuses[index] = value;
        setOffer({
            ...offer,
            features: {
                ...offer.features,
                bonuses: newBonuses,
            },
        });
    };

    const handleRemoveBonus = (index: number) => {
        const newBonuses = bonuses.filter((_, i) => i !== index);
        setOffer({
            ...offer,
            features: {
                ...offer.features,
                bonuses: newBonuses,
            },
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
            });
        } catch (error) {
            alert("Failed to save offer. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Save Button */}
            {!readOnly && (
                <div className="sticky top-0 z-10 flex items-center justify-end rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Offer"}
                    </Button>
                </div>
            )}

            {/* Offer Name & Price */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Offer Details
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Offer Name
                        </label>
                        <input
                            type="text"
                            value={offer.name}
                            onChange={(e) =>
                                setOffer({ ...offer, name: e.target.value })
                            }
                            disabled={readOnly}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            placeholder="Ultimate Transformation Program"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Tagline/Description
                        </label>
                        <input
                            type="text"
                            value={offer.description || ""}
                            onChange={(e) =>
                                setOffer({ ...offer, description: e.target.value })
                            }
                            disabled={readOnly}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            placeholder="Get results in 30 days or your money back"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Price
                            </label>
                            <input
                                type="number"
                                value={offer.price}
                                onChange={(e) =>
                                    setOffer({ ...offer, price: e.target.value })
                                }
                                disabled={readOnly}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                placeholder="997"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Currency
                            </label>
                            <input
                                type="text"
                                value={offer.currency}
                                onChange={(e) =>
                                    setOffer({ ...offer, currency: e.target.value })
                                }
                                disabled={readOnly}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                placeholder="USD"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Features</h3>
                    {!readOnly && (
                        <Button onClick={handleAddFeature} size="sm" variant="outline">
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
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                </div>
            </div>

            {/* Bonuses */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Bonuses</h3>
                    {!readOnly && (
                        <Button onClick={handleAddBonus} size="sm" variant="outline">
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
                                onChange={(e) => handleUpdateBonus(idx, e.target.value)}
                                disabled={readOnly}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                </div>
            </div>

            {/* Guarantee */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Guarantee</h3>
                <textarea
                    value={guarantee}
                    onChange={(e) =>
                        setOffer({
                            ...offer,
                            features: {
                                ...offer.features,
                                guarantee: e.target.value,
                            },
                        })
                    }
                    disabled={readOnly}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="100% money-back guarantee within 30 days. No questions asked."
                />
            </div>
        </div>
    );
}
