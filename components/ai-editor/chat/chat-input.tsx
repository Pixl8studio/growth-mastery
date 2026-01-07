"use client";

/**
 * Chat Input
 * Text input with attach, voice, and send buttons
 * Supports image uploads via paperclip button and clipboard paste
 */

// External packages
import { Loader2, Paperclip, Send } from "lucide-react";
import { useState, useRef, KeyboardEvent, useCallback, useEffect } from "react";

// Internal utilities
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";

// UI Components
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { VoiceToTextButton } from "@/components/ui/voice-to-text-button";

// Types
export interface ImageAttachment {
    id: string;
    url: string;
    file?: File;
    uploading?: boolean;
}

interface ChatInputProps {
    onSendMessage: (message: string, attachments?: ImageAttachment[]) => void;
    isProcessing: boolean;
    projectId?: string;
}

export function ChatInput({ onSendMessage, isProcessing, projectId }: ChatInputProps) {
    const [message, setMessage] = useState("");
    const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate unique ID for attachments
    const generateId = () =>
        `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const handleSend = () => {
        if ((!message.trim() && attachments.length === 0) || isProcessing) return;

        // Don't send if any attachments are still uploading
        if (attachments.some((a) => a.uploading)) return;

        onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);

        // Revoke blob URLs before clearing to prevent memory leak
        attachments.forEach((attachment) => {
            if (attachment.url.startsWith("blob:")) {
                URL.revokeObjectURL(attachment.url);
            }
        });

        setMessage("");
        setAttachments([]);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    const handleInput = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    };

    // Handle voice-to-text transcript
    const handleVoiceTranscript = useCallback((transcript: string) => {
        setMessage((prev) => {
            const separator = prev.trim() ? " " : "";
            return prev + separator + transcript;
        });
        // Focus the textarea after voice input
        textareaRef.current?.focus();
    }, []);

    // Upload image file
    const uploadImage = useCallback(
        async (file: File): Promise<string | null> => {
            if (!projectId) {
                logger.warn({}, "No projectId provided for image upload");
                return null;
            }

            const formData = new FormData();
            formData.append("image", file);
            formData.append("projectId", projectId);

            try {
                const response = await fetch("/api/pages/upload-image", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error("Upload failed");
                }

                const data = await response.json();
                return data.imageUrl;
            } catch (error) {
                logger.error({ error }, "Failed to upload image");
                return null;
            }
        },
        [projectId]
    );

    // Handle file selection
    const handleFileSelect = useCallback(
        async (files: FileList | null) => {
            if (!files || files.length === 0) return;

            const imageFiles = Array.from(files).filter((file) =>
                file.type.startsWith("image/")
            );

            if (imageFiles.length === 0) return;

            // Add attachments with uploading state
            const newAttachments: ImageAttachment[] = imageFiles.map((file) => ({
                id: generateId(),
                url: URL.createObjectURL(file), // Temporary preview URL
                file,
                uploading: true,
            }));

            setAttachments((prev) => [...prev, ...newAttachments]);

            // Upload each file
            for (const attachment of newAttachments) {
                if (!attachment.file) continue;

                const uploadedUrl = await uploadImage(attachment.file);

                setAttachments((prev) =>
                    prev.map((a) =>
                        a.id === attachment.id
                            ? { ...a, url: uploadedUrl || a.url, uploading: false }
                            : a
                    )
                );
            }
        },
        [uploadImage]
    );

    // Handle paperclip button click
    const handlePaperclipClick = () => {
        fileInputRef.current?.click();
    };

    // Handle clipboard paste
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            const imageItems = Array.from(items).filter((item) =>
                item.type.startsWith("image/")
            );

            if (imageItems.length === 0) return;

            e.preventDefault();

            const files: File[] = [];
            for (const item of imageItems) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }

            if (files.length > 0) {
                const fileList = new DataTransfer();
                files.forEach((f) => fileList.items.add(f));
                await handleFileSelect(fileList.files);
            }
        };

        const textarea = textareaRef.current;
        textarea?.addEventListener("paste", handlePaste);

        return () => {
            textarea?.removeEventListener("paste", handlePaste);
        };
    }, [handleFileSelect]);

    // Remove attachment and clean up blob URL
    const removeAttachment = (id: string) => {
        setAttachments((prev) => {
            const attachment = prev.find((a) => a.id === id);
            // Revoke blob URL to prevent memory leak
            if (attachment?.url.startsWith("blob:")) {
                URL.revokeObjectURL(attachment.url);
            }
            return prev.filter((a) => a.id !== id);
        });
    };

    // Clean up blob URLs on unmount
    useEffect(() => {
        return () => {
            attachments.forEach((attachment) => {
                if (attachment.url.startsWith("blob:")) {
                    URL.revokeObjectURL(attachment.url);
                }
            });
        };
        // Only run cleanup on unmount, not on every attachments change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasContent = message.trim() || attachments.length > 0;
    const isUploading = attachments.some((a) => a.uploading);

    return (
        <div className="relative">
            {/* Image Attachments Preview */}
            {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="relative group">
                            <img
                                src={attachment.url}
                                alt="Attachment"
                                className={cn(
                                    "h-16 w-16 rounded-lg object-cover border border-border",
                                    attachment.uploading && "opacity-50"
                                )}
                            />
                            {attachment.uploading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                </div>
                            )}
                            {!attachment.uploading && (
                                <button
                                    onClick={() => removeAttachment(attachment.id)}
                                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
            />

            {/* Input Container */}
            <div
                className={cn(
                    "flex items-end gap-2 rounded-2xl border border-border bg-background p-2",
                    "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20",
                    "transition-all duration-150"
                )}
            >
                {/* Left Controls - Paperclip Button */}
                <TooltipProvider delayDuration={300}>
                    <div className="flex items-center gap-1 pb-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handlePaperclipClick}
                                    disabled={isProcessing}
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p>Attach image (or paste with Ctrl+V)</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>

                {/* Text Input */}
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        placeholder="Ask GrowthMastery.ai..."
                        disabled={isProcessing}
                        rows={1}
                        className={cn(
                            "w-full resize-none bg-transparent text-sm outline-none",
                            "placeholder:text-muted-foreground",
                            "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                        style={{ minHeight: "24px", maxHeight: "120px" }}
                    />
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1 pb-1">
                    {/* Voice Input - Now functional */}
                    <VoiceToTextButton
                        onTranscript={handleVoiceTranscript}
                        disabled={isProcessing}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    />

                    {/* Send Button */}
                    <Button
                        onClick={handleSend}
                        disabled={!hasContent || isProcessing || isUploading}
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-full",
                            "bg-gradient-to-r from-orange-500 to-amber-500",
                            "text-white hover:from-orange-600 hover:to-amber-600",
                            "disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
                        )}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
