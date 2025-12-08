"use client";

/**
 * Preview Iframe
 * Sandboxed iframe for rendering HTML content
 */

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PreviewIframeProps {
    html: string;
    deviceMode: "desktop" | "tablet" | "mobile";
    isProcessing: boolean;
}

const viewportWidths = {
    desktop: 1280,
    tablet: 768,
    mobile: 375,
};

export function PreviewIframe({ html, deviceMode, isProcessing }: PreviewIframeProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scrollPosition, setScrollPosition] = useState(0);

    // Update iframe content when HTML changes
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        // Save scroll position
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
                requestAnimationFrame(() => {
                    setScrollPosition(iframeDoc.documentElement.scrollTop || 0);
                });
            }
        } catch {
            // Cross-origin iframe, ignore
        }

        requestAnimationFrame(() => {
            setIsLoading(true);
        });

        // Use srcdoc for sandboxed content
        const fullHtml = html || getPlaceholderHtml();
        iframe.srcdoc = fullHtml;

        // Handle load event
        const handleLoad = () => {
            setIsLoading(false);

            // Restore scroll position
            try {
                const iframeDoc =
                    iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    iframeDoc.documentElement.scrollTop = scrollPosition;
                }
            } catch {
                // Cross-origin iframe, ignore
            }

            // Add flash effect for edited elements (handled by edit-applier)
        };

        iframe.addEventListener("load", handleLoad);
        return () => iframe.removeEventListener("load", handleLoad);
    }, [html]);

    const width = viewportWidths[deviceMode];

    return (
        <div className="relative h-full w-full">
            {/* Loading Overlay */}
            {(isLoading || isProcessing) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">
                            {isProcessing
                                ? "Applying changes..."
                                : "Loading preview..."}
                        </span>
                    </div>
                </div>
            )}

            {/* Iframe */}
            <iframe
                ref={iframeRef}
                title="Page Preview"
                sandbox="allow-scripts allow-same-origin"
                className={cn("border-0 bg-white", "transition-all duration-300")}
                style={{
                    width: deviceMode === "desktop" ? "100%" : `${width}px`,
                    height: "100%",
                    minHeight: deviceMode === "desktop" ? "600px" : "auto",
                    display: "block",
                }}
            />
        </div>
    );
}

// Placeholder HTML when no content is provided
function getPlaceholderHtml(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .placeholder {
      text-align: center;
      padding: 2rem;
    }
    .placeholder-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }
    p {
      color: #6b7280;
      max-width: 400px;
    }
  </style>
</head>
<body>
  <div class="placeholder">
    <div class="placeholder-icon">🎨</div>
    <h1>Ready to Create</h1>
    <p>Generate your landing page to see the preview here. Your AI-powered page will appear in real-time as you make edits.</p>
  </div>
</body>
</html>
  `.trim();
}
