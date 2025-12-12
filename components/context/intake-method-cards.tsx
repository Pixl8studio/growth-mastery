"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Copy,
    Check,
    Globe,
    Upload,
    FileText,
    Loader2,
    X,
    Link,
    FileSpreadsheet,
    Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import type { SectionId } from "@/types/business-profile";
import { SECTION_DEFINITIONS } from "@/types/business-profile";

interface IntakeMethodCardsProps {
    sectionId: SectionId;
    projectId: string;
    onContentAppend: (content: string) => void;
}

const ACCEPTED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
];

const ACCEPTED_EXTENSIONS = [
    ".pdf",
    ".docx",
    ".doc",
    ".txt",
    ".md",
    ".csv",
    ".xlsx",
    ".xls",
    ".pptx",
    ".ppt",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function IntakeMethodCards({
    sectionId,
    projectId,
    onContentAppend,
}: IntakeMethodCardsProps) {
    const { toast } = useToast();

    // Card 1: Copy Prompts state
    const [isCopied, setIsCopied] = useState(false);

    // Card 2: URL Scrape state
    const [url, setUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeProgress, setScrapeProgress] = useState<{
        current: number;
        total: number;
    } | null>(null);

    // Card 3: File Upload state
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate copy prompt for the current section
    const generateCopyPrompt = useCallback((): string => {
        const sectionDef = SECTION_DEFINITIONS[sectionId];

        const questionsText = sectionDef.fields
            .map((field, index) => {
                if (field.type === "belief_shift" && "subfields" in field) {
                    const subQuestions = field.subfields
                        .map(
                            (sub, subIndex) =>
                                `   ${String.fromCharCode(97 + subIndex)}) ${sub.label}`
                        )
                        .join("\n");
                    return `${index + 1}. ${field.label}:\n${subQuestions}`;
                }
                return `${index + 1}. ${field.label}`;
            })
            .join("\n\n");

        return `# ${sectionDef.title}

Please answer the following questions about ${sectionDef.description.toLowerCase()}:

${questionsText}

Please provide detailed, specific answers for each question. Format your response clearly with each answer labeled by question number.`;
    }, [sectionId]);

    // Card 1: Handle copy prompt
    const handleCopyPrompt = async () => {
        const prompt = generateCopyPrompt();
        await navigator.clipboard.writeText(prompt);
        setIsCopied(true);

        toast({
            title: "✓ Copied!",
            description: "Paste this into your GPT, then paste the response back here.",
        });

        setTimeout(() => setIsCopied(false), 3000);
    };

    // Card 2: Validate URL
    const validateUrl = (urlString: string): boolean => {
        try {
            const parsedUrl = new URL(urlString);
            return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        } catch {
            return false;
        }
    };

    // Card 2: Handle URL scrape
    const handleScrape = async () => {
        if (!validateUrl(url)) {
            toast({
                title: "Invalid URL",
                description: "Please enter a valid HTTP or HTTPS URL.",
                variant: "destructive",
            });
            return;
        }

        setIsScraping(true);
        setScrapeProgress({ current: 0, total: 1 });

        try {
            const response = await fetch("/api/intake/crawl", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    url,
                    maxPages: 50,
                    maxDepth: 3,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to scrape website");
            }

            logger.info(
                {
                    url,
                    pagesScraped: data.pagesScraped,
                    contentLength: data.content?.length,
                },
                "Website scraped successfully"
            );

            if (data.content) {
                onContentAppend(data.content);
                toast({
                    title: "Content imported!",
                    description: `Scraped ${data.pagesScraped} page${data.pagesScraped > 1 ? "s" : ""} from the website.`,
                });
            }

            setUrl("");
            setScrapeProgress(null);
        } catch (error) {
            // Use userError for expected scraping failures - website may not have extractable content
            logger.userError({ error, url }, "Failed to scrape website");
            toast({
                title: "Scraping failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to scrape website. Please check the URL and try again.",
                variant: "destructive",
            });
        } finally {
            setIsScraping(false);
            setScrapeProgress(null);
        }
    };

    // Card 3: Validate file
    const validateFile = (selectedFile: File): boolean => {
        if (selectedFile.size > MAX_FILE_SIZE) {
            toast({
                title: "File too large",
                description: "Please upload a file smaller than 10MB.",
                variant: "destructive",
            });
            return false;
        }

        const ext = selectedFile.name.split(".").pop()?.toLowerCase();
        const isValidExt = ACCEPTED_EXTENSIONS.some((accepted) =>
            accepted.endsWith(ext || "")
        );

        if (!isValidExt && !ACCEPTED_TYPES.includes(selectedFile.type)) {
            toast({
                title: "Unsupported file type",
                description:
                    "Please upload a PDF, DOCX, DOC, TXT, XLSX, CSV, or PPTX file.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    };

    // Card 3: Handle file select
    const handleFileSelect = (selectedFile: File) => {
        if (validateFile(selectedFile)) {
            setFile(selectedFile);
        }
    };

    // Card 3: Handle drag and drop
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

    // Card 3: Handle file upload
    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("projectId", projectId);
            formData.append("extractOnly", "true"); // Only extract text, don't create intake session

            const response = await fetch("/api/intake/extract-text", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to process file");
            }

            logger.info(
                { fileName: file.name, contentLength: data.text?.length },
                "File processed successfully"
            );

            if (data.text) {
                onContentAppend(data.text);
                toast({
                    title: "Content imported!",
                    description: `Extracted text from ${file.name}`,
                });
            }

            setFile(null);
        } catch (error) {
            // Use userError for expected file processing failures - file may be invalid/corrupted
            logger.userError({ error, fileName: file?.name }, "Failed to process file");
            toast({
                title: "Upload failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to process file. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Get file icon based on extension
    const getFileIcon = (fileName: string) => {
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (ext === "xlsx" || ext === "xls" || ext === "csv") {
            return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
        }
        if (ext === "pptx" || ext === "ppt") {
            return <Presentation className="h-6 w-6 text-orange-600" />;
        }
        return <FileText className="h-6 w-6 text-primary" />;
    };

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Card 1: Copy Prompts for GPT */}
            <Card className="flex flex-col p-4">
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Copy className="h-4 w-4 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-foreground">
                        Copy Prompts for GPT
                    </h4>
                </div>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">
                    Copy questions to your trained GPT, then paste the response into the
                    input below.
                </p>
                <Button
                    variant={isCopied ? "secondary" : "outline"}
                    onClick={handleCopyPrompt}
                    className="w-full"
                    disabled={isCopied}
                >
                    {isCopied ? (
                        <>
                            <Check className="mr-2 h-4 w-4 text-green-600" />✓ Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Prompt
                        </>
                    )}
                </Button>
            </Card>

            {/* Card 2: Scrape Website URL */}
            <Card className="flex flex-col p-4">
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                        <Globe className="h-4 w-4 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-foreground">
                        Scrape Website URL
                    </h4>
                </div>
                <p className="mb-3 flex-1 text-sm text-muted-foreground">
                    Extract content from your website. Crawls up to 50 pages, 3 levels
                    deep.
                </p>
                <div className="space-y-2">
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="pl-9"
                            disabled={isScraping}
                        />
                    </div>
                    <Button
                        onClick={handleScrape}
                        disabled={!url || isScraping}
                        className="w-full"
                        variant="outline"
                    >
                        {isScraping ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {scrapeProgress
                                    ? `Scraping... (${scrapeProgress.current}/${scrapeProgress.total})`
                                    : "Scraping..."}
                            </>
                        ) : (
                            <>
                                <Globe className="mr-2 h-4 w-4" />
                                Scrape Website
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Card 3: Upload Document */}
            <Card className="flex flex-col p-4">
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <Upload className="h-4 w-4 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-foreground">Upload Document</h4>
                </div>
                <p className="mb-3 flex-1 text-sm text-muted-foreground">
                    Upload PDF, DOCX, TXT, XLSX, CSV, or PPTX files (max 10MB).
                </p>

                {!file ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={cn(
                            "cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors",
                            {
                                "border-primary bg-primary/5": isDragging,
                                "border-border hover:border-primary/50": !isDragging,
                            }
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                            Drop file or click to browse
                        </p>
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
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-2">
                            <div className="flex items-center gap-2">
                                {getFileIcon(file.name)}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="rounded p-1 hover:bg-muted"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>
                        <Button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full"
                            variant="outline"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload & Extract
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
