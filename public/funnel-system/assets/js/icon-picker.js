/**
 * Icon Picker Modal
 * Interactive UI for selecting icons from the library
 */

class IconPicker {
    constructor() {
        this.currentElement = null;
        this.currentIconName = null;
        this.onSelectCallback = null;
        this.init();
    }

    init() {
        this.createModal();
        this.attachStyles();
    }

    attachStyles() {
        if (document.getElementById("icon-picker-styles")) return;

        const styles = document.createElement("style");
        styles.id = "icon-picker-styles";
        styles.textContent = `
            .icon-picker-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                z-index: 100000;
                display: none;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }

            .icon-picker-overlay.active {
                display: flex;
            }

            .icon-picker-modal {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                animation: slideUp 0.3s ease;
            }

            .icon-picker-header {
                padding: 24px 24px 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            .icon-picker-header h2 {
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 700;
                color: #111827;
            }

            .icon-picker-header p {
                margin: 0;
                font-size: 14px;
                color: #6b7280;
            }

            .icon-picker-search {
                padding: 16px 24px;
                border-bottom: 1px solid #e5e7eb;
            }

            .icon-picker-search input {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                transition: all 0.2s;
            }

            .icon-picker-search input:focus {
                outline: none;
                border-color: hsl(103 89% 29%);
                box-shadow: 0 0 0 3px hsla(103, 89%, 29%, 0.1);
            }

            .icon-picker-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .icon-category {
                margin-bottom: 32px;
            }

            .icon-category:last-child {
                margin-bottom: 0;
            }

            .icon-category-title {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6b7280;
                margin-bottom: 12px;
            }

            .icon-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 8px;
            }

            .icon-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 16px 8px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                background: white;
            }

            .icon-item:hover {
                border-color: hsl(103 89% 29%);
                background: hsl(103 89% 98%);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .icon-item.selected {
                border-color: hsl(103 89% 29%);
                background: hsl(103 89% 95%);
                box-shadow: 0 0 0 3px hsla(103, 89%, 29%, 0.2);
            }

            .icon-item svg {
                width: 32px;
                height: 32px;
                color: #111827;
                stroke-width: 1.5;
                margin-bottom: 8px;
            }

            .icon-item-name {
                font-size: 10px;
                color: #6b7280;
                text-align: center;
                line-height: 1.2;
            }

            .icon-picker-footer {
                padding: 16px 24px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            .icon-picker-btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .icon-picker-btn-cancel {
                background: #f3f4f6;
                color: #374151;
            }

            .icon-picker-btn-cancel:hover {
                background: #e5e7eb;
            }

            .icon-picker-btn-select {
                background: hsl(103 89% 29%);
                color: white;
            }

            .icon-picker-btn-select:hover {
                background: hsl(103 89% 25%);
            }

            .icon-picker-btn-select:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .icon-picker-empty {
                text-align: center;
                padding: 48px 24px;
                color: #9ca3af;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Make icons clickable in the editor */
            .feature-icon,
            .screen-icon {
                cursor: pointer !important;
                transition: all 0.2s !important;
                position: relative !important;
            }

            .feature-icon:hover,
            .screen-icon:hover {
                transform: scale(1.1) !important;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) !important;
            }

            .feature-icon::after,
            .screen-icon::after {
                content: "Click to change";
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                color: #6b7280;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: none;
            }

            .feature-icon:hover::after,
            .screen-icon:hover::after {
                opacity: 1;
            }
        `;
        document.head.appendChild(styles);
    }

