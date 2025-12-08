"use client";

/**
 * Public Page Wrapper
 * Renders generated HTML content with proper theme styling
 */

interface PublicPageWrapperProps {
    htmlContent: string;
    theme?: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
}

export function PublicPageWrapper({ htmlContent, theme }: PublicPageWrapperProps) {
    // Default theme if none provided
    const pageTheme = theme || {
        primary: "#2563eb",
        secondary: "#10b981",
        background: "#ffffff",
        text: "#1f2937",
    };

    return (
        <>
            {/* Load essential CSS files for proper page rendering */}
            <link
                rel="stylesheet"
                href="/funnel-system/config/theme-variables.css?v=6.1"
            />
            <link rel="stylesheet" href="/funnel-system/assets/css/blocks.css?v=6.1" />

            {/* Inject theme CSS variables */}
            <style>{`
                :root {
                    --primary-color: ${pageTheme.primary};
                    --secondary-color: ${pageTheme.secondary};
                    --background-color: ${pageTheme.background};
                    --text-color: ${pageTheme.text};

                    /* Force light theme - override any dark mode styles */
                    --text-primary: #111827 !important;
                    --text-secondary: #6B7280 !important;
                    --text-light: #9CA3AF !important;
                    --text-white: #FFFFFF !important;
                    --bg-primary: #FFFFFF !important;
                    --bg-secondary: hsl(120 30% 92%) !important;
                    --bg-tertiary: hsl(120 20% 95%) !important;
                    --bg-quaternary: hsl(120 15% 90%) !important;

                    /* Section backgrounds - light and clean */
                    --bg-section-1: #FFFFFF !important;
                    --bg-section-2: hsl(120 30% 96%) !important;
                    --bg-section-3: hsl(48 38% 98%) !important;
                    --bg-section-4: hsl(120 20% 97%) !important;
                    --bg-section-5: #FFFFFF !important;

                    --space-1: 0.25rem;
                    --space-2: 0.5rem;
                    --space-3: 0.75rem;
                    --space-4: 1rem;
                    --space-6: 1.5rem;
                    --space-8: 2rem;
                    --space-12: 3rem;
                    --space-16: 4rem;
                    --space-20: 5rem;
                }

                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #FFFFFF !important;
                    color: #111827 !important;
                }

                /* Ensure page content uses light backgrounds */
                .page-container,
                .block,
                section {
                    background-color: var(--bg-primary, #FFFFFF);
                    color: var(--text-primary, #111827);
                }
            `}</style>

            {/* Render the HTML content */}
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </>
    );
}
