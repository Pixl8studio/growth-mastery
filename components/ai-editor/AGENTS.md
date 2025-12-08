# AI Editor Components

Lovable-style conversational landing page editor with Claude Sonnet 4 integration.

## Architecture

- Split-pane layout: 35% chat panel, 65% preview iframe
- Device preview modes: desktop (1280px), tablet (768px), mobile (375px)
- State managed in `hooks/use-editor.ts` with Sentry observability

## Component Structure

- `chat/` - Message thread, input, AI responses, quick actions
- `preview/` - Iframe sandbox with device frames
- `header/` - Toolbar with undo, device selector, publish

## Current Status (Phase 4)

Implemented: device preview, error handling, auto-save, undo (in-memory) Not
implemented: version history UI, HTML export, version restore

## Related Code

- API routes: `app/api/ai-editor/`
- Library: `lib/ai-editor/` (generator, chat-processor, edit-applier)
- Types: `types/ai-editor.ts`
- Database: `ai_editor_pages`, `ai_editor_conversations`, `ai_editor_versions`
