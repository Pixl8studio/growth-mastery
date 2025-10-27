/**
 * Table component for displaying pages list
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import type { PageListItem } from "@/types/pages";
import { PageTypeBadge } from "./page-type-badge";
import { PublishToggle } from "./publish-toggle";
import { SlugEditor } from "./slug-editor";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, ArrowUpRight, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { deletePage } from "@/app/pages/actions";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/client-logger";

interface PagesTableProps {
    pages: PageListItem[];
    username: string;
}

export function PagesTable({ pages, username }: PagesTableProps) {
    const router = useRouter();
    const [refreshKey, setRefreshKey] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    if (pages.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
                <div className="mx-auto max-w-sm">
                    <h3 className="text-lg font-medium text-gray-900">
                        No pages found
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Try adjusting your filters or create a new funnel to generate
                        pages.
                    </p>
                    <div className="mt-6">
                        <Button asChild>
                            <Link href="/funnel-builder">Create Funnel</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const getStepNumber = (type: PageListItem["type"]): number => {
        switch (type) {
            case "enrollment":
                return 5;
            case "watch":
                return 8;
            case "registration":
                return 9;
            default:
                return 5;
        }
    };

    const handlePreview = (page: PageListItem) => {
        const previewUrl = `/funnel-builder/${page.funnel_id}/pages/${page.type}/${page.id}`;
        window.open(previewUrl, "_blank");
    };

    const handleEdit = (page: PageListItem) => {
        const editorUrl = `/funnel-builder/${page.funnel_id}/pages/${page.type}/${page.id}?edit=true`;
        window.open(editorUrl, "_blank");
    };

    const handleDelete = async (page: PageListItem) => {
        if (
            !confirm(
                `Are you sure you want to delete "${page.headline}"? This action cannot be undone.`
            )
        ) {
            return;
        }

        setDeletingId(page.id);

        try {
            await deletePage(page.type, page.id);
            logger.info({ pageId: page.id }, "Page deleted");
            router.refresh();
        } catch (error) {
            logger.error({ error, pageId: page.id }, "Failed to delete page");
            alert("Failed to delete page. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Page Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Page URL & Slug
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Published
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Funnel
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Created
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {pages.map((page) => (
                            <tr
                                key={`${page.type}-${page.id}`}
                                className="hover:bg-gray-50"
                            >
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">
                                        {page.headline}
                                    </div>
                                    {page.vanity_slug && (
                                        <div className="mt-1 text-xs text-gray-500">
                                            /{page.vanity_slug}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <PageTypeBadge type={page.type} />
                                </td>
                                <td className="px-6 py-4">
                                    <SlugEditor
                                        pageId={page.id}
                                        pageType={page.type}
                                        initialSlug={page.vanity_slug}
                                        username={username}
                                        onUpdate={() => setRefreshKey((k) => k + 1)}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                        <PublishToggle page={page} />
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    {page.funnel_name}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {formatDistanceToNow(new Date(page.created_at), {
                                        addSuffix: true,
                                    })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handlePreview(page)}
                                            title="Preview"
                                            disabled={deletingId === page.id}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(page)}
                                            title="Edit with Visual Editor"
                                            disabled={deletingId === page.id}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            title="Go to Funnel Step"
                                            disabled={deletingId === page.id}
                                        >
                                            <Link
                                                href={`/funnel-builder/${page.funnel_id}/step/${getStepNumber(page.type)}`}
                                            >
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(page)}
                                            title="Delete"
                                            disabled={deletingId === page.id}
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
