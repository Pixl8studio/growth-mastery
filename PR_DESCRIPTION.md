# Fix Intake Step Upload and Auto-Generate Errors

## Summary

This PR fixes multiple issues with the intake step upload and auto-generate
functionality, and adds new session management features.

## Changes

### Bug Fixes

1. **Fixed auto-generate button errors**
   - Enhanced error handling in auto-generation API and orchestrator
   - Added detailed error logging with context for debugging
   - Improved error messages propagated to UI
   - Added try-catch blocks around each generation step

2. **Fixed .docx upload error**
   - Improved error handling in `extractTextFromDocx()` function
   - Added file validation before processing
   - Enhanced error messages with file name and specific error details
   - Added validation for empty files and corrupted documents
   - Better error messages passed through to UI

3. **Verified paste and scrape functionality**
   - Enhanced error handling in paste and scrape endpoints
   - Improved error messages for failed scrapes
   - Better logging for debugging

### Enhancements

4. **Added session rename functionality**
   - Created API endpoint `/api/intake/rename` to update session names
   - Added inline editing UI in session list
   - Users can now rename intake sessions after creation
   - Edit button with save/cancel functionality

5. **Combined multiple intake methods into one session**
   - Modified auto-generation to fetch and combine all intake records for a project
   - All intake methods (documents, URLs, pasted content, voice calls) are now combined
     for generation
   - Added visual indicator showing when multiple sessions are combined
   - Combined transcript text includes session separators for clarity

6. **Updated button text**
   - Changed "Generate Deck Structure" to "Define Offer" in Step 1
   - Improved navigation flow clarity

## Files Changed

- `app/api/generate/auto-generate-all/route.ts` - Improved error handling
- `app/api/intake/upload/route.ts` - Enhanced error messages
- `app/api/intake/paste/route.ts` - Improved error handling
- `app/api/intake/scrape/route.ts` - Enhanced error messages
- `app/api/intake/rename/route.ts` - New endpoint for renaming sessions
- `app/funnel-builder/[projectId]/step/1/page.tsx` - Added rename UI, combined sessions,
  button text update
- `lib/generators/auto-generation-orchestrator.ts` - Enhanced error handling and logging
- `lib/intake/processors.ts` - Improved DOCX extraction error handling

## Testing

- [x] All TypeScript checks pass
- [x] All linter checks pass
- [x] Pre-commit hooks pass
- [x] Code follows project standards

## Related Issues

Fixes #1
