/**
 * Brief Template Library Component
 * Pre-made and user-saved brief templates
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    FileText,
    Trash2,
    Copy,
    Star,
    Search,
} from "lucide-react";

interface BriefTemplate {
    id: string;
    name: string;
    description: string;
    config: any;
    is_default: boolean;
    is_favorite: boolean;
    created_at: string;
}

interface BriefTemplateLibraryProps {
    onSelectTemplate: (template: BriefTemplate) => void;
    funnelProjectId: string;
}

export function BriefTemplateLibrary({
    onSelectTemplate,
    funnelProjectId,
}: BriefTemplateLibraryProps) {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<BriefTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "default" | "custom">("all");

    useEffect(() => {
        loadTemplates();
    }, [funnelProjectId]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/marketing/templates?funnel_project_id=${funnelProjectId}`
            );
            const data = await response.json();

            if (data.success) {
                setTemplates(data.templates || []);
            }
        } catch (error) {
            logger.error({ error }, "Failed to load templates");
            toast({
                title: "Error",
                description: "Failed to load templates",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm("Delete this template?")) return;

        try {
            const response = await fetch(`/api/marketing/templates/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Template Deleted",
                    description: "Template has been removed",
                });
                setTemplates(templates.filter((t) => t.id !== id));
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete template");
            toast({
                title: "Delete Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleToggleFavorite = async (id: string, currentValue: boolean) => {
        try {
            const response = await fetch(`/api/marketing/templates/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_favorite: !currentValue,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setTemplates(
                    templates.map((t) =>
                        t.id === id ? { ...t, is_favorite: !currentValue } : t
                    )
                );
            }
        } catch (error) {
            logger.error({ error }, "Failed to update favorite");
        }
    };

    const handleDuplicateTemplate = async (template: BriefTemplate) => {
        try {
            const response = await fetch("/api/marketing/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${template.name} (Copy)`,
                    description: template.description,
                    config: template.config,
                    funnel_project_id: funnelProjectId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Template Duplicated",
                    description: "A copy has been created",
                });
                loadTemplates();
            }
        } catch (error) {
            logger.error({ error }, "Failed to duplicate template");
            toast({
                title: "Duplication Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const filteredTemplates = templates
        .filter((t) => {
            if (filter === "default") return t.is_default;
            if (filter === "custom") return !t.is_default;
            return true;
        })
        .filter(
            (t) =>
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const favoriteTemplates = filteredTemplates.filter((t) => t.is_favorite);
    const otherTemplates = filteredTemplates.filter((t) => !t.is_favorite);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold mb-2">Brief Templates</h2>
                <p className="text-gray-600">
                    Start with a pre-made template or use one you've saved
                </p>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search templates..."
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setFilter("all")}
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                    >
                        All
                    </Button>
                    <Button
                        onClick={() => setFilter("default")}
                        variant={filter === "default" ? "default" : "outline"}
                        size="sm"
                    >
                        Default
                    </Button>
                    <Button
                        onClick={() => setFilter("custom")}
                        variant={filter === "custom" ? "default" : "outline"}
                        size="sm"
                    >
                        Custom
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading templates...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Favorites */}
                    {favoriteTemplates.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                Favorites
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {favoriteTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onSelect={() => onSelectTemplate(template)}
                                        onDelete={() =>
                                            handleDeleteTemplate(template.id)
                                        }
                                        onDuplicate={() =>
                                            handleDuplicateTemplate(template)
                                        }
                                        onToggleFavorite={() =>
                                            handleToggleFavorite(
                                                template.id,
                                                template.is_favorite
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Templates */}
                    {otherTemplates.length > 0 && (
                        <div>
                            {favoriteTemplates.length > 0 && (
                                <h3 className="text-lg font-semibold mb-3">
                                    All Templates
                                </h3>
                            )}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {otherTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onSelect={() => onSelectTemplate(template)}
                                        onDelete={() =>
                                            handleDeleteTemplate(template.id)
                                        }
                                        onDuplicate={() =>
                                            handleDuplicateTemplate(template)
                                        }
                                        onToggleFavorite={() =>
                                            handleToggleFavorite(
                                                template.id,
                                                template.is_favorite
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredTemplates.length === 0 && !loading && (
                        <Card className="p-12 text-center border-dashed">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                No Templates Found
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {searchTerm
                                    ? "Try a different search term"
                                    : "Create your first brief and save it as a template"}
                            </p>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

function TemplateCard({
    template,
    onSelect,
    onDelete,
    onDuplicate,
    onToggleFavorite,
}: {
    template: BriefTemplate;
    onSelect: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onToggleFavorite: () => void;
}) {
    return (
        <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    {template.is_default && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                            Default
                        </span>
                    )}
                </div>
                <button
                    onClick={onToggleFavorite}
                    className="text-gray-400 hover:text-yellow-500 transition-colors"
                >
                    <Star
                        className={`h-5 w-5 ${template.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`}
                    />
                </button>
            </div>

            <h4 className="font-semibold mb-2">{template.name}</h4>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description}
            </p>

            <div className="flex gap-2">
                <Button onClick={onSelect} size="sm" className="flex-1">
                    Use Template
                </Button>
                <Button onClick={onDuplicate} variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                </Button>
                {!template.is_default && (
                    <Button
                        onClick={onDelete}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </Card>
    );
}

