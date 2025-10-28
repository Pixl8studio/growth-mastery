"use client";

import { Card } from "@/components/ui/card";
import { Phone, Upload, FileText, Globe, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntakeMethod = "voice" | "upload" | "paste" | "scrape" | "google_drive";

interface IntakeMethodSelectorProps {
    onSelectMethod: (method: IntakeMethod) => void;
    selectedMethod?: IntakeMethod;
}

interface MethodOption {
    id: IntakeMethod;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    comingSoon?: boolean;
}

const METHODS: MethodOption[] = [
    {
        id: "voice",
        title: "Voice Call",
        description: "Have a natural 15-20 minute conversation with our AI assistant",
        icon: Phone,
        color: "blue",
    },
    {
        id: "upload",
        title: "Upload Documents",
        description: "Upload PDFs, Word docs, or text files about your business",
        icon: Upload,
        color: "purple",
    },
    {
        id: "paste",
        title: "Paste Content",
        description: "Paste text from existing documents or GPT knowledge bases",
        icon: FileText,
        color: "green",
    },
    {
        id: "scrape",
        title: "Scrape Website",
        description: "Import content from your existing enrollment or landing pages",
        icon: Globe,
        color: "orange",
    },
    {
        id: "google_drive",
        title: "Connect Google Drive",
        description: "Import documents directly from your Google Drive folder",
        icon: Cloud,
        color: "red",
        comingSoon: true,
    },
];

export function IntakeMethodSelector({
    onSelectMethod,
    selectedMethod,
}: IntakeMethodSelectorProps) {
    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                    Choose Your Intake Method
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                    Select how you'd like to provide your business information
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;
                    const isDisabled = method.comingSoon;

                    return (
                        <Card
                            key={method.id}
                            className={cn("p-6 transition-all", {
                                "border-blue-500 bg-blue-50": isSelected,
                                "cursor-pointer hover:shadow-lg hover:border-gray-300":
                                    !isDisabled,
                                "cursor-not-allowed opacity-60": isDisabled,
                            })}
                            onClick={() => !isDisabled && onSelectMethod(method.id)}
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <div
                                        className={cn(
                                            "flex h-12 w-12 items-center justify-center rounded-full",
                                            {
                                                "bg-blue-100": method.color === "blue",
                                                "bg-purple-100":
                                                    method.color === "purple",
                                                "bg-green-100":
                                                    method.color === "green",
                                                "bg-orange-100":
                                                    method.color === "orange",
                                                "bg-red-100": method.color === "red",
                                            }
                                        )}
                                    >
                                        <Icon
                                            className={cn("h-6 w-6", {
                                                "text-blue-600":
                                                    method.color === "blue",
                                                "text-purple-600":
                                                    method.color === "purple",
                                                "text-green-600":
                                                    method.color === "green",
                                                "text-orange-600":
                                                    method.color === "orange",
                                                "text-red-600": method.color === "red",
                                            })}
                                        />
                                    </div>
                                    {method.comingSoon && (
                                        <span className="absolute -right-2 -top-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-semibold text-white">
                                            Soon
                                        </span>
                                    )}
                                </div>

                                <h4 className="mb-2 font-semibold text-gray-900">
                                    {method.title}
                                </h4>
                                <p className="text-sm text-gray-600">
                                    {method.description}
                                </p>
                                {method.comingSoon && (
                                    <p className="mt-2 text-xs font-medium text-yellow-600">
                                        Coming Soon
                                    </p>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
