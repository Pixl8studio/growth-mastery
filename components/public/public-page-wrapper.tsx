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
            {/* Inject theme CSS variables */}
            <style>{`
                :root {
                    --primary-color: ${pageTheme.primary};
                    --secondary-color: ${pageTheme.secondary};
                    --background-color: ${pageTheme.background};
                    --text-color: ${pageTheme.text};
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
                }
            `}</style>

            {/* Render the HTML content */}
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </>
    );
}
