/**
 * AI Editor Library
 * Exports all modules for the AI-powered landing page editor
 */

// Context aggregation
export { aggregateFunnelContext } from "./context-aggregator";

// Framework definitions and loading
export {
    getPageFramework,
    formatFrameworkForPrompt,
    getSectionOverview,
    loadPageFramework,
    type PageType,
    type PageFramework,
    type SectionSpec,
    type DesignSystemSpec,
    type CopyPrinciplesSpec,
} from "./framework-loader";

// Page generation
export {
    generatePage,
    validateGeneratedHtml,
    type GeneratePageOptions,
    type GeneratePageResult,
} from "./generator";

// Chat/edit processing
export {
    processEditRequest,
    getQuickEditMessage,
    QUICK_EDIT_PRESETS,
    type EditRequestOptions,
    type EditRequestResult,
    type QuickEditType,
} from "./chat-processor";

// Edit application
export {
    applyEdits,
    parseEditsFromResponse,
    type Edit,
    type EditResult,
} from "./edit-applier";
