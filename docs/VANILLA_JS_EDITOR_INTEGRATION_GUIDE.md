# Vanilla JS Editor Integration Guide

## Overview

This guide provides implementation patterns for integrating the new AI image generation,
video, and section features into the existing `visual-editor.js` file.

## Prerequisites

The React modals and API endpoints are complete. Window functions are exposed:

- `window.openImageGenerationModal()`
- `window.openVideoSelectorModal()`
- `window.openSectionGeneratorModal()`

Callbacks are set up to call these editor methods:

- `window.visualEditor.insertAIImage(imageUrl, mediaId)`
- `window.visualEditor.insertUploadedImage(imageUrl, mediaId, filename)`
- `window.visualEditor.insertVideoBlock(video)`
- `window.visualEditor.insertGeneratedSection(sectionType, copy)`

## Implementation Patterns

### 1. Add Toolbar Buttons

Add these buttons to the `setupToolbar()` method in `visual-editor.js`:

```javascript
setupToolbar() {
  // ... existing toolbar setup ...

  // AI Image Generation Button
  const aiImageBtn = document.createElement('button');
  aiImageBtn.className = 'toolbar-button';
  aiImageBtn.innerHTML = '✨ AI Image';
  aiImageBtn.title = 'Generate AI Image with DALL-E';
  aiImageBtn.onclick = () => {
    if (window.openImageGenerationModal) {
      window.openImageGenerationModal();
    } else {
      console.error('Image generation modal not available');
    }
  };
  toolbar.appendChild(aiImageBtn);

  // Upload Image Button
  const uploadImageBtn = document.createElement('button');
  uploadImageBtn.className = 'toolbar-button';
  uploadImageBtn.innerHTML = '📁 Upload Image';
  uploadImageBtn.title = 'Upload Image from Computer';
  uploadImageBtn.onclick = () => {
    // Trigger the React ImageUploadButton via a custom event
    document.dispatchEvent(new CustomEvent('editor:upload-image'));
  };
  toolbar.appendChild(uploadImageBtn);

  // Insert Video Button
  const videoBtn = document.createElement('button');
  videoBtn.className = 'toolbar-button';
  videoBtn.innerHTML = '🎥 Insert Video';
  videoBtn.title = 'Insert Pitch Video';
  videoBtn.onclick = () => {
    if (window.openVideoSelectorModal) {
      window.openVideoSelectorModal();
    } else {
      console.error('Video selector modal not available');
    }
  };
  toolbar.appendChild(videoBtn);

  // Generate Section Button
  const sectionBtn = document.createElement('button');
  sectionBtn.className = 'toolbar-button';
  sectionBtn.innerHTML = '📝 AI Section';
  sectionBtn.title = 'Generate AI Section with Copy';
  sectionBtn.onclick = () => {
    if (window.openSectionGeneratorModal) {
      window.openSectionGeneratorModal();
    } else {
      console.error('Section generator modal not available');
    }
  };
  toolbar.appendChild(sectionBtn);
}
```

### 2. Implement insertAIImage Method

```javascript
/**
 * Insert AI-generated image into the editor
 * @param {string} imageUrl - Public URL of the generated image
 * @param {string} mediaId - Database ID of the media record
 */
insertAIImage(imageUrl, mediaId) {
  console.log('Inserting AI-generated image:', imageUrl, mediaId);

  // Create image element
  const imgContainer = document.createElement('div');
  imgContainer.className = 'block image-block';
  imgContainer.setAttribute('data-block-type', 'image');
  imgContainer.setAttribute('data-media-id', mediaId);
  imgContainer.setAttribute('data-media-type', 'ai_generated');

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'AI Generated Image';
  img.style.width = '100%';
  img.style.height = 'auto';
  img.style.borderRadius = '8px';

  imgContainer.appendChild(img);

  // Insert after currently selected block or at the end
  const selectedBlock = this.selectedBlock;
  const pageContainer = document.querySelector('.page-container');

  if (selectedBlock && selectedBlock.parentNode) {
    selectedBlock.parentNode.insertBefore(imgContainer, selectedBlock.nextSibling);
  } else if (pageContainer) {
    pageContainer.appendChild(imgContainer);
  }

  // Make the image block editable and selectable
  this.makeBlockEditable(imgContainer);
  this.selectBlock(imgContainer);

  // Add context menu for image options
  this.addImageContextMenu(imgContainer);

  // Trigger auto-save
  this.saveState();
  this.showNotification('AI image inserted successfully!', 'success');
}
```

### 3. Implement insertUploadedImage Method

