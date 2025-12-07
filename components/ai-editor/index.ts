/**
 * AI Editor Components
 * Lovable-style conversational landing page editor
 */

// Main layout
export { AIEditorLayout } from "./ai-editor-layout";

// Header components
export { EditorHeader } from "./header/editor-header";

// Chat components
export { ChatPanel } from "./chat/chat-panel";
export { MessageThread } from "./chat/message-thread";
export { UserMessage } from "./chat/user-message";
export { AIMessage } from "./chat/ai-message";
export { ThinkingIndicator } from "./chat/thinking-indicator";
export { EditSummaryCard } from "./chat/edit-summary-card";
export { QuickActionChips } from "./chat/quick-action-chips";
export { ChatInput } from "./chat/chat-input";

// Preview components
export { PreviewPanel } from "./preview/preview-panel";
export { PreviewIframe } from "./preview/preview-iframe";
export { DeviceFrame } from "./preview/device-frame";

// Hooks
export { useEditor } from "./hooks/use-editor";
export type { Message, Edit, EditSummary } from "./hooks/use-editor";