    createModal() {
        const overlay = document.createElement("div");
        overlay.className = "icon-picker-overlay";
        overlay.id = "icon-picker-overlay";

        overlay.innerHTML = `
            <div class="icon-picker-modal" onclick="event.stopPropagation()">
                <div class="icon-picker-header">
                    <h2>Choose an Icon</h2>
                    <p>Select an icon to replace the current one</p>
                </div>

                <div class="icon-picker-search">
                    <input
                        type="text"
                        id="icon-search-input"
                        placeholder="Search icons..."
                        autocomplete="off"
                    />
                </div>

                <div class="icon-picker-body" id="icon-picker-body">
                    <!-- Icons will be populated here -->
                </div>

                <div class="icon-picker-footer">
                    <button class="icon-picker-btn icon-picker-btn-cancel" onclick="window.iconPicker.close()">
                        Cancel
                    </button>
                    <button class="icon-picker-btn icon-picker-btn-select" id="icon-select-btn" disabled>
                        Select Icon
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) this.close();
        });

        document.getElementById("icon-search-input").addEventListener("input", (e) => {
            this.filterIcons(e.target.value);
        });

        document.getElementById("icon-select-btn").addEventListener("click", () => {
            this.selectIcon();
        });

        // Keyboard support
        document.addEventListener("keydown", (e) => {
            const overlay = document.getElementById("icon-picker-overlay");
            if (overlay && overlay.classList.contains("active")) {
                if (e.key === "Escape") {
                    this.close();
                } else if (e.key === "Enter" && this.currentIconName) {
                    this.selectIcon();
                }
            }
        });
    }

    open(element, currentIconName, onSelect) {
        this.currentElement = element;
        this.currentIconName = currentIconName || "target";
        this.onSelectCallback = onSelect;

        this.renderIcons();

        const overlay = document.getElementById("icon-picker-overlay");
        overlay.classList.add("active");

        // Focus search input
        setTimeout(() => {
            document.getElementById("icon-search-input").focus();
        }, 100);
    }

    close() {
        const overlay = document.getElementById("icon-picker-overlay");
        overlay.classList.remove("active");

        // Reset
        this.currentElement = null;
        this.currentIconName = null;
        this.onSelectCallback = null;
        document.getElementById("icon-search-input").value = "";
    }

    renderIcons(filter = "") {
        const body = document.getElementById("icon-picker-body");
        const categories = window.ICON_CATEGORIES;

        if (!categories) {
            body.innerHTML =
                '<div class="icon-picker-empty">Icon categories not loaded</div>';
            return;
        }

        const filterLower = filter.toLowerCase();
        let hasResults = false;
        let html = "";

        for (const [categoryKey, categoryData] of Object.entries(categories)) {
            const filteredIcons = categoryData.icons.filter((iconName) => {
                if (!filter) return true;
                return (
                    iconName.includes(filterLower) ||
                    window
                        .getIconDisplayName(iconName)
                        .toLowerCase()
                        .includes(filterLower)
                );
            });

            if (filteredIcons.length > 0) {
                hasResults = true;
                html += `
                    <div class="icon-category">
                        <div class="icon-category-title">${categoryData.name}</div>
                        <div class="icon-grid">
                            ${filteredIcons
                                .map(
                                    (iconName) => `
                                <div
                                    class="icon-item ${iconName === this.currentIconName ? "selected" : ""}"
                                    data-icon="${iconName}"
                                    onclick="window.iconPicker.selectIconItem('${iconName}')"
                                >
                                    ${window.getIconSvg(iconName)}
                                    <div class="icon-item-name">${window.getIconDisplayName(iconName)}</div>
                                </div>
                            `
                                )
                                .join("")}
                        </div>
                    </div>
                `;
            }
        }

        if (!hasResults) {
            html =
                '<div class="icon-picker-empty">No icons found matching "' +
                filter +
                '"</div>';
        }

        body.innerHTML = html;
    }

    filterIcons(query) {
        this.renderIcons(query);
    }

    selectIconItem(iconName) {
        // Update selection
        const items = document.querySelectorAll(".icon-item");
        items.forEach((item) => item.classList.remove("selected"));

        const selectedItem = document.querySelector(`[data-icon="${iconName}"]`);
        if (selectedItem) {
            selectedItem.classList.add("selected");
        }

        this.currentIconName = iconName;

        // Enable select button
        document.getElementById("icon-select-btn").disabled = false;
    }

    selectIcon() {
        if (!this.currentIconName || !this.currentElement) return;

        // Update the icon in the DOM
        const newSvg = window.getIconSvg(this.currentIconName);
        this.currentElement.innerHTML = newSvg;
        this.currentElement.setAttribute("data-icon", this.currentIconName);

        // Trigger auto-save if available
        if (window.scheduleAutoSave) {
            window.scheduleAutoSave();
        }

        // Call callback if provided
        if (this.onSelectCallback) {
            this.onSelectCallback(this.currentIconName, newSvg);
        }

        console.log("✅ Icon updated to:", this.currentIconName);
        this.close();
    }

    // Initialize click handlers for icons in the editor
    initializeIconClickHandlers() {
        console.log("🎯 Initializing icon click handlers...");
        this.attachClickHandlers();

        // Also set up a mutation observer to catch dynamically added icons
        const observer = new MutationObserver(() => {
            this.attachClickHandlers();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        this.observer = observer;
    }

    attachClickHandlers() {
        const iconElements = document.querySelectorAll(".feature-icon, .screen-icon");

        iconElements.forEach((icon) => {
            // Skip if already has handler
            if (icon.hasAttribute("data-icon-picker-ready")) return;

            icon.setAttribute("data-icon-picker-ready", "true");
            icon.setAttribute("data-icon-picker-active", "true"); // Mark for visual editor to skip
            icon.style.cursor = "pointer";

            // Click handler
            const clickHandler = (e) => {
                // Stop all propagation immediately
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();

                console.log("🎨 Icon clicked - opening picker modal");

                // Get current icon name from data attribute or try to detect
                let currentIcon = icon.getAttribute("data-icon") || "target";

                this.open(icon, currentIcon, (iconName) => {
                    console.log("✅ Icon changed to:", iconName);
                });

                return false;
            };

            // Add listener in capture phase to intercept BEFORE visual editor
            icon.addEventListener("click", clickHandler, { capture: true });
        });

        console.log(`✅ Icon picker initialized for ${iconElements.length} icons`);
    }
}

// Initialize globally
if (typeof window !== "undefined") {
    window.IconPicker = IconPicker;
    // Don't auto-initialize - let editor-page-wrapper.tsx control initialization
}
