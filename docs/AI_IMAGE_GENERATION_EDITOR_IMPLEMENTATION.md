# AI Image Generation & Page Editor Implementation

## Overview

This document summarizes the implementation of GitHub Issue #83: Funnel Page Editor UX
Improvements, including AI-powered image generation with DALL-E, enhanced image upload
capabilities, video integration from pitch videos, and AI-generated section blocks based
on intake data.

## Implemented Features

### 1. AI Image Generation with DALL-E

**Backend:**

- `app/api/pages/generate-image/route.ts` - DALL-E 3 image generation API endpoint
- `lib/ai/client.ts` - Extended with `generateImageWithAI()` function
- `lib/ai/types.ts` - Added image generation types (ImageSize, ImageQuality,
  GeneratedImage)

**Frontend:**

- `components/pages/image-generation-modal.tsx` - Full-featured modal for AI image
  generation
  - Text input for custom prompts
  - Suggested prompts for quick generation
  - Size selection (1024x1024, 1792x1024, 1024x1792)
  - Image preview and regeneration options
  - Insert into editor functionality

**Features:**

- Uses OpenAI DALL-E 3 for high-quality image generation
- Images automatically uploaded to Supabase Storage
- Metadata tracked in `page_media` table
- Loading states and error handling
- Prompt suggestions based on common use cases

### 2. Image Upload

**Backend:**

- `app/api/pages/upload-image/route.ts` - Image upload API with validation
  - Max file size: 5MB
  - Allowed types: JPG, PNG, WebP, GIF
  - Automatic dimension detection
  - Metadata tracking

**Frontend:**

- `components/pages/image-upload-button.tsx` - Versatile upload component
  - Drag-and-drop support
  - File picker fallback
  - Image preview before upload
  - Progress indicators
  - Button and dropzone variants

**Features:**

- Client-side validation
- Image preview generation
- Automatic upload to Supabase Storage
- Metadata extraction (dimensions, size, mime type)

### 3. Video Integration

**Backend:**

- `app/api/pages/pitch-videos/route.ts` - API to fetch pitch videos for a project
  - Returns videos from `pitch_videos` table
  - Includes Cloudflare thumbnail URLs
  - Filtered by project ownership

**Frontend:**

- `components/pages/video-selector-modal.tsx` - Video selection interface
  - Grid layout with video thumbnails
  - Video duration display
  - Search and filter capabilities
  - Single-select with visual feedback

**Features:**

- Uses existing pitch videos from Step 7
- No re-upload needed
- Cloudflare Stream integration for thumbnails
- Visual selection UI with hover states

### 4. AI Section Generation

**Backend:**

- `app/api/pages/generate-section-copy/route.ts` - Section copy generation API
- `lib/pages/section-copy-generator.ts` - Core section generation logic
  - Uses intake data for personalization
  - Page type awareness (registration, watch, enrollment)
  - Section-specific frameworks (hero, benefits, problem, solution, etc.)
  - Custom prompt support

**Frontend:**

- `components/pages/section-block-generator.tsx` - Section generation interface
  - 8 section types with descriptions
  - Optional custom instructions
  - Copy preview before insertion
  - Regeneration capability

**Features:**

- AI-powered copy based on intake data
- Framework-driven generation (Hook + Promise + CTA, etc.)
- Multiple section types supported
- Custom prompt override option
- Structured output matching section needs

### 5. Media Library

**Backend:**

- `app/api/pages/media/route.ts` - Media library API
  - List all uploaded and generated images
  - Filter by project, page, or media type
  - Pagination-ready structure

### 6. Database Schema

**Migration:** `supabase/migrations/20251031120000_add_page_media_table.sql`

**New Table: `page_media`**

- `id` - UUID primary key
- `funnel_project_id` - Foreign key to funnel_projects
- `page_id` - Foreign key to pages (nullable)
- `user_id` - Foreign key to auth.users
- `media_type` - Enum: 'uploaded_image', 'ai_generated_image', 'pitch_video'
- `storage_path` - Supabase storage path
- `public_url` - Public URL for media
- `prompt` - AI generation prompt (nullable)
- `metadata` - JSONB for dimensions, file size, etc.
- `created_at`, `updated_at` - Timestamps

