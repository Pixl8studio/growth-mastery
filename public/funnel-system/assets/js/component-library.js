/**
 * Framer-Inspired Component Library System
 * Advanced left navigation with categorized elements
 */

class ComponentLibrary {
  constructor() {
    this.isVisible = false;
    this.activeCategory = null;
    this.components = this.initializeComponents();
    this.init();
  }

  init() {
    this.createLibraryInterface();
    this.setupEventListeners();
    this.renderComponents();
  }

  initializeComponents() {
    return {
      start: {
        icon: '🚀',
        label: 'Start',
        items: [
          { id: 'wireframe', name: 'Wireframe', icon: '📐', description: 'Basic layout structure' },
          { id: 'template', name: 'Template', icon: '📄', description: 'Pre-built page templates' }
        ]
      },
      basics: {
        icon: '🔧',
        label: 'Basics',
        expanded: true,
        items: [
          { id: 'section', name: 'Section', icon: '📦', description: 'Container section', preview: 'section-preview.svg' },
          { id: 'hero', name: 'Hero', icon: '🎯', description: 'Hero section with CTA', preview: 'hero-preview.svg' },
          { id: 'navigation', name: 'Navigation', icon: '🧭', description: 'Site navigation menu', preview: 'nav-preview.svg' },
          { id: 'footer', name: 'Footer', icon: '⬇️', description: 'Page footer section', preview: 'footer-preview.svg' }
        ]
      },
      content: {
        icon: '📝',
        label: 'Content',
        items: [
          { id: 'text', name: 'Text Block', icon: '📄', description: 'Rich text content', preview: 'text-preview.svg' },
          { id: 'heading', name: 'Heading', icon: '📰', description: 'Page headings H1-H6', preview: 'heading-preview.svg' },
          { id: 'list', name: 'List', icon: '📋', description: 'Bulleted or numbered lists', preview: 'list-preview.svg' },
          { id: 'story', name: 'Story Section', icon: '👤', description: 'About/presenter section with photo', preview: 'story-preview.svg', color: '#8b5cf6' },
          { id: 'quote', name: 'Quote Banner', icon: '💬', description: 'Centered quote with background image', preview: 'quote-preview.svg', color: '#f59e0b' }
        ]
      },
      media: {
        icon: '🎨',
        label: 'Media',
        items: [
          { id: 'image', name: 'Image', icon: '🖼️', description: 'Static images', preview: 'image-preview.svg', color: '#3b82f6' },
          { id: 'gallery', name: 'Gallery', icon: '🖼️', description: 'Image gallery grid', preview: 'gallery-preview.svg', color: '#3b82f6' },
          { id: 'video', name: 'Video', icon: '🎥', description: 'Video player', preview: 'video-preview.svg', color: '#f59e0b' },
          { id: 'youtube', name: 'YouTube', icon: '📺', description: 'YouTube embed', preview: 'youtube-preview.svg', color: '#ef4444' },
          { id: 'vimeo', name: 'Vimeo', icon: '🎬', description: 'Vimeo embed', preview: 'vimeo-preview.svg', color: '#06b6d4' }
        ]
      },
      forms: {
        icon: '📝',
        label: 'Forms',
        items: [
          { id: 'contact-form', name: 'Contact Form', icon: '📧', description: 'Contact form builder', preview: 'contact-form-preview.svg', color: '#10b981' },
          { id: 'newsletter', name: 'Newsletter', icon: '📬', description: 'Email signup form', preview: 'newsletter-preview.svg', color: '#10b981' },
          { id: 'survey', name: 'Survey', icon: '📊', description: 'Survey form builder', preview: 'survey-preview.svg', color: '#10b981' },
          { id: 'payment', name: 'Payment Form', icon: '💳', description: 'Payment collection form', preview: 'payment-preview.svg', color: '#8b5cf6' }
        ]
      },
      interactive: {
        icon: '⚡',
        label: 'Interactive',
        items: [
          { id: 'button', name: 'Button', icon: '🔘', description: 'Call-to-action buttons', preview: 'button-preview.svg', color: '#3b82f6' },
          { id: 'tabs', name: 'Tabs', icon: '📑', description: 'Tabbed content sections', preview: 'tabs-preview.svg', color: '#06b6d4' },
          { id: 'accordion', name: 'Accordion', icon: '📂', description: 'Collapsible content', preview: 'accordion-preview.svg', color: '#06b6d4' },
          { id: 'modal', name: 'Modal', icon: '🔲', description: 'Popup modal window', preview: 'modal-preview.svg', color: '#8b5cf6' },
          { id: 'countdown', name: 'Countdown', icon: '⏰', description: 'Countdown timer', preview: 'countdown-preview.svg', color: '#f59e0b' },
          { id: 'progress', name: 'Progress Bar', icon: '📊', description: 'Progress indicator', preview: 'progress-preview.svg', color: '#10b981' }
        ]
      },
      ecommerce: {
        icon: '🛒',
        label: 'E-commerce',
        items: [
          { id: 'product-card', name: 'Product Card', icon: '🏷️', description: 'Product display card', preview: 'product-preview.svg', color: '#f59e0b' },
          { id: 'pricing-table', name: 'Pricing Table', icon: '💰', description: 'Pricing comparison table', preview: 'pricing-preview.svg', color: '#10b981' },
          { id: 'cart', name: 'Shopping Cart', icon: '🛒', description: 'Shopping cart widget', preview: 'cart-preview.svg', color: '#f59e0b' },
          { id: 'checkout', name: 'Checkout Form', icon: '💳', description: 'Checkout process form', preview: 'checkout-preview.svg', color: '#8b5cf6' }
        ]
      },
      testimonials: {
        icon: '⭐',
        label: 'Testimonials',
        items: [
          { id: 'testimonial-card', name: 'Testimonial Card', icon: '💬', description: 'Single testimonial', preview: 'testimonial-preview.svg', color: '#f59e0b' },
          { id: 'testimonial-grid', name: 'Testimonial Grid', icon: '📱', description: 'Multiple testimonials grid', preview: 'testimonial-grid-preview.svg', color: '#f59e0b' },
          { id: 'testimonial-slider', name: 'Testimonial Slider', icon: '🎠', description: 'Rotating testimonials', preview: 'testimonial-slider-preview.svg', color: '#f59e0b' },
          { id: 'review-stars', name: 'Review Stars', icon: '⭐', description: 'Star rating display', preview: 'stars-preview.svg', color: '#f59e0b' }
        ]
      },
      social: {
        icon: '📱',
        label: 'Social',
        items: [
          { id: 'social-links', name: 'Social Links', icon: '🔗', description: 'Social media links', preview: 'social-links-preview.svg', color: '#3b82f6' },
          { id: 'instagram-feed', name: 'Instagram Feed', icon: '📸', description: 'Instagram post feed', preview: 'instagram-preview.svg', color: '#e91e63' },
          { id: 'twitter-embed', name: 'Twitter Embed', icon: '🐦', description: 'Twitter timeline embed', preview: 'twitter-preview.svg', color: '#1da1f2' },
          { id: 'facebook-like', name: 'Facebook Like', icon: '👍', description: 'Facebook like button', preview: 'facebook-preview.svg', color: '#4267b2' }
        ]
      },
      advanced: {
        icon: '🔬',
        label: 'Advanced',
        items: [
          { id: 'custom-code', name: 'Custom Code', icon: '💻', description: 'Custom HTML/CSS/JS', preview: 'code-preview.svg', color: '#6b7280' },
          { id: 'embed', name: 'Embed', icon: '🔌', description: 'Third-party embeds', preview: 'embed-preview.svg', color: '#6b7280' },
          { id: 'api-data', name: 'API Data', icon: '🔄', description: 'Dynamic API content', preview: 'api-preview.svg', color: '#8b5cf6' },
          { id: 'animation', name: 'Animation', icon: '✨', description: 'CSS animations', preview: 'animation-preview.svg', color: '#f59e0b' }
        ]
      }
    };
  }

