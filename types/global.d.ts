/**
 * Global type declarations for vanilla JavaScript editor components.
 * These classes are loaded from external scripts in the public directory.
 */

/**
 * Visual Editor - Main editor controller class
 */
declare class VisualEditor {
    constructor();
    isEditMode: boolean;
    toggleEditMode(): void;
    setupToolbar(): void;
    attachToDOM(): void;
    saveContent(): Promise<void>;
    savePage(): void;

    // New image and media methods
    insertAIImage(imageUrl: string, mediaId: string): void;
    insertUploadedImage(imageUrl: string, mediaId: string, filename: string): void;
    insertInlineImage(imageUrl: string): void;
    updateSectionBackground(sectionElement: HTMLElement, imageUrl: string): void;

    // Video methods
    insertVideoBlock(video: import("@/types/pages").PitchVideo): void;

    // Section generation methods
    insertGeneratedSection(sectionType: string, copy: Record<string, unknown>): void;

    // Add other methods as needed
}

/**
 * Block Manager - Handles block operations and selection
 */
declare class BlockManager {
    constructor();
    selectBlock(element: HTMLElement): void;
    deleteBlock(element: HTMLElement): void;
    duplicateBlock(element: HTMLElement): void;
    moveBlock(element: HTMLElement, direction: "up" | "down"): void;
    // Add other methods as needed
}

/**
 * Component Library - Manages available components and drag-drop
 */
declare class ComponentLibrary {
    constructor();
    setupDragDrop(): void;
    addComponent(type: string, config: Record<string, unknown>): void;
    // Add other methods as needed
}

/**
 * Extend the Window interface to include editor globals
 */
interface Window {
    visualEditor?: VisualEditor;
    blockManager?: BlockManager;
    componentLibrary?: ComponentLibrary;

    // Database save functions
    saveToDatabase?: () => Promise<void>;
    scheduleAutoSave?: () => void;
    showSaveIndicator?: (message: string) => void;

    // Modal opener functions (exposed by React components)
    openImageGenerationModal?: () => void;
    openVideoSelectorModal?: () => void;
    openSectionGeneratorModal?: () => void;
    openFieldRegenerateModal?: (
        fieldId: string,
        fieldContext: string,
        element: HTMLElement
    ) => void;

    // AI field regeneration functions
    addRegenerateIcons?: () => void;
}
