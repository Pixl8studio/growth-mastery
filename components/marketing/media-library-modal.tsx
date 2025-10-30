/**
 * Media Library Modal Component
 * User's uploaded media library with grid view and management
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    X,
    Upload,
    Trash2,
    Edit2,
    CheckCircle2,
    Image as ImageIcon,
} from "lucide-react";

interface MediaItem {
    id: string;
    url: string;
    alt_text: string;
    type: "image" | "video";
    created_at: string;
}

interface MediaLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMedia: (urls: string[]) => void;
    multiSelect?: boolean;
    funnelProjectId: string;
}

export function MediaLibraryModal({
    isOpen,
    onClose,
    onSelectMedia,
    multiSelect = false,
    funnelProjectId,
}: MediaLibraryModalProps) {
    const { toast } = useToast();
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [editingAltText, setEditingAltText] = useState<string | null>(null);
    const [altTextValue, setAltTextValue] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadMedia();
        }
    }, [isOpen, funnelProjectId]);

    const loadMedia = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/marketing/media?funnel_project_id=${funnelProjectId}`
            );
            const data = await response.json();

            if (data.success) {
                setMediaItems(data.media || []);
            }
        } catch (error) {
            logger.error({ error }, "Failed to load media");
            toast({
                title: "Error",
                description: "Failed to load media library",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        Array.from(files).forEach((file) => {
            formData.append("files", file);
        });
        formData.append("funnel_project_id", funnelProjectId);

        try {
            toast({
                title: "Uploading...",
                description: `Uploading ${files.length} file(s)`,
            });

            const response = await fetch("/api/marketing/media", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Upload Complete",
                    description: `${files.length} file(s) uploaded successfully`,
                });
                loadMedia();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Upload failed");
            toast({
                title: "Upload Failed",
                description:
                    error instanceof Error ? error.message : "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this media item?")) return;

        try {
            const response = await fetch(`/api/marketing/media/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Deleted",
                    description: "Media item deleted",
                });
                setMediaItems(mediaItems.filter((item) => item.id !== id));
            }
        } catch (error) {
            logger.error({ error }, "Delete failed");
            toast({
                title: "Delete Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleUpdateAltText = async (id: string) => {
        try {
            const response = await fetch(`/api/marketing/media/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    alt_text: altTextValue,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Updated",
                    description: "Alt text updated",
                });
                setMediaItems(
                    mediaItems.map((item) =>
                        item.id === id ? { ...item, alt_text: altTextValue } : item
                    )
                );
                setEditingAltText(null);
            }
        } catch (error) {
            logger.error({ error }, "Update failed");
            toast({
                title: "Update Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const toggleSelect = (url: string) => {
        if (multiSelect) {
            if (selectedItems.includes(url)) {
                setSelectedItems(selectedItems.filter((u) => u !== url));
            } else {
                setSelectedItems([...selectedItems, url]);
            }
        } else {
            setSelectedItems([url]);
        }
    };

    const handleConfirmSelection = () => {
        onSelectMedia(selectedItems);
        onClose();
        setSelectedItems([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Media Library</h2>
                        <p className="text-sm text-gray-600">
                            {selectedItems.length > 0 &&
                                `${selectedItems.length} selected`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label>
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleUpload}
                                className="hidden"
                            />
                            <Button as="span" variant="outline" size="sm">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                            </Button>
                        </label>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                                <p className="text-gray-600">Loading media...</p>
                            </div>
                        </div>
                    ) : mediaItems.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    No Media Yet
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Upload images and videos to use in your posts
                                </p>
                                <label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={handleUpload}
                                        className="hidden"
                                    />
                                    <Button as="span">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Media
                                    </Button>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {mediaItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                        selectedItems.includes(item.url)
                                            ? "border-blue-500"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    {/* Media Display */}
                                    {item.type === "image" ? (
                                        <img
                                            src={item.url}
                                            alt={item.alt_text || "Media item"}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => toggleSelect(item.url)}
                                        />
                                    ) : (
                                        <video
                                            src={item.url}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => toggleSelect(item.url)}
                                        />
                                    )}

                                    {/* Selection Indicator */}
                                    {selectedItems.includes(item.url) && (
                                        <div className="absolute top-2 right-2">
                                            <CheckCircle2 className="h-6 w-6 text-blue-500 bg-white rounded-full" />
                                        </div>
                                    )}

                                    {/* Actions Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => {
                                                    setEditingAltText(item.id);
                                                    setAltTextValue(
                                                        item.alt_text || ""
                                                    );
                                                }}
                                                className="text-white hover:text-blue-300"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-white hover:text-red-300"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Alt Text Editor */}
                                    {editingAltText === item.id && (
                                        <div className="absolute inset-0 bg-black bg-opacity-90 p-3 flex flex-col">
                                            <label className="text-white text-xs mb-2">
                                                Alt Text
                                            </label>
                                            <Input
                                                value={altTextValue}
                                                onChange={(e) =>
                                                    setAltTextValue(e.target.value)
                                                }
                                                placeholder="Describe this image..."
                                                className="mb-2"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() =>
                                                        handleUpdateAltText(item.id)
                                                    }
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        setEditingAltText(null)
                                                    }
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {selectedItems.length > 0 && (
                    <div className="p-6 border-t flex justify-end gap-3">
                        <Button onClick={() => setSelectedItems([])} variant="outline">
                            Clear Selection
                        </Button>
                        <Button onClick={handleConfirmSelection}>
                            Select {selectedItems.length}{" "}
                            {selectedItems.length === 1 ? "Item" : "Items"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