```javascript
/**
 * Insert uploaded image into the editor
 * @param {string} imageUrl - Public URL of the uploaded image
 * @param {string} mediaId - Database ID of the media record
 * @param {string} filename - Original filename
 */
insertUploadedImage(imageUrl, mediaId, filename) {
  console.log('Inserting uploaded image:', imageUrl, mediaId, filename);

  // Similar to insertAIImage but with uploaded media type
  const imgContainer = document.createElement('div');
  imgContainer.className = 'block image-block';
  imgContainer.setAttribute('data-block-type', 'image');
  imgContainer.setAttribute('data-media-id', mediaId);
  imgContainer.setAttribute('data-media-type', 'uploaded');

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = filename;
  img.style.width = '100%';
  img.style.height = 'auto';
  img.style.borderRadius = '8px';

  imgContainer.appendChild(img);

  // Insert logic (same as insertAIImage)
  const selectedBlock = this.selectedBlock;
  const pageContainer = document.querySelector('.page-container');

  if (selectedBlock && selectedBlock.parentNode) {
    selectedBlock.parentNode.insertBefore(imgContainer, selectedBlock.nextSibling);
  } else if (pageContainer) {
    pageContainer.appendChild(imgContainer);
  }

  this.makeBlockEditable(imgContainer);
  this.selectBlock(imgContainer);
  this.addImageContextMenu(imgContainer);
  this.saveState();
  this.showNotification('Image uploaded successfully!', 'success');
}
```

### 4. Implement insertInlineImage Method

```javascript
/**
 * Insert image inline at cursor position
 * @param {string} imageUrl - Public URL of the image
 */
insertInlineImage(imageUrl) {
  console.log('Inserting inline image:', imageUrl);

  const selection = window.getSelection();
  if (!selection.rangeCount) {
    console.warn('No selection found for inline image insertion');
    return;
  }

  const range = selection.getRangeAt(0);
  const img = document.createElement('img');
  img.src = imageUrl;
  img.style.maxWidth = '300px';
  img.style.height = 'auto';
  img.style.margin = '0 8px';
  img.style.verticalAlign = 'middle';
  img.setAttribute('data-inline-image', 'true');

  range.insertNode(img);

  // Move cursor after image
  range.setStartAfter(img);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);

  this.saveState();
  this.showNotification('Inline image inserted!', 'success');
}
```

### 5. Implement updateSectionBackground Method

```javascript
/**
 * Update section background image
 * @param {HTMLElement} sectionElement - The section block element
 * @param {string} imageUrl - Public URL of the background image
 */
updateSectionBackground(sectionElement, imageUrl) {
  console.log('Updating section background:', sectionElement, imageUrl);

  if (!sectionElement) {
    console.error('No section element provided');
    return;
  }

  // Set background image
  sectionElement.style.backgroundImage = `url('${imageUrl}')`;
  sectionElement.style.backgroundSize = 'cover';
  sectionElement.style.backgroundPosition = 'center';
  sectionElement.style.backgroundRepeat = 'no-repeat';

  // Store media ID as data attribute
  sectionElement.setAttribute('data-bg-image', imageUrl);

  // Optionally add overlay for better text readability
  if (!sectionElement.querySelector('.bg-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      pointer-events: none;
      z-index: 0;
    `;
    sectionElement.style.position = 'relative';
    sectionElement.insertBefore(overlay, sectionElement.firstChild);

    // Ensure content is above overlay
    Array.from(sectionElement.children).forEach(child => {
      if (child !== overlay) {
        child.style.position = 'relative';
        child.style.zIndex = '1';
      }
    });
  }

  this.saveState();
  this.showNotification('Background image updated!', 'success');
}
```

### 6. Implement insertVideoBlock Method

```javascript
/**
 * Insert video block from pitch videos
 * @param {Object} video - Video object with id, title, video_id, thumbnail_url
 */
