"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/client-logger";
import { useToast } from "@/components/ui/use-toast";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadIntakeProps {
    projectId: string;
    userId: string;
    onComplete?: () => void;
}

const ACCEPTED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt", ".md"];

export function UploadIntake({ projectId, userId, onComplete }: UploadIntakeProps) {
    const [file, setFile] = useState<File | null>(null);
    const [sessionName, setSessionName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const validateFile = (file: File): boolean => {
        // Check file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Please upload a file smaller than 10MB.",
                variant: "destructive",
            });
            return false;
        }

        // Check file type
        if (!ACCEPTED_TYPES.includes(file.type)) {
            toast({
                title: "Unsupported file type",
                description: "Please upload a PDF, DOCX, DOC, TXT, or MD file.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    };

    const handleFileSelect = (selectedFile: File) => {
        if (validateFile(selectedFile)) {
            setFile(selectedFile);
            if (!sessionName) {
                setSessionName(selectedFile.name);
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("projectId", projectId);
            formData.append("userId", userId);
            formData.append("sessionName", sessionName.trim() || file.name);

            const response = await fetch("/api/intake/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to upload file");
            }

            logger.info(
                { intakeId: data.intakeId, fileName: file.name },
                "File uploaded successfully"
            );

            toast({
                title: "File uploaded!",
                description: "Your file has been processed successfully.",
            });

            setFile(null);
            setSessionName("");

            if (onComplete) {
                setTimeout(() => onComplete(), 1000);
            }
        } catch (error) {
            logger.error({ error }, "Failed to upload file");
            toast({
                title: "Upload failed",
                description:
                    error instanceof Error ? error.message : "Failed to upload file",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        Upload Documents
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                        Upload PDF, Word, or text files about your business
                    </p>
                </div>

                {/* Session Name */}
                <div>
                    <label
                        htmlFor="sessionName"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Session Name (optional)
                    </label>
                    <input
                        type="text"
                        id="sessionName"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="e.g., Product Documentation"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                </div>

                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                        {
                            "border-blue-500 bg-blue-50": isDragging,
                            "border-gray-300 bg-gray-50": !isDragging,
                        }
                    )}
                >
                    {!file ? (
                        <div className="space-y-4">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">
                                    Drag and drop your file here, or
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Browse Files
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={ACCEPTED_EXTENSIONS.join(",")}
                                    onChange={(e) => {
                                        const selectedFile = e.target.files?.[0];
                                        if (selectedFile) {
                                            handleFileSelect(selectedFile);
                                        }
                                    }}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                Supported: PDF, DOCX, DOC, TXT, MD (max 10MB)
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between rounded-lg bg-white p-4">
                            <div className="flex items-center space-x-3">
                                <FileText className="h-8 w-8 text-blue-600" />
                                <div className="text-left">
                                    <p className="font-medium text-gray-900">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Upload Button */}
                <Button
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className="w-full"
                    size="lg"
                >
                    {isUploading ? (
                        <>
                            <span className="mr-2">Processing...</span>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </>
                    ) : (
                        "Upload and Process"
                    )}
                </Button>

                {/* Help Text */}
                <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-blue-900">
                        💡 Tips
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                        <li>• Upload pitch decks, product docs, or business plans</li>
                        <li>• We'll automatically extract text from your documents</li>
                        <li>
                            • You can upload multiple documents by repeating this
                            process
                        </li>
                        <li>• Ensure documents are in English for best results</li>
                    </ul>
                </div>
            </div>
        </Card>
    );
}
