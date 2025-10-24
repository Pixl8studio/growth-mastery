/**
 * Block Functionality for Funnel Pages
 * Handles animations, interactions, and general block behavior
 */

class BlockManager {
  constructor() {
    this.animationObserver = null;
    this.init();
  }

  init() {
    this.setupAnimations();
    this.setupInteractions();
    this.setupFormHandling();
    this.setupAnalytics();
  }

  /**
   * Setup intersection observer for animations
   */
  setupAnimations() {
    // Disconnect existing observer to prevent duplicates
    if (this.animationObserver) {
      this.animationObserver.disconnect();
    }
    
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    this.animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          
          // Stagger animation for grid items
          const gridItems = entry.target.querySelectorAll('.feature-card, .testimonial-card');
          if (gridItems.length > 0) {
            gridItems.forEach((item, index) => {
              setTimeout(() => {
                item.classList.add('visible');
              }, index * 150);
            });
          }
        }
      });
    }, observerOptions);

    // Observe all blocks (including dynamically loaded ones)
    document.querySelectorAll('.block').forEach(block => {
      // Only add fade-in class if it doesn't already have it
      if (!block.classList.contains('fade-in')) {
        block.classList.add('fade-in');
      }
      
      // Always observe the block (even if re-observing)
      this.animationObserver.observe(block);
      
      // If block is already in view, make it visible immediately
      const rect = block.getBoundingClientRect();
      const isInView = rect.top < window.innerHeight && rect.bottom > 0;
      if (isInView) {
        block.classList.add('visible');
      }
    });
    
    console.log('✅ Animation observer setup complete for', document.querySelectorAll('.block').length, 'blocks');
  }

  /**
   * Setup interactive elements
   */
  setupInteractions() {
    // FAQ toggles
    this.setupFAQToggles();
    
    // Smooth scrolling
    this.setupSmoothScrolling();
    
    // Button hover effects
    this.setupButtonEffects();
    
    // Testimonial interactions
    this.setupTestimonialEffects();
  }

  setupFAQToggles() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      
      if (question && answer) {
        question.addEventListener('click', () => {
          const isActive = item.classList.contains('active');
          
          // Close all other FAQ items
          faqItems.forEach(otherItem => {
            if (otherItem !== item) {
              otherItem.classList.remove('active');
              const otherAnswer = otherItem.querySelector('.faq-answer');
              if (otherAnswer) {
                otherAnswer.style.maxHeight = '0px';
              }
            }
          });
          
          // Toggle current item
          if (!isActive) {
            item.classList.add('active');
            // Calculate the actual height needed
            answer.style.maxHeight = 'none';
            const height = answer.scrollHeight;
            answer.style.maxHeight = '0px';
            // Force reflow
            answer.offsetHeight;
            // Set the target height
            answer.style.maxHeight = height + 'px';
          } else {
            item.classList.remove('active');
            answer.style.maxHeight = '0px';
          }
        });
      }
    });
  }

  setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Skip if it's just "#"
        if (href === '#') {
          e.preventDefault();
          return;
        }
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          
          const offsetTop = target.offsetTop - 80; // Account for fixed header
          
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
          
          // Track click
          this.trackEvent('scroll_to_section', {
            section: href.substring(1),
            element_text: this.textContent.trim()
          });
        }
      }.bind(this));
    });
  }

  setupButtonEffects() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
      // Add ripple effect
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
      
      // Track button clicks
      button.addEventListener('click', (e) => {
        this.trackEvent('button_click', {
          button_text: button.textContent.trim(),
          button_href: button.getAttribute('href') || '',
          button_type: button.className.includes('btn-primary') ? 'primary' : 'secondary'
        });
      });
    });
  }

  setupTestimonialEffects() {
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    
    testimonialCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px) scale(1.02)';
        card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.1)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      });
    });
  }

  /**
   * Setup form handling
   */
  setupFormHandling() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmission(form);
      });
    });
  }

  handleFormSubmission(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"], .btn');
    const originalText = submitButton ? submitButton.textContent : '';
    
    if (submitButton) {
      submitButton.textContent = 'Processing...';
      submitButton.disabled = true;
    }
    
    // Track form submission
    this.trackEvent('form_submit', {
      form_type: form.dataset.formType || 'contact',
      fields: Object.keys(data)
    });
    
    // Simulate API call (replace with actual endpoint)
    setTimeout(() => {
      this.showNotification('Thank you! We\'ll be in touch soon.', 'success');
      form.reset();
      
      if (submitButton) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    }, 2000);
  }

  /**
   * Setup analytics tracking
   */
  setupAnalytics() {
    // Track page view
    this.trackEvent('page_view', {
      page_title: document.title,
      page_url: window.location.href
    });
    
    // Track scroll depth
    this.setupScrollTracking();
    
    // Track time on page
    this.setupTimeTracking();
  }

  setupScrollTracking() {
    let scrollDepths = [25, 50, 75, 90];
    let trackedDepths = new Set();
    
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      scrollDepths.forEach(depth => {
        if (scrollPercent >= depth && !trackedDepths.has(depth)) {
          trackedDepths.add(depth);
          this.trackEvent('scroll_depth', {
            depth: depth,
            page_url: window.location.href
          });
        }
      });
    });
  }

  setupTimeTracking() {
    const startTime = Date.now();
    
    // Track time milestones
    const milestones = [30, 60, 120, 300]; // seconds
    const tracked = new Set();
    
    setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      milestones.forEach(milestone => {
        if (timeSpent >= milestone && !tracked.has(milestone)) {
          tracked.add(milestone);
          this.trackEvent('time_on_page', {
            duration: milestone,
            page_url: window.location.href
          });
        }
      });
    }, 5000);
  }

  /**
   * Track events (replace with your analytics service)
   */
  trackEvent(eventName, properties = {}) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }
    
    // Facebook Pixel
    if (typeof fbq !== 'undefined') {
      fbq('track', eventName, properties);
    }
    
    // Custom analytics
    if (window.analytics) {
      window.analytics.track(eventName, properties);
    }
    
    // Console log for debugging
    console.log('Event tracked:', eventName, properties);
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Auto remove
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  /**
   * Utility methods
   */
  
  // Get viewport dimensions
  getViewport() {
    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight
    };
  }
  
  // Check if element is in viewport
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    const viewport = this.getViewport();
    
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewport.height &&
      rect.right <= viewport.width
    );
  }
  
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Add CSS for ripple effect
const rippleCSS = `
.btn {
  position: relative;
  overflow: hidden;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  animation: ripple-animation 0.6s linear;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.feature-card,
.testimonial-card {
  transition: all 0.3s ease;
}

.feature-card.visible,
.testimonial-card.visible {
  opacity: 1;
  transform: translateY(0);
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.blockManager = new BlockManager();
  
  // Add global safety net for invisible content
  setInterval(() => {
    const invisibleBlocks = document.querySelectorAll('.fade-in:not(.visible)');
    if (invisibleBlocks.length > 0) {
      console.log('🚨 Safety net: Found', invisibleBlocks.length, 'invisible blocks, making them visible');
      invisibleBlocks.forEach(block => {
        // Check if block is actually in view
        const rect = block.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > -100;
        if (isInView) {
          block.classList.add('visible');
        }
      });
    }
  }, 2000); // Check every 2 seconds
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlockManager;
}
