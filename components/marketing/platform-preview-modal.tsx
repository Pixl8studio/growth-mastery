/**
 * Platform Preview Modal Component
 * Mobile phone mockup with platform-specific preview rendering
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PlatformPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: {
        copy_text: string;
        platform: string;
        hashtags?: string[];
        media_urls?: string[];
        cta_text?: string;
    };
}

export function PlatformPreviewModal({
    isOpen,
    onClose,
    content,
}: PlatformPreviewModalProps) {
    const [selectedPlatform, setSelectedPlatform] = useState(content.platform);

    if (!isOpen) return null;

    const renderPlatformPreview = () => {
        const platformIcons: Record<string, string> = {
            instagram: "📸",
            facebook: "👍",
            linkedin: "💼",
            twitter: "🐦",
        };

        const platformColors: Record<string, string> = {
            instagram: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
            facebook: "bg-blue-600",
            linkedin: "bg-blue-700",
            twitter: "bg-sky-500",
        };

        return (
            <div className="bg-white rounded-lg overflow-hidden">
                {/* Platform Header */}
                <div
                    className={`${platformColors[selectedPlatform]} p-3 text-white flex items-center gap-2`}
                >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xl">
                        {platformIcons[selectedPlatform]}
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-sm">Your Brand</div>
                        <div className="text-xs opacity-90">Sponsored</div>
                    </div>
                </div>

                {/* Media Section */}
                {content.media_urls && content.media_urls.length > 0 && (
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <img
                            src={content.media_urls[0]}
                            alt="Post media"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                        {!content.media_urls[0] && (
                            <div className="text-gray-400">
                                <ImageIcon className="h-12 w-12" />
                            </div>
                        )}
                    </div>
                )}

                {/* Content Section */}
                <div className="p-3">
                    {/* Engagement Buttons (Mock) */}
                    <div className="flex gap-4 mb-3 pb-3 border-b">
                        <button className="text-gray-700">❤️</button>
                        <button className="text-gray-700">💬</button>
                        <button className="text-gray-700">↗️</button>
                    </div>

                    {/* Caption */}
                    <div className="space-y-2">
                        <div className="text-sm">
                            <span className="font-semibold">Your Brand </span>
                            <span className="text-gray-900">{content.copy_text}</span>
                        </div>

                        {/* Hashtags */}
                        {content.hashtags && content.hashtags.length > 0 && (
                            <div className="text-sm text-blue-600">
                                {content.hashtags.map((tag) => `#${tag}`).join(" ")}
                            </div>
                        )}

                        {/* CTA */}
                        {content.cta_text && (
                            <Button variant="outline" size="sm" className="w-full mt-2">
                                {content.cta_text}
                            </Button>
                        )}
                    </div>

                    {/* Mock Comments */}
                    <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500">
                            View all 24 comments
                        </div>
                        <div className="text-xs text-gray-400 mt-1">2 hours ago</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <div className="relative w-full max-w-5xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300"
                >
                    <X className="h-8 w-8" />
                </button>

                <div className="bg-white rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold">Platform Preview</h3>
                        <div className="flex gap-2">
                            {["instagram", "facebook", "linkedin", "twitter"].map(
                                (platform) => (
                                    <Button
                                        key={platform}
                                        onClick={() => setSelectedPlatform(platform)}
                                        variant={
                                            selectedPlatform === platform
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                    >
                                        {platform === "instagram" && "📸"}
                                        {platform === "facebook" && "👍"}
                                        {platform === "linkedin" && "💼"}
                                        {platform === "twitter" && "🐦"}
                                        <span className="ml-2 capitalize">
                                            {platform}
                                        </span>
                                    </Button>
                                )
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        {/* iPhone Mockup */}
                        <div className="relative">
                            <div className="w-80 h-[640px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                                {/* iPhone Notch */}
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10"></div>

                                {/* Screen */}
                                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden overflow-y-auto">
                                    {/* Status Bar */}
                                    <div className="h-12 bg-white flex items-center justify-between px-6 text-xs">
                                        <span>9:41</span>
                                        <div className="flex gap-1">
                                            <span>📶</span>
                                            <span>📡</span>
                                            <span>🔋</span>
                                        </div>
                                    </div>

                                    {/* Platform Content */}
                                    {renderPlatformPreview()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        </svg>
    );
}