  createLibraryInterface() {
    const libraryHTML = `
      <div id="component-library" class="component-library">
        <div class="library-header">
          <div class="library-title">
            <h3>Components</h3>
            <button class="library-toggle" id="library-toggle">
              <span class="toggle-icon">←</span>
            </button>
          </div>
          <div class="library-spacer"></div>
        </div>
        <div class="library-content" id="library-content">
          <!-- Categories will be rendered here -->
        </div>
      </div>
    `;

    // Insert into page
    const existingLibrary = document.getElementById('component-library');
    if (existingLibrary) {
      existingLibrary.remove();
    }

    document.body.insertAdjacentHTML('beforeend', libraryHTML);
  }

  renderComponents() {
    const content = document.getElementById('library-content');
    if (!content) return;

    let html = '';

    Object.entries(this.components).forEach(([categoryKey, category]) => {
      const isExpanded = category.expanded || this.activeCategory === categoryKey;
      const filteredItems = category.items;

      html += `
        <div class="component-category ${isExpanded ? 'expanded' : ''}" data-category="${categoryKey}">
          <div class="category-header" data-category="${categoryKey}">
            <span class="category-icon">${category.icon}</span>
            <span class="category-label">${category.label}</span>
            <span class="category-count">${filteredItems.length}</span>
            <span class="category-arrow">▶</span>
          </div>
          <div class="category-content">
            <div class="component-grid">
              ${filteredItems.map(item => this.renderComponentCard(item)).join('')}
            </div>
          </div>
        </div>
      `;
    });

    content.innerHTML = html;
  }

