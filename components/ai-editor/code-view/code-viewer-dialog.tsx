"use client";

/**
 * Code Viewer Dialog
 * Modal dialog for viewing HTML source code with syntax highlighting
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CodeViewerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    html: string;
    title?: string;
}

export function CodeViewerDialog({
    open,
    onOpenChange,
    html,
    title = "HTML Source",
}: CodeViewerDialogProps) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(html);
            setCopied(true);
            toast({
                title: "Copied to clipboard",
                description: "HTML source code has been copied.",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({
                title: "Failed to copy",
                description: "Could not copy to clipboard.",
                variant: "destructive",
            });
        }
    };

    const handleDownload = () => {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
            title: "Downloaded",
            description: "HTML file has been downloaded.",
        });
    };

    // Add line numbers to the HTML
    const lines = html.split("\n");
    const lineCount = lines.length;
    const lineNumberWidth = String(lineCount).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription className="sr-only">
                            View and copy the HTML source code for your page
                        </DialogDescription>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                className="h-8"
                            >
                                {copied ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                className="h-8"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-auto rounded-md border bg-muted/50">
                    <pre className="p-4 text-sm font-mono overflow-x-auto">
                        <code>
                            {lines.map((line, index) => (
                                <div key={index} className="flex">
                                    <span
                                        className="select-none text-muted-foreground pr-4 text-right"
                                        style={{ minWidth: `${lineNumberWidth + 1}ch` }}
                                    >
                                        {index + 1}
                                    </span>
                                    <span className="whitespace-pre">
                                        {line || " "}
                                    </span>
                                </div>
                            ))}
                        </code>
                    </pre>
                </div>
            </DialogContent>
        </Dialog>
    );
}
