/**
 * Global type declarations for vanilla JavaScript editor components.
 * These classes are loaded from external scripts in the public directory.
 */

/**
 * Visual Editor - Main editor controller class
 */
declare class VisualEditor {
    constructor();
    toggleEditMode(): void;
    setupToolbar(): void;
    attachToDOM(): void;
    saveContent(): Promise<void>;
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
}