insertVideoBlock(video) {
  console.log('Inserting video block:', video);

  // Create video container
  const videoContainer = document.createElement('div');
  videoContainer.className = 'block video-block';
  videoContainer.setAttribute('data-block-type', 'video');
  videoContainer.setAttribute('data-video-id', video.video_id);
  videoContainer.style.cssText = `
    position: relative;
    width: 100%;
    padding-top: 56.25%; /* 16:9 aspect ratio */
    margin: 2rem 0;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
  `;

  // Create iframe for Cloudflare Stream
  const iframe = document.createElement('iframe');
  iframe.src = `https://customer-${window.CLOUDFLARE_ACCOUNT_ID || 'default'}.cloudflarestream.com/${video.video_id}/iframe`;
  iframe.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  `;
  iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';
  iframe.allowFullscreen = true;

  videoContainer.appendChild(iframe);

  // Add caption
  const caption = document.createElement('div');
  caption.className = 'video-caption';
  caption.textContent = video.title || 'Video';
  caption.style.cssText = `
    margin-top: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
    color: #666;
  `;
  caption.setAttribute('data-editable', 'true');

  const wrapper = document.createElement('div');
  wrapper.appendChild(videoContainer);
  wrapper.appendChild(caption);
  wrapper.className = 'block';

  // Insert after selected block
  const selectedBlock = this.selectedBlock;
  const pageContainer = document.querySelector('.page-container');

  if (selectedBlock && selectedBlock.parentNode) {
    selectedBlock.parentNode.insertBefore(wrapper, selectedBlock.nextSibling);
  } else if (pageContainer) {
    pageContainer.appendChild(wrapper);
  }

  this.makeBlockEditable(wrapper);
  this.selectBlock(wrapper);
  this.saveState();
  this.showNotification('Video inserted successfully!', 'success');
}
```

### 7. Implement insertGeneratedSection Method

```javascript
/**
 * Insert AI-generated section with copy
 * @param {string} sectionType - Type of section (hero, benefits, etc.)
 * @param {Object} copy - Generated copy object with headline, body, bullets, etc.
 */
insertGeneratedSection(sectionType, copy) {
  console.log('Inserting generated section:', sectionType, copy);

  const section = document.createElement('section');
  section.className = `block ${sectionType}-section`;
  section.setAttribute('data-block-type', sectionType);
  section.setAttribute('data-ai-generated', 'true');
  section.style.padding = '4rem 2rem';

  let sectionHTML = '';

  // Build section HTML based on type
  switch (sectionType) {
    case 'hero':
      sectionHTML = `
        <div class="container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
          ${copy.headline ? `<h1 data-editable="true" style="font-size: 3rem; margin-bottom: 1rem;">${copy.headline}</h1>` : ''}
          ${copy.subheadline ? `<p data-editable="true" style="font-size: 1.25rem; color: #666; margin-bottom: 2rem;">${copy.subheadline}</p>` : ''}
          ${copy.cta || copy.buttonText ? `<button class="cta-button" data-editable="true" style="padding: 1rem 2rem; font-size: 1.125rem; border-radius: 8px;">${copy.cta || copy.buttonText}</button>` : ''}
        </div>
      `;
      break;

    case 'benefits':
    case 'features':
      sectionHTML = `
        <div class="container" style="max-width: 1200px; margin: 0 auto;">
          ${copy.headline ? `<h2 data-editable="true" style="font-size: 2.5rem; margin-bottom: 2rem; text-align: center;">${copy.headline}</h2>` : ''}
          ${copy.bullets && copy.bullets.length > 0 ? `
            <ul style="list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
              ${copy.bullets.map(bullet => `
                <li data-editable="true" style="padding: 1.5rem; background: #f9fafb; border-radius: 8px;">
                  <span style="font-size: 1.5rem; margin-right: 0.5rem;">✓</span>
                  ${bullet}
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      `;
      break;

    case 'problem':
    case 'solution':
      sectionHTML = `
        <div class="container" style="max-width: 800px; margin: 0 auto;">
          ${copy.headline ? `<h2 data-editable="true" style="font-size: 2.5rem; margin-bottom: 1.5rem;">${copy.headline}</h2>` : ''}
          ${copy.body ? `<p data-editable="true" style="font-size: 1.125rem; line-height: 1.7; color: #374151;">${copy.body}</p>` : ''}
          ${copy.bullets && copy.bullets.length > 0 ? `
            <ul style="margin-top: 2rem;">
              ${copy.bullets.map(bullet => `<li data-editable="true" style="margin-bottom: 1rem;">${bullet}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
      break;

    case 'cta':
      sectionHTML = `
        <div class="container" style="max-width: 800px; margin: 0 auto; text-align: center;">
          ${copy.headline ? `<h2 data-editable="true" style="font-size: 2.5rem; margin-bottom: 1rem;">${copy.headline}</h2>` : ''}
          ${copy.subheadline ? `<p data-editable="true" style="font-size: 1.25rem; color: #666; margin-bottom: 2rem;">${copy.subheadline}</p>` : ''}
          ${copy.buttonText || copy.cta ? `<button class="cta-button" data-editable="true" style="padding: 1rem 2rem; font-size: 1.125rem; border-radius: 8px;">${copy.buttonText || copy.cta}</button>` : ''}
        </div>
      `;
      break;

    default:
      sectionHTML = `
        <div class="container" style="max-width: 1200px; margin: 0 auto;">
          ${copy.headline ? `<h2 data-editable="true" style="font-size: 2.5rem; margin-bottom: 2rem;">${copy.headline}</h2>` : ''}
          ${copy.body ? `<p data-editable="true" style="font-size: 1.125rem; line-height: 1.7;">${copy.body}</p>` : ''}
        </div>
      `;
  }

  section.innerHTML = sectionHTML;

  // Insert after selected block
  const selectedBlock = this.selectedBlock;
  const pageContainer = document.querySelector('.page-container');

  if (selectedBlock && selectedBlock.parentNode) {
    selectedBlock.parentNode.insertBefore(section, selectedBlock.nextSibling);
  } else if (pageContainer) {
    pageContainer.appendChild(section);
  }

  // Make all editable elements functional
  section.querySelectorAll('[data-editable="true"]').forEach(el => {
    el.contentEditable = 'true';
    el.addEventListener('input', () => {
      if (window.scheduleAutoSave) {
        window.scheduleAutoSave();
      }
    });
  });

  this.makeBlockEditable(section);
  this.selectBlock(section);
  this.saveState();
  this.showNotification(`${sectionType} section inserted successfully!`, 'success');
}
```

### 8. Add Context Menu for Image Options

```javascript
/**
 * Add context menu to image blocks
 * @param {HTMLElement} imageBlock - The image block element
 */
addImageContextMenu(imageBlock) {
  imageBlock.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${e.pageX}px;
      top: ${e.pageY}px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 8px 0;
      z-index: 10000;
    `;

    const options = [
      { label: 'Replace Image', action: () => {
        if (window.openImageGenerationModal) {
          this.currentImageTarget = imageBlock.querySelector('img');
          window.openImageGenerationModal();
        }
      }},
      { label: 'Set as Section Background', action: () => {
        const section = imageBlock.closest('section') || imageBlock.closest('.block');
        if (section) {
          const img = imageBlock.querySelector('img');
          this.updateSectionBackground(section, img.src);
        }
      }},
      { label: 'Delete Image', action: () => {
        imageBlock.remove();
        this.saveState();
      }},
    ];

    options.forEach(option => {
      const item = document.createElement('div');
      item.textContent = option.label;
      item.style.cssText = 'padding: 8px 16px; cursor: pointer; transition: background 0.2s;';
      item.onmouseenter = () => item.style.background = '#f3f4f6';
      item.onmouseleave = () => item.style.background = '';
      item.onclick = () => {
        option.action();
        menu.remove();
      };
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Remove menu on click outside
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
  });
}
```

## CSS Additions

Add to `public/funnel-system/assets/css/editor.css`:

```css
/* Toolbar button styling */
.toolbar-button {
  padding: 8px 16px;
  margin: 0 4px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toolbar-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Image block styling */
.image-block {
  position: relative;
  margin: 1.5rem 0;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.image-block:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-block.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Video block styling */
.video-block {
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.video-block:hover {
  border-color: #3b82f6;
}

/* Section background overlay */
.bg-overlay {
  transition: opacity 0.3s;
}

section:hover .bg-overlay {
  opacity: 0.7;
}

/* Context menu */
.context-menu {
  min-width: 180px;
}

.context-menu div:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.context-menu div:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}
```

## Testing Checklist

- [ ] AI image generation button appears in toolbar
- [ ] Clicking AI image button opens modal
- [ ] Generated images insert correctly
- [ ] Upload image button works
- [ ] Drag-drop image upload functions
- [ ] Video selector opens and displays videos
- [ ] Video blocks render Cloudflare Stream player
- [ ] Section generator creates proper HTML structure
- [ ] All editable fields work correctly
- [ ] Auto-save triggers on changes
- [ ] Context menu appears on right-click
- [ ] Background image updates work
- [ ] Undo/redo includes new operations

## Deployment Notes

1. Run migration: `supabase migration up`
2. Create storage bucket if not auto-created
3. Test API endpoints with Postman
4. Verify RLS policies work
5. Test image generation costs in development first
6. Set up monitoring for AI API calls
7. Configure rate limiting if needed

## Support

For issues or questions, refer to:

- `docs/AI_IMAGE_GENERATION_EDITOR_IMPLEMENTATION.md` - Full implementation details
- GitHub Issue #83 - Original feature request
- Existing visual-editor.js patterns for block manipulation