**RLS Policies:**

- Users can only access their own project media
- Full CRUD permissions for project owners

**Storage Bucket:** `page-media`

- Public access for published pages
- 5MB file size limit
- Allowed types: image/jpeg, image/png, image/webp, image/gif

### 7. Editor Integration

**Updated Files:**

- `components/editor/editor-page-wrapper.tsx`
  - Added modal state management
  - Exposed modal openers to window for vanilla JS
  - Handler functions for all insertion actions
  - Modal components integrated in render

**Page Components Updated:**

- `app/funnel-builder/[projectId]/pages/registration/[pageId]/page.tsx`
- `app/funnel-builder/[projectId]/pages/watch/[pageId]/page.tsx`
- `app/funnel-builder/[projectId]/pages/enrollment/[pageId]/page.tsx`
- All now pass `projectId` to EditorPageWrapper

**TypeScript Declarations:**

- `types/pages.ts` - Added PageMedia, PitchVideo types
- `types/global.d.ts` - Extended Window and VisualEditor interfaces

## Architecture

### Data Flow

**AI Image Generation:**

1. User clicks "Generate AI Image" in editor
2. React modal opens via `window.openImageGenerationModal()`
3. User enters prompt and selects size
4. POST to `/api/pages/generate-image`
5. Server calls DALL-E API
6. Generated image downloaded and uploaded to Supabase
7. Metadata saved to `page_media` table
8. Image URL returned to frontend
9. `window.visualEditor.insertAIImage()` called to insert into page

**Image Upload:**

1. User selects or drops image file
2. Client-side validation (size, type)
3. POST to `/api/pages/upload-image` with FormData
4. Server validates and uploads to Supabase Storage
5. Metadata saved to `page_media` table
6. Public URL returned to frontend
7. `window.visualEditor.insertUploadedImage()` called

**Video Selection:**

1. User clicks "Insert Video" in editor
2. React modal opens via `window.openVideoSelectorModal()`
3. Modal fetches videos from `/api/pages/pitch-videos`
4. User selects video from grid
5. `window.visualEditor.insertVideoBlock()` called with video data

**Section Generation:**

1. User clicks "Generate Section" in editor
2. React modal opens via `window.openSectionGeneratorModal()`
3. User selects section type and optional custom prompt
4. POST to `/api/pages/generate-section-copy`
5. Server fetches intake data and page context
6. OpenAI generates section copy following framework
7. Copy displayed in preview
8. `window.visualEditor.insertGeneratedSection()` called

### Security

- **Authentication:** All API endpoints require authenticated user
- **Authorization:** Project ownership verified on all operations
- **Input Validation:** File size, type, and prompt length limits
- **RLS Policies:** Database-level access control
- **Rate Limiting:** Recommended for AI endpoints (not yet implemented)
- **Prompt Sanitization:** XSS prevention in user prompts

### Error Handling

- Sentry integration for error tracking
- Structured logging with context
- User-friendly error messages
- Retry logic with exponential backoff for AI calls
- Graceful degradation for failures

## Technical Specifications

### DALL-E Integration

- Model: dall-e-3
- Default size: 1024x1024
- Quality: standard (can upgrade to "hd")
- Style: vivid (more dramatic) or natural
- Cost: ~$0.04 per standard image, ~$0.08 per HD image

### Storage

- Platform: Supabase Storage
- Bucket: page-media (public)
- Max file size: 5MB
- Formats: JPEG, PNG, WebP, GIF
- CDN delivery via Supabase

### AI Models

- Image generation: DALL-E 3
- Copy generation: GPT-4o
- Temperature: 0.7 for creative copy
- Max tokens: 1500 for section copy

## Next Steps (Not Yet Implemented)

### Vanilla JS Editor Functions

