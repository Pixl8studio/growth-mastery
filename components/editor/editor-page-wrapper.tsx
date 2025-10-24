"use client";

/**
 * Editor Page Wrapper
 * Minimal React component that loads vanilla JS editor and injects HTML content
 * Preserves 100% of genie-v1 editor functionality without React rewrite
 */

import Script from "next/script";
import { useEffect } from "react";
import { logger } from "@/lib/client-logger";

interface EditorPageWrapperProps {
    pageId: string;
    pageType: "registration" | "watch" | "enrollment";
    htmlContent: string;
    theme: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    isEditMode: boolean;
}

export function EditorPageWrapper({
    pageId,
    pageType,
    htmlContent,
    theme,
    isEditMode,
}: EditorPageWrapperProps) {
    useEffect(() => {
        if (!isEditMode) return;

        // Inject theme CSS variables for editor
        const root = document.documentElement;
        root.style.setProperty("--primary-color", theme.primary);
        root.style.setProperty("--secondary-color", theme.secondary);
        root.style.setProperty("--background-color", theme.background);
        root.style.setProperty("--text-color", theme.text);

        // Spacing variables from genie-v1
        const spacingScale = {
            "--space-1": "0.25rem",
            "--space-2": "0.5rem",
            "--space-3": "0.75rem",
            "--space-4": "1rem",
            "--space-6": "1.5rem",
            "--space-8": "2rem",
            "--space-12": "3rem",
            "--space-16": "4rem",
            "--space-20": "5rem",
        };

        Object.entries(spacingScale).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        logger.info(
            { pageId, pageType, isEditMode },
            "Editor page wrapper initialized"
        );
    }, [isEditMode, theme, pageId, pageType]);

    // If not in edit mode, just render the HTML content
    if (!isEditMode) {
        return (
            <>
                <style>{`
                    :root {
                        --primary-color: ${theme.primary};
                        --secondary-color: ${theme.secondary};
                        --background-color: ${theme.background};
                        --text-color: ${theme.text};
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
                `}</style>
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </>
        );
    }

    // Edit mode - load full editor
    return (
        <>
            {/* Theme CSS variables */}
            <style>{`
                :root {
                    --primary-color: ${theme.primary};
                    --secondary-color: ${theme.secondary};
                    --background-color: ${theme.background};
                    --text-color: ${theme.text};
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

            {/* Load editor CSS */}
            <link rel="stylesheet" href="/funnel-system/assets/css/editor.css" />
            <link rel="stylesheet" href="/funnel-system/assets/css/blocks.css" />
            <link
                rel="stylesheet"
                href="/funnel-system/assets/css/component-library.css"
            />

            {/* Load editor JavaScript - vanilla JS works as-is! */}
            <Script
                src="/funnel-system/assets/js/visual-editor.js"
                strategy="afterInteractive"
                onLoad={() => {
                    logger.info({}, "Visual editor script loaded");
                }}
                onError={(e) => {
                    logger.error({ error: e }, "Failed to load visual editor script");
                }}
            />
            <Script
                src="/funnel-system/assets/js/blocks.js"
                strategy="afterInteractive"
                onLoad={() => logger.info({}, "Blocks script loaded")}
            />
            <Script
                src="/funnel-system/assets/js/component-library.js"
                strategy="afterInteractive"
                onLoad={() => logger.info({}, "Component library script loaded")}
            />

            {/* Editor UI containers - populated by vanilla JS */}
            <div id="editor-interface" className="editor-interface" />
            <div id="block-settings" className="block-settings" />
            <div id="component-library" />

            {/* Page content - editor attaches to DOM automatically */}
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />

            {/* Toggle edit mode button */}
            <button
                id="toggle-editor"
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    zIndex: 99998,
                    padding: "15px",
                    background: theme.primary,
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "60px",
                    height: "60px",
                    cursor: "pointer",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                    fontSize: "20px",
                }}
            >
                ✏️
            </button>

            {/* Auto-save integration */}
            <Script id="auto-save-setup" strategy="afterInteractive">
                {`
                    // Auto-save function for database persistence
                    window.saveToDatabase = async function() {
                        try {
                            const pageContainer = document.querySelector('.page-container');
                            if (!pageContainer) {
                                console.warn('No page container found for auto-save');
                                return;
                            }

                            const response = await fetch('/api/pages/${pageType}/${pageId}', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    html_content: pageContainer.outerHTML
                                })
                            });

                            const data = await response.json();

                            if (data.success) {
                                console.log('✅ Page auto-saved to database');
                                if (window.showSaveIndicator) {
                                    window.showSaveIndicator('Saved to Database');
                                }
                            } else {
                                console.error('❌ Failed to save page:', data.error);
                            }
                        } catch (error) {
                            console.error('❌ Auto-save error:', error);
                        }
                    };

                    // Schedule auto-save function (called by editor)
                    let saveTimeout;
                    window.scheduleAutoSave = function() {
                        clearTimeout(saveTimeout);
                        saveTimeout = setTimeout(() => {
                            window.saveToDatabase();
                        }, 3000); // 3-second debounce
                    };

                    console.log('✅ Auto-save system initialized for ${pageType} page ${pageId}');
                `}
            </Script>
        </>
    );
}
