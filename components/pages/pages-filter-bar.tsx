/**
 * Filter bar component for pages list
 * Provides filtering by funnel, page type, published status, and search
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FunnelOption, PageType } from "@/types/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface PagesFilterBarProps {
    funnels: FunnelOption[];
}

export function PagesFilterBar({ funnels }: PagesFilterBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [funnelId, setFunnelId] = useState(searchParams.get("funnel_id") || "all");
    const [pageType, setPageType] = useState(searchParams.get("page_type") || "all");
    const [isPublished, setIsPublished] = useState(
        searchParams.get("is_published") || "all"
    );
    const [search, setSearch] = useState(searchParams.get("search") || "");

    useEffect(() => {
        const params = new URLSearchParams();

        if (funnelId && funnelId !== "all") {
            params.set("funnel_id", funnelId);
        }
        if (pageType && pageType !== "all") {
            params.set("page_type", pageType);
        }
        if (isPublished && isPublished !== "all") {
            params.set("is_published", isPublished);
        }
        if (search) {
            params.set("search", search);
        }

        const queryString = params.toString();
        router.push(queryString ? `/pages?${queryString}` : "/pages");
    }, [funnelId, pageType, isPublished, search, router]);

    const handleClearFilters = () => {
        setFunnelId("all");
        setPageType("all");
        setIsPublished("all");
        setSearch("");
    };

    const hasActiveFilters =
        funnelId !== "all" ||
        pageType !== "all" ||
        isPublished !== "all" ||
        search !== "";

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Funnel Filter */}
                <div>
                    <label
                        htmlFor="funnel-filter"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Funnel
                    </label>
                    <select
                        id="funnel-filter"
                        value={funnelId}
                        onChange={(e) => setFunnelId(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">All Funnels</option>
                        {funnels.map((funnel) => (
                            <option key={funnel.id} value={funnel.id}>
                                {funnel.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Page Type Filter */}
                <div>
                    <label
                        htmlFor="type-filter"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Page Type
                    </label>
                    <select
                        id="type-filter"
                        value={pageType}
                        onChange={(e) => setPageType(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">All Types</option>
                        <option value="enrollment">Enrollment</option>
                        <option value="watch">Watch</option>
                        <option value="registration">Registration</option>
                    </select>
                </div>

                {/* Published Status Filter */}
                <div>
                    <label
                        htmlFor="status-filter"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Status
                    </label>
                    <select
                        id="status-filter"
                        value={isPublished}
                        onChange={(e) => setIsPublished(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">All</option>
                        <option value="true">Published</option>
                        <option value="false">Draft</option>
                    </select>
                </div>

                {/* Search */}
                <div>
                    <label
                        htmlFor="search-filter"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            id="search-filter"
                            type="text"
                            placeholder="Search headlines..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        Clear Filters
                    </Button>
                </div>
            )}
        </div>
    );
}
