/**
 * Story Library Component
 *
 * Manage proof stories, testimonials, and micro-stories indexed by
 * objection category, business niche, and price band.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Star, TrendingUp } from "lucide-react";

interface StoryEntry {
    id: string;
    user_id: string;
    title: string;
    story_type: "micro_story" | "proof_element" | "testimonial" | "case_study";
    objection_category: string;
    business_niche: string[];
    price_band: "low" | "mid" | "high";
    content: string;
    effectiveness_score?: number;
    times_used: number;
    conversion_rate?: number;
    created_at: string;
}

interface StoryLibraryProps {
    stories: StoryEntry[];
    onCreateStory: (story: Partial<StoryEntry>) => Promise<void>;
    onUpdateStory: (id: string, updates: Partial<StoryEntry>) => Promise<void>;
    onDeleteStory: (id: string) => Promise<void>;
}

const OBJECTION_CATEGORIES = [
    "price_concern",
    "timing_concern",
    "need_justification",
    "competitor_comparison",
    "trust_building",
    "implementation_worry",
    "results_skepticism",
];

const STORY_TYPES = [
    {
        value: "micro_story",
        label: "Micro Story",
        description: "Short 2-3 sentence story",
    },
    {
        value: "proof_element",
        label: "Proof Element",
        description: "Data point or metric",
    },
    {
        value: "testimonial",
        label: "Testimonial",
        description: "Customer quote",
    },
    {
        value: "case_study",
        label: "Case Study",
        description: "Full success story",
    },
];

export function StoryLibrary({
    stories,
    onCreateStory,
    onUpdateStory,
    onDeleteStory,
}: StoryLibraryProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterObjection, setFilterObjection] = useState<string>("");
    const [filterType, setFilterType] = useState<string>("");

    const [formData, setFormData] = useState<Partial<StoryEntry>>({
        title: "",
        story_type: "micro_story",
        objection_category: "price_concern",
        business_niche: [],
        price_band: "mid",
        content: "",
    });

    const handleCreate = async () => {
        await onCreateStory(formData);
        setShowCreateForm(false);
        setFormData({
            title: "",
            story_type: "micro_story",
            objection_category: "price_concern",
            business_niche: [],
            price_band: "mid",
            content: "",
        });
    };

    const filteredStories = stories.filter((story) => {
        const matchesSearch =
            !searchQuery ||
            story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            story.content.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesObjection =
            !filterObjection || story.objection_category === filterObjection;

        const matchesType = !filterType || story.story_type === filterType;

        return matchesSearch && matchesObjection && matchesType;
    });

    const getStoryTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            micro_story: "bg-blue-100 text-blue-800",
            proof_element: "bg-green-100 text-green-800",
            testimonial: "bg-purple-100 text-purple-800",
            case_study: "bg-orange-100 text-orange-800",
        };
        return colors[type] || "bg-gray-100 text-gray-800";
    };

    const getPriceBandColor = (band: string) => {
        const colors: Record<string, string> = {
            low: "bg-green-100 text-green-800",
            mid: "bg-yellow-100 text-yellow-800",
            high: "bg-red-100 text-red-800",
        };
        return colors[band] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Story Library</h3>
                    <p className="text-sm text-gray-600">
                        Manage proof stories indexed by objection, niche, and price
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Story
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search stories..."
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={filterObjection}
                            onChange={(e) => setFilterObjection(e.target.value)}
                            className="w-full border rounded p-2"
                        >
                            <option value="">All Objections</option>
                            {OBJECTION_CATEGORIES.map((obj) => (
                                <option key={obj} value={obj}>
                                    {obj.replace("_", " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full border rounded p-2"
                        >
                            <option value="">All Types</option>
                            {STORY_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Create Form */}
            {showCreateForm && (
                <Card className="p-6 border-2 border-green-500">
                    <h4 className="font-semibold mb-4">Add New Story</h4>
                    <div className="space-y-4">
                        <div>
                            <Label>Story Title</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({ ...formData, title: e.target.value })
                                }
                                placeholder="Sarah doubled revenue in 90 days"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Story Type</Label>
                                <select
                                    value={formData.story_type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            story_type: e.target.value as any,
                                        })
                                    }
                                    className="w-full border rounded p-2"
                                >
                                    {STORY_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {
                                        STORY_TYPES.find(
                                            (t) => t.value === formData.story_type
                                        )?.description
                                    }
                                </p>
                            </div>

                            <div>
                                <Label>Objection Category</Label>
                                <select
                                    value={formData.objection_category}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            objection_category: e.target.value,
                                        })
                                    }
                                    className="w-full border rounded p-2"
                                >
                                    {OBJECTION_CATEGORIES.map((obj) => (
                                        <option key={obj} value={obj}>
                                            {obj.replace("_", " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label>Price Band</Label>
                                <select
                                    value={formData.price_band}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            price_band: e.target.value as
                                                | "low"
                                                | "mid"
                                                | "high",
                                        })
                                    }
                                    className="w-full border rounded p-2"
                                >
                                    <option value="low">Low (&lt;$500)</option>
                                    <option value="mid">Mid ($500-$5k)</option>
                                    <option value="high">High ($5k+)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label>Business Niches (comma-separated)</Label>
                            <Input
                                placeholder="coaching, consulting, saas"
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        business_niche: e.target.value
                                            .split(",")
                                            .map((n) => n.trim()),
                                    })
                                }
                            />
                        </div>

                        <div>
                            <Label>Story Content</Label>
                            <Textarea
                                value={formData.content}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        content: e.target.value,
                                    })
                                }
                                rows={6}
                                placeholder="Sarah was skeptical about the price, but after seeing our ROI calculator showing a 5x return, she invested. 90 days later, she'd doubled her revenue and thanked us for pushing her to take action."
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button onClick={handleCreate} className="flex-1">
                                Add Story to Library
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateForm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stories Grid */}
            <div className="grid grid-cols-1 gap-4">
                {filteredStories.length === 0 ? (
                    <Card className="p-12 text-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold mb-2">
                            {searchQuery || filterObjection || filterType
                                ? "No Stories Match Your Filters"
                                : "No Stories Yet"}
                        </h4>
                        <p className="text-gray-600 mb-4">
                            {searchQuery || filterObjection || filterType
                                ? "Try adjusting your filters"
                                : "Add your first proof story to the library"}
                        </p>
                        {!searchQuery && !filterObjection && !filterType && (
                            <Button onClick={() => setShowCreateForm(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Story
                            </Button>
                        )}
                    </Card>
                ) : (
                    filteredStories.map((story) => (
                        <Card
                            key={story.id}
                            className="p-5 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold">{story.title}</h4>
                                        <Badge
                                            className={getStoryTypeColor(
                                                story.story_type
                                            )}
                                        >
                                            {story.story_type.replace("_", " ")}
                                        </Badge>
                                        <Badge
                                            className={getPriceBandColor(
                                                story.price_band
                                            )}
                                        >
                                            ${story.price_band}
                                        </Badge>
                                    </div>

                                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                        {story.content}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Badge variant="outline">
                                                {story.objection_category.replace(
                                                    "_",
                                                    " "
                                                )}
                                            </Badge>
                                        </div>

                                        {story.business_niche.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                {story.business_niche
                                                    .slice(0, 3)
                                                    .map((niche) => (
                                                        <Badge
                                                            key={niche}
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {niche}
                                                        </Badge>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    {story.effectiveness_score && (
                                        <div className="flex items-center gap-1 text-sm">
                                            <Star className="h-4 w-4 text-yellow-500" />
                                            <span className="font-medium">
                                                {story.effectiveness_score.toFixed(1)}
                                            </span>
                                        </div>
                                    )}

                                    {story.times_used > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                            <TrendingUp className="h-3 w-3" />
                                            <span>Used {story.times_used}x</span>
                                        </div>
                                    )}

                                    <Button variant="outline" size="sm">
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Stats Footer */}
            {filteredStories.length > 0 && (
                <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50">
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {filteredStories.length}
                            </div>
                            <div className="text-xs text-gray-600">Total Stories</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {
                                    new Set(
                                        filteredStories.map((s) => s.objection_category)
                                    ).size
                                }
                            </div>
                            <div className="text-xs text-gray-600">
                                Objections Covered
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {filteredStories.reduce(
                                    (sum, s) => sum + s.times_used,
                                    0
                                )}
                            </div>
                            <div className="text-xs text-gray-600">Times Used</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {(
                                    filteredStories.reduce(
                                        (sum, s) => sum + (s.effectiveness_score || 0),
                                        0
                                    ) / filteredStories.length
                                ).toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600">
                                Avg Effectiveness
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
