"use client";

/**
 * Preview Iframe
 * Sandboxed iframe for rendering HTML content with Content Security Policy
 *
 * ## Security Features
 *
 * This component implements a Content Security Policy (CSP) to protect against XSS
 * and other injection attacks while still allowing necessary functionality.
 *
 * ## CSP Font CDN Limitations (PR #414)
 *
 * The CSP allows fonts from:
 * - fonts.googleapis.com (Google Fonts stylesheets)
 * - fonts.gstatic.com (Google Fonts font files)
 *
 * **IMPORTANT LIMITATION**: If the AI generates landing pages that use fonts from
 * other CDNs (e.g., Adobe Fonts, Font Squirrel, custom CDNs), those fonts will be
 * blocked by CSP and fall back to system fonts.
 *
 * Supported font sources:
 * - Google Fonts (recommended) - fully supported
 * - Self-hosted fonts (embedded as data: URIs) - supported
 * - System fonts - always available
 *
 * Unsupported font sources (will be blocked):
 * - Adobe Fonts (use.typekit.net)
 * - Font Squirrel CDN
 * - Custom font CDNs
 *
 * To add support for additional font CDNs, update the CSP_META_TAG below.
 * Trade-off: Each additional CDN increases attack surface.
 */

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PreviewIframeProps {
    html: string;
    deviceMode: "desktop" | "tablet" | "mobile";
    isProcessing: boolean;
    refreshKey?: number;
}

const viewportWidths = {
    desktop: 1280,
    tablet: 768,
    mobile: 375,
};

/**
 * Content Security Policy for iframe content
 *
 * This CSP allows:
 * - Inline scripts (required for AI-generated interactive elements)
 * - Inline styles (required for AI-generated styling)
 * - Images from any HTTPS source and data URIs
 * - Fonts from Google Fonts CDN and data URIs
 * - Media from any HTTPS source
 *
 * Security trade-offs documented above.
 */
const CSP_META_TAG = `<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  media-src 'self' https:;
  connect-src 'self' https:;
  frame-src 'none';
">`
    .replace(/\s+/g, " ")
    .trim();

/**
 * Inject CSP meta tag into HTML content
 * Adds security headers while preserving existing content
 */
function injectCsp(html: string): string {
    if (!html) return html;

    // Check if CSP already exists
    if (html.includes("Content-Security-Policy")) {
        return html;
    }

    // Inject CSP into <head>
    if (html.includes("<head>")) {
        return html.replace("<head>", `<head>\n  ${CSP_META_TAG}`);
    }

    // If no <head>, inject after <html>
    if (html.includes("<html")) {
        const htmlTagEnd = html.indexOf(">", html.indexOf("<html"));
        if (htmlTagEnd !== -1) {
            return (
                html.slice(0, htmlTagEnd + 1) +
                `\n<head>\n  ${CSP_META_TAG}\n</head>` +
                html.slice(htmlTagEnd + 1)
            );
        }
    }

    // Fallback: prepend CSP
    return `<!DOCTYPE html>\n<html>\n<head>\n  ${CSP_META_TAG}\n</head>\n<body>\n${html}\n</body>\n</html>`;
}

export function PreviewIframe({
    html,
    deviceMode,
    isProcessing,
    refreshKey = 0,
}: PreviewIframeProps) {
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
        // Inject CSP for security (PR #414)
        const fullHtml = injectCsp(html || getPlaceholderHtml());
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
    }, [html, refreshKey]);

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
