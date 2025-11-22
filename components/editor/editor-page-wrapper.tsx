"use client";

/**
 * Editor Page Wrapper
 * Minimal React component that loads vanilla JS editor and injects HTML content
 * Preserves 100% of genie-v1 editor functionality without React rewrite
 */

import Script from "next/script";
import { useEffect, useState } from "react";
import { logger } from "@/lib/client-logger";
import { PageRegenerateButton } from "@/components/pages/page-regenerate-button";
import { ImageGenerationModal } from "@/components/pages/image-generation-modal";
import { VideoSelectorModal } from "@/components/pages/video-selector-modal";
import { SectionBlockGenerator } from "@/components/pages/section-block-generator";
import { FieldRegenerateModal } from "@/components/pages/field-regenerate-modal";
import type { PitchVideo } from "@/types/pages";

interface EditorPageWrapperProps {
    pageId: string;
    projectId: string;
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
    projectId,
    pageType,
    htmlContent,
    theme,
    isEditMode,
}: EditorPageWrapperProps) {
    // Modal states for new features
    const [isImageGenModalOpen, setIsImageGenModalOpen] = useState(false);
    const [isVideoSelectorOpen, setIsVideoSelectorOpen] = useState(false);
    const [isSectionGeneratorOpen, setIsSectionGeneratorOpen] = useState(false);
    const [isFieldRegenerateOpen, setIsFieldRegenerateOpen] = useState(false);
    const [fieldToRegenerate, setFieldToRegenerate] = useState<{
        fieldId: string;
        fieldContext: string;
        element: HTMLElement;
    } | null>(null);

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

        // Load editor CSS files dynamically (with cache-busting)
        const cssFiles = [
            "/funnel-system/config/theme-variables.css?v=6.1",
            "/funnel-system/assets/css/editor.css?v=6.1",
            "/funnel-system/assets/css/blocks.css?v=6.1",
            "/funnel-system/assets/css/component-library.css?v=6.1",
        ];

        cssFiles.forEach((href) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            document.head.appendChild(link);
        });

        logger.info(
            { pageId, projectId, pageType, isEditMode },
            "📝 Editor page wrapper mounted - loading editor scripts"
        );

        // Debug log for theme
        logger.info({ theme }, "🎨 Theme CSS variables injected");

        // Expose modal openers to window for vanilla JS integration
        window.openImageGenerationModal = () => setIsImageGenModalOpen(true);
        window.openVideoSelectorModal = () => setIsVideoSelectorOpen(true);
        window.openSectionGeneratorModal = () => setIsSectionGeneratorOpen(true);
        window.openFieldRegenerateModal = (
            fieldId: string,
            fieldContext: string,
            element: HTMLElement
        ) => handleOpenFieldRegenerate(fieldId, fieldContext, element);

        logger.info({}, "✅ React modal handlers exposed to window");

        // Cleanup: remove CSS links and window functions when component unmounts
        return () => {
            cssFiles.forEach((href) => {
                const existingLink = document.querySelector(`link[href="${href}"]`);
                if (existingLink) {
                    existingLink.remove();
                }
            });

            delete window.openImageGenerationModal;
            delete window.openVideoSelectorModal;
            delete window.openSectionGeneratorModal;
            delete window.openFieldRegenerateModal;
        };
    }, [isEditMode, theme, pageId, projectId, pageType]);

    // Handler for AI-generated image
    const handleImageGenerated = (imageUrl: string, mediaId: string) => {
        logger.info({ imageUrl, mediaId }, "AI image generated, inserting into editor");

        // Call vanilla JS editor function to insert image
        if (window.visualEditor && window.visualEditor.insertAIImage) {
            window.visualEditor.insertAIImage(imageUrl, mediaId);
        }
    };

    // Handler for video selection
    const handleVideoSelected = (video: PitchVideo) => {
        logger.info({ video }, "Video selected, inserting into editor");

        // Call vanilla JS editor function to insert video
        if (window.visualEditor && window.visualEditor.insertVideoBlock) {
            window.visualEditor.insertVideoBlock(video);
        }
    };

    // Handler for generated section
    const handleSectionGenerated = (sectionType: string, copy: any) => {
        logger.info({ sectionType, copy }, "Section generated, inserting into editor");

        // Call vanilla JS editor function to insert section
        if (window.visualEditor && window.visualEditor.insertGeneratedSection) {
            window.visualEditor.insertGeneratedSection(sectionType, copy);
        }
    };

    // Handler to open field regenerate modal
    const handleOpenFieldRegenerate = (
        fieldId: string,
        fieldContext: string,
        element: HTMLElement
    ) => {
        logger.info({ fieldId }, "Opening field regenerate modal");
        setFieldToRegenerate({ fieldId, fieldContext, element });
        setIsFieldRegenerateOpen(true);
    };

    // Handler for selected field option
    const handleFieldOptionSelected = (newContent: string) => {
        logger.info(
            { hasContent: !!newContent, content: newContent.substring(0, 50) },
            "Field option selected"
        );

        if (fieldToRegenerate && newContent) {
            const element = fieldToRegenerate.element;

            // SIMPLE APPROACH: Update only text nodes, leave sparkle button untouched
            // Remove all text nodes but keep the sparkle button
            Array.from(element.childNodes).forEach((node) => {
                // Only remove text nodes, leave element nodes (like the sparkle button) alone
                if (node.nodeType === Node.TEXT_NODE) {
                    node.remove();
                }
            });

            // Add new text as first child (before the sparkle button)
            const textNode = document.createTextNode(newContent);
            element.insertBefore(textNode, element.firstChild);

            logger.info(
                {
                    newText: newContent.substring(0, 50),
                    hasSparkleButton: !!element.querySelector(".field-regenerate-btn"),
                },
                "Content updated - sparkle button preserved"
            );

            // Flash success
            element.style.background = "#dcfce7";
            setTimeout(() => {
                element.style.background = "";
            }, 1000);

            // Trigger auto-save
            setTimeout(() => {
                if (window.scheduleAutoSave) {
                    window.scheduleAutoSave();
                }
            }, 500);

            logger.info(
                { fieldId: fieldToRegenerate.fieldId },
                "Field update complete"
            );
        }
    };

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
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </>
        );
    }

    // Edit mode - load full editor
    return (
        <>
            {/* Theme CSS variables - Light theme enforcement */}
            <style>{`
                :root {
                    --primary-color: ${theme.primary};
                    --secondary-color: ${theme.secondary};
                    --background-color: ${theme.background};
                    --text-color: ${theme.text};

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

                /* Ensure page container uses light background */
                .page-container,
                .block,
                section {
                    background-color: var(--bg-primary, #FFFFFF);
                    color: var(--text-primary, #111827);
                }
            `}</style>

            {/* Editor CSS loaded via useEffect */}

            {/* Load icon mapper first */}
            <Script
                src="/funnel-system/assets/js/icon-mapper.js?v=6.4"
                strategy="afterInteractive"
                onLoad={() => {
                    logger.info({}, "Icon mapper script loaded");
                }}
            />

            {/* Load icon picker for interactive icon selection */}
            <Script
                src="/funnel-system/assets/js/icon-picker.js?v=6.4"
                strategy="afterInteractive"
                onLoad={() => {
                    logger.info({}, "Icon picker script loaded");
                }}
            />

            {/* Load editor JavaScript - vanilla JS works as-is! */}
            <Script
                src="/funnel-system/assets/js/visual-editor.js?v=6.6"
                strategy="afterInteractive"
                onLoad={() => {
                    logger.info({}, "Visual editor script loaded");

                    // CRITICAL: Instantiate the visual editor
                    if (typeof VisualEditor !== "undefined" && !window.visualEditor) {
                        window.visualEditor = new VisualEditor();
                        console.log("✅ Visual editor instantiated!");
                    }
                }}
                onError={(e) => {
                    logger.error({ error: e }, "Failed to load visual editor script");
                }}
            />
            <Script
                src="/funnel-system/assets/js/blocks.js?v=6.1"
                strategy="afterInteractive"
                onLoad={() => {
                    logger.info({}, "Blocks script loaded");

                    // CRITICAL: Instantiate BlockManager
                    if (typeof BlockManager !== "undefined" && !window.blockManager) {
                        window.blockManager = new BlockManager();
                        console.log("✅ Block manager instantiated!");
                    }
                }}
            />
            <Script
                src="/funnel-system/assets/js/component-library.js?v=6.1"
                strategy="afterInteractive"
                onLoad={() => {
                    logger.info({}, "Component library script loaded");

                    // CRITICAL: Instantiate ComponentLibrary
                    if (
                        typeof ComponentLibrary !== "undefined" &&
                        !window.componentLibrary
                    ) {
                        window.componentLibrary = new ComponentLibrary();
                        console.log("✅ Component library instantiated!");
                    }
                }}
            />

            {/* Editor UI containers - populated by vanilla JS */}
            <div id="editor-interface" className="editor-interface">
                <div id="editor-toolbar" className="editor-toolbar">
                    {/* Populated by visual-editor.js setupToolbar() */}
                    {/* Regenerate button - positioned at top of toolbar */}
                    <div
                        style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            zIndex: 100,
                        }}
                    >
                        <PageRegenerateButton
                            pageId={pageId}
                            pageType={pageType}
                            onRegenerate={() => {
                                logger.info(
                                    { pageId, pageType },
                                    "Page regenerated via button"
                                );
                            }}
                        />
                    </div>
                </div>
            </div>
            <div id="block-settings" className="block-settings">
                {/* Populated by visual-editor.js when block selected */}
            </div>
            <div id="component-library">{/* Populated by component-library.js */}</div>

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

            {/* Editor initialization and auto-save */}
            <Script id="editor-init" strategy="afterInteractive">
                {`
                    // Initialize immediately - DOM is already ready since scripts load afterInteractive
                    console.log('🎯 Initializing visual editor...');

                    // Setup function to connect toggle button
                    function connectToggleButton() {
                        const toggleBtn = document.getElementById('toggle-editor');
                        const editorInterface = document.getElementById('editor-interface');

                        if (toggleBtn && editorInterface) {
                            toggleBtn.addEventListener('click', () => {
                                editorInterface.classList.toggle('active');

                                // Toggle the visual editor edit mode
                                if (window.visualEditor) {
                                    window.visualEditor.toggleEditMode();
                                } else {
                                    console.warn('⚠️ Visual editor not loaded yet');
                                }
                            });

                            console.log('✅ Toggle button connected');
                            return true;
                        }
                        return false;
                    }

                    // Try connecting immediately, retry if elements not ready
                    if (!connectToggleButton()) {
                        setTimeout(connectToggleButton, 50);
                    }

                    // Wait for editor to load, then activate edit mode automatically
                    const waitForEditor = setInterval(() => {
                        if (window.visualEditor) {
                            clearInterval(waitForEditor);
                            console.log('✅ Visual editor loaded successfully');

                            const editorInterface = document.getElementById('editor-interface');
                            const editorToolbar = document.getElementById('editor-toolbar');

                            console.log('🔍 Editor elements:', {
                                editorInterface: editorInterface ? 'found' : 'MISSING',
                                editorToolbar: editorToolbar ? 'found' : 'MISSING',
                                toolbarHTML: editorToolbar?.innerHTML?.length || 0
                            });

                            if (editorInterface) {
                                // Show editor interface immediately
                                editorInterface.classList.add('active');
                                editorInterface.style.opacity = '1';
                                console.log('✅ Editor interface activated (should be visible now)');
                            }

                            // Activate edit mode - ensure it's ON
                            console.log('🔧 Current edit mode state:', window.visualEditor.isEditMode);
                            if (window.visualEditor.isEditMode === false) {
                                console.log('⚙️  Toggling edit mode ON...');
                                window.visualEditor.toggleEditMode();
                            } else {
                                console.log('✅ Edit mode already ON');
                            }

                            // Verify edit mode is ON after a short delay
                            setTimeout(() => {
                                console.log('🔍 Verifying edit mode after initialization:', {
                                    isEditMode: window.visualEditor.isEditMode,
                                    expectedState: true
                                });
                                if (!window.visualEditor.isEditMode) {
                                    console.warn('⚠️  Edit mode is OFF! This will prevent sparkle buttons from showing.');
                                    console.warn('💡 Try clicking the Edit button in the toolbar');
                                }
                            }, 1500);

                            // CRITICAL: Hook auto-save into editor events
                            // Override the editor's save function to use our database save
                            const originalSave = window.visualEditor.savePage || function() {};
                            window.visualEditor.savePage = function() {
                                console.log('💾 Editor save triggered - saving to database...');
                                if (window.saveToDatabase) {
                                    window.saveToDatabase();
                                }
                            };

                            // Auto-save on content changes
                            document.addEventListener('input', function(e) {
                                if (e.target.hasAttribute('data-editable') || e.target.closest('[data-editable]')) {
                                    console.log('✏️ Content edited - scheduling auto-save...');
                                    if (window.scheduleAutoSave) {
                                        window.scheduleAutoSave();
                                    }
                                }
                            });

                            // Auto-save on drag/drop
                            document.addEventListener('dragend', function() {
                                console.log('🔀 Block reordered - scheduling auto-save...');
                                if (window.scheduleAutoSave) {
                                    window.scheduleAutoSave();
                                }
                            });

                            // Auto-save on block deletion
                            document.addEventListener('click', function(e) {
                                if (e.target.closest('.delete-section-btn')) {
                                    console.log('🗑️ Block deleted - scheduling auto-save...');
                                    setTimeout(() => {
                                        if (window.scheduleAutoSave) {
                                            window.scheduleAutoSave();
                                        }
                                    }, 500); // Delay to let delete complete
                                }
                            });

                            console.log('🎨 Editor is now active and ready to use!');
                            console.log('📊 Toolbar should contain buttons, undo/redo, theme switcher');
                            console.log('💾 Auto-save hooks installed - edits will save in 3 seconds');

                            // Initialize icon picker click handlers after a short delay
                            setTimeout(() => {
                                if (window.iconPicker && window.iconPicker.initializeIconClickHandlers) {
                                    window.iconPicker.initializeIconClickHandlers();
                                    console.log('🎨 Icon picker click handlers initialized');
                                }
                            }, 1000);
                        }
                    }, 100);

                    // Timeout after 10 seconds
                    setTimeout(() => {
                        clearInterval(waitForEditor);
                        if (!window.visualEditor) {
                            console.error('❌ Visual editor failed to load within 10 seconds');
                            console.error('Check that funnel-system assets are deployed correctly');
                        }
                    }, 10000);

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

            {/* Per-field regeneration system */}
            <Script id="field-regeneration" strategy="afterInteractive">
                {`
                    console.log('🚀 AI Field Regeneration System: Initializing...');

                    // Add regenerate icons to editable fields
                    function addRegenerateIcons() {
                        const editableElements = document.querySelectorAll('[data-editable="true"]');
                        let fieldIdCounter = 0;

                        console.log('✨ AI Regeneration: Found', editableElements.length, 'editable fields');
                        console.log('✨ AI Regeneration: Editor state -', {
                            visualEditorExists: !!window.visualEditor,
                            isEditMode: window.visualEditor?.isEditMode,
                            editorType: typeof window.visualEditor
                        });

                        editableElements.forEach((element, index) => {
                            // Remove any existing regenerate button first (from previous load)
                            const existingBtn = element.querySelector('.field-regenerate-btn');
                            if (existingBtn) {
                                console.log('🔄 Removing old sparkle button from field', index);
                                existingBtn.remove();
                            }

                            // Generate field ID if not present
                            if (!element.getAttribute('data-field-id')) {
                                const blockType = element.closest('[data-block-type]')?.getAttribute('data-block-type') || 'unknown';
                                const fieldId = blockType + '-field-' + (fieldIdCounter++);
                                element.setAttribute('data-field-id', fieldId);
                                console.log('🏷️  Generated field ID:', fieldId, 'for element', index);
                            }

                            // Create regenerate button
                            const regenBtn = document.createElement('button');
                            regenBtn.className = 'field-regenerate-btn';
                            regenBtn.innerHTML = '✨';
                            regenBtn.title = 'Regenerate this field with AI';
                            regenBtn.style.cssText = \`
                                position: absolute;
                                top: 5px;
                                right: 5px;
                                width: 28px;
                                height: 28px;
                                border-radius: 6px;
                                background: rgba(37, 99, 235, 0.95);
                                color: white;
                                border: none;
                                cursor: pointer;
                                font-size: 14px;
                                display: none;
                                align-items: center;
                                justify-content: center;
                                z-index: 1000;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                                transition: all 0.2s;
                            \`;

                            regenBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const fieldId = element.getAttribute('data-field-id');
                                const fieldContext = element.textContent || element.innerText;

                                console.log('✨ Opening regenerate modal for field:', fieldId);

                                // Open the React modal with field data
                                if (window.openFieldRegenerateModal) {
                                    window.openFieldRegenerateModal(fieldId, fieldContext, element);
                                } else {
                                    console.error('❌ Field regenerate modal not available');
                                    alert('AI regeneration feature is loading. Please try again in a moment.');
                                }
                            });

                            // Make element position relative to contain absolute button
                            const currentPosition = window.getComputedStyle(element).position;
                            if (currentPosition === 'static') {
                                element.style.position = 'relative';
                            }

                            // Show/hide button on hover - with debug logging
                            element.addEventListener('mouseenter', () => {
                                const editorState = {
                                    visualEditorExists: !!window.visualEditor,
                                    isEditMode: window.visualEditor?.isEditMode,
                                    buttonWillShow: !!(window.visualEditor && window.visualEditor.isEditMode)
                                };

                                console.log('👆 Hover on field:', element.getAttribute('data-field-id'), editorState);

                                if (window.visualEditor && window.visualEditor.isEditMode) {
                                    regenBtn.style.display = 'flex';
                                    console.log('✨ Sparkle button shown for:', element.getAttribute('data-field-id'));
                                } else {
                                    console.warn('⚠️  Sparkle button NOT shown - edit mode check failed:', editorState);
                                }
                            });

                            element.addEventListener('mouseleave', () => {
                                regenBtn.style.display = 'none';
                            });

                            element.appendChild(regenBtn);
                        });

                        console.log('✅ AI Regeneration: Added sparkle buttons to', editableElements.length, 'fields');
                        console.log('💡 To see sparkles: Hover over any editable text in edit mode');
                    }

                    // Store reference to buttons for edit mode change handling
                    window.aiRegenerationButtons = [];

                    // Function to update button visibility based on edit mode
                    window.updateSparkleButtonsVisibility = function() {
                        const isEditMode = window.visualEditor?.isEditMode;
                        console.log('🔄 Updating sparkle button visibility. Edit mode:', isEditMode);

                        // Note: We don't change display here, that's handled by hover events
                        // This function just logs the state for debugging
                        if (!isEditMode) {
                            console.warn('⚠️  Edit mode is OFF - sparkle buttons will not appear on hover');
                            console.warn('💡 Click the Edit/Preview button in toolbar to enable edit mode');
                        } else {
                            console.log('✅ Edit mode is ON - sparkle buttons should appear on hover');
                        }
                    };

                    // Wait for editor to be ready, then add regenerate icons
                    let checkCount = 0;
                    const checkEditorReady = setInterval(() => {
                        checkCount++;
                        const editorExists = !!window.visualEditor;
                        const editableCount = document.querySelectorAll('[data-editable="true"]').length;

                        if (checkCount % 4 === 0) { // Log every 2 seconds
                            console.log('⏳ Waiting for editor... (attempt', checkCount, ')', {
                                editorExists,
                                editableCount,
                                isEditMode: window.visualEditor?.isEditMode
                            });
                        }

                        if (editorExists && editableCount > 0) {
                            clearInterval(checkEditorReady);
                            console.log('✅ Editor ready! Adding sparkle buttons in 1.5 seconds...');
                            console.log('📊 Current state:', {
                                editor: !!window.visualEditor,
                                editMode: window.visualEditor?.isEditMode,
                                editableFields: editableCount
                            });

                            // Wait 1.5 seconds to ensure edit mode is properly set
                            setTimeout(() => {
                                addRegenerateIcons();

                                // Check edit mode status after adding icons
                                setTimeout(() => {
                                    window.updateSparkleButtonsVisibility();
                                }, 500);

                                // CONTINUOUSLY monitor and maintain sparkle buttons
                                // Check every 2 seconds if buttons are missing and re-add them
                                setInterval(() => {
                                    const editables = document.querySelectorAll('[data-editable="true"]');
                                    let missingCount = 0;

                                    editables.forEach((element) => {
                                        // If element doesn't have a sparkle button, it got removed somehow
                                        if (!element.querySelector('.field-regenerate-btn')) {
                                            missingCount++;
                                        }
                                    });

                                    if (missingCount > 0) {
                                        console.log('🔧 Detected', missingCount, 'missing sparkle buttons - re-adding them');
                                        addRegenerateIcons();
                                    }
                                }, 2000); // Check every 2 seconds
                            }, 1500);
                        }
                    }, 500);

                    // Monitor for edit mode toggle button clicks
                    document.addEventListener('click', function(e) {
                        const toggleBtn = e.target.closest('#toggle-edit');
                        if (toggleBtn) {
                            // Wait for toggle to complete, then update visibility info
                            setTimeout(() => {
                                window.updateSparkleButtonsVisibility();
                            }, 100);
                        }
                    });

                    // Timeout after 15 seconds
                    setTimeout(() => {
                        clearInterval(checkEditorReady);
                        if (!window.visualEditor || document.querySelectorAll('[data-editable="true"]').length === 0) {
                            console.error('❌ AI Regeneration System: Timeout - Editor not ready after 15 seconds');
                            console.error('Debug info:', {
                                visualEditor: !!window.visualEditor,
                                editableFields: document.querySelectorAll('[data-editable="true"]').length,
                                isEditMode: window.visualEditor?.isEditMode
                            });
                        }
                    }, 15000);
                `}
            </Script>

            {/* New Feature Modals */}
            <ImageGenerationModal
                isOpen={isImageGenModalOpen}
                onClose={() => setIsImageGenModalOpen(false)}
                onImageGenerated={handleImageGenerated}
                projectId={projectId}
                pageId={pageId}
            />

            <VideoSelectorModal
                isOpen={isVideoSelectorOpen}
                onClose={() => setIsVideoSelectorOpen(false)}
                onVideoSelected={handleVideoSelected}
                projectId={projectId}
            />

            <SectionBlockGenerator
                isOpen={isSectionGeneratorOpen}
                onClose={() => setIsSectionGeneratorOpen(false)}
                onSectionGenerated={handleSectionGenerated}
                projectId={projectId}
                pageId={pageId}
            />

            {fieldToRegenerate && (
                <FieldRegenerateModal
                    isOpen={isFieldRegenerateOpen}
                    onClose={() => {
                        setIsFieldRegenerateOpen(false);
                        setFieldToRegenerate(null);
                    }}
                    onSelect={handleFieldOptionSelected}
                    fieldId={fieldToRegenerate.fieldId}
                    fieldContext={fieldToRegenerate.fieldContext}
                    pageId={pageId}
                    pageType={pageType}
                />
            )}
        </>
    );
}