The following functions need to be implemented in
`public/funnel-system/assets/js/visual-editor.js`:

1. **Image Insertion:**

   ```javascript
   insertAIImage(imageUrl, mediaId) {
     // Insert AI-generated image into current cursor position or selected block
   }

   insertUploadedImage(imageUrl, mediaId, filename) {
     // Insert uploaded image with proper alt text
   }

   insertInlineImage(imageUrl) {
     // Insert image inline within content
   }

   updateSectionBackground(sectionElement, imageUrl) {
     // Update section background image
   }
   ```

2. **Video Insertion:**

   ```javascript
   insertVideoBlock(video) {
     // Create video embed section with Cloudflare Stream player
     // Use video.video_id, video.title, video.thumbnail_url
   }
   ```

3. **Section Generation:**
   ```javascript
   insertGeneratedSection(sectionType, copy) {
     // Create section HTML based on type and generated copy
     // Match existing section templates and styling
   }
   ```

### CSS Styling

Add to `public/funnel-system/assets/css/editor.css`:

1. Toolbar buttons for new features
2. Inline image drag handles
3. Section background image controls
4. Video block styling
5. AI generation indicators

### Storage Bucket Creation

Run in Supabase dashboard or CLI:

```sql
-- Create storage bucket (if not auto-created by migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-media', 'page-media', true);

-- Set storage bucket policies
CREATE POLICY "Users can upload to page-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'page-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read access to page-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'page-media');
```

### Testing

**E2E Tests Needed:**

1. AI image generation flow
2. Image upload with drag-drop
3. Video selection and insertion
4. Section generation with intake data
5. Background image updates
6. Error handling scenarios

**Integration Tests:**

1. API endpoint authentication
2. Image upload validation
3. DALL-E API integration
4. Database operations
5. Storage operations

### Performance Optimizations

1. **Image Optimization:**
   - Lazy loading in editor
   - WebP conversion for modern browsers
   - Responsive image sizes via Supabase transforms

2. **Caching:**
   - Cache pitch videos list
   - Cache intake data for section generation
   - Client-side image preview caching

3. **Rate Limiting:**
   - Implement per-user rate limits for AI generation
   - Queue management for multiple generations
   - Cost tracking and budgets

## Usage Examples

### Generate AI Image

```typescript
// User workflow:
1. Click "Generate AI Image" button in editor toolbar
2. Enter prompt: "Modern minimalist hero background with soft gradient"
3. Select size: Wide (1792x1024)
4. Click "Generate Image"
5. Wait 10-30 seconds
6. Preview image
7. Click "Insert Image" or "Generate New Image"
```

### Upload Image

```typescript
// User workflow:
1. Click "Upload Image" or drag image to dropzone
2. Select image from file picker
3. Preview image
4. Automatic upload with progress indicator
5. Image inserted into editor
```

### Select Video

```typescript
// User workflow:
1. Click "Insert Video" button
2. Browse pitch videos in modal
3. Click video to select
4. Click "Insert Video"
5. Video block added to page
```

### Generate Section

```typescript
// User workflow:
1. Click "Generate Section" button
2. Select section type (e.g., "Hero Section")
3. Optionally add custom instructions
4. Click "Generate Section"
5. Review generated copy
6. Click "Insert Section" or "Regenerate"
```

## Monitoring and Analytics

**Log Events:**

- `ai_image_generated` - Track DALL-E usage and costs
- `image_uploaded` - Track storage usage
- `video_selected` - Track video usage patterns
- `section_generated` - Track AI copy generation

**Metrics to Track:**

- Image generation success rate
- Average generation time
- Upload success rate
- Storage usage per project
- AI generation costs
- User engagement with features

## Conclusion

This implementation provides a complete foundation for AI-powered page editing with
image generation, uploads, video integration, and section generation. The architecture
is extensible, secure, and follows established patterns in the codebase.

The main remaining work is implementing the vanilla JavaScript editor functions to
handle the insertion operations, which should integrate seamlessly with the existing
visual-editor.js architecture.
