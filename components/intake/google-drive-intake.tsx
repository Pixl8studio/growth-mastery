"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/client-logger";
import { useToast } from "@/components/ui/use-toast";
import { Cloud, FileText, CheckSquare, Square } from "lucide-react";

interface GoogleDriveIntakeProps {
    projectId: string;
    userId: string;
    onComplete?: () => void;
}

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: number;
}

export function GoogleDriveIntake({
    projectId,
    userId,
    onComplete,
}: GoogleDriveIntakeProps) {
    const [sessionName, setSessionName] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const handleConnect = async () => {
        setIsConnecting(true);

        try {
            // Get OAuth URL
            const response = await fetch("/api/intake/google-drive?action=auth");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to get authentication URL");
            }

            // Open OAuth popup
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                data.authUrl,
                "Google Drive OAuth",
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Wait for OAuth callback
            const handleMessage = (event: MessageEvent) => {
                if (event.data.type === "google-oauth-success") {
                    setAccessToken(event.data.accessToken);
                    loadDriveFiles(event.data.accessToken);
                    popup?.close();
                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);
        } catch (error) {
            logger.error({ error }, "Failed to connect to Google Drive");
            toast({
                title: "Connection failed",
                description: "Failed to connect to Google Drive. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const loadDriveFiles = async (token: string) => {
        try {
            // List files from Google Drive
            const response = await fetch(
                "https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size)",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load files");
            }

            const data = await response.json();
            setFiles(data.files || []);

            logger.info(
                { fileCount: data.files?.length || 0 },
                "Loaded Google Drive files"
            );
        } catch (error) {
            logger.error({ error }, "Failed to load Google Drive files");
            toast({
                title: "Error",
                description: "Failed to load files from Google Drive.",
                variant: "destructive",
            });
        }
    };

    const toggleFileSelection = (fileId: string) => {
        const newSelection = new Set(selectedFileIds);
        if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
        } else {
            newSelection.add(fileId);
        }
        setSelectedFileIds(newSelection);
    };

    const handleImport = async () => {
        if (selectedFileIds.size === 0) {
            toast({
                title: "No files selected",
                description: "Please select at least one file to import.",
                variant: "destructive",
            });
            return;
        }

        setIsImporting(true);

        try {
            const response = await fetch("/api/intake/google-drive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    userId,
                    accessToken,
                    fileIds: Array.from(selectedFileIds),
                    sessionName:
                        sessionName.trim() ||
                        `Google Drive (${selectedFileIds.size} files)`,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to import files");
            }

            logger.info(
                {
                    intakeId: data.intakeId,
                    filesProcessed: data.filesProcessed,
                },
                "Google Drive files imported successfully"
            );

            toast({
                title: "Files imported!",
                description: `Successfully imported ${data.filesProcessed} ${data.filesProcessed === 1 ? "file" : "files"}.`,
            });

            setSelectedFileIds(new Set());
            setSessionName("");

            if (onComplete) {
                setTimeout(() => onComplete(), 1500);
            }
        } catch (error) {
            logger.error({ error }, "Failed to import Google Drive files");
            toast({
                title: "Import failed",
                description:
                    error instanceof Error ? error.message : "Failed to import files",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (!bytes) return "Unknown size";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        Connect Google Drive
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                        Import documents directly from your Google Drive
                    </p>
                </div>

                {!accessToken ? (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                            <Cloud className="mb-4 h-16 w-16 text-gray-400" />
                            <h4 className="mb-2 font-semibold text-gray-900">
                                Connect Your Google Drive
                            </h4>
                            <p className="mb-4 text-sm text-gray-600">
                                You'll be prompted to grant access to your Google Drive
                                files
                            </p>
                            <Button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isConnecting
                                    ? "Connecting..."
                                    : "Connect Google Drive"}
                            </Button>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4">
                            <h4 className="mb-2 text-sm font-semibold text-blue-900">
                                🔒 Privacy & Security
                            </h4>
                            <ul className="space-y-1 text-sm text-blue-800">
                                <li>
                                    • We only request read-only access to your files
                                </li>
                                <li>• You control which files to import</li>
                                <li>• We never modify or delete your Drive files</li>
                                <li>
                                    • You can revoke access anytime in Google settings
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
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

                        {/* File List */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Select Files to Import
                            </label>
                            <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
                                {files.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-gray-500">
                                        No files found in your Google Drive
                                    </p>
                                ) : (
                                    files.map((file) => (
                                        <div
                                            key={file.id}
                                            onClick={() => toggleFileSelection(file.id)}
                                            className="flex cursor-pointer items-center justify-between rounded-lg bg-white p-3 transition-colors hover:bg-gray-50"
                                        >
                                            <div className="flex items-center space-x-3">
                                                {selectedFileIds.has(file.id) ? (
                                                    <CheckSquare className="h-5 w-5 text-blue-600" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-gray-400" />
                                                )}
                                                <FileText className="h-6 w-6 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatFileSize(file.size)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {selectedFileIds.size > 0 && (
                                <p className="mt-2 text-sm text-gray-600">
                                    {selectedFileIds.size}{" "}
                                    {selectedFileIds.size === 1 ? "file" : "files"}{" "}
                                    selected
                                </p>
                            )}
                        </div>

                        {/* Import Button */}
                        <Button
                            onClick={handleImport}
                            disabled={selectedFileIds.size === 0 || isImporting}
                            className="w-full"
                            size="lg"
                        >
                            {isImporting ? (
                                <>
                                    <span className="mr-2">Importing...</span>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                </>
                            ) : (
                                `Import ${selectedFileIds.size || ""} ${selectedFileIds.size === 1 ? "File" : "Files"}`
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