  renderComponentCard(item) {
    const color = item.color || '#6b7280';
    // Convert emoji to SVG if available
    const iconHtml = typeof window.emojiToSvg === 'function' ? window.emojiToSvg(item.icon) : item.icon;
    return `
      <div class="component-card"
           data-component="${item.id}"
           draggable="true"
           title="${item.description}">
        <div class="component-preview" style="background: linear-gradient(135deg, ${color}20, ${color}10);">
          <span class="component-icon" style="color: ${color}">${iconHtml}</span>
        </div>
        <div class="component-info">
          <h4 class="component-name">${item.name}</h4>
          <p class="component-description">${item.description}</p>
        </div>
        <div class="component-actions">
          <button class="add-component-btn" data-component="${item.id}" title="Add to page">+</button>
        </div>
      </div>
    `;
  }

  filterItems(items) {
    return items;
  }

  setupEventListeners() {
    // Toggle library visibility
    document.addEventListener('click', (e) => {
      if (e.target.id === 'library-toggle' || e.target.closest('#library-toggle')) {
        this.toggleLibrary();
      }

      // Category expansion
      if (e.target.closest('.category-header')) {
        const categoryKey = e.target.closest('.category-header').dataset.category;
        this.toggleCategory(categoryKey);
      }

      // Add component
      if (e.target.classList.contains('add-component-btn')) {
        const componentId = e.target.dataset.component;
        this.addComponentToPage(componentId);
      }

    });

    // Drag and drop
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('component-card')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.component);
        e.target.classList.add('dragging');
      }
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('component-card')) {
        e.target.classList.remove('dragging');
      }
    });

    // Keyboard shortcuts - disabled for current release
    /*
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'l':
            e.preventDefault();
            this.toggleLibrary();
            break;
        }
      }
    });
    */
  }

  toggleLibrary() {
    const library = document.getElementById('component-library');
    if (!library) return;

    this.isVisible = !this.isVisible;
    library.classList.toggle('visible', this.isVisible);

    const toggleIcon = document.querySelector('#library-toggle .toggle-icon');
    if (toggleIcon) {
      toggleIcon.textContent = this.isVisible ? '←' : '→';
    }
  }

  toggleCategory(categoryKey) {
    const category = document.querySelector(`[data-category="${categoryKey}"]`);
    if (!category) return;

    const isExpanded = category.classList.contains('expanded');

    // Collapse all categories first
    document.querySelectorAll('.component-category').forEach(cat => {
      cat.classList.remove('expanded');
    });

    // Expand clicked category if it wasn't expanded
    if (!isExpanded) {
      category.classList.add('expanded');
      this.activeCategory = categoryKey;
    } else {
      this.activeCategory = null;
    }
  }

  addComponentToPage(componentId) {
    console.log('Adding component to page:', componentId);

    // Find the component definition
    let componentData = null;
    Object.values(this.components).forEach(category => {
      const found = category.items.find(item => item.id === componentId);
      if (found) componentData = found;
    });

    if (!componentData) return;

    // Create the component HTML based on type
    const componentHTML = this.generateComponentHTML(componentId, componentData);

    // Add to page (integrate with existing visual editor)
    if (window.visualEditor) {
      window.visualEditor.addCustomComponent(componentHTML, componentData);
    } else {
      // Fallback: add to page container
      const pageContainer = document.querySelector('.page-container');
      if (pageContainer) {
        pageContainer.insertAdjacentHTML('beforeend', componentHTML);
      }
    }

    // Show success notification
    this.showNotification(`${componentData.name} added to page!`, 'success');
  }

  generateComponentHTML(componentId, componentData) {
    // Component templates based on type
    const templates = {
      'testimonial-card': `
        <div class="block testimonial-block" data-block-type="testimonial" data-component-id="${componentId}">
          <div class="container">
            <div class="testimonial-grid">
              <div class="testimonial-card">
                <p class="testimonial-quote" data-editable="true">"This is an amazing product that has transformed our business!"</p>
                <div class="testimonial-author">
                  <div class="testimonial-avatar"></div>
                  <div class="testimonial-info">
                    <h4 data-editable="true">Customer Name</h4>
                    <p data-editable="true">CEO, Company Name</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      'pricing-table': `
        <div class="block pricing-block" data-block-type="pricing" data-component-id="${componentId}">
          <div class="container">
            <div class="pricing-options">
              <div class="pricing-card">
                <div class="pricing-badge" data-editable="true">Popular</div>
                <div class="pricing-amount" data-editable="true">$99</div>
                <div class="pricing-period" data-editable="true">per month</div>
                <ul class="pricing-features">
                  <li data-editable="true">Feature 1</li>
                  <li data-editable="true">Feature 2</li>
                  <li data-editable="true">Feature 3</li>
                </ul>
                <a href="#" class="btn btn-primary btn-large" data-editable="true">Get Started</a>
              </div>
            </div>
          </div>
        </div>
      `,
      'hero': `
        <div class="block hero-block" data-block-type="hero" data-component-id="${componentId}">
          <div class="container">
            <div class="hero-content">
              <h1 class="hero-title" data-editable="true">Your Amazing Headline</h1>
              <p class="hero-subtitle" data-editable="true">Compelling subtitle that converts visitors into customers</p>
              <div class="hero-cta">
                <a href="#" class="btn btn-primary btn-large" data-editable="true">Get Started Now</a>
              </div>
            </div>
          </div>
        </div>
      `,
      'contact-form': `
        <div class="block form-block" data-block-type="form" data-component-id="${componentId}">
          <div class="container">
            <form class="contact-form">
              <div class="form-row">
                <input type="text" placeholder="Your Name" required>
                <input type="email" placeholder="Your Email" required>
              </div>
              <textarea placeholder="Your Message" required></textarea>
              <button type="submit" class="btn btn-primary">Send Message</button>
            </form>
          </div>
        </div>
      `,
      'story': `
        <div class="block story-block bg-section-1" data-block-type="story" data-component-id="${componentId}" style="padding: var(--space-20) 0;">
          <div class="container">
            <div class="story-card" style="background: white; padding: var(--space-12); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); max-width: 1000px; margin: 0 auto;">
              <div class="story-content" style="display: grid; grid-template-columns: 300px 1fr; gap: var(--space-12); align-items: center;">
                <div class="story-image" style="text-align: center;">
                  <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNEY0NkU1Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K" alt="Presenter Photo" data-editable="true" style="width: 100%; max-width: 300px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
                </div>
                <div class="story-text">
                  <div class="story-header" style="margin-bottom: var(--space-6);">
                    <p class="story-label" data-editable="true" style="font-size: var(--text-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary-color); margin-bottom: var(--space-2);">
                      MEET THE PRESENTER
                    </p>
                    <h2 class="story-name" data-editable="true" style="font-size: var(--text-4xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-6);">
                      Your Name Here
                    </h2>
                  </div>
                  <div class="story-bio" style="margin-bottom: var(--space-6);">
                    <p data-editable="true" style="font-size: var(--text-lg); line-height: 1.6; color: var(--text-secondary); margin-bottom: var(--space-4);">
                      Share your story here. Talk about your background, expertise, and what drives you to help others succeed in their journey.
                    </p>
                  </div>
                  <div class="story-credentials">
                    <div class="credential-item" style="display: flex; align-items: center; margin-bottom: var(--space-3);">
                      <span style="color: var(--primary-color); margin-right: var(--space-2);">✓</span>
                      <span data-editable="true" style="font-size: var(--text-base); color: var(--text-secondary);">Years of Experience</span>
                    </div>
                    <div class="credential-item" style="display: flex; align-items: center; margin-bottom: var(--space-3);">
                      <span style="color: var(--primary-color); margin-right: var(--space-2);">✓</span>
                      <span data-editable="true" style="font-size: var(--text-base); color: var(--text-secondary);">Key Achievement</span>
                    </div>
                    <div class="credential-item" style="display: flex; align-items: center;">
                      <span style="color: var(--primary-color); margin-right: var(--space-2);">✓</span>
                      <span data-editable="true" style="font-size: var(--text-base); color: var(--text-secondary);">Notable Recognition</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Mobile responsive layout -->
              <style>
                @media (max-width: 768px) {
                  .story-content {
                    grid-template-columns: 1fr !important;
                    text-align: center;
                    gap: var(--space-8) !important;
                  }
                  .story-image {
                    order: -1;
                  }
                  .story-image img {
                    max-width: 200px !important;
                  }
                  .story-card {
                    margin: 0 var(--space-4) !important;
                  }
                }
              </style>
            </div>
          </div>
        </div>
      `,
      'quote': `
        <div class="block quote-block" data-block-type="quote" data-component-id="${componentId}" style="background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/Screenshot 2568-09-30 at 2.22.29 AM.png') center/cover; padding: var(--space-20) 0; text-align: center; color: white; position: relative;">
          <div class="container">
            <div class="quote-content" style="max-width: 900px; margin: 0 auto;">
              <div class="quote-icon" style="font-size: 4rem; color: var(--primary-color); margin-bottom: var(--space-6); opacity: 0.9;">❝</div>
              <blockquote class="quote-text" data-editable="true" style="font-size: var(--text-3xl); line-height: 1.4; font-weight: 400; font-style: italic; color: white; margin-bottom: var(--space-8); text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">
                "Success is not final, failure is not fatal: it is the courage to continue that counts."
              </blockquote>
              <div class="quote-attribution">
                <cite class="quote-author" data-editable="true" style="font-size: var(--text-xl); font-weight: 600; color: white; display: block; margin-bottom: var(--space-2);">
                  Winston Churchill
                </cite>
                <span class="quote-title" data-editable="true" style="font-size: var(--text-base); color: rgba(255, 255, 255, 0.8); font-style: normal;">
                  Former Prime Minister
                </span>
              </div>
            </div>
          </div>
        </div>
      `,
      'footer': `
        <div class="block footer-block bg-footer" data-block-type="footer" data-component-id="${componentId}">
          <div class="container">
            <div class="footer-content">
              <h3 data-editable="true" style="color: white; margin-bottom: var(--space-6);">
                Ready to Transform Your Business?
              </h3>
              <p data-editable="true" style="color: rgba(255, 255, 255, 0.9); margin-bottom: var(--space-8); max-width: 600px; margin-left: auto; margin-right: auto;">
                Join thousands of successful entrepreneurs who have already transformed their business with our proven system.
              </p>
              <div class="footer-links">
                <a href="#" class="footer-link" data-editable="true">Privacy Policy</a>
                <a href="#" class="footer-link" data-editable="true">Terms of Service</a>
                <a href="#" class="footer-link" data-editable="true">Contact</a>
                <a href="#" class="footer-link" data-editable="true">Support</a>
              </div>
              <div class="footer-copyright">
                <p data-editable="true">© 2024 Your Company Name. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      `
    };

    return templates[componentId] || `
      <div class="block custom-block" data-component-id="${componentId}">
        <div class="container">
          <h3 data-editable="true">${componentData.name}</h3>
          <p data-editable="true">${componentData.description}</p>
        </div>
      </div>
    `;
  }


  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `library-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Initialize component library when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.componentLibrary = new ComponentLibrary();

  // Show library by default
  setTimeout(() => {
    window.componentLibrary.toggleLibrary();
  }, 500);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentLibrary;
}
