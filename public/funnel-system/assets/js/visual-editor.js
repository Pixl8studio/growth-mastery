/**
 * Framer-Inspired Visual Editor for White-Label Funnels
 * Provides drag-and-drop editing, live preview, and component management
 */

class VisualEditor {
    constructor() {
        // Load edit mode state from localStorage, default to true for better UX
        this.isEditMode =
            localStorage.getItem("visualEditor_editMode") === "false" ? false : true;
        this.selectedBlock = null;
        this.selectedTextElement = null;
        this.selectedCardElement = null;
        this.selectedButtonElement = null;
        this.selectedHeroElement = null;
        this.isResizing = false;
        this.resizeStartX = 0;
        this.resizeStartWidth = 0;
        this.draggedBlock = null;
        this.draggedElement = null;
        this.dropHandled = false;
        this.components = new Map();
        this.undoStack = [];
        this.redoStack = [];
        this.copiedSettings = null;
        this.selectedElement = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadComponents();
        this.setupImageUpload();
        this.setupToolbar();
        this.initializeBlocks();
        this.loadSavedTheme();
        this.loadSavedCustomTheme();

        // Set initial UI state based on edit mode
        document.body.setAttribute("data-editor-mode", this.isEditMode);

        // Ensure all social proof elements and other theme-dependent elements are properly styled
        setTimeout(() => {
            const allBlocks = document.querySelectorAll(".block");
            allBlocks.forEach((block) => {
                this.applyThemeColorsToBlock(block);

                // Add responsive classes to existing card grids
                const cardGrids = block.querySelectorAll(
                    ".features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip"
                );
                cardGrids.forEach((grid) => {
                    if (!grid.classList.contains("cards-per-row-responsive")) {
                        grid.classList.add("cards-per-row-responsive");
                    }
                });
            });
            console.log(
                "Theme colors and responsive classes applied to all blocks on initialization"
            );
        }, 50);

        // Save initial state for undo functionality
        setTimeout(() => {
            this.saveState();
            console.log("Initial state saved for undo/redo functionality");
            console.log(
                `Visual Editor initialized in ${this.isEditMode ? "EDIT" : "PREVIEW"} mode`
            );

            // Ensure section controls are properly attached if in edit mode
            if (this.isEditMode) {
                this.ensureSectionControls();
            }
        }, 100);
    }

    /**
     * Toggle between edit and preview mode
     */
    toggleEditMode() {
        // Clean up any ongoing drag operations and resize handles before switching modes
        this.cleanupDragOperation();
        this.removeHeroResizeHandles();
        this.selectedHeroElement = null;

        this.isEditMode = !this.isEditMode;

        // Persist edit mode state
        localStorage.setItem("visualEditor_editMode", this.isEditMode.toString());

        document.body.setAttribute("data-editor-mode", this.isEditMode);

        const blocks = document.querySelectorAll(".block");
        blocks.forEach((block) => {
            block.setAttribute("data-editor-mode", this.isEditMode);

            if (this.isEditMode) {
                this.makeBlockEditable(block);
            } else {
                this.makeBlockReadOnly(block);
            }

            // Apply theme colors to ensure social proof and other elements are properly styled
            this.applyThemeColorsToBlock(block);
        });

        this.updateToolbar();
    }

    /**
     * Make a block editable with Framer-like interactions
     */
    makeBlockEditable(block) {
        // Add edit handles with drag icon
        if (!block.querySelector(".block-handle")) {
            const handle = document.createElement("div");
            handle.className = "block-handle";
            handle.title = "Drag to reorder section";
            const blockType = block.dataset.blockType || "Block";
            // Add grip icon for drag indication
            const gripIcon =
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
            handle.innerHTML = `<span class="grip-icon">${gripIcon}</span><span class="block-type-label">${blockType}</span>`;
            block.appendChild(handle);
        }

        // Add section controls (arrows and X button) or attach listeners to existing ones
        let controls = block.querySelector(".section-controls");

        if (!controls) {
            console.log(
                "🔧 Creating section controls for block:",
                block.dataset.blockType
            );

            controls = document.createElement("div");
            controls.className = "section-controls";

            // Create buttons programmatically instead of innerHTML
            controls.innerHTML = `
                <button class="section-control-btn move-up-btn" title="Move Section Up">
                    <span>↑</span>
                </button>
                <button class="section-control-btn move-down-btn" title="Move Section Down">
                    <span>↓</span>
                </button>
                <button class="section-control-btn delete-section-btn" title="Delete Section">
                    <span>×</span>
                </button>
            `;

            // Append controls to block
            block.appendChild(controls);
        } else {
            console.log(
                "🔄 Attaching listeners to existing controls for block:",
                block.dataset.blockType
            );
        }

        // Always attach event listeners to the control buttons (whether new or existing)
        const moveUpBtn = controls.querySelector(".move-up-btn");
        const moveDownBtn = controls.querySelector(".move-down-btn");
        const deleteBtn = controls.querySelector(".delete-section-btn");

        if (moveUpBtn) {
            moveUpBtn.addEventListener("click", (e) => {
                console.log("⬆️ Move up button clicked!");
                e.stopPropagation();
                e.preventDefault();
                this.handleSectionAction(block, "move-up");
            });
        }

        if (moveDownBtn) {
            moveDownBtn.addEventListener("click", (e) => {
                console.log("⬇️ Move down button clicked!");
                e.stopPropagation();
                e.preventDefault();
                this.handleSectionAction(block, "move-down");
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener("click", (e) => {
                console.log("❌ Delete button clicked!");
                e.stopPropagation();
                e.preventDefault();
                this.handleSectionAction(block, "delete");
            });
        }

        console.log(
            "✅ Event listeners attached to section control buttons for:",
            block.dataset.blockType
        );

        // Add drag functionality
        block.draggable = true;
        block.addEventListener("dragstart", this.handleDragStart.bind(this));
        block.addEventListener("dragover", this.handleDragOver.bind(this));
        block.addEventListener("drop", this.handleDrop.bind(this));
        block.addEventListener("dragend", this.handleDragEnd.bind(this));
        block.addEventListener("click", this.handleBlockClick.bind(this));

        // Make text content editable
        const editableElements = block.querySelectorAll("[data-editable]");
        editableElements.forEach((element) => {
            element.contentEditable = true;
            element.addEventListener("blur", this.handleContentChange.bind(this));
            element.addEventListener("keydown", this.handleKeyDown.bind(this));
            // Add click handler for text elements to show text-specific settings
            element.addEventListener("click", this.handleTextElementClick.bind(this));
        });

        // Make card elements clickable for card-specific settings
        const cardElements = block.querySelectorAll(
            ".feature-card, .testimonial-card, .learn-card, .pricing-card, .story-card, .faq-item"
        );
        cardElements.forEach((card) => {
            card.addEventListener("click", this.handleCardClick.bind(this));
            card.style.cursor = "pointer";
        });

        // Make button elements clickable for button-specific settings
        const buttonElements = block.querySelectorAll(".btn");
        buttonElements.forEach((button) => {
            button.addEventListener("click", this.handleButtonClick.bind(this));
            button.style.cursor = "pointer";
        });

        // Add element management for dynamic sections
        this.makeElementsManageable(block);
    }

    /**
     * Handle section control actions (move up/down, delete)
     */
    handleSectionAction(block, action) {
        this.saveState(); // Save state for undo functionality

        switch (action) {
            case "move-up":
                this.moveSectionUp(block);
                break;
            case "move-down":
                this.moveSectionDown(block);
                break;
            case "delete":
                this.deleteSection(block);
                break;
        }
    }

    moveSectionUp(block) {
        const previousSection = block.previousElementSibling;
        if (previousSection && previousSection.classList.contains("block")) {
            block.parentNode.insertBefore(block, previousSection);
            this.showNotification("Section moved up!", "success");
        } else {
            this.showNotification("Section is already at the top", "info");
        }
    }

    moveSectionDown(block) {
        const nextSection = block.nextElementSibling;
        if (nextSection && nextSection.classList.contains("block")) {
            block.parentNode.insertBefore(nextSection, block);
            this.showNotification("Section moved down!", "success");
        } else {
            this.showNotification("Section is already at the bottom", "info");
        }
    }

    deleteSection(block) {
        const deleteBtn = block.querySelector(".delete-section-btn");

        // Check if button is already in confirmation state
        if (deleteBtn.classList.contains("confirm-delete")) {
            // Actually delete the section
            const sectionType = block.dataset.blockType || "section";
            block.remove();

            // Clear selection if this was the selected block
            if (this.selectedBlock === block) {
                this.selectedBlock = null;
                document.getElementById("block-settings").style.display = "none";
            }

            this.showNotification(
                `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} section deleted!`,
                "success"
            );
        } else {
            // Enter confirmation state
            deleteBtn.classList.add("confirm-delete");
            deleteBtn.innerHTML = "<span>✓</span>";
            deleteBtn.title = "Click again to confirm deletion";

            // Revert after 5 seconds if not clicked again
            setTimeout(() => {
                if (deleteBtn && deleteBtn.classList.contains("confirm-delete")) {
                    deleteBtn.classList.remove("confirm-delete");
                    deleteBtn.innerHTML = "<span>×</span>";
                    deleteBtn.title = "Delete Section";
                }
            }, 5000);
        }
    }

    /**
     * Ensure all blocks have section controls when in edit mode
     */
    ensureSectionControls() {
        if (!this.isEditMode) return;

        const blocks = document.querySelectorAll(".block");
        blocks.forEach((block) => {
            // Check if section controls are missing and add them
            if (!block.querySelector(".section-controls")) {
                this.makeBlockEditable(block);
            }
        });

        console.log("Section controls ensured for all blocks in edit mode");
    }

    /**
     * Make block read-only
     */
    makeBlockReadOnly(block) {
        block.draggable = false;

        // Clean up any drag-related classes and styles that might persist
        block.classList.remove("dragging", "drop-target");
        block.style.borderTop = "";
        block.style.opacity = "";

        // Remove edit handles
        const handle = block.querySelector(".block-handle");
        if (handle) handle.remove();

        // Remove section controls
        const sectionControls = block.querySelector(".section-controls");
        if (sectionControls) sectionControls.remove();

        // Hide element controls
        const elementControls = block.querySelectorAll(".element-controls");
        elementControls.forEach((control) => {
            control.style.display = "none";
        });

        // Remove manageable-element class
        const manageableElements = block.querySelectorAll(".manageable-element");
        manageableElements.forEach((element) => {
            element.classList.remove("manageable-element");
        });

        const editableElements = block.querySelectorAll("[data-editable]");
        editableElements.forEach((element) => {
            element.contentEditable = false;
        });
    }

    /**
     * Handle block selection
     */
    handleBlockClick(e) {
        if (!this.isEditMode) return;

        // Guard against null/undefined e.target (can happen when element is removed from DOM)
        if (!e.target) return;

        // Skip if this is an icon element (for icon picker)
        if (e.target.classList.contains('feature-icon') ||
            e.target.classList.contains('screen-icon') ||
            e.target.closest('.feature-icon') ||
            e.target.closest('.screen-icon')) {
            console.log('🎨 Skipping block click - this is an icon element');
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        // Ignore clicks on section control buttons (X, up arrow, down arrow)
        if (
            e.target.closest(".section-control-btn") ||
            e.target.closest(".section-controls")
        ) {
            console.log("🚫 Block click ignored - clicked on section control");
            return;
        }

        console.log("✅ Block click handling");
        e.stopPropagation();

        // Remove previous selections
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove("block-selected");
        }
        if (this.selectedTextElement) {
            this.selectedTextElement.classList.remove("text-selected");
        }
        if (this.selectedCardElement) {
            this.selectedCardElement.classList.remove("card-selected");
        }
        if (this.selectedButtonElement) {
            this.selectedButtonElement.classList.remove("button-selected");
        }

        // Select new block
        this.selectedBlock = e.currentTarget;
        this.selectedBlock.classList.add("block-selected");
        this.selectedTextElement = null;
        this.selectedCardElement = null;
        this.selectedButtonElement = null;
        this.removeHeroResizeHandles();
        this.selectedHeroElement = null;

        this.showBlockSettings(this.selectedBlock, "section");
    }

    /**
     * Handle text element selection
     */
    handleTextElementClick(e) {
        if (!this.isEditMode) return;

        // Skip if this is an icon element (for icon picker)
        if (e.target.classList.contains('feature-icon') ||
            e.target.classList.contains('screen-icon') ||
            e.target.closest('.feature-icon') ||
            e.target.closest('.screen-icon')) {
            console.log('🎨 Skipping text element click - this is an icon');
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        e.stopPropagation();

        // Remove previous selections
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove("block-selected");
        }
        if (this.selectedTextElement) {
            this.selectedTextElement.classList.remove("text-selected");
        }
        if (this.selectedCardElement) {
            this.selectedCardElement.classList.remove("card-selected");
        }
        if (this.selectedButtonElement) {
            this.selectedButtonElement.classList.remove("button-selected");
        }

        // Select text element
        this.selectedTextElement = e.currentTarget;
        this.selectedTextElement.classList.add("text-selected");
        this.selectedBlock = e.currentTarget.closest(".block");
        this.selectedCardElement = null;
        this.selectedButtonElement = null;

        // Check if this is a hero text element and add resize functionality
        if (this.isHeroTextElement(e.currentTarget)) {
            this.selectedHeroElement =
                e.currentTarget.closest(".hero-content") || e.currentTarget;
            this.addHeroResizeHandles(this.selectedHeroElement);
        } else {
            this.removeHeroResizeHandles();
            this.selectedHeroElement = null;
        }

        this.showBlockSettings(this.selectedTextElement, "text");
    }

    /**
     * Handle card element selection
     */
    handleCardClick(e) {
        if (!this.isEditMode) return;

        e.stopPropagation();

        // Remove previous selections
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove("block-selected");
        }
        if (this.selectedTextElement) {
            this.selectedTextElement.classList.remove("text-selected");
        }
        if (this.selectedCardElement) {
            this.selectedCardElement.classList.remove("card-selected");
        }

        // Select card element
        this.selectedCardElement = e.currentTarget;
        this.selectedCardElement.classList.add("card-selected");
        this.selectedBlock = e.currentTarget.closest(".block");
        this.selectedTextElement = null;
        this.selectedButtonElement = null;
        this.removeHeroResizeHandles();
        this.selectedHeroElement = null;

        this.showBlockSettings(this.selectedCardElement, "card");
    }

    /**
     * Handle button element selection
     */
    handleButtonClick(e) {
        if (!this.isEditMode) return;

        e.stopPropagation();
        e.preventDefault(); // Prevent button default action

        // Remove previous selections
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove("block-selected");
        }
        if (this.selectedTextElement) {
            this.selectedTextElement.classList.remove("text-selected");
        }
        if (this.selectedCardElement) {
            this.selectedCardElement.classList.remove("card-selected");
        }
        if (this.selectedButtonElement) {
            this.selectedButtonElement.classList.remove("button-selected");
        }

        // Select button element
        this.selectedButtonElement = e.currentTarget;
        this.selectedButtonElement.classList.add("button-selected");
        this.selectedBlock = e.currentTarget.closest(".block");
        this.selectedTextElement = null;
        this.selectedCardElement = null;
        this.removeHeroResizeHandles();
        this.selectedHeroElement = null;

        this.showBlockSettings(this.selectedButtonElement, "button");
    }

    /**
     * Show settings panel for selected block, text element, card, or button
     */
    showBlockSettings(element, type = "section") {
        const settingsPanel = document.getElementById("block-settings");
        if (!settingsPanel) return;

        let settings;
        let panelTitle;

        if (type === "text") {
            settings = this.getTextSettings();
            panelTitle = "Text Settings";
            settingsPanel.innerHTML = this.renderSettingsPanel(
                settings,
                element,
                panelTitle
            );
        } else if (type === "card") {
            settings = this.getCardSettings();
            panelTitle = "Card Settings";
            settingsPanel.innerHTML = this.renderSettingsPanel(
                settings,
                element,
                panelTitle
            );
        } else if (type === "button") {
            settings = this.getButtonSettings();
            panelTitle = "Button Settings";
            settingsPanel.innerHTML = this.renderSettingsPanel(
                settings,
                element,
                panelTitle
            );
        } else {
            // Ensure block has an ID for management actions
            if (!element.id) {
                element.id = element.dataset.blockType + "-block-" + Date.now();
            }

            const blockType = element.dataset.blockType || "generic";
            settings = this.getBlockSettings(blockType, element);
            panelTitle = "Block Settings";
            settingsPanel.innerHTML = this.renderSettingsPanel(
                settings,
                element,
                panelTitle
            );
        }

        settingsPanel.style.display = "block";

        // Make panel draggable and add controls
        this.makeSettingsPanelDraggable(settingsPanel);
        this.addPanelControls(settingsPanel);
        this.restorePanelState(settingsPanel);

        // Add event listeners for management buttons (only for block elements)
        if (element.classList.contains("block")) {
            this.attachManagementButtonListeners(settingsPanel, element);
        }
    }

    /**
     * Get settings configuration for block type
     */
    getBlockSettings(blockType, element) {
        // Check if this section actually contains cards
        const hasCards = this.sectionHasCards(element, blockType);

        // Base settings that apply to all sections
        let commonSettings = {
            sectionBackground: {
                type: "section-background-select",
                label: "This Section Background",
                options: [
                    // Clean Solid Colors
                    { value: "#FFFFFF", label: "Clean White", preview: "#FFFFFF" },
                    { value: "#F8FAFC", label: "Light Gray", preview: "#F8FAFC" },

                    // Professional Gradients
                    {
                        value: "linear-gradient(135deg, #667eea, #764ba2)",
                        label: "🌊 Ocean",
                        preview: "linear-gradient(135deg, #667eea, #764ba2)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                        label: "🌅 Sunset",
                        preview: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                    },
                    {
                        value: "linear-gradient(135deg, #134e5e, #71b280)",
                        label: "🌲 Forest",
                        preview: "linear-gradient(135deg, #134e5e, #71b280)",
                    },
                    {
                        value: "linear-gradient(135deg, #1e3c72, #2a5298)",
                        label: "🌌 Galaxy",
                        preview: "linear-gradient(135deg, #1e3c72, #2a5298)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff6b6b, #feca57)",
                        label: "🪸 Coral",
                        preview: "linear-gradient(135deg, #ff6b6b, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                        label: "🌿 Mint",
                        preview: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                    },
                    {
                        value: "linear-gradient(135deg, #a8edea, #fed6e3)",
                        label: "💜 Lavender",
                        preview: "linear-gradient(135deg, #a8edea, #fed6e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                        label: "🍑 Peach",
                        preview: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                    },
                    {
                        value: "linear-gradient(135deg, #74b9ff, #0984e3)",
                        label: "🧊 Arctic",
                        preview: "linear-gradient(135deg, #74b9ff, #0984e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #11998e, #38ef7d)",
                        label: "💎 Emerald",
                        preview: "linear-gradient(135deg, #11998e, #38ef7d)",
                    },
                    {
                        value: "linear-gradient(135deg, #ee5a24, #feca57)",
                        label: "🔥 Flame",
                        preview: "linear-gradient(135deg, #ee5a24, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #f093fb, #f5576c)",
                        label: "🌸 Dawn",
                        preview: "linear-gradient(135deg, #f093fb, #f5576c)",
                    },
                    {
                        value: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        label: "👑 Royal",
                        preview: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff0099, #493240)",
                        label: "🌙 Cosmic",
                        preview: "linear-gradient(135deg, #ff0099, #493240)",
                    },
                    {
                        value: "linear-gradient(135deg, #4facfe, #00f2fe)",
                        label: "💧 Aqua",
                        preview: "linear-gradient(135deg, #4facfe, #00f2fe)",
                    },

                    {
                        value: "custom",
                        label: "🎨 Custom Color",
                        preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                    },
                ],
                default: "#FFFFFF",
            },
            customTheme: {
                type: "custom-theme-editor",
                label: "Custom Theme Colors",
                variables: [
                    {
                        name: "--text-primary",
                        label: "Primary Text",
                        default: "#1F2937",
                    },
                    {
                        name: "--text-secondary",
                        label: "Secondary Text",
                        default: "#6B7280",
                    },
                    {
                        name: "--bg-primary",
                        label: "Primary Background",
                        default: "#FFFFFF",
                    },
                    {
                        name: "--bg-secondary",
                        label: "Secondary Background",
                        default: "#F9FAFB",
                    },
                    {
                        name: "--primary-color",
                        label: "Primary Color",
                        default: "#4F46E5",
                    },
                    {
                        name: "--secondary-color",
                        label: "Secondary Color",
                        default: "#10B981",
                    },
                ],
            },
            paddingTop: {
                type: "range",
                label: "Top Padding",
                min: 0,
                max: 200,
                unit: "px",
                default: 80,
            },
            paddingBottom: {
                type: "range",
                label: "Bottom Padding",
                min: 0,
                max: 200,
                unit: "px",
                default: 80,
            },
            marginTop: {
                type: "range",
                label: "Top Margin",
                min: 0,
                max: 100,
                unit: "px",
                default: 0,
            },
            marginBottom: {
                type: "range",
                label: "Bottom Margin",
                min: 0,
                max: 100,
                unit: "px",
                default: 0,
            },
            borderRadius: {
                type: "range",
                label: "Border Radius",
                min: 0,
                max: 50,
                unit: "px",
                default: 0,
            },
        };

        // Add grid/layout background controls for sections with grids
        const hasGrid = element.querySelector('.features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip, .grid, [class*="grid"]');
        if (hasGrid) {
            commonSettings.gridBackground = {
                type: "section-background-select",
                label: "📦 Grid Container Background",
                options: [
                    { value: "transparent", label: "Transparent", preview: "transparent" },
                    { value: "#FFFFFF", label: "White", preview: "#FFFFFF" },
                    { value: "#F8FAFC", label: "Light Gray", preview: "#F8FAFC" },
                    { value: "#F3F4F6", label: "Cool Gray", preview: "#F3F4F6" },
                    { value: "rgba(79, 70, 229, 0.05)", label: "Primary Tint", preview: "rgba(79, 70, 229, 0.1)" },
                    { value: "rgba(16, 185, 129, 0.05)", label: "Success Tint", preview: "rgba(16, 185, 129, 0.1)" },
                    { value: "custom", label: "🎨 Custom", preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)" },
                ],
                default: "transparent",
            };
            commonSettings.gridPadding = {
                type: "range",
                label: "📦 Grid Inner Padding",
                min: 0,
                max: 60,
                unit: "px",
                default: 0,
            };
            commonSettings.gridBorderRadius = {
                type: "range",
                label: "🔲 Grid Border Radius",
                min: 0,
                max: 30,
                unit: "px",
                default: 0,
            };
        }

        // Add card color options only if this section has cards
        if (hasCards) {
            commonSettings.blockColor = {
                type: "block-color-select",
                label: "🎴 Cards & Blocks Color",
                options: [
                    // Clean Solid Colors for Cards
                    { value: "#FFFFFF", label: "Clean White", preview: "#FFFFFF" },
                    { value: "#F8FAFC", label: "Light Gray", preview: "#F8FAFC" },

                    // Beautiful Card Gradients (same as sections!)
                    {
                        value: "linear-gradient(135deg, #667eea, #764ba2)",
                        label: "🌊 Ocean",
                        preview: "linear-gradient(135deg, #667eea, #764ba2)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                        label: "🌅 Sunset",
                        preview: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                    },
                    {
                        value: "linear-gradient(135deg, #134e5e, #71b280)",
                        label: "🌲 Forest",
                        preview: "linear-gradient(135deg, #134e5e, #71b280)",
                    },
                    {
                        value: "linear-gradient(135deg, #1e3c72, #2a5298)",
                        label: "🌌 Galaxy",
                        preview: "linear-gradient(135deg, #1e3c72, #2a5298)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff6b6b, #feca57)",
                        label: "🪸 Coral",
                        preview: "linear-gradient(135deg, #ff6b6b, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                        label: "🌿 Mint",
                        preview: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                    },
                    {
                        value: "linear-gradient(135deg, #a8edea, #fed6e3)",
                        label: "💜 Lavender",
                        preview: "linear-gradient(135deg, #a8edea, #fed6e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                        label: "🍑 Peach",
                        preview: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                    },
                    {
                        value: "linear-gradient(135deg, #74b9ff, #0984e3)",
                        label: "🧊 Arctic",
                        preview: "linear-gradient(135deg, #74b9ff, #0984e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #11998e, #38ef7d)",
                        label: "💎 Emerald",
                        preview: "linear-gradient(135deg, #11998e, #38ef7d)",
                    },
                    {
                        value: "linear-gradient(135deg, #ee5a24, #feca57)",
                        label: "🔥 Flame",
                        preview: "linear-gradient(135deg, #ee5a24, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #f093fb, #f5576c)",
                        label: "🌸 Dawn",
                        preview: "linear-gradient(135deg, #f093fb, #f5576c)",
                    },
                    {
                        value: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        label: "👑 Royal",
                        preview: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff0099, #493240)",
                        label: "🌙 Cosmic",
                        preview: "linear-gradient(135deg, #ff0099, #493240)",
                    },
                    {
                        value: "linear-gradient(135deg, #4facfe, #00f2fe)",
                        label: "💧 Aqua",
                        preview: "linear-gradient(135deg, #4facfe, #00f2fe)",
                    },

                    {
                        value: "custom",
                        label: "🎨 Custom Card Color",
                        preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                    },
                ],
                default: "#FFFFFF",
            };
        }

        const typeSpecific = {
            hero: {
                ...commonSettings,
                titleSize: {
                    type: "range",
                    label: "Title Size",
                    min: 24,
                    max: 80,
                    unit: "px",
                    default: 48,
                },
                subtitleSize: {
                    type: "range",
                    label: "Subtitle Size",
                    min: 16,
                    max: 32,
                    unit: "px",
                    default: 20,
                },
                buttonStyle: {
                    type: "select",
                    label: "Button Style",
                    options: ["primary", "secondary", "outline"],
                    default: "primary",
                },
                textAlign: {
                    type: "select",
                    label: "Text Alignment",
                    options: ["left", "center", "right"],
                    default: "center",
                },
                backgroundGradient: {
                    type: "checkbox",
                    label: "Gradient Background",
                    default: false,
                },
            },
            features: {
                ...commonSettings,
                cardsPerRow: {
                    type: "range",
                    label: "📐 Cards Per Row",
                    min: 1,
                    max: 5,
                    step: 1,
                    default: 3,
                },
                columns: {
                    type: "range",
                    label: "Columns",
                    min: 1,
                    max: 4,
                    default: 3,
                },
                cardShadow: { type: "checkbox", label: "Card Shadow", default: true },
                cardPadding: {
                    type: "range",
                    label: "Card Padding",
                    min: 10,
                    max: 60,
                    unit: "px",
                    default: 32,
                },
                cardRadius: {
                    type: "range",
                    label: "Card Radius",
                    min: 0,
                    max: 30,
                    unit: "px",
                    default: 16,
                },
            },
            testimonial: {
                ...commonSettings,
                cardsPerRow: {
                    type: "range",
                    label: "📐 Cards Per Row",
                    min: 1,
                    max: 5,
                    step: 1,
                    default: 3,
                },
                layout: {
                    type: "select",
                    label: "Layout",
                    options: ["grid", "carousel", "single"],
                    default: "grid",
                },
                showAvatars: { type: "checkbox", label: "Show Avatars", default: true },
                cardRadius: {
                    type: "range",
                    label: "Card Radius",
                    min: 0,
                    max: 30,
                    unit: "px",
                    default: 16,
                },
                cardShadow: { type: "checkbox", label: "Card Shadow", default: true },
            },
            learn: {
                ...commonSettings,
                cardsPerRow: {
                    type: "range",
                    label: "📐 Cards Per Row",
                    min: 1,
                    max: 4,
                    step: 1,
                    default: 2,
                },
                layout: {
                    type: "select",
                    label: "Layout",
                    options: ["grid", "single"],
                    default: "grid",
                },
                showNumbers: { type: "checkbox", label: "Show Numbers", default: true },
                cardRadius: {
                    type: "range",
                    label: "Card Radius",
                    min: 0,
                    max: 30,
                    unit: "px",
                    default: 16,
                },
                cardShadow: { type: "checkbox", label: "Card Shadow", default: true },
                titleColor: { type: "color", label: "Title Color", default: "#333333" },
                descriptionColor: {
                    type: "color",
                    label: "Description Color",
                    default: "#666666",
                },
                numberColor: {
                    type: "color",
                    label: "Number Color",
                    default: "#4f46e5",
                },
            },
            pricing: {
                ...commonSettings,
                cardsPerRow: {
                    type: "range",
                    label: "📐 Cards Per Row",
                    min: 1,
                    max: 5,
                    step: 1,
                    default: 3,
                },
                currency: { type: "text", label: "Currency Symbol", default: "$" },
                cardShadow: { type: "checkbox", label: "Card Shadow", default: true },
                cardRadius: {
                    type: "range",
                    label: "Card Radius",
                    min: 0,
                    max: 30,
                    unit: "px",
                    default: 12,
                },
                showBadge: {
                    type: "checkbox",
                    label: "Show Popular Badge",
                    default: true,
                },
            },
            "webinar-cta": {
                ...commonSettings,
                overlayOpacity: {
                    type: "range",
                    label: "Overlay Opacity",
                    min: 0,
                    max: 100,
                    unit: "%",
                    default: 90,
                },
                buttonStyle: {
                    type: "select",
                    label: "Button Style",
                    options: ["primary", "secondary", "outline"],
                    default: "primary",
                },
                textAlign: {
                    type: "select",
                    label: "Text Alignment",
                    options: ["left", "center", "right"],
                    default: "center",
                },
            },
            "social-proof": {
                ...commonSettings,
                cardsPerRow: {
                    type: "range",
                    label: "📐 Cards Per Row",
                    min: 1,
                    max: 5,
                    step: 1,
                    default: 3,
                },
                cardSpacing: {
                    type: "range",
                    label: "📏 Card Spacing",
                    min: 0.5,
                    max: 15.5,
                    step: 0.5,
                    unit: "rem",
                    default: 2,
                },
                cardPadding: {
                    type: "range",
                    label: "📦 Card Padding",
                    min: 1,
                    max: 4,
                    step: 0.25,
                    unit: "rem",
                    default: 2,
                },
                cardRadius: {
                    type: "range",
                    label: "🎨 Card Roundness",
                    min: 0,
                    max: 30,
                    unit: "px",
                    default: 12,
                },
                showShadows: {
                    type: "checkbox",
                    label: "✨ Card Shadows",
                    default: true,
                },
                hideBorders: {
                    type: "checkbox",
                    label: "🚫 Hide Borders",
                    default: false,
                },
                hideBackground: {
                    type: "checkbox",
                    label: "👻 Hide Background",
                    default: false,
                },
            },
            navigation: {
                ...commonSettings,
                navLinkColor: {
                    type: "nav-link-color-select",
                    label: "🔗 Link Color",
                    options: [
                        { value: "#1F2937", label: "Dark Gray", preview: "#1F2937" },
                        { value: "#FFFFFF", label: "White", preview: "#FFFFFF" },
                        { value: "#4f46e5", label: "Primary Blue", preview: "#4f46e5" },
                        { value: "#10b981", label: "Emerald", preview: "#10b981" },
                        { value: "custom", label: "🎨 Custom", preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)" },
                    ],
                    default: "#1F2937",
                },
                navLinkHoverColor: {
                    type: "nav-link-color-select",
                    label: "🔗 Link Hover Color",
                    options: [
                        { value: "#4f46e5", label: "Primary Blue", preview: "#4f46e5" },
                        { value: "#10b981", label: "Emerald", preview: "#10b981" },
                        { value: "#1F2937", label: "Dark Gray", preview: "#1F2937" },
                        { value: "#FFFFFF", label: "White", preview: "#FFFFFF" },
                        { value: "custom", label: "🎨 Custom", preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)" },
                    ],
                    default: "#4f46e5",
                },
                showLogo: {
                    type: "checkbox",
                    label: "🖼️ Show Logo",
                    default: true,
                },
                stickyNav: {
                    type: "checkbox",
                    label: "📌 Sticky Navigation",
                    default: false,
                },
                navHeight: {
                    type: "range",
                    label: "📏 Navigation Height",
                    min: 48,
                    max: 120,
                    unit: "px",
                    default: 64,
                },
                navPadding: {
                    type: "range",
                    label: "📦 Horizontal Padding",
                    min: 8,
                    max: 80,
                    unit: "px",
                    default: 24,
                },
            },
            footer: {
                ...commonSettings,
                footerLinkColor: {
                    type: "nav-link-color-select",
                    label: "🔗 Link Color",
                    options: [
                        { value: "#6B7280", label: "Light Gray", preview: "#6B7280" },
                        { value: "#FFFFFF", label: "White", preview: "#FFFFFF" },
                        { value: "#1F2937", label: "Dark Gray", preview: "#1F2937" },
                        { value: "custom", label: "🎨 Custom", preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)" },
                    ],
                    default: "#6B7280",
                },
                showSocialLinks: {
                    type: "checkbox",
                    label: "📱 Show Social Links",
                    default: true,
                },
                textAlign: {
                    type: "select",
                    label: "📐 Text Alignment",
                    options: ["left", "center", "right"],
                    default: "center",
                },
            },
        };

        return typeSpecific[blockType] || commonSettings;
    }

    /**
     * Check if a section contains cards that need styling options
     */
    sectionHasCards(element, blockType) {
        // Define block types that typically have cards
        const blockTypesWithCards = [
            "features",
            "testimonial",
            "learn",
            "pricing",
            "faq",
            "steps",
            "process",
            "story",
        ];

        // Block types that definitely don't have cards
        const blockTypesWithoutCards = [
            "hero",
            "navigation",
            "footer",
            "header",
            "text",
            "image",
            "video",
        ];

        if (blockTypesWithoutCards.includes(blockType)) {
            return false;
        }

        if (blockTypesWithCards.includes(blockType)) {
            return true;
        }

        // For unknown block types, check the actual DOM content
        if (element) {
            const cardSelectors = [
                ".feature-card",
                ".testimonial-card",
                ".learn-card",
                ".pricing-card",
                ".step-card",
                ".process-card",
                ".story-card",
                ".faq-item",
                '[class*="card"]',
                '[class*="item"]',
            ];

            return cardSelectors.some((selector) => element.querySelector(selector));
        }

        // Default to false for unknown cases
        return false;
    }

    /**
     * Get text color settings
     */
    getTextSettings() {
        return {
            textColor: {
                type: "text-color-select",
                label: "Text Color",
                options: [
                    // Standard Text Colors
                    { value: "#1F2937", label: "Dark Gray", preview: "#1F2937" },
                    { value: "#6B7280", label: "Light Gray", preview: "#6B7280" },
                    { value: "#FFFFFF", label: "White", preview: "#FFFFFF" },
                    { value: "#000000", label: "Black", preview: "#000000" },

                    // Vibrant Colors (adapted from gradients)
                    { value: "#667eea", label: "🌊 Ocean Blue", preview: "#667eea" },
                    { value: "#764ba2", label: "💜 Deep Purple", preview: "#764ba2" },
                    { value: "#134e5e", label: "🌲 Forest Green", preview: "#134e5e" },
                    { value: "#1e3c72", label: "🌌 Galaxy Blue", preview: "#1e3c72" },
                    { value: "#ff6b6b", label: "🪸 Coral Red", preview: "#ff6b6b" },
                    { value: "#48c9b0", label: "🌿 Mint Green", preview: "#48c9b0" },
                    { value: "#ee5a24", label: "🔥 Flame Orange", preview: "#ee5a24" },
                    { value: "#f093fb", label: "🌸 Rose Pink", preview: "#f093fb" },
                    { value: "#4f46e5", label: "👑 Royal Purple", preview: "#4f46e5" },
                    { value: "#11998e", label: "💎 Emerald", preview: "#11998e" },
                    { value: "#74b9ff", label: "🧊 Arctic Blue", preview: "#74b9ff" },
                    { value: "#feca57", label: "⭐ Golden Yellow", preview: "#feca57" },

                    {
                        value: "custom",
                        label: "🎨 Custom Color",
                        preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                    },
                ],
                default: "#1F2937",
            },
            customTextColor: {
                type: "text-color-editor",
                label: "Custom Text Color",
            },
            customBlockColor: {
                type: "block-color-editor",
                label: "Custom Block Color",
            },
            fontSize: {
                type: "range",
                label: "Font Size",
                min: 12,
                max: 72,
                unit: "px",
                default: 16,
            },
            fontWeight: {
                type: "select",
                label: "Font Weight",
                options: ["300", "400", "500", "600", "700", "800"],
                default: "400",
            },
            lineHeight: {
                type: "range",
                label: "Line Height",
                min: 1,
                max: 3,
                step: 0.1,
                default: 1.5,
            },
            letterSpacing: {
                type: "range",
                label: "Letter Spacing",
                min: -2,
                max: 5,
                unit: "px",
                default: 0,
            },
            textAlign: {
                type: "select",
                label: "Text Alignment",
                options: ["left", "center", "right", "justify"],
                default: "left",
            },
            textTransform: {
                type: "select",
                label: "Text Transform",
                options: ["none", "uppercase", "lowercase", "capitalize"],
                default: "none",
            },
        };
    }

    /**
     * Get card color and styling settings
     */
    getCardSettings() {
        return {
            cardBackground: {
                type: "card-color-select",
                label: "Card Background Color",
                options: [
                    // Clean Solid Colors for Cards
                    { value: "#FFFFFF", label: "Clean White", preview: "#FFFFFF" },
                    { value: "#F8FAFC", label: "Light Gray", preview: "#F8FAFC" },

                    // Beautiful Card Gradients (same as sections!)
                    {
                        value: "linear-gradient(135deg, #667eea, #764ba2)",
                        label: "🌊 Ocean",
                        preview: "linear-gradient(135deg, #667eea, #764ba2)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                        label: "🌅 Sunset",
                        preview: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                    },
                    {
                        value: "linear-gradient(135deg, #134e5e, #71b280)",
                        label: "🌲 Forest",
                        preview: "linear-gradient(135deg, #134e5e, #71b280)",
                    },
                    {
                        value: "linear-gradient(135deg, #1e3c72, #2a5298)",
                        label: "🌌 Galaxy",
                        preview: "linear-gradient(135deg, #1e3c72, #2a5298)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff6b6b, #feca57)",
                        label: "🪸 Coral",
                        preview: "linear-gradient(135deg, #ff6b6b, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                        label: "🌿 Mint",
                        preview: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                    },
                    {
                        value: "linear-gradient(135deg, #a8edea, #fed6e3)",
                        label: "💜 Lavender",
                        preview: "linear-gradient(135deg, #a8edea, #fed6e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                        label: "🍑 Peach",
                        preview: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                    },
                    {
                        value: "linear-gradient(135deg, #74b9ff, #0984e3)",
                        label: "🧊 Arctic",
                        preview: "linear-gradient(135deg, #74b9ff, #0984e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #11998e, #38ef7d)",
                        label: "💎 Emerald",
                        preview: "linear-gradient(135deg, #11998e, #38ef7d)",
                    },
                    {
                        value: "linear-gradient(135deg, #ee5a24, #feca57)",
                        label: "🔥 Flame",
                        preview: "linear-gradient(135deg, #ee5a24, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #f093fb, #f5576c)",
                        label: "🌸 Dawn",
                        preview: "linear-gradient(135deg, #f093fb, #f5576c)",
                    },
                    {
                        value: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        label: "👑 Royal",
                        preview: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff0099, #493240)",
                        label: "🌙 Cosmic",
                        preview: "linear-gradient(135deg, #ff0099, #493240)",
                    },
                    {
                        value: "linear-gradient(135deg, #4facfe, #00f2fe)",
                        label: "💧 Aqua",
                        preview: "linear-gradient(135deg, #4facfe, #00f2fe)",
                    },

                    {
                        value: "custom",
                        label: "🎨 Custom Card Color",
                        preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                    },
                ],
                default: "#FFFFFF",
            },
            applyToAllCards: {
                type: "action-button",
                label: "",
                buttonText: "✨ Apply to All Cards in Section",
                action: "apply-card-color-to-all",
            },
            cardShadow: { type: "checkbox", label: "Card Shadow", default: true },
            cardRadius: {
                type: "range",
                label: "Card Radius",
                min: 0,
                max: 30,
                unit: "px",
                default: 16,
            },
            cardPadding: {
                type: "range",
                label: "Card Padding",
                min: 10,
                max: 60,
                unit: "px",
                default: 24,
            },
            cardBorder: { type: "checkbox", label: "Card Border", default: false },
            cardBorderColor: {
                type: "color",
                label: "Border Color",
                default: "#E2E8F0",
            },
            customCardColor: {
                type: "card-color-editor",
                label: "Custom Card Color",
            },
        };
    }

    /**
     * Get button styling settings
     */
    getButtonSettings() {
        return {
            buttonBackground: {
                type: "button-color-select",
                label: "Button Background Color",
                options: [
                    // Clean Solid Colors for Buttons
                    { value: "#FFFFFF", label: "Clean White", preview: "#FFFFFF" },
                    { value: "#F8FAFC", label: "Light Gray", preview: "#F8FAFC" },

                    // Beautiful Button Gradients (same as sections/cards!)
                    {
                        value: "linear-gradient(135deg, #667eea, #764ba2)",
                        label: "🌊 Ocean",
                        preview: "linear-gradient(135deg, #667eea, #764ba2)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                        label: "🌅 Sunset",
                        preview: "linear-gradient(135deg, #ff9a9e, #fecfef)",
                    },
                    {
                        value: "linear-gradient(135deg, #134e5e, #71b280)",
                        label: "🌲 Forest",
                        preview: "linear-gradient(135deg, #134e5e, #71b280)",
                    },
                    {
                        value: "linear-gradient(135deg, #1e3c72, #2a5298)",
                        label: "🌌 Galaxy",
                        preview: "linear-gradient(135deg, #1e3c72, #2a5298)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff6b6b, #feca57)",
                        label: "🪸 Coral",
                        preview: "linear-gradient(135deg, #ff6b6b, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                        label: "🌿 Mint",
                        preview: "linear-gradient(135deg, #48c9b0, #96e6a1)",
                    },
                    {
                        value: "linear-gradient(135deg, #a8edea, #fed6e3)",
                        label: "💜 Lavender",
                        preview: "linear-gradient(135deg, #a8edea, #fed6e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                        label: "🍑 Peach",
                        preview: "linear-gradient(135deg, #ffecd2, #fcb69f)",
                    },
                    {
                        value: "linear-gradient(135deg, #74b9ff, #0984e3)",
                        label: "🧊 Arctic",
                        preview: "linear-gradient(135deg, #74b9ff, #0984e3)",
                    },
                    {
                        value: "linear-gradient(135deg, #11998e, #38ef7d)",
                        label: "💎 Emerald",
                        preview: "linear-gradient(135deg, #11998e, #38ef7d)",
                    },
                    {
                        value: "linear-gradient(135deg, #ee5a24, #feca57)",
                        label: "🔥 Flame",
                        preview: "linear-gradient(135deg, #ee5a24, #feca57)",
                    },
                    {
                        value: "linear-gradient(135deg, #f093fb, #f5576c)",
                        label: "🌸 Dawn",
                        preview: "linear-gradient(135deg, #f093fb, #f5576c)",
                    },
                    {
                        value: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        label: "👑 Royal",
                        preview: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    },
                    {
                        value: "linear-gradient(135deg, #ff0099, #493240)",
                        label: "🌙 Cosmic",
                        preview: "linear-gradient(135deg, #ff0099, #493240)",
                    },
                    {
                        value: "linear-gradient(135deg, #4facfe, #00f2fe)",
                        label: "💧 Aqua",
                        preview: "linear-gradient(135deg, #4facfe, #00f2fe)",
                    },

                    {
                        value: "custom",
                        label: "🎨 Custom Button Color",
                        preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                    },
                ],
                default: "#4F46E5",
            },
            buttonTextColor: {
                type: "button-text-color-select",
                label: "Button Text Color",
                options: [
                    { value: "#FFFFFF", label: "White", preview: "#FFFFFF" },
                    { value: "#1F2937", label: "Dark Gray", preview: "#1F2937" },
                    { value: "#6B7280", label: "Light Gray", preview: "#6B7280" },
                    { value: "#000000", label: "Black", preview: "#000000" },
                    {
                        value: "custom",
                        label: "🎨 Custom Text Color",
                        preview: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
                    },
                ],
                default: "#FFFFFF",
            },
            applyToAllButtons: {
                type: "action-button",
                label: "",
                buttonText: "✨ Apply to All Buttons in Section",
                action: "apply-button-style-to-all",
            },
            buttonLink: {
                type: "text",
                label: "🔗 Button Redirect URL",
                placeholder: "https://example.com or /page.html",
                description:
                    "Enter the URL where this button should redirect when clicked",
                default: "",
            },
            buttonTarget: {
                type: "select",
                label: "🎯 Link Target",
                options: [
                    { value: "_self", label: "Same Window" },
                    { value: "_blank", label: "New Tab/Window" },
                ],
                default: "_self",
                description: "Choose how the link opens",
            },
            buttonSize: {
                type: "select",
                label: "Button Size",
                options: ["small", "medium", "large"],
                default: "medium",
            },
            buttonRadius: {
                type: "range",
                label: "Button Radius",
                min: 0,
                max: 50,
                unit: "px",
                default: 8,
            },
            buttonPadding: {
                type: "range",
                label: "Button Padding",
                min: 5,
                max: 30,
                unit: "px",
                default: 12,
            },
            buttonShadow: { type: "checkbox", label: "Button Shadow", default: true },
            buttonBorder: { type: "checkbox", label: "Button Border", default: false },
            buttonBorderColor: {
                type: "color",
                label: "Border Color",
                default: "#E2E8F0",
            },
            customButtonColor: {
                type: "button-color-editor",
                label: "Custom Button Color",
            },
        };
    }

    /**
     * Render settings panel HTML
     */
    renderSettingsPanel(settings, element, panelTitle = null) {
        // Don't render settings panel for icon elements
        if (element.classList.contains('feature-icon') ||
            element.classList.contains('screen-icon')) {
            console.log('🎨 Skipping settings panel for icon element');
            return '';
        }

        const blockType = element.dataset.blockType;
        const displayTitle =
            panelTitle || `${this.getBlockDisplayName(blockType)} Settings`;

        // Start with panel header including controls
        let html = `
      <div class="settings-panel-header">
        <div class="panel-title-section">
          <h3 class="panel-title">✨ ${displayTitle}</h3>
        </div>
        <div class="panel-controls">
          <button class="panel-control-btn panel-collapse-btn" title="Collapse panel">
            <span class="collapse-icon">−</span>
          </button>
          <button class="panel-control-btn panel-close-btn" title="Close panel">
            <span class="close-icon">×</span>
          </button>
        </div>
      </div>
      <div class="settings-panel-content">`;

        // Add element management section first (only for block elements, not text)
        if (element.classList.contains("block")) {
            html += this.renderElementManagementSection(element);
        }

        // Funnel-level settings are now handled at dashboard level

        // Add image upload controls for specific block types
        console.log("🖼️ Checking block type for image upload:", blockType);
        if (blockType === "quote") {
            html += this.renderImageUploadSection(
                "Background Image",
                "background",
                element,
                "Change the background image for this quote section"
            );
            console.log("✅ Added quote background upload controls");
        } else if (blockType === "story") {
            html += this.renderImageUploadSection(
                "Founder Photo",
                "photo",
                element,
                "Upload a photo of the founder/presenter"
            );
            console.log("✅ Added story photo upload controls");
        }

        // Then add the styling settings
        html += `<div class="settings-form">`;

        Object.entries(settings).forEach(([key, setting]) => {
            // Get current value based on element type
            let currentValue;
            if (element.classList.contains("block")) {
                currentValue = this.getBlockProperty(element, key) || setting.default;
            } else if (
                element.classList &&
                (element.classList.contains("feature-card") ||
                    element.classList.contains("testimonial-card") ||
                    element.classList.contains("learn-card") ||
                    element.classList.contains("pricing-card") ||
                    element.classList.contains("story-card") ||
                    element.classList.contains("faq-item"))
            ) {
                currentValue = this.getCardProperty(element, key) || setting.default;
            } else if (element.classList && element.classList.contains("btn")) {
                currentValue = this.getButtonProperty(element, key) || setting.default;
            } else {
                currentValue = this.getTextProperty(element, key) || setting.default;
            }

            html += `<div class="setting-group">
        <label>${setting.label}</label>`;

            switch (setting.type) {
                case "section-background-select":
                    html += `<div class="theme-background-selector">`;
                    setting.options.forEach((option) => {
                        const isSelected =
                            currentValue === option.value ? "selected" : "";
                        html += `
              <div class="theme-option ${isSelected}" data-property="${key}" data-value="${option.value}" title="${option.label}">
                <div class="theme-preview" style="background: ${option.preview}"></div>
                <span class="theme-label">${option.label}</span>
              </div>
            `;
                    });
                    html += `</div>`;
                    break;
                case "text-color-select":
                    html += `<div class="theme-text-color-selector">`;
                    setting.options.forEach((option) => {
                        const isSelected =
                            currentValue === option.value ? "selected" : "";
                        html += `
              <div class="theme-option ${isSelected}" data-property="${key}" data-value="${option.value}" title="${option.label}">
                <div class="theme-preview" style="background: ${option.preview}; border: 2px solid #e2e8f0;"></div>
                <span class="theme-label">${option.label}</span>
              </div>
            `;
                    });
                    html += `</div>`;
                    break;
                case "block-color-select":
                    html += `<div class="theme-block-color-selector">`;
                    setting.options.forEach((option) => {
                        const isSelected =
                            currentValue === option.value ? "selected" : "";
                        html += `
              <div class="theme-option ${isSelected}" data-property="${key}" data-value="${option.value}" title="${option.label}">
                <div class="theme-preview" style="background: ${option.preview}; border: 2px solid #e2e8f0;"></div>
                <span class="theme-label">${option.label}</span>
              </div>
            `;
                    });
                    html += `</div>`;
                    break;
                case "card-color-select":
                    html += `<div class="theme-card-color-selector">`;
                    setting.options.forEach((option) => {
                        const isSelected =
                            currentValue === option.value ? "selected" : "";
                        html += `
              <div class="theme-option ${isSelected}" data-property="${key}" data-value="${option.value}" title="${option.label}">
                <div class="theme-preview" style="background: ${option.preview}; border: 2px solid #e2e8f0;"></div>
                <span class="theme-label">${option.label}</span>
              </div>
            `;
                    });
                    html += `</div>`;
                    break;
                case "action-button":
                    if (setting.buttonText) {
                        html += `
              <div class="action-button-wrapper" style="margin-top: 12px;">
                <button class="action-btn" data-action="${setting.action}" style="
                  width: 100%;
                  padding: 12px 16px;
                  background: linear-gradient(135deg, #10b981, #059669);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s ease;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                  ${setting.buttonText}
                </button>
              </div>
            `;
                    }
                    break;
                case "button-color-select":
                    html += `<div class="theme-button-color-selector">`;
                    setting.options.forEach((option) => {
                        const isSelected =
                            currentValue === option.value ? "selected" : "";
                        html += `
              <div class="theme-option ${isSelected}" data-property="${key}" data-value="${option.value}" title="${option.label}">
                <div class="theme-preview" style="background: ${option.preview}; border: 2px solid #e2e8f0;"></div>
                <span class="theme-label">${option.label}</span>
              </div>
            `;
                    });
                    html += `</div>`;
                    break;
                case "button-text-color-select":
                    html += `<div class="theme-button-text-color-selector">`;
                    setting.options.forEach((option) => {
                        const isSelected =
                            currentValue === option.value ? "selected" : "";
                        html += `
              <div class="theme-option ${isSelected}" data-property="${key}" data-value="${option.value}" title="${option.label}">
                <div class="theme-preview" style="background: ${option.preview}; border: 2px solid #e2e8f0;"></div>
                <span class="theme-label">${option.label}</span>
              </div>
            `;
                    });
                    html += `</div>`;
                    break;
                case "nav-link-color-select":
                    html += `<div class="theme-nav-link-color-selector">`;
                    setting.options.forEach((option) => {
                        const isSelected =
                            currentValue === option.value ? "selected" : "";
                        html += `
              <div class="theme-option ${isSelected}" data-property="${key}" data-value="${option.value}" title="${option.label}">
                <div class="theme-preview" style="background: ${option.preview}; border: 2px solid #e2e8f0;"></div>
                <span class="theme-label">${option.label}</span>
              </div>
            `;
                    });
                    html += `</div>`;
                    break;
                case "text-color-editor":
                    // Only show if custom text color is selected
                    const selectedTextColor = this.getTextProperty(
                        element,
                        "textColor"
                    );
                    if (selectedTextColor === "custom") {
                        html += `<div class="custom-text-color-editor">
              <div class="theme-editor-header">
                <h4>🎨 Custom Text Color</h4>
                <p>Choose any color for this text element</p>
              </div>

              <div class="text-custom-color">
                <label class="theme-variable-label">Text Color</label>
                <div class="theme-color-wrapper">
                  <div class="theme-color-preview" style="background: ${this.getCurrentTextColor(element)}; border: 2px solid #e2e8f0;"></div>
                  <input type="color" class="text-color-picker" data-text-property="textColor" value="${this.getCurrentTextColor(element)}">
                  <input type="text" class="text-color-text" data-text-property="textColor" value="${this.getCurrentTextColor(element)}" placeholder="#1F2937">
                </div>
              </div>
            </div>`;
                    }
                    break;
                case "block-color-editor":
                    // Only show if custom block color is selected
                    const selectedBlockColor = this.getBlockProperty(
                        element,
                        "blockColor"
                    );
                    if (selectedBlockColor === "custom") {
                        html += `<div class="custom-block-color-editor">
              <div class="theme-editor-header">
                <h4>🎨 Custom Card Color</h4>
                <p>Choose any color for cards/blocks in this section</p>
              </div>

              <div class="block-custom-color">
                <label class="theme-variable-label">Card Background Color</label>
                <div class="theme-color-wrapper">
                  <div class="theme-color-preview" style="background: ${this.getCurrentBlockColor(element)}; border: 2px solid #e2e8f0;"></div>
                  <input type="color" class="block-color-picker" data-block-property="blockColor" value="${this.getCurrentBlockColor(element)}">
                  <input type="text" class="block-color-text" data-block-property="blockColor" value="${this.getCurrentBlockColor(element)}" placeholder="#FFFFFF">
                </div>
              </div>
            </div>`;
                    }
                    break;
                case "card-color-editor":
                    // Only show if custom card color is selected
                    const selectedCardColor = this.getCardProperty(
                        element,
                        "cardBackground"
                    );
                    if (selectedCardColor === "custom") {
                        html += `<div class="custom-card-color-editor">
              <div class="theme-editor-header">
                <h4>🎨 Custom Card Color</h4>
                <p>Choose any color for this card</p>
              </div>

              <div class="card-custom-color">
                <label class="theme-variable-label">Card Background Color</label>
                <div class="theme-color-wrapper">
                  <div class="theme-color-preview" style="background: ${this.getCurrentCardColor(element)}; border: 2px solid #e2e8f0;"></div>
                  <input type="color" class="card-color-picker" data-card-property="cardBackground" value="${this.getCurrentCardColor(element)}">
                  <input type="text" class="card-color-text" data-card-property="cardBackground" value="${this.getCurrentCardColor(element)}" placeholder="#FFFFFF">
                </div>
              </div>
            </div>`;
                    }
                    break;
                case "custom-theme-editor":
                    // Only show if custom is selected
                    const selectedBg = this.getBlockProperty(
                        element,
                        "sectionBackground"
                    );
                    if (selectedBg === "custom") {
                        html += `<div class="custom-theme-editor">
              <div class="theme-editor-header">
                <h4>🎨 Custom Section Background</h4>
                <p>Choose any color for this section</p>
              </div>

              <div class="section-custom-color">
                <label class="theme-variable-label">Section Background Color</label>
                <div class="theme-color-wrapper">
                  <div class="theme-color-preview" style="background: ${this.getCurrentSectionBackground(element)}"></div>
                  <input type="color" class="section-color-picker" data-section-property="sectionBackground" value="${this.getCurrentSectionBackground(element)}">
                  <input type="text" class="section-color-text" data-section-property="sectionBackground" value="${this.getCurrentSectionBackground(element)}" placeholder="#FFFFFF">
                </div>
              </div>

              <div class="theme-editor-header" style="margin-top: 20px;">
                <h4>🌐 Global Theme Colors</h4>
                <p>Modify colors used throughout the entire site</p>
              </div>
              <div class="theme-variables-grid">`;

                        setting.variables.forEach((variable) => {
                            const currentValue =
                                this.getCustomVariable(variable.name) ||
                                variable.default;
                            html += `
                <div class="theme-variable-group">
                  <label class="theme-variable-label">${variable.label}</label>
                  <div class="theme-color-wrapper">
                    <div class="theme-color-preview" style="background: ${currentValue}"></div>
                    <input type="color" class="theme-color-picker" data-css-variable="${variable.name}" value="${currentValue}">
                    <input type="text" class="theme-color-text" data-css-variable="${variable.name}" value="${currentValue}" placeholder="${variable.default}">
                  </div>
                </div>
              `;
                        });

                        html += `
              </div>
              <div class="theme-actions">
                <button class="theme-btn reset-theme-btn" data-action="reset-theme">Reset to Default</button>
                <button class="theme-btn save-theme-btn" data-action="save-theme">Save Theme</button>
              </div>
            </div>`;
                    }
                    break;
                case "color":
                    html += `
            <div class="color-input-wrapper">
              <input type="color" data-property="${key}" value="${currentValue}" class="color-picker">
              <input type="text" data-property="${key}-text" value="${currentValue}" class="color-text" placeholder="#000000">
            </div>`;
                    break;
                case "range":
                    const unit = setting.unit || "";
                    html += `
            <div class="range-input-wrapper">
              <input type="range" data-property="${key}" min="${setting.min}" max="${setting.max}" value="${currentValue}" class="range-slider">
              <span class="range-value">${currentValue}${unit}</span>
            </div>`;
                    break;
                case "select":
                    html += `<select data-property="${key}" class="select-input">`;
                    setting.options.forEach((option) => {
                        // Handle both string options and object options {value, label}
                        const optionValue =
                            typeof option === "object" ? option.value : option;
                        const optionLabel =
                            typeof option === "object"
                                ? option.label
                                : option.charAt(0).toUpperCase() + option.slice(1);
                        const selected = currentValue === optionValue ? "selected" : "";
                        html += `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
                    });
                    html += `</select>`;
                    if (setting.description) {
                        html += `<small class="setting-description">${setting.description}</small>`;
                    }
                    break;
                case "checkbox":
                    const checked = currentValue ? "checked" : "";
                    html += `
            <div class="checkbox-wrapper">
              <input type="checkbox" data-property="${key}" ${checked} id="${key}-${Date.now()}" class="checkbox-input">
              <label for="${key}-${Date.now()}" class="checkbox-label">
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Enable</span>
              </label>
            </div>`;
                    break;
                case "text":
                    const placeholder =
                        setting.placeholder || `Enter ${setting.label.toLowerCase()}`;
                    html += `<input type="text" data-property="${key}" value="${currentValue}" class="text-input" placeholder="${placeholder}">`;
                    if (setting.description) {
                        html += `<small class="setting-description">${setting.description}</small>`;
                    }
                    break;
            }

            html += `</div>`;
        });

        html += `
      <div class="settings-actions">
        <button class="reset-btn" onclick="window.visualEditor.resetBlockSettings()">↺ Reset</button>
        <button class="copy-btn" onclick="window.visualEditor.copyBlockSettings()">📋 Copy Style</button>
        <button class="paste-btn" onclick="window.visualEditor.pasteBlockSettings()">📌 Paste Style</button>
      </div>
    </div></div>`; // Close settings-panel-content
        return html;
    }

    getBlockDisplayName(blockType) {
        const displayNames = {
            testimonial: "Testimonials",
            learn: "Learning Outcomes",
            features: "Features",
            faq: "FAQ",
            pricing: "Pricing",
            hero: "Hero Section",
            cta: "Call to Action",
        };
        return displayNames[blockType] || "Block";
    }

    renderElementManagementSection(block) {
        const blockType = block.dataset.blockType;

        if (
            !["testimonial", "learn", "features", "faq", "pricing"].includes(blockType)
        ) {
            return "";
        }

        let managementHTML =
            '<div class="element-management-section element-management-top">';
        managementHTML +=
            '<div class="management-header"><h4>📝 Manage Elements</h4></div>';

        switch (blockType) {
            case "testimonial":
                const testimonialCount =
                    block.querySelectorAll(".testimonial-card").length;
                managementHTML += `
          <div class="management-info">
            <div class="management-stats">
              <span class="stat-badge">💬 ${testimonialCount} Testimonials</span>
            </div>
            <div class="management-actions">
              <button class="management-btn management-btn-primary" data-action="add-testimonial" data-block-id="${block.id || "testimonial-block"}">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Add Testimonial</span>
              </button>
            </div>
            <div class="management-help">
              <small>💡 Hover over testimonials to add, remove, or reorder them individually</small>
            </div>
          </div>
        `;
                break;
            case "learn":
                const learnCount = block.querySelectorAll(".learn-card").length;
                managementHTML += `
          <div class="management-info">
            <div class="management-stats">
              <span class="stat-badge">🎓 ${learnCount} Learning Outcomes</span>
            </div>
            <div class="management-actions">
              <button class="management-btn management-btn-primary" data-action="add-learn" data-block-id="${block.id || "learn-block"}">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Add Learning Outcome</span>
              </button>
            </div>
            <div class="management-help">
              <small>💡 Hover over learning outcomes to add, remove, or reorder them individually</small>
            </div>
          </div>
        `;
                break;
            case "features":
                const featureCount = block.querySelectorAll(".feature-card").length;
                managementHTML += `
          <div class="management-info">
            <div class="management-stats">
              <span class="stat-badge">⭐ ${featureCount} Features</span>
            </div>
            <div class="management-actions">
              <button class="management-btn management-btn-primary" data-action="add-feature" data-block-id="${block.id || "features-block"}">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Add Feature</span>
              </button>
            </div>
            <div class="management-help">
              <small>💡 Hover over feature cards to manage them individually</small>
            </div>
          </div>
        `;
                break;
            case "faq":
                const faqCount = block.querySelectorAll(".faq-item").length;
                managementHTML += `
          <div class="management-info">
            <div class="management-stats">
              <span class="stat-badge">❓ ${faqCount} FAQs</span>
            </div>
            <div class="management-actions">
              <button class="management-btn management-btn-primary" data-action="add-faq" data-block-id="${block.id || "faq-block"}">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Add FAQ</span>
              </button>
            </div>
            <div class="management-help">
              <small>💡 Hover over FAQ items to manage them individually</small>
            </div>
          </div>
        `;
                break;
            case "pricing":
                const pricingCardCount = block.querySelectorAll(".pricing-card").length;
                const pricingFeatureCount =
                    block.querySelectorAll(".pricing-features li").length;
                managementHTML += `
          <div class="management-info">
            <div class="management-stats">
              <span class="stat-badge">💰 ${pricingCardCount} Plans</span>
              <span class="stat-badge">📋 ${pricingFeatureCount} Features</span>
            </div>
            <div class="management-actions">
              <button class="management-btn management-btn-primary" data-action="add-pricing-plan" data-block-id="${block.id || "pricing-block"}">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Add Pricing Plan</span>
              </button>
              <button class="management-btn management-btn-secondary" data-action="add-pricing-feature" data-block-id="${block.id || "pricing-block"}">
                <span class="btn-icon">📝</span>
                <span class="btn-text">Add Feature to First Plan</span>
              </button>
            </div>
            <div class="management-help">
              <small>💡 Hover over pricing cards or features to manage them individually</small>
            </div>
          </div>
        `;
                break;
        }

        managementHTML += "</div>";
        return managementHTML;
    }

    /**
     * Handle drag and drop functionality
     */
    handleDragStart(e) {
        this.draggedBlock = e.currentTarget;
        this.dropHandled = false; // Reset the flag for new drag operation
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", ""); // Required for Firefox

        // Add visual feedback - use class instead of inline style to avoid conflicts
        e.currentTarget.classList.add("dragging");

        console.log("=== DRAG START ===");
        console.log("Dragged block:", this.draggedBlock);
        console.log("Block classes:", this.draggedBlock.className);
        console.log(
            "Block has .block class:",
            this.draggedBlock.classList.contains("block")
        );
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        // Visual feedback for drop zones
        const dropZone = e.currentTarget;
        if (dropZone !== this.draggedBlock && dropZone.classList.contains("block")) {
            // Clear existing drop indicators
            this.clearDropIndicators();
            // Add drop indicator to this zone
            dropZone.style.borderTop = "3px solid var(--primary-color)";
            dropZone.classList.add("drop-target");
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const dropZone = e.currentTarget;

        console.log("=== DROP EVENT TRIGGERED ===");
        console.log("Drop zone:", dropZone);
        console.log("Dragged block:", this.draggedBlock);
        console.log("Drop zone has block class:", dropZone.classList.contains("block"));
        console.log("Are they different?", dropZone !== this.draggedBlock);

        if (!this.draggedBlock) {
            console.log("❌ No dragged block found");
            this.cleanupDragOperation();
            return;
        }

        if (dropZone === this.draggedBlock) {
            console.log("❌ Dropped on same element");
            this.cleanupDragOperation();
            return;
        }

        if (!dropZone.classList.contains("block")) {
            console.log("❌ Drop zone is not a block");
            this.cleanupDragOperation();
            return;
        }

        // Save state for undo
        this.saveState();

        // Get the containers - ensure we're working with the right elements
        const pageContainer =
            document.querySelector(".page-container") || document.body;
        console.log("Page container:", pageContainer);
        console.log("Page container tag name:", pageContainer.tagName);
        console.log("Page container classes:", pageContainer.className);

        const allBlocks = Array.from(pageContainer.querySelectorAll(".block"));
        console.log("Total blocks found:", allBlocks.length);
        console.log(
            "All blocks:",
            allBlocks.map((block) => ({
                tag: block.tagName,
                classes: block.className,
                type: block.dataset.blockType,
                parent: block.parentNode.tagName,
            }))
        );

        const draggedIndex = allBlocks.indexOf(this.draggedBlock);
        const dropIndex = allBlocks.indexOf(dropZone);

        console.log(`Dragged block index: ${draggedIndex}`);
        console.log(`Drop zone index: ${dropIndex}`);

        // Perform the reorder
        if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== dropIndex) {
            console.log("✅ Proceeding with move operation");

            try {
                if (draggedIndex < dropIndex) {
                    // Moving down: insert after the drop target
                    console.log("Moving down - inserting after drop target");
                    if (dropZone.nextSibling) {
                        pageContainer.insertBefore(
                            this.draggedBlock,
                            dropZone.nextSibling
                        );
                        console.log("Inserted before next sibling");
                    } else {
                        pageContainer.appendChild(this.draggedBlock);
                        console.log("Appended to end");
                    }
                } else {
                    // Moving up: insert before the drop target
                    console.log("Moving up - inserting before drop target");
                    pageContainer.insertBefore(this.draggedBlock, dropZone);
                    console.log("Inserted before drop target");
                }

                console.log("✅ Block movement completed successfully");

                // Verify the move worked
                const newAllBlocks = Array.from(
                    pageContainer.querySelectorAll(".block")
                );
                const newDraggedIndex = newAllBlocks.indexOf(this.draggedBlock);
                console.log("New dragged block index:", newDraggedIndex);
            } catch (error) {
                console.error("❌ Error during block movement:", error);
            }
        } else {
            console.log("❌ Invalid indices or same position", {
                draggedIndex,
                dropIndex,
            });
        }

        console.log("=== DROP EVENT COMPLETE ===");

        // Mark drop as handled to prevent dragend interference
        this.dropHandled = true;

        // Always clean up regardless of success
        this.cleanupDragOperation();
    }

    handleDragEnd(e) {
        console.log("=== DRAG END ===");
        console.log("Dragged block still exists:", !!this.draggedBlock);
        console.log("Drop was handled:", this.dropHandled);

        // Only clean up if drop wasn't handled
        if (!this.dropHandled) {
            setTimeout(() => {
                console.log("Cleaning up after dragend (drop not handled)");
                this.cleanupDragOperation();
            }, 10);
        } else {
            console.log("Drop was handled, skipping dragend cleanup");
        }
    }

    cleanupDragOperation() {
        console.log("=== CLEANUP OPERATION ===");

        // Remove dragging class from the dragged element
        if (this.draggedBlock) {
            this.draggedBlock.classList.remove("dragging");
            this.draggedBlock.style.opacity = ""; // Reset inline opacity
            console.log("Cleaned up dragged block:", this.draggedBlock);
        } else {
            console.log("No dragged block to clean up");
        }

        // Clear all drop indicators
        this.clearDropIndicators();

        // Reset dragged block reference and flags
        this.draggedBlock = null;
        this.dropHandled = false;
        console.log("=== CLEANUP COMPLETE ===");
    }

    clearDropIndicators() {
        // Remove all border indicators and drop-target classes
        const allBlocks = document.querySelectorAll(".block");
        allBlocks.forEach((block) => {
            block.style.borderTop = "";
            block.classList.remove("drop-target");
        });
    }

    /**
     * Hero text resize functionality
     */
    isHeroTextElement(element) {
        // Check if element is within a hero block and is a text element
        const heroBlock = element.closest(".hero-block");
        if (!heroBlock) return false;

        // Check if it's a hero text element (title, subtitle, or within hero-content)
        return (
            element.classList.contains("hero-title") ||
            element.classList.contains("hero-subtitle") ||
            element.closest(".hero-content")
        );
    }

    addHeroResizeHandles(heroContent) {
        this.removeHeroResizeHandles(); // Remove any existing handles

        if (!heroContent) return;

        // Ensure the hero content is relatively positioned for handle positioning
        heroContent.style.position = "relative";

        // Create left resize handle
        const leftHandle = document.createElement("div");
        leftHandle.className = "hero-resize-handle hero-resize-left";
        leftHandle.innerHTML = "⟷";
        leftHandle.setAttribute("data-resize-direction", "left");

        // Create right resize handle
        const rightHandle = document.createElement("div");
        rightHandle.className = "hero-resize-handle hero-resize-right";
        rightHandle.innerHTML = "⟷";
        rightHandle.setAttribute("data-resize-direction", "right");

        // Add event listeners
        this.addResizeEventListeners(leftHandle);
        this.addResizeEventListeners(rightHandle);

        // Append handles to hero content
        heroContent.appendChild(leftHandle);
        heroContent.appendChild(rightHandle);

        console.log("Added resize handles to hero content:", heroContent);
    }

    addResizeEventListeners(handle) {
        handle.addEventListener("mousedown", this.handleResizeStart.bind(this));
        handle.addEventListener("dragstart", (e) => e.preventDefault()); // Prevent default drag
    }

    handleResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.selectedHeroElement) return;

        this.isResizing = true;
        this.resizeStartX = e.clientX;

        // Get current width
        const computedStyle = getComputedStyle(this.selectedHeroElement);
        this.resizeStartWidth = parseInt(computedStyle.maxWidth) || 800;

        // Add resize cursor and visual feedback to body
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
        document.body.classList.add("resizing");

        // Add global mouse events
        document.addEventListener("mousemove", this.handleResizeMove.bind(this));
        document.addEventListener("mouseup", this.handleResizeEnd.bind(this));

        console.log(
            "Started resizing hero content, start width:",
            this.resizeStartWidth
        );
    }

    handleResizeMove(e) {
        if (!this.isResizing || !this.selectedHeroElement) return;

        const deltaX = e.clientX - this.resizeStartX;
        let newWidth = this.resizeStartWidth + deltaX * 2; // Multiply by 2 for both sides

        // Set constraints
        newWidth = Math.max(300, Math.min(1200, newWidth)); // Min 300px, Max 1200px

        // Apply the new width
        this.selectedHeroElement.style.maxWidth = newWidth + "px";

        // Store the custom width
        this.selectedHeroElement.dataset.customWidth = newWidth;

        // Show width indicator
        this.showWidthIndicator(newWidth);

        console.log("Resizing hero content to:", newWidth + "px");
    }

    handleResizeEnd(e) {
        if (!this.isResizing) return;

        this.isResizing = false;

        // Remove global styles and events
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.body.classList.remove("resizing");

        document.removeEventListener("mousemove", this.handleResizeMove.bind(this));
        document.removeEventListener("mouseup", this.handleResizeEnd.bind(this));

        // Hide width indicator
        this.hideWidthIndicator();

        // Save state for undo
        this.saveState();

        console.log("Finished resizing hero content");
    }

    removeHeroResizeHandles() {
        const existingHandles = document.querySelectorAll(".hero-resize-handle");
        existingHandles.forEach((handle) => handle.remove());

        if (this.selectedHeroElement) {
            this.selectedHeroElement.style.position = "";
        }
    }

    initializeHeroContent(block) {
        if (!block.classList.contains("hero-block")) return;

        const heroContent = block.querySelector(".hero-content");
        if (!heroContent) return;

        // Restore custom width if it exists
        if (heroContent.dataset.customWidth) {
            const customWidth = parseInt(heroContent.dataset.customWidth);
            if (customWidth && customWidth > 0) {
                heroContent.style.maxWidth = customWidth + "px";
                console.log("Restored custom hero width:", customWidth + "px");
            }
        }
    }

    showWidthIndicator(width) {
        let indicator = document.getElementById("width-indicator");
        if (!indicator) {
            indicator = document.createElement("div");
            indicator.id = "width-indicator";
            indicator.className = "width-indicator";
            document.body.appendChild(indicator);
        }

        indicator.textContent = `${width}px`;
        indicator.style.display = "block";

        // Position near the hero content if possible
        if (this.selectedHeroElement) {
            const rect = this.selectedHeroElement.getBoundingClientRect();
            indicator.style.left = rect.left + rect.width / 2 - 30 + "px";
            indicator.style.top = rect.top - 40 + "px";
        }
    }

    hideWidthIndicator() {
        const indicator = document.getElementById("width-indicator");
        if (indicator) {
            indicator.style.display = "none";
        }
    }

    /**
     * Handle content changes
     */
    handleContentChange(e) {
        this.saveState();
        // Auto-save could be implemented here
    }

    handleKeyDown(e) {
        // Handle special keys
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.target.blur();
        }

        if (e.key === "Escape") {
            e.target.blur();
            this.selectedBlock = null;
            document.getElementById("block-settings").style.display = "none";
        }
    }

    /**
     * Component library management
     */
    loadComponents() {
        // Load available components/blocks - Ordered and renamed per client requirements
        const componentTypes = [
            { type: "hero", name: "Hero", icon: "🎯" },
            { type: "social-proof", name: "Proof", icon: "📊" },
            { type: "learn", name: "Learn", icon: "🎓" },
            { type: "process", name: "steps", icon: "🔢" },
            { type: "story", name: "Story", icon: "👤" },
            { type: "cta", name: "Action", icon: "🚀" },
            { type: "testimonial", name: "Reviews", icon: "💬" },
            { type: "features", name: "features", icon: "⭐" },
            { type: "pricing", name: "Price", icon: "💰" },
            { type: "quote", name: "Quote", icon: "💬" },
            { type: "faq", name: "FAQ", icon: "❓" },
            { type: "newsletter", name: "Subs", icon: "📬" },
            { type: "foot", name: "Foot", icon: "🦶" },
        ];

        componentTypes.forEach((component) => {
            this.components.set(component.type, component);
        });
    }

    /**
     * Add new block to page
     */
    addBlock(blockType, insertAfter = null) {
        this.saveState();

        const blockHTML = this.getBlockTemplate(blockType);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = blockHTML;
        const newBlock = tempDiv.firstElementChild;

        const container = document.querySelector(".page-container") || document.body;

        if (insertAfter) {
            insertAfter.insertAdjacentElement("afterend", newBlock);
        } else {
            container.appendChild(newBlock);
        }

        // Initialize FAQ toggle functionality if it's an FAQ block
        if (blockType === "faq") {
            this.initializeFaqToggle(newBlock);
        }

        // Apply current theme colors to the new block
        this.applyThemeColorsToBlock(newBlock);

        if (this.isEditMode) {
            this.makeBlockEditable(newBlock);
        }

        // Auto-scroll to new section with smooth behavior
        setTimeout(() => {
            newBlock.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            // Add pulse animation to highlight the new section
            newBlock.style.animation = "pulse-highlight 1.5s ease-in-out";
            setTimeout(() => {
                newBlock.style.animation = "";
            }, 1500);
        }, 100);

        // Auto-select new block - include target property for proper event handling
        this.handleBlockClick({ target: newBlock, currentTarget: newBlock, stopPropagation: () => {}, preventDefault: () => {} });
    }

    /**
     * Apply current theme colors to a new block
     */
    applyThemeColorsToBlock(block) {
        if (!block) return;

        console.log(
            "🎨 Applying SMART theme colors to block:",
            block.dataset.blockType
        );

        // Get current theme colors from CSS variables
        const root = document.documentElement;
        const currentTheme = {
            primary: getComputedStyle(root).getPropertyValue("--primary-color").trim(),
            secondary: getComputedStyle(root)
                .getPropertyValue("--secondary-color")
                .trim(),
            accent: getComputedStyle(root).getPropertyValue("--accent-color").trim(),
            textPrimary: getComputedStyle(root)
                .getPropertyValue("--text-primary")
                .trim(),
            textSecondary: getComputedStyle(root)
                .getPropertyValue("--text-secondary")
                .trim(),
            bgPrimary: getComputedStyle(root).getPropertyValue("--bg-primary").trim(),
            bgSecondary: getComputedStyle(root)
                .getPropertyValue("--bg-secondary")
                .trim(),
        };

        // === BUTTONS: Auto-contrast text on themed backgrounds ===
        const primaryButtons = block.querySelectorAll(".btn-primary");
        primaryButtons.forEach((btn) => {
            btn.style.setProperty("background", currentTheme.accent, "important");
            btn.style.setProperty("border-color", currentTheme.accent, "important");
            // SMART: Auto-calculate contrast color instead of hardcoded white
            btn.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.accent),
                "important"
            );
        });

        const secondaryButtons = block.querySelectorAll(".btn-secondary");
        secondaryButtons.forEach((btn) => {
            btn.style.setProperty("background", currentTheme.secondary, "important");
            btn.style.setProperty("border-color", currentTheme.secondary, "important");
            // SMART: Auto-calculate contrast color
            btn.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.secondary),
                "important"
            );
        });

        // === CARDS: Auto-contrast text on gradient backgrounds ===
        const gradientBg = `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.secondary})`;

        // Pricing badges
        const pricingBadges = block.querySelectorAll(".pricing-badge, .popular-badge");
        pricingBadges.forEach((badge) => {
            badge.style.setProperty("background", gradientBg, "important");
            // SMART: Use primary color for contrast calculation (gradients are tricky, so we use the primary)
            badge.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.primary),
                "important"
            );
        });

        // Feature icons
        const featureIcons = block.querySelectorAll(".feature-icon");
        featureIcons.forEach((icon) => {
            icon.style.setProperty("background", gradientBg, "important");
            icon.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.primary),
                "important"
            );
        });

        // Cards with gradients
        const gradientCards = block.querySelectorAll(
            ".testimonial-card, .pricing-card"
        );
        gradientCards.forEach((card) => {
            card.style.setProperty("background", gradientBg, "important");
            // Apply smart text colors to ALL text in these cards
            const cardTexts = card.querySelectorAll("*");
            cardTexts.forEach((text) => {
                if (window.getComputedStyle(text).display !== "none") {
                    text.style.setProperty(
                        "color",
                        this.getContrastColor(currentTheme.primary),
                        "important"
                    );
                }
            });
        });

        // === FAQ SECTIONS: Auto-contrast on gradient backgrounds ===
        const faqQuestions = block.querySelectorAll(".faq-question");
        faqQuestions.forEach((question) => {
            // Clean slate
            question.classList.remove("bg-primary", "bg-secondary", "bg-gradient");
            question.style.removeProperty("background-color");
            question.style.removeProperty("background-image");
            question.style.removeProperty("background");

            // Apply gradient background with smart text color
            question.style.setProperty("background", gradientBg, "important");
            question.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.primary),
                "important"
            );
            question.style.setProperty("border", "none", "important");
            question.style.setProperty("padding", "1rem 1.5rem", "important");
            question.style.setProperty("border-radius", "8px", "important");
            question.style.setProperty("cursor", "pointer", "important");
            question.style.setProperty("transition", "all 0.3s ease", "important");
            question.style.setProperty("font-weight", "600", "important");
        });

        // === HERO SECTIONS: Auto-contrast on gradient backgrounds ===
        if (block.classList.contains("hero-block")) {
            block.style.setProperty("background", gradientBg, "important");
            const heroTexts = block.querySelectorAll(
                "h1, h2, h3, h4, h5, h6, p, span, div, .hero-title, .hero-subtitle"
            );
            heroTexts.forEach((text) => {
                // Skip buttons as they have their own styling handled above
                if (!text.classList.contains("btn")) {
                    text.style.setProperty(
                        "color",
                        this.getContrastColor(currentTheme.primary),
                        "important"
                    );
                }
            });
        }

        // === CTA SECTIONS: Auto-contrast on gradient backgrounds ===
        if (block.classList.contains("cta-block")) {
            block.style.setProperty("background", gradientBg, "important");
            const ctaTexts = block.querySelectorAll(
                "h1, h2, h3, h4, h5, h6, p, span, div"
            );
            ctaTexts.forEach((text) => {
                text.style.setProperty(
                    "color",
                    this.getContrastColor(currentTheme.primary),
                    "important"
                );
            });
        }

        // === STORY CARDS: Keep white background, use theme variables ===
        const storyCards = block.querySelectorAll(".story-card");
        storyCards.forEach((card) => {
            card.style.setProperty("background", "white", "important");
            card.style.setProperty("box-shadow", "var(--shadow-lg)", "important");
        });

        // === ACCENT ELEMENTS: Use theme colors directly ===
        const socialProofNumbers = block.querySelectorAll(".social-proof-number");
        socialProofNumbers.forEach((number) => {
            number.style.setProperty("color", currentTheme.primary, "important");
        });

        const accentElements = block.querySelectorAll(".accent-color, .highlight");
        accentElements.forEach((element) => {
            element.style.setProperty("color", currentTheme.accent, "important");
        });

        // === HEADINGS: Use CSS variables (will auto-update with themes) ===
        const headings = block.querySelectorAll(
            "h1, h2, h3, .hero-title, .heading-1, .heading-2, .heading-3"
        );
        headings.forEach((heading) => {
            if (!heading.style.color || heading.style.color === "inherit") {
                heading.style.setProperty("color", "var(--text-primary)", "important");
            }
        });

        // FAQ items cleanup
        const faqItems = block.querySelectorAll(".faq-item");
        faqItems.forEach((item) => {
            item.style.removeProperty("background-color");
            item.style.removeProperty("background-image");
            item.style.removeProperty("background");
            item.style.setProperty("margin-bottom", "1rem", "important");
            item.style.setProperty("border-radius", "8px", "important");
            item.style.setProperty("overflow", "hidden", "important");
        });

        // === RESPONSIVE BEHAVIOR ===
        const cardGrids = block.querySelectorAll(
            ".features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip"
        );
        cardGrids.forEach((grid) => {
            if (!grid.classList.contains("cards-per-row-responsive")) {
                grid.classList.add("cards-per-row-responsive");
            }
        });

        console.log("✅ SMART theme colors applied - all text will auto-contrast!");
    }

    /**
     * Initialize FAQ toggle functionality for existing FAQ items
     */
    initializeFaqToggle(block) {
        const faqItems = block.querySelectorAll(".faq-item");
        faqItems.forEach((item) => {
            const question = item.querySelector(".faq-question");
            if (question) {
                // Remove any existing event listeners to prevent duplicates
                const newQuestion = question.cloneNode(true);
                question.parentNode.replaceChild(newQuestion, question);

                // Add toggle functionality
                newQuestion.addEventListener("click", (e) => {
                    // In edit mode, allow toggling unless specifically editing text
                    if (this.isEditMode) {
                        // Check if this is a text editing click
                        const isTextEdit = e.detail >= 2 || e.ctrlKey || e.metaKey;
                        if (isTextEdit) {
                            return; // Allow text editing
                        }
                    }

                    // Toggle FAQ
                    e.preventDefault();
                    e.stopPropagation();

                    const answer = item.querySelector(".faq-answer");
                    const isActive = item.classList.contains("active");

                    // Close all other FAQ items first
                    const allFaqItems =
                        item.parentElement.querySelectorAll(".faq-item");
                    allFaqItems.forEach((otherItem) => {
                        if (
                            otherItem !== item &&
                            otherItem.classList.contains("active")
                        ) {
                            otherItem.classList.remove("active");
                            const otherAnswer = otherItem.querySelector(".faq-answer");
                            if (otherAnswer) {
                                otherAnswer.style.maxHeight = "0px";
                            }
                        }
                    });

                    // Toggle current item
                    if (!isActive) {
                        item.classList.add("active");
                        if (answer) {
                            // Calculate the actual height needed
                            answer.style.maxHeight = "none";
                            const height = answer.scrollHeight;
                            answer.style.maxHeight = "0px";
                            // Force reflow
                            answer.offsetHeight;
                            // Set the target height
                            answer.style.maxHeight = height + "px";
                        }
                    } else {
                        item.classList.remove("active");
                        if (answer) {
                            answer.style.maxHeight = "0px";
                        }
                    }

                    console.log("FAQ toggled:", item.classList.contains("active"));
                });
            }
        });
    }

    /**
     * Apply current theme colors to a specific element (for individual items like FAQ, cards)
     */
    applyThemeColorsToElement(element) {
        if (!element) return;

        console.log("🎨 Applying SMART theme colors to element:", element.className);

        // Get current theme colors from CSS variables
        const root = document.documentElement;
        const currentTheme = {
            primary: getComputedStyle(root).getPropertyValue("--primary-color").trim(),
            secondary: getComputedStyle(root)
                .getPropertyValue("--secondary-color")
                .trim(),
            accent: getComputedStyle(root).getPropertyValue("--accent-color").trim(),
        };

        const gradientBg = `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.secondary})`;

        // Apply theme colors to FAQ questions within this element
        const faqQuestions = element.querySelectorAll(".faq-question");
        faqQuestions.forEach((question) => {
            // Remove any existing background classes or styles
            question.classList.remove("bg-primary", "bg-secondary", "bg-gradient");
            question.style.removeProperty("background-color");
            question.style.removeProperty("background-image");
            question.style.removeProperty("background");

            // Apply gradient background with SMART contrast text color
            question.style.setProperty("background", gradientBg, "important");
            question.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.primary),
                "important"
            );
            question.style.setProperty("border", "none", "important");
            question.style.setProperty("padding", "1rem 1.5rem", "important");
            question.style.setProperty("border-radius", "8px", "important");
            question.style.setProperty("cursor", "pointer", "important");
            question.style.setProperty("transition", "all 0.3s ease", "important");
            question.style.setProperty("font-weight", "600", "important");
        });

        // Apply theme colors to other card elements
        if (
            element.classList.contains("feature-card") ||
            element.classList.contains("testimonial-card") ||
            element.classList.contains("learn-card") ||
            element.classList.contains("pricing-card")
        ) {
            element.style.setProperty("background", gradientBg, "important");
            // SMART: Auto-calculate contrast color instead of hardcoded white
            element.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.primary),
                "important"
            );

            // Apply smart text colors to ALL text in this card
            const cardTexts = element.querySelectorAll("*");
            cardTexts.forEach((text) => {
                if (window.getComputedStyle(text).display !== "none") {
                    text.style.setProperty(
                        "color",
                        this.getContrastColor(currentTheme.primary),
                        "important"
                    );
                }
            });
        }

        // Story cards get special treatment - theme-aware background with proper contrast
        if (element.classList.contains("story-card")) {
            // Use a theme-aware background that provides good contrast
            const bgColor = currentTheme.primary;
            const lightBg = this.isLightColor(bgColor)
                ? "rgba(255, 255, 255, 0.95)"
                : "rgba(255, 255, 255, 0.98)";

            element.style.setProperty("background", lightBg, "important");
            element.style.setProperty(
                "border",
                `2px solid ${currentTheme.primary}20`,
                "important"
            );
            element.style.setProperty("box-shadow", "var(--shadow-lg)", "important");

            // Apply standard theme variables like other sections
            const storyTexts = element.querySelectorAll(
                "p, .story-bio p, .credential-item span:not(:first-child)"
            );
            storyTexts.forEach((text) => {
                text.style.setProperty("color", "var(--text-secondary)", "important");
            });

            // Headings use primary text color
            const storyHeadings = element.querySelectorAll(
                "h1, h2, h3, h4, .story-name"
            );
            storyHeadings.forEach((heading) => {
                heading.style.setProperty("color", "var(--text-primary)", "important");
            });

            // Accent elements use primary color
            const accentElements = element.querySelectorAll(
                ".story-label, .credential-item span:first-child"
            );
            accentElements.forEach((accent) => {
                accent.style.setProperty("color", "var(--primary-color)", "important");
            });
        }

        // Apply theme colors to social proof numbers within this element
        const socialProofNumbers = element.querySelectorAll(".social-proof-number");
        socialProofNumbers.forEach((number) => {
            number.style.setProperty("color", currentTheme.primary, "important");
        });

        // Apply theme colors to buttons within this element
        const primaryButtons = element.querySelectorAll(".btn-primary");
        primaryButtons.forEach((btn) => {
            btn.style.setProperty("background", currentTheme.accent, "important");
            btn.style.setProperty("border-color", currentTheme.accent, "important");
            // SMART: Auto-calculate contrast color instead of hardcoded white
            btn.style.setProperty(
                "color",
                this.getContrastColor(currentTheme.accent),
                "important"
            );
        });

        console.log("✅ SMART theme colors applied to element");
    }

    /**
     * Refresh theme colors for all existing sections on the page
     */
    refreshAllSectionThemes() {
        console.log("🔄 Refreshing theme colors for all existing sections");

        const allBlocks = document.querySelectorAll(".block");
        allBlocks.forEach((block) => {
            this.applyThemeColorsToBlock(block);
        });

        console.log("✅ All sections refreshed with current theme");
    }

    /**
     * Get HTML template for block type
     */
    getBlockTemplate(blockType) {
        const templates = {
            hero: `
        <div class="block hero-block" data-block-type="hero">
          <div class="container">
            <div class="hero-content">
              <h1 class="hero-title" data-editable="true">Your Compelling Headline Here</h1>
              <p class="hero-subtitle" data-editable="true">Transform your business with our proven system</p>
              <div class="hero-cta">
                <a href="#" class="btn btn-primary btn-large" data-editable="true">Get Started Today</a>
              </div>
            </div>
          </div>
        </div>
      `,
            features: `
        <div class="block features-block" data-block-type="features">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">Why Choose Our System</h2>
              <p class="subheading" data-editable="true">Everything you need to succeed</p>
            </div>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${typeof window !== 'undefined' && window.getIconSvg ? window.getIconSvg('target') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'}</div>
                <h3 class="feature-title" data-editable="true">Strategic Clarity</h3>
                <p class="feature-description" data-editable="true">Get crystal clear on your path to success</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${typeof window !== 'undefined' && window.getIconSvg ? window.getIconSvg('zap') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'}</div>
                <h3 class="feature-title" data-editable="true">Fast Implementation</h3>
                <p class="feature-description" data-editable="true">See results in weeks, not months</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${typeof window !== 'undefined' && window.getIconSvg ? window.getIconSvg('rocket') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>'}</div>
                <h3 class="feature-title" data-editable="true">Scale With Confidence</h3>
                <p class="feature-description" data-editable="true">Build systems that grow with you</p>
              </div>
            </div>
          </div>
        </div>
      `,
            process: `
        <div class="block bg-section-3" data-block-type="process" style="padding: var(--space-20) 0;">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">3 Steps To <strong>Exponential</strong> Growth</h2>
            </div>
            <div class="features-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
              <div class="feature-card">
                <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${typeof window !== 'undefined' && window.getIconSvg ? window.getIconSvg('lightbulb') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>'}</div>
                <h3 class="feature-title" data-editable="true">Strategic Clarity</h3>
                <p class="feature-description" data-editable="true">Follow a proven process to transform your existing offer or craft a brand new, highly scalable with an irresistible, scalable value proposition that sells itself.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${typeof window !== 'undefined' && window.getIconSvg ? window.getIconSvg('clock') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'}</div>
                <h3 class="feature-title" data-editable="true">Buy Back Time</h3>
                <p class="feature-description" data-editable="true">Learn to replace chaos with the key hires in the right order and the right systems. Evolve from operator to architect - and build a business that can run without you.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${typeof window !== 'undefined' && window.getIconSvg ? window.getIconSvg('rocket') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>'}</div>
                <h3 class="feature-title" data-editable="true">Scalable Momentum</h3>
                <p class="feature-description" data-editable="true">Build a business that can scale and grow while you step back. Create systems, processes, and funnels that work 24/7 to bring in qualified leads and sales.</p>
              </div>
            </div>
          </div>
        </div>
      `,
            testimonial: `
        <div class="block testimonial-block" data-block-type="testimonial">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">What Our Clients Say</h2>
            </div>
            <div class="testimonial-grid">
              <div class="testimonial-card">
                <p class="testimonial-quote" data-editable="true">"This system transformed my business completely. I'm now on track for my first $1M year."</p>
                <div class="testimonial-author">
                  <div class="testimonial-avatar"></div>
                  <div class="testimonial-info">
                    <h4 data-editable="true">John Smith</h4>
                    <p data-editable="true">CEO, Success Company</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
            learn: `
        <div class="block learn-block" data-block-type="learn">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">What You'll Learn In This Masterclass</h2>
            </div>
            <div class="learn-grid">
              <div class="learn-card">
                <div class="learn-number">1</div>
                <div class="learn-content">
                  <h3 class="learn-title" data-editable="true">Clarify the Path to 10x Growth Without Burnout</h3>
                  <p class="learn-description" data-editable="true">Learn how to overcome the 3 silent growth barriers that keep most businesses stuck—so you can finally scale your revenue without scaling your workload.</p>
                </div>
              </div>
              <div class="learn-card">
                <div class="learn-number">2</div>
                <div class="learn-content">
                  <h3 class="learn-title" data-editable="true">Unlock Your Scalable Evergreen Funnel Framework</h3>
                  <p class="learn-description" data-editable="true">Discover the proven, 5-step method to launch a profitable, AI-powered evergreen funnel in just 8 weeks—even if you're overwhelmed, tech-phobic, or have no team.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
            pricing: `
        <div class="block pricing-block bg-section-2" data-block-type="pricing">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">Choose Your Plan</h2>
            </div>
            <div class="pricing-options">
              <div class="pricing-card">
                <div class="pricing-badge" data-editable="true">Most Popular</div>
                <div class="pricing-amount" data-editable="true">$197</div>
                <div class="pricing-period" data-editable="true">per month</div>
                <ul class="pricing-features">
                  <li data-editable="true">Feature 1</li>
                  <li data-editable="true">Feature 2</li>
                  <li data-editable="true">Feature 3</li>
                  <li data-editable="true">Feature 4</li>
                </ul>
                <a href="#" class="btn btn-primary btn-large" data-editable="true">Get Started</a>
              </div>
            </div>
          </div>
        </div>
      `,
            contact: `
        <div class="block contact-block bg-section-1" data-block-type="contact">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">Get In Touch</h2>
              <p class="subheading" data-editable="true">Ready to get started? Contact us today</p>
            </div>
            <form class="contact-form" style="max-width: 600px; margin: 0 auto;">
              <div class="form-group">
                <label data-editable="true">Name</label>
                <input type="text" name="name" required>
              </div>
              <div class="form-group">
                <label data-editable="true">Email</label>
                <input type="email" name="email" required>
              </div>
              <div class="form-group">
                <label data-editable="true">Message</label>
                <textarea name="message" rows="4" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-large" data-editable="true">Send Message</button>
            </form>
          </div>
        </div>
      `,
            cta: `
        <div class="block bg-cta" data-block-type="cta" style="padding: 80px 0; text-align: center;">
          <div class="container">
            <h2 class="heading-2" data-editable="true" style="color: white; margin-bottom: 32px;">
              Ready To Get Started?
            </h2>
            <p data-editable="true" style="color: white; font-size: 18px; margin-bottom: 40px;">
              Join thousands who have transformed their business with our system.
            </p>
            <a href="#" class="btn btn-secondary btn-large" data-editable="true" style="background: white; color: #4f46e5;">
              Start Your Journey Today
            </a>
          </div>
        </div>
      `,
            faq: `
        <div class="block faq-block bg-section-1" data-block-type="faq">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">Frequently Asked Questions</h2>
            </div>
            <div class="faq-container" style="max-width: 800px; margin: 0 auto;">
              <div class="faq-item">
                <div class="faq-question" data-editable="true">What is included in the program?</div>
                <div class="faq-answer" data-editable="true">Complete description of what your program includes and how it works.</div>
              </div>
              <div class="faq-item">
                <div class="faq-question" data-editable="true">How long does it take to see results?</div>
                <div class="faq-answer" data-editable="true">Timeline and expectations for client results.</div>
              </div>
              <div class="faq-item">
                <div class="faq-question" data-editable="true">Is there a money-back guarantee?</div>
                <div class="faq-answer" data-editable="true">Details about your guarantee and refund policy.</div>
              </div>
            </div>
          </div>
        </div>
      `,
            content: `
        <div class="block bg-section-1" data-block-type="content" style="padding: 80px 0;">
          <div class="container">
            <div style="max-width: 800px; margin: 0 auto; text-align: center;">
              <h2 class="heading-2" data-editable="true">Your Section Title</h2>
              <p class="subheading" data-editable="true">Add your content description here</p>
              <p data-editable="true">
                This is a flexible content section. You can add paragraphs, lists, images,
                and any other content you need for your page.
              </p>
            </div>
          </div>
        </div>
      `,
            newsletter: `
        <div class="block newsletter-block bg-section-2" data-block-type="newsletter" style="padding: 80px 0;">
          <div class="container">
            <div style="max-width: 600px; margin: 0 auto; text-align: center;">
              <h2 class="heading-2" data-editable="true">Stay Updated</h2>
              <p class="subheading" data-editable="true">Get exclusive tips and updates delivered to your inbox</p>
              <form class="newsletter-form" style="display: flex; gap: 12px; margin-top: 30px;">
                <input type="email" placeholder="Enter your email" style="flex: 1; padding: 15px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" required>
                <button type="submit" class="btn btn-primary" data-editable="true">Subscribe</button>
              </form>
            </div>
          </div>
        </div>
      `,
            foot: `
        <div class="block foot-block" data-block-type="foot">
          <div class="container">
            <div class="foot-content">
              <div class="foot-left">
                <div class="device-mockups">
                  <div class="device-stack">
                    <div class="device laptop">
                      <div class="device-screen">
                        <div class="screen-content">
                          <div class="screen-header" data-editable="true">GROWTH AUTOMATION MASTERCLASS</div>
                          <div class="screen-title" data-editable="true">3 KEYS TO LAUNCH & SCALE WITH AI & DELEGATION</div>
                        </div>
                      </div>
                    </div>
                    <div class="device tablet">
                      <div class="device-screen">
                        <div class="screen-content">
                          <div class="screen-text" data-editable="true">BUILD AN AUTOMATED SALES PIPELINE</div>
                        </div>
                      </div>
                    </div>
                    <div class="device phone">
                      <div class="device-screen">
                        <div class="screen-content">
                          <div class="screen-icon" style="width: 48px; height: 48px; color: hsl(103 89% 29%);">${typeof window !== 'undefined' && window.getIconSvg ? window.getIconSvg('rocket') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="foot-right">
                <div class="foot-copy">
                  <h2 class="foot-title" data-editable="true">Liberate Your <span class="highlight">Growth</span></h2>
                  <h3 class="foot-subtitle" data-editable="true">Discover The 3 Keys To Build A Profitable Evergreen Masterclass Funnel By Leveraging A Proven System</h3>
                  <p class="foot-description" data-editable="true"><strong>Without Burning Out</strong> in the time-for-money trap, endless cold sales calls, manual lead nurture & follow up, expensive monthly softwares, gambling on Facebook Ads, or team member headaches.</p>
                  <div class="foot-cta">
                    <button class="btn btn-primary btn-large" data-editable="true">REGISTER NOW</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
            "contact-form": `
        <div class="block contact-block bg-section-1" data-block-type="contact-form" style="padding: var(--space-20) 0;">
          <div class="container">
            <div class="heading-block">
              <h2 class="heading-2" data-editable="true">Get In Touch</h2>
              <p class="subheading" data-editable="true">Ready to transform your business? Let's start the conversation.</p>
            </div>
            <div class="contact-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-12); margin-top: var(--space-16);">
              <div class="contact-info" style="background: white; padding: var(--space-12); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
                <h3 data-editable="true" style="margin-bottom: var(--space-6); color: var(--primary-color);">Contact Information</h3>
                <div class="contact-item" style="margin-bottom: var(--space-6);">
                  <strong data-editable="true">Email:</strong>
                  <p data-editable="true">hello@yourcompany.com</p>
                </div>
                <div class="contact-item" style="margin-bottom: var(--space-6);">
                  <strong data-editable="true">Phone:</strong>
                  <p data-editable="true">+1 (555) 123-4567</p>
                </div>
                <div class="contact-item">
                  <strong data-editable="true">Office:</strong>
                  <p data-editable="true">123 Business St, Suite 100<br>Your City, State 12345</p>
                </div>
              </div>
              <div class="contact-form-wrapper" style="background: white; padding: var(--space-12); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
                <form class="contact-form">
                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-6);">
                    <div class="form-group">
                      <label data-editable="true">First Name</label>
                      <input type="text" name="first_name" required>
                    </div>
                    <div class="form-group">
                      <label data-editable="true">Last Name</label>
                      <input type="text" name="last_name" required>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: var(--space-6);">
                    <label data-editable="true">Email Address</label>
                    <input type="email" name="email" required>
                  </div>
                  <div class="form-group" style="margin-bottom: var(--space-6);">
                    <label data-editable="true">Phone (Optional)</label>
                    <input type="tel" name="phone">
                  </div>
                  <div class="form-group" style="margin-bottom: var(--space-8);">
                    <label data-editable="true">How can we help you?</label>
                    <textarea name="message" rows="5" placeholder="Tell us about your goals and challenges..." required></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary btn-large" data-editable="true" style="width: 100%;">Send Message</button>
                  <p style="margin-top: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary); text-align: center;" data-editable="true">
                    We'll respond within 24 hours
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      `,
            footer: `
        <div class="block footer-block bg-footer" data-block-type="footer">
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
      `,
            "social-proof": `
        <div class="block social-proof-block" data-block-type="social-proof">
          <div class="container">
            <div class="social-proof-header">
              <h3 class="social-proof-title" data-editable="true">Built for Success</h3>
            </div>
            <div class="social-proof-strip">
              <div class="social-proof-card">
                <div class="social-proof-stat">
                  <span class="social-proof-number" data-editable="true">50%</span>
                  <span class="social-proof-label" data-editable="true">Success Rate</span>
                </div>
              </div>
              <div class="social-proof-card">
                <div class="social-proof-stat">
                  <span class="social-proof-number" data-editable="true">100%</span>
                  <span class="social-proof-label" data-editable="true">Satisfaction</span>
                </div>
              </div>
              <div class="social-proof-card">
                <div class="social-proof-stat">
                  <span class="social-proof-number" data-editable="true">2,500+</span>
                  <span class="social-proof-label" data-editable="true">Customers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
            story: `
        <div class="block story-block bg-section-1" data-block-type="story" style="padding: var(--space-20) 0;">
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
        };

        // Add quote template
        templates.quote = `
      <div class="block quote-block" data-block-type="quote" style="background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/Screenshot 2568-09-30 at 2.22.29 AM.png') center/cover; padding: var(--space-20) 0; text-align: center; color: white; position: relative;">
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
    `;

        return templates[blockType] || templates.hero;
    }

    /**
     * Undo/Redo functionality
     */
    saveState() {
        const state = document.querySelector(".page-container").innerHTML;
        this.undoStack.push(state);
        this.redoStack = []; // Clear redo stack on new action

        // Limit undo stack size
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }

        // Update toolbar to reflect new state
        this.updateToolbar();
    }

    undo() {
        if (this.undoStack.length > 1) {
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);

            const previousState = this.undoStack[this.undoStack.length - 1];
            const pageContainer = document.querySelector(".page-container");
            if (!pageContainer) {
                console.warn("⚠️ Undo failed: .page-container not found");
                // Restore the stack state
                this.undoStack.push(currentState);
                this.redoStack.pop();
                return;
            }
            pageContainer.innerHTML = previousState;
            this.initializeBlocks();
            this.updateToolbar();

            // Reinitialize sparkle buttons and icon handlers after DOM restore
            this.reinitializeAfterDOMRestore();

            console.log(
                "✅ Undo applied - Stack lengths:",
                this.undoStack.length,
                this.redoStack.length
            );
            this.showNotification("Undo successful", "success");
        } else {
            console.log("⚠️ Nothing to undo");
            this.showNotification("Nothing to undo", "info");
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.undoStack.push(state);

            const pageContainer = document.querySelector(".page-container");
            if (!pageContainer) {
                console.warn("⚠️ Redo failed: .page-container not found");
                // Restore the stack state
                this.redoStack.push(state);
                this.undoStack.pop();
                return;
            }
            pageContainer.innerHTML = state;
            this.initializeBlocks();
            this.updateToolbar();

            // Reinitialize sparkle buttons and icon handlers after DOM restore
            this.reinitializeAfterDOMRestore();

            console.log(
                "✅ Redo applied - Stack lengths:",
                this.undoStack.length,
                this.redoStack.length
            );
            this.showNotification("Redo successful", "success");
        } else {
            console.log("⚠️ Nothing to redo");
            this.showNotification("Nothing to redo", "info");
        }
    }

    /**
     * Reinitialize sparkle buttons and icon handlers after DOM restore (undo/redo)
     */
    reinitializeAfterDOMRestore() {
        // Reinitialize icon picker click handlers
        if (window.iconPicker && typeof window.iconPicker.initializeIconClickHandlers === 'function') {
            setTimeout(() => {
                window.iconPicker.initializeIconClickHandlers();
                console.log("🎨 Icon picker handlers reinitialized after undo/redo");
            }, 100);
        }

        // Trigger sparkle button reinitialization (handled by editor-page-wrapper.tsx script)
        // The script monitors for missing sparkle buttons every 2 seconds, but we can trigger immediately
        if (typeof window.addRegenerateIcons === 'function') {
            setTimeout(() => {
                window.addRegenerateIcons();
                console.log("✨ Sparkle buttons reinitialized after undo/redo");
            }, 200);
        }

        // Dispatch custom event for any other listeners that need to reinitialize
        document.dispatchEvent(new CustomEvent('editorDOMRestored', {
            detail: { source: 'undoRedo' }
        }));
    }

    /**
     * Setup toolbar
     */
    setupToolbar() {
        const toolbar = document.getElementById("editor-toolbar");
        if (!toolbar) return;

        toolbar.innerHTML = `
      <div class="toolbar-section toolbar-left">
        <button id="toggle-edit" class="toolbar-btn">
          <span class="btn-icon">✏️</span>
          <span class="btn-text">Edit</span>
        </button>
        <button id="theme-switcher" class="toolbar-btn">
          <span class="btn-icon">🎨</span>
          <span class="btn-text">Theme</span>
        </button>
      </div>

      <div class="toolbar-section toolbar-center">
        <div class="quick-add-section">
          <div class="quick-add-icons">
            ${Array.from(this.components.entries())
                .map(([type, component]) => {
                    // Convert emoji to SVG if emojiToSvg is available
                    const iconHtml =
                        typeof window.emojiToSvg === "function"
                            ? window.emojiToSvg(component.icon)
                            : component.icon;
                    return `<button class="quick-add-btn" data-component="${type}" title="Add ${component.name}">
                <span class="quick-icon">${iconHtml}</span>
                <span class="quick-label">${component.name.split(" ")[0]}</span>
              </button>`;
                })
                .join("")}
          </div>
        </div>
      </div>

      <div class="toolbar-section toolbar-right">
        <button id="undo-btn" class="toolbar-btn">
          <span class="btn-icon">↶</span>
          <span class="btn-text">Undo</span>
        </button>
        <button id="redo-btn" class="toolbar-btn">
          <span class="btn-icon">↷</span>
          <span class="btn-text">Redo</span>
        </button>
        <button id="save-btn" class="toolbar-btn primary">
          <span class="btn-icon">💾</span>
          <span class="btn-text">Save</span>
        </button>
      </div>
    `;
    }

    updateToolbar() {
        const toggleBtn = document.getElementById("toggle-edit");
        if (toggleBtn) {
            const icon = toggleBtn.querySelector(".btn-icon");
            const text = toggleBtn.querySelector(".btn-text");

            if (icon && text) {
                icon.textContent = this.isEditMode ? "👁️" : "✏️";
                text.textContent = this.isEditMode ? "Preview" : "Edit";
            }

            toggleBtn.classList.toggle("active", this.isEditMode);
        }

        // Update undo/redo button states
        const undoBtn = document.getElementById("undo-btn");
        const redoBtn = document.getElementById("redo-btn");

        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length <= 1;
            undoBtn.style.opacity = this.undoStack.length <= 1 ? "0.5" : "1";
        }

        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
            redoBtn.style.opacity = this.redoStack.length === 0 ? "0.5" : "1";
        }
    }

    setupEventListeners() {
        document.addEventListener("click", (e) => {
            // Toolbar button handlers
            // Components functionality disabled for current release
            /*
      if (e.target.id === 'toggle-components' || e.target.closest('#toggle-components')) {
        this.toggleComponentLibrary();
      }
      */

            if (e.target.id === "toggle-edit" || e.target.closest("#toggle-edit")) {
                this.toggleEditMode();
            }

            if (
                e.target.id === "theme-switcher" ||
                e.target.closest("#theme-switcher")
            ) {
                this.showThemeSelector();
            }

            if (e.target.id === "undo-btn" || e.target.closest("#undo-btn")) {
                this.undo();
            }

            if (e.target.id === "redo-btn" || e.target.closest("#redo-btn")) {
                this.redo();
            }

            // Component library handlers (legacy quick add)
            const componentBtn =
                e.target.closest(".component-btn") ||
                e.target.closest(".quick-add-btn");
            if (componentBtn) {
                const componentType = componentBtn.dataset.component;
                this.addBlock(componentType, this.selectedBlock);
            }

            // Save handler
            if (e.target.id === "save-btn" || e.target.closest("#save-btn")) {
                this.savePage();
            }

            // Image upload button handlers
            if (e.target.classList.contains("image-upload-btn")) {
                const type = e.target.dataset.type;
                const targetElement =
                    type === "background"
                        ? this.selectedBlock
                        : this.selectedBlock.querySelector(
                              'img[data-editable="true"], .story-image img'
                          );

                if (type === "background") {
                    this.showImageUploadForBackground(this.selectedBlock);
                } else if (type === "photo") {
                    this.showImageUploadForPhoto(targetElement);
                }
            }

            // Image remove button handlers
            if (e.target.classList.contains("image-remove-btn")) {
                const type = e.target.dataset.type;
                if (type === "background") {
                    this.removeBackgroundImage(this.selectedBlock);
                } else if (type === "photo") {
                    this.removePhotoImage(this.selectedBlock);
                }
            }

            // Slug update button handler
            if (e.target.classList.contains("update-slug-btn")) {
                const funnelId = e.target.dataset.funnelId;
                const slugInput = document.querySelector(".slug-input");
                if (slugInput && funnelId) {
                    this.updateFunnelSlug(funnelId, slugInput.value);
                }
            }
        });

        // Settings panel handlers - Enhanced for better real-time sync
        document.addEventListener("input", (e) => {
            if (e.target.dataset.property && this.selectedBlock) {
                let value = e.target.value;

                // Handle checkbox values
                if (e.target.type === "checkbox") {
                    value = e.target.checked;
                }

                // Handle color text inputs
                if (e.target.classList.contains("color-text")) {
                    const colorPicker = document.querySelector(
                        `input[data-property="${e.target.dataset.property.replace("-text", "")}"]`
                    );
                    if (colorPicker) {
                        colorPicker.value = value;
                    }
                    value = e.target.value;
                    this.updateBlockProperty(
                        this.selectedBlock,
                        e.target.dataset.property.replace("-text", ""),
                        value
                    );
                    return;
                }

                // Immediate update for real-time feedback based on what's selected
                if (this.selectedButtonElement) {
                    this.updateButtonProperty(
                        this.selectedButtonElement,
                        e.target.dataset.property,
                        value
                    );
                } else if (this.selectedCardElement) {
                    this.updateCardProperty(
                        this.selectedCardElement,
                        e.target.dataset.property,
                        value
                    );
                } else if (this.selectedTextElement) {
                    this.updateTextProperty(
                        this.selectedTextElement,
                        e.target.dataset.property,
                        value
                    );
                } else if (this.selectedBlock) {
                    this.updateBlockProperty(
                        this.selectedBlock,
                        e.target.dataset.property,
                        value
                    );
                }
            }
        });

        document.addEventListener("change", (e) => {
            if (e.target.dataset.property) {
                let value = e.target.value;

                // Handle checkbox values
                if (e.target.type === "checkbox") {
                    value = e.target.checked;
                }

                // Apply the change based on what's selected
                if (this.selectedButtonElement) {
                    this.updateButtonProperty(
                        this.selectedButtonElement,
                        e.target.dataset.property,
                        value
                    );
                } else if (this.selectedCardElement) {
                    this.updateCardProperty(
                        this.selectedCardElement,
                        e.target.dataset.property,
                        value
                    );
                } else if (this.selectedTextElement) {
                    this.updateTextProperty(
                        this.selectedTextElement,
                        e.target.dataset.property,
                        value
                    );
                } else if (this.selectedBlock) {
                    this.updateBlockProperty(
                        this.selectedBlock,
                        e.target.dataset.property,
                        value
                    );
                }
            }
        });

        // Handle color picker sync
        document.addEventListener("input", (e) => {
            if (e.target.type === "color" && e.target.dataset.property) {
                const textInput = document.querySelector(
                    `input[data-property="${e.target.dataset.property}-text"]`
                );
                if (textInput) {
                    textInput.value = e.target.value;
                }
            }
        });

        // Handle theme background/color selector clicks
        document.addEventListener("click", (e) => {
            if (
                e.target &&
                e.target.closest &&
                e.target.closest(".theme-option") &&
                (this.selectedBlock || this.selectedTextElement)
            ) {
                const themeOption = e.target.closest(".theme-option");
                const property = themeOption.dataset.property;
                const value = themeOption.dataset.value;

                // Update selection UI
                const selector = themeOption.parentElement;
                selector
                    .querySelectorAll(".theme-option")
                    .forEach((opt) => opt.classList.remove("selected"));
                themeOption.classList.add("selected");

                // Apply property based on what's selected
                if (this.selectedTextElement && property === "textColor") {
                    // Apply text color to text element
                    this.updateTextProperty(this.selectedTextElement, property, value);

                    // Refresh settings if custom was selected to show text color picker
                    if (value === "custom") {
                        this.showNotification(
                            "🎨 Custom text color picker activated!",
                            "info"
                        );
                        setTimeout(() => {
                            this.showBlockSettings(this.selectedTextElement, "text");
                        }, 100);
                    }
                } else if (
                    this.selectedButtonElement &&
                    (property === "buttonBackground" || property === "buttonTextColor")
                ) {
                    // Apply button color to button element
                    this.updateButtonProperty(
                        this.selectedButtonElement,
                        property,
                        value
                    );

                    // Refresh settings if custom was selected to show button color picker
                    if (value === "custom") {
                        this.showNotification(
                            "🎨 Custom button color picker activated!",
                            "info"
                        );
                        setTimeout(() => {
                            this.showBlockSettings(
                                this.selectedButtonElement,
                                "button"
                            );
                        }, 100);
                    }
                } else if (this.selectedCardElement && property === "cardBackground") {
                    // Apply card color to card element
                    this.updateCardProperty(this.selectedCardElement, property, value);

                    // Refresh settings if custom was selected to show card color picker
                    if (value === "custom") {
                        this.showNotification(
                            "🎨 Custom card color picker activated!",
                            "info"
                        );
                        setTimeout(() => {
                            this.showBlockSettings(this.selectedCardElement, "card");
                        }, 100);
                    }
                } else if (this.selectedBlock) {
                    // Apply block property (background, etc.)
                    this.updateBlockProperty(this.selectedBlock, property, value);

                    // Refresh settings if custom was selected to show color editor
                    if (value === "custom") {
                        this.showNotification(
                            "🎨 Custom color picker activated! Modify colors below.",
                            "info"
                        );
                        setTimeout(() => {
                            this.showBlockSettings(this.selectedBlock);
                        }, 100);
                    }
                }
            }
        });

        // Handle custom theme variable changes
        document.addEventListener("input", (e) => {
            if (
                e.target &&
                (e.target.classList.contains("theme-color-picker") ||
                    e.target.classList.contains("theme-color-text"))
            ) {
                const variable = e.target.getAttribute("data-css-variable");
                const value = e.target.value;

                if (variable && value) {
                    this.updateCustomVariable(variable, value);

                    // Sync color picker and text input
                    const wrapper =
                        e.target.closest && e.target.closest(".theme-color-wrapper");
                    if (wrapper) {
                        const preview = wrapper.querySelector(".theme-color-preview");
                        const colorPicker =
                            wrapper.querySelector(".theme-color-picker");
                        const textInput = wrapper.querySelector(".theme-color-text");

                        if (preview) preview.style.background = value;
                        if (colorPicker && e.target !== colorPicker)
                            colorPicker.value = value;
                        if (textInput && e.target !== textInput)
                            textInput.value = value;
                    }
                }
            }
        });

        // Handle section-specific color changes
        document.addEventListener("input", (e) => {
            if (
                e.target &&
                (e.target.classList.contains("section-color-picker") ||
                    e.target.classList.contains("section-color-text"))
            ) {
                const property = e.target.getAttribute("data-section-property");
                const value = e.target.value;

                if (property && value && this.selectedBlock) {
                    // Apply directly to the selected section
                    this.selectedBlock.style.setProperty(
                        "background",
                        value,
                        "important"
                    );
                    this.selectedBlock.dataset.sectionBackground = value;

                    // Update text color for readability
                    this.updateTextColorForBackground(this.selectedBlock, value);

                    // Sync color picker and text input
                    const wrapper = e.target.closest(".theme-color-wrapper");
                    if (wrapper) {
                        const preview = wrapper.querySelector(".theme-color-preview");
                        const colorPicker = wrapper.querySelector(
                            ".section-color-picker"
                        );
                        const textInput = wrapper.querySelector(".section-color-text");

                        if (preview) preview.style.background = value;
                        if (colorPicker && e.target !== colorPicker)
                            colorPicker.value = value;
                        if (textInput && e.target !== textInput)
                            textInput.value = value;
                    }

                    this.showNotification(`Section background updated!`, "success");
                }
            }
        });

        // Handle text-specific color changes
        document.addEventListener("input", (e) => {
            if (
                e.target &&
                (e.target.classList.contains("text-color-picker") ||
                    e.target.classList.contains("text-color-text"))
            ) {
                const property = e.target.getAttribute("data-text-property");
                const value = e.target.value;

                if (property && value && this.selectedTextElement) {
                    // Apply directly to the selected text element
                    this.selectedTextElement.style.setProperty(
                        "color",
                        value,
                        "important"
                    );
                    this.selectedTextElement.dataset.textColor = value;

                    // Sync color picker and text input
                    const wrapper = e.target.closest(".theme-color-wrapper");
                    if (wrapper) {
                        const preview = wrapper.querySelector(".theme-color-preview");
                        const colorPicker = wrapper.querySelector(".text-color-picker");
                        const textInput = wrapper.querySelector(".text-color-text");

                        if (preview) preview.style.background = value;
                        if (colorPicker && e.target !== colorPicker)
                            colorPicker.value = value;
                        if (textInput && e.target !== textInput)
                            textInput.value = value;
                    }

                    this.showNotification(`Text color updated!`, "success");
                }
            }
        });

        // Handle card-specific color changes
        document.addEventListener("input", (e) => {
            if (
                e.target &&
                (e.target.classList.contains("card-color-picker") ||
                    e.target.classList.contains("card-color-text"))
            ) {
                const property = e.target.getAttribute("data-card-property");
                const value = e.target.value;

                if (property && value && this.selectedCardElement) {
                    // Apply directly to the selected card element
                    this.selectedCardElement.style.setProperty(
                        "background-color",
                        value,
                        "important"
                    );
                    this.selectedCardElement.dataset.cardBackground = value;

                    // Sync color picker and text input
                    const wrapper = e.target.closest(".theme-color-wrapper");
                    if (wrapper) {
                        const preview = wrapper.querySelector(".theme-color-preview");
                        const colorPicker = wrapper.querySelector(".card-color-picker");
                        const textInput = wrapper.querySelector(".card-color-text");

                        if (preview) preview.style.background = value;
                        if (colorPicker && e.target !== colorPicker)
                            colorPicker.value = value;
                        if (textInput && e.target !== textInput)
                            textInput.value = value;
                    }

                    this.showNotification(`Card color updated!`, "success");
                }
            }
        });

        // Handle theme action buttons
        document.addEventListener("click", (e) => {
            if (e.target.matches('[data-action="reset-theme"]')) {
                this.resetCustomTheme();
            }
            if (e.target.matches('[data-action="save-theme"]')) {
                this.saveCustomTheme();
            }
            if (e.target.matches('[data-action="apply-card-color-to-all"]')) {
                this.applyCardColorToAll();
            }
            if (e.target.matches('[data-action="apply-button-style-to-all"]')) {
                this.applyButtonStyleToAll();
            }
        });

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case "z":
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case "s":
                        e.preventDefault();
                        this.savePage();
                        break;
                    case "e":
                        e.preventDefault();
                        this.toggleEditMode();
                        break;
                    case "Escape":
                        e.preventDefault();
                        this.closePanelSettings(
                            document.getElementById("block-settings")
                        );
                        break;
                }
            }
        });
    }

    initializeBlocks() {
        const blocks = document.querySelectorAll(".block");
        blocks.forEach((block) => {
            // Set the data-editor-mode attribute on each block
            block.setAttribute("data-editor-mode", this.isEditMode);

            if (this.isEditMode) {
                this.makeBlockEditable(block);
            } else {
                this.makeBlockReadOnly(block);
            }

            // Initialize FAQ toggle functionality for existing FAQ items
            this.initializeFaqToggle(block);

            // Apply theme colors to ensure all elements have proper styling
            this.applyThemeColorsToBlock(block);

            // Initialize hero content with custom widths if they exist
            this.initializeHeroContent(block);
        });

        console.log(
            `Initialized ${blocks.length} blocks in ${this.isEditMode ? "EDIT" : "PREVIEW"} mode`
        );
    }

    getBlockProperty(block, property) {
        // Handle section background specially
        if (property === "sectionBackground") {
            // Check dataset first
            if (block.dataset.sectionBackground) {
                return block.dataset.sectionBackground;
            }

            // Check for existing inline background style
            const bgStyle = block.style.background;
            if (bgStyle) {
                return bgStyle;
            }

            // Default to clean white
            return "#FFFFFF";
        }

        // First check dataset for stored values
        if (block.dataset[property]) {
            return block.dataset[property];
        }

        // Then check computed styles for current values
        const computedStyle = getComputedStyle(block);

        // Map property names to actual CSS properties
        switch (property) {
            case "backgroundColor":
                return this.rgbToHex(computedStyle.backgroundColor) || "#ffffff";
            case "paddingTop":
                return parseInt(computedStyle.paddingTop) || 80;
            case "paddingBottom":
                return parseInt(computedStyle.paddingBottom) || 80;
            case "marginTop":
                return parseInt(computedStyle.marginTop) || 0;
            case "marginBottom":
                return parseInt(computedStyle.marginBottom) || 0;
            case "borderRadius":
                return parseInt(computedStyle.borderRadius) || 0;
            case "titleColor":
                const title = block.querySelector(
                    "h1, h2, .hero-title, .heading-1, .heading-2"
                );
                return title ? this.rgbToHex(getComputedStyle(title).color) : "#111827";
            case "titleSize":
                const titleEl = block.querySelector("h1, .hero-title, .heading-1");
                return titleEl ? parseInt(getComputedStyle(titleEl).fontSize) : 48;
            case "subtitleColor":
                const subtitle = block.querySelector(".hero-subtitle, .subheading");
                return subtitle
                    ? this.rgbToHex(getComputedStyle(subtitle).color)
                    : "#6b7280";
            case "subtitleSize":
                const subtitleEl = block.querySelector(".hero-subtitle, .subheading");
                return subtitleEl
                    ? parseInt(getComputedStyle(subtitleEl).fontSize)
                    : 20;
            case "cardsPerRow":
                // Check if there's a stored value first
                if (block.dataset.cardsPerRow) {
                    return parseInt(block.dataset.cardsPerRow);
                }
                // Try to detect current cards per row from grid layout
                const cardGrid = block.querySelector(
                    ".features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip"
                );
                if (cardGrid) {
                    const gridCols = getComputedStyle(cardGrid).gridTemplateColumns;
                    if (gridCols && gridCols !== "none") {
                        // Count the number of 1fr columns
                        const colCount = (gridCols.match(/1fr/g) || []).length;
                        return colCount > 0 ? colCount : 3;
                    }
                }
                return 3; // Default
            default:
                return computedStyle.getPropertyValue(`--${property}`) || "";
        }
    }

    // Helper function to convert RGB to Hex
    rgbToHex(rgb) {
        if (!rgb || rgb === "rgba(0, 0, 0, 0)" || rgb === "transparent")
            return "#ffffff";

        // Handle hex values that are already in hex format
        if (rgb.startsWith("#")) return rgb;

        // Handle rgb/rgba values
        const rgbMatch = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        return "#ffffff";
    }

    updateBlockProperty(block, property, value) {
        // Don't save state on every change to avoid performance issues
        // this.saveState();

        console.log(`Updating ${property} to ${value} on block:`, block);

        // Apply the property based on its type - FOCUS ON COLORS FIRST
        switch (property) {
            case "sectionBackground":
                if (value === "custom") {
                    // Show color picker for custom color - this will be handled by the custom theme editor
                    block.setAttribute("data-custom-background", "true");
                } else {
                    // Apply the background color directly to this section
                    block.style.setProperty("background", value, "important");
                    block.removeAttribute("data-custom-background");

                    // Remove any old background classes since we're using direct colors now
                    const bgClasses = [
                        "bg-section-1",
                        "bg-section-2",
                        "bg-section-3",
                        "bg-section-4",
                        "bg-section-5",
                        "bg-hero",
                        "bg-cta",
                        "bg-testimonial",
                        "bg-pricing",
                    ];
                    bgClasses.forEach((cls) => block.classList.remove(cls));

                    // Update text color based on background brightness
                    this.updateTextColorForBackground(block, value);
                }

                // Store the value in dataset for persistence
                block.dataset.sectionBackground = value;

                console.log(`Applied section background: ${value}`);
                break;
            case "backgroundColor":
                block.style.backgroundColor = value;
                block.style.setProperty("background-color", value, "important");
                console.log(`Applied backgroundColor: ${value}`);
                break;

            case "titleColor":
                const titles = block.querySelectorAll(
                    "h1, h2, .hero-title, .heading-1, .heading-2, .heading-3"
                );
                titles.forEach((title) => {
                    title.style.setProperty("color", value, "important");
                    console.log(`Applied titleColor: ${value} to`, title);
                });
                break;

            case "subtitleColor":
                const subtitles = block.querySelectorAll(".hero-subtitle, .subheading");
                subtitles.forEach((subtitle) => {
                    subtitle.style.setProperty("color", value, "important");
                    console.log(`Applied subtitleColor: ${value} to`, subtitle);
                });
                break;

            case "buttonColor":
                const buttons = block.querySelectorAll(".btn");
                buttons.forEach((btn) => {
                    if (btn.classList.contains("btn-primary")) {
                        btn.style.setProperty("background-color", value, "important");
                        console.log(
                            `Applied buttonColor: ${value} to primary button`,
                            btn
                        );
                    } else if (btn.classList.contains("btn-secondary")) {
                        btn.style.setProperty("border-color", value, "important");
                        btn.style.setProperty("color", value, "important");
                        console.log(
                            `Applied buttonColor: ${value} to secondary button`,
                            btn
                        );
                    }
                });
                break;

            case "cardBackground":
                const cards = block.querySelectorAll(
                    ".feature-card, .testimonial-card, .learn-card, .pricing-card"
                );
                cards.forEach((card) => {
                    card.style.setProperty("background-color", value, "important");
                    console.log(`Applied cardBackground: ${value} to`, card);
                });
                break;

            case "iconColor":
                const icons = block.querySelectorAll(".feature-icon");
                icons.forEach((icon) => {
                    icon.style.setProperty("background-color", value, "important");
                    console.log(`Applied iconColor: ${value} to`, icon);
                });
                break;

            case "textColor":
                const textElements = block.querySelectorAll(
                    ".feature-description, p:not(.hero-subtitle):not(.subheading)"
                );
                textElements.forEach((text) => {
                    text.style.setProperty("color", value, "important");
                    console.log(`Applied textColor: ${value} to`, text);
                });
                break;

            case "quoteColor":
                const quotes = block.querySelectorAll(".testimonial-quote");
                quotes.forEach((quote) => {
                    quote.style.setProperty("color", value, "important");
                    console.log(`Applied quoteColor: ${value} to`, quote);
                });
                break;

            case "authorColor":
                const authors = block.querySelectorAll(".testimonial-info h4");
                authors.forEach((author) => {
                    author.style.setProperty("color", value, "important");
                    console.log(`Applied authorColor: ${value} to`, author);
                });
                break;

            case "borderColor":
                const testimonialCards = block.querySelectorAll(".testimonial-card");
                testimonialCards.forEach((card) => {
                    card.style.setProperty("border-left-color", value, "important");
                    console.log(`Applied borderColor: ${value} to`, card);
                });
                break;

            // Spacing properties
            case "paddingTop":
                block.style.setProperty("padding-top", value + "px", "important");
                break;
            case "paddingBottom":
                block.style.setProperty("padding-bottom", value + "px", "important");
                break;
            case "marginTop":
                block.style.setProperty("margin-top", value + "px", "important");
                break;
            case "marginBottom":
                block.style.setProperty("margin-bottom", value + "px", "important");
                break;
            case "borderRadius":
                block.style.setProperty("border-radius", value + "px", "important");
                break;

            // Typography
            case "titleSize":
                const titleElements = block.querySelectorAll(
                    "h1, .hero-title, .heading-1"
                );
                titleElements.forEach((title) => {
                    title.style.setProperty("font-size", value + "px", "important");
                });
                break;
            case "subtitleSize":
                const subtitleElements = block.querySelectorAll(
                    ".hero-subtitle, .subheading"
                );
                subtitleElements.forEach((subtitle) => {
                    subtitle.style.setProperty("font-size", value + "px", "important");
                });
                break;

            // Layout
            case "textAlign":
                block.style.setProperty("text-align", value, "important");
                break;
            case "columns":
                const grid = block.querySelector(".features-grid, .testimonial-grid");
                if (grid) {
                    grid.style.setProperty(
                        "grid-template-columns",
                        `repeat(${value}, 1fr)`,
                        "important"
                    );
                }
                break;
            case "cardsPerRow":
                // Set a CSS custom property for responsive behavior
                block.style.setProperty("--cards-per-row", value);

                // Apply cards per row to all grid-based card containers
                const cardGrids = block.querySelectorAll(
                    ".features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip"
                );
                cardGrids.forEach((grid) => {
                    // Use CSS custom property with fallback
                    grid.style.setProperty(
                        "grid-template-columns",
                        `repeat(var(--cards-per-row, ${value}), 1fr)`,
                        "important"
                    );
                    grid.style.setProperty("display", "grid", "important");
                    grid.style.setProperty(
                        "gap",
                        "var(--space-6, 1.5rem)",
                        "important"
                    );

                    // Ensure proper centering for all grid layouts
                    grid.style.setProperty("justify-content", "center", "important");
                    grid.style.setProperty("place-content", "center", "important");

                    // Add responsive class for mobile override
                    grid.classList.add("cards-per-row-responsive");
                });

                // Store the value for persistence
                block.dataset.cardsPerRow = value;
                console.log(
                    `Applied cardsPerRow: ${value} cards per row with responsive behavior`
                );
                break;

            // Effects
            case "backgroundGradient":
                if (value) {
                    block.style.setProperty(
                        "background",
                        "linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(16, 185, 129, 0.1))",
                        "important"
                    );
                } else {
                    block.style.removeProperty("background");
                }
                break;
            case "cardShadow":
                const cardElements = block.querySelectorAll(
                    ".feature-card, .testimonial-card, .pricing-card"
                );
                cardElements.forEach((card) => {
                    if (value) {
                        card.style.setProperty(
                            "box-shadow",
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            "important"
                        );
                    } else {
                        card.style.removeProperty("box-shadow");
                    }
                });
                break;
            case "showAvatars":
                const avatars = block.querySelectorAll(".testimonial-avatar");
                avatars.forEach((avatar) => {
                    avatar.style.setProperty(
                        "display",
                        value ? "block" : "none",
                        "important"
                    );
                });
                break;

            // Social Proof specific properties
            case "cardSpacing":
                block.style.setProperty("--social-proof-gap", value + "rem");
                block.style.setProperty(
                    "--social-proof-gap-mobile",
                    Math.max(0.5, value - 0.5) + "rem"
                );
                break;
            case "cardPadding":
                const socialCards = block.querySelectorAll(".social-proof-card");
                socialCards.forEach((card) => {
                    card.style.setProperty(
                        "padding",
                        value + "rem " + value * 0.75 + "rem",
                        "important"
                    );
                });
                break;
            case "cardRadius":
                const socialProofCards = block.querySelectorAll(".social-proof-card");
                socialProofCards.forEach((card) => {
                    card.style.setProperty("border-radius", value + "px", "important");
                });
                break;
            case "showShadows":
                const socialCardElements = block.querySelectorAll(".social-proof-card");
                socialCardElements.forEach((card) => {
                    if (value) {
                        card.style.setProperty(
                            "box-shadow",
                            "0 2px 8px rgba(0, 0, 0, 0.05)",
                            "important"
                        );
                    } else {
                        card.style.removeProperty("box-shadow");
                    }
                });
                break;
            case "hideBorders":
                const socialProofCardsBorder =
                    block.querySelectorAll(".social-proof-card");
                socialProofCardsBorder.forEach((card) => {
                    if (value) {
                        card.style.setProperty("border", "none", "important");
                    } else {
                        card.style.setProperty(
                            "border",
                            "1px solid var(--border-light, #e2e8f0)",
                            "important"
                        );
                    }
                });
                break;
            case "hideBackground":
                const socialProofCardsBackground =
                    block.querySelectorAll(".social-proof-card");
                socialProofCardsBackground.forEach((card) => {
                    if (value) {
                        card.style.setProperty(
                            "background",
                            "transparent",
                            "important"
                        );
                    } else {
                        card.style.setProperty(
                            "background",
                            "var(--bg-primary, #ffffff)",
                            "important"
                        );
                    }
                });
                break;

            // Grid/Layout background properties
            case "gridBackground":
                const grids = block.querySelectorAll('.features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip, .grid, [class*="grid"]');
                grids.forEach((grid) => {
                    if (value === "custom") {
                        grid.setAttribute("data-custom-grid-bg", "true");
                    } else if (value === "transparent") {
                        grid.style.setProperty("background", "transparent", "important");
                        grid.removeAttribute("data-custom-grid-bg");
                    } else {
                        grid.style.setProperty("background", value, "important");
                        grid.removeAttribute("data-custom-grid-bg");
                    }
                });
                block.dataset.gridBackground = value;
                console.log(`Applied gridBackground: ${value}`);
                break;

            case "gridPadding":
                const gridContainers = block.querySelectorAll('.features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip, .grid, [class*="grid"]');
                gridContainers.forEach((grid) => {
                    grid.style.setProperty("padding", value + "px", "important");
                });
                block.dataset.gridPadding = value;
                console.log(`Applied gridPadding: ${value}px`);
                break;

            case "gridBorderRadius":
                const gridElements = block.querySelectorAll('.features-grid, .testimonial-grid, .learn-grid, .pricing-options, .social-proof-strip, .grid, [class*="grid"]');
                gridElements.forEach((grid) => {
                    grid.style.setProperty("border-radius", value + "px", "important");
                });
                block.dataset.gridBorderRadius = value;
                console.log(`Applied gridBorderRadius: ${value}px`);
                break;

            // Navigation block properties
            case "navLinkColor":
                const navLinks = block.querySelectorAll("a, .nav-link, .navbar-link");
                navLinks.forEach((link) => {
                    if (value !== "custom") {
                        link.style.setProperty("color", value, "important");
                    }
                });
                block.dataset.navLinkColor = value;
                console.log(`Applied navLinkColor: ${value}`);
                break;

            case "navLinkHoverColor":
                // Store hover color in CSS variable for hover state
                block.style.setProperty("--nav-link-hover-color", value);
                block.dataset.navLinkHoverColor = value;
                // Inject hover styles
                this.injectNavHoverStyles(block, value);
                console.log(`Applied navLinkHoverColor: ${value}`);
                break;

            case "showLogo":
                const logos = block.querySelectorAll(".logo, .nav-logo, .navbar-brand, img[alt*='logo'], img[alt*='Logo']");
                logos.forEach((logo) => {
                    logo.style.setProperty("display", value ? "block" : "none", "important");
                });
                block.dataset.showLogo = value;
                console.log(`Applied showLogo: ${value}`);
                break;

            case "stickyNav":
                if (value) {
                    block.style.setProperty("position", "sticky", "important");
                    block.style.setProperty("top", "0", "important");
                    block.style.setProperty("z-index", "1000", "important");
                } else {
                    block.style.removeProperty("position");
                    block.style.removeProperty("top");
                    block.style.setProperty("z-index", "auto", "important");
                }
                block.dataset.stickyNav = value;
                console.log(`Applied stickyNav: ${value}`);
                break;

            case "navHeight":
                block.style.setProperty("min-height", value + "px", "important");
                const navInner = block.querySelector(".nav-inner, .navbar-inner, .container");
                if (navInner) {
                    navInner.style.setProperty("min-height", value + "px", "important");
                }
                block.dataset.navHeight = value;
                console.log(`Applied navHeight: ${value}px`);
                break;

            case "navPadding":
                block.style.setProperty("padding-left", value + "px", "important");
                block.style.setProperty("padding-right", value + "px", "important");
                block.dataset.navPadding = value;
                console.log(`Applied navPadding: ${value}px`);
                break;

            // Footer block properties
            case "footerLinkColor":
                const footerLinks = block.querySelectorAll("a, .footer-link");
                footerLinks.forEach((link) => {
                    if (value !== "custom") {
                        link.style.setProperty("color", value, "important");
                    }
                });
                block.dataset.footerLinkColor = value;
                console.log(`Applied footerLinkColor: ${value}`);
                break;

            case "showSocialLinks":
                const socialLinks = block.querySelectorAll(".social-links, .social-icons, [class*='social']");
                socialLinks.forEach((links) => {
                    links.style.setProperty("display", value ? "flex" : "none", "important");
                });
                block.dataset.showSocialLinks = value;
                console.log(`Applied showSocialLinks: ${value}`);
                break;

            default:
                // Fallback to CSS custom property
                block.style.setProperty(`--${property}`, value);
                console.log(`Applied custom property --${property}: ${value}`);
                break;
        }

        // Store the value in dataset for persistence
        block.dataset[property] = value;

        // Update any related UI elements
        this.updateSettingsUI(property, value);

        console.log(`Property ${property} updated successfully`);
    }

    /**
     * Update text element properties
     */
    updateTextProperty(textElement, property, value) {
        if (!textElement) return;

        console.log(`Updating text ${property} to ${value} on element:`, textElement);

        // Apply the property based on its type
        switch (property) {
            case "textColor":
                if (value === "custom") {
                    // Custom color picker would be handled separately
                    textElement.setAttribute("data-custom-color", "true");
                } else {
                    textElement.style.setProperty("color", value, "important");
                    textElement.removeAttribute("data-custom-color");
                }
                break;
            case "fontSize":
                textElement.style.setProperty("font-size", value + "px", "important");
                break;
            case "fontWeight":
                textElement.style.setProperty("font-weight", value, "important");
                break;
            case "lineHeight":
                textElement.style.setProperty("line-height", value, "important");
                break;
            case "letterSpacing":
                textElement.style.setProperty(
                    "letter-spacing",
                    value + "px",
                    "important"
                );
                break;
            case "textAlign":
                textElement.style.setProperty("text-align", value, "important");
                break;
            case "textTransform":
                textElement.style.setProperty("text-transform", value, "important");
                break;
            default:
                // Fallback to CSS custom property
                textElement.style.setProperty(`--${property}`, value);
                console.log(`Applied custom text property --${property}: ${value}`);
                break;
        }

        // Store the value in dataset for persistence
        textElement.dataset[property] = value;

        // Update any related UI elements
        this.updateSettingsUI(property, value);

        console.log(`Text property ${property} updated successfully`);
    }

    /**
     * Update card element properties
     */
    updateCardProperty(cardElement, property, value) {
        if (!cardElement) return;

        console.log(`Updating card ${property} to ${value} on element:`, cardElement);

        // Apply the property based on its type
        switch (property) {
            case "cardBackground":
                if (value === "custom") {
                    cardElement.setAttribute("data-custom-color", "true");
                } else {
                    // Handle both solid colors and gradients
                    if (value.includes("linear-gradient") || value.includes("rgba")) {
                        cardElement.style.setProperty("background", value, "important");
                    } else {
                        cardElement.style.setProperty(
                            "background-color",
                            value,
                            "important"
                        );
                    }
                    cardElement.removeAttribute("data-custom-color");
                }
                break;
            case "cardRadius":
                cardElement.style.setProperty(
                    "border-radius",
                    value + "px",
                    "important"
                );
                break;
            case "cardPadding":
                cardElement.style.setProperty("padding", value + "px", "important");
                break;
            case "cardShadow":
                if (value) {
                    cardElement.style.setProperty(
                        "box-shadow",
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        "important"
                    );
                } else {
                    cardElement.style.removeProperty("box-shadow");
                }
                break;
            case "cardBorder":
                if (value) {
                    cardElement.style.setProperty(
                        "border",
                        "1px solid #E2E8F0",
                        "important"
                    );
                } else {
                    cardElement.style.removeProperty("border");
                }
                break;
            case "cardBorderColor":
                cardElement.style.setProperty("border-color", value, "important");
                break;
            default:
                // Fallback to CSS custom property
                cardElement.style.setProperty(`--${property}`, value);
                console.log(`Applied custom card property --${property}: ${value}`);
                break;
        }

        // Store the value in dataset for persistence
        cardElement.dataset[property] = value;

        // Update any related UI elements
        this.updateSettingsUI(property, value);

        console.log(`Card property ${property} updated successfully`);
    }

    /**
     * Apply current card color to all cards in the section
     */
    applyCardColorToAll() {
        if (!this.selectedCardElement) {
            this.showNotification("No card selected", "error");
            return;
        }

        // Get the current card's background color (handle gradients and solid colors)
        const currentColor =
            this.selectedCardElement.style.background ||
            this.selectedCardElement.style.backgroundColor ||
            this.selectedCardElement.dataset.cardBackground ||
            "#FFFFFF";

        // Get the parent section
        const parentSection = this.selectedCardElement.closest(".block");
        if (!parentSection) {
            this.showNotification("Could not find parent section", "error");
            return;
        }

        // Find all cards in the same section
        const allCards = parentSection.querySelectorAll(
            ".feature-card, .testimonial-card, .pricing-card, .faq-item"
        );

        if (allCards.length === 0) {
            this.showNotification("No cards found in this section", "error");
            return;
        }

        // Apply the color to all cards
        let updatedCount = 0;
        allCards.forEach((card) => {
            card.style.setProperty("background", currentColor, "important");
            card.dataset.cardBackground = currentColor;
            updatedCount++;
        });

        // Show success notification
        this.showNotification(
            `🎨 Applied card color to ${updatedCount} cards in this section!`,
            "success"
        );

        // Save state for undo
        this.saveState();
    }

    /**
     * Apply current button style to all buttons in the section
     */
    applyButtonStyleToAll() {
        if (!this.selectedButtonElement) {
            this.showNotification("No button selected", "error");
            return;
        }

        // Get the current button's styles
        const currentBgColor =
            this.selectedButtonElement.style.background ||
            this.selectedButtonElement.style.backgroundColor ||
            this.selectedButtonElement.dataset.buttonBackground ||
            "#4F46E5";
        const currentTextColor = this.selectedButtonElement.style.color || "#FFFFFF";
        const currentRadius = this.selectedButtonElement.style.borderRadius || "8px";
        const currentPadding = this.selectedButtonElement.style.padding || "12px";
        const currentShadow = this.selectedButtonElement.style.boxShadow;
        const currentBorder = this.selectedButtonElement.style.border;

        // Get the parent section
        const parentSection = this.selectedButtonElement.closest(".block");
        if (!parentSection) {
            this.showNotification("Could not find parent section", "error");
            return;
        }

        // Find all buttons in the same section
        const allButtons = parentSection.querySelectorAll(".btn");

        if (allButtons.length === 0) {
            this.showNotification("No buttons found in this section", "error");
            return;
        }

        // Apply the styles to all buttons
        let updatedCount = 0;
        allButtons.forEach((button) => {
            button.style.setProperty("background", currentBgColor, "important");
            button.style.setProperty("color", currentTextColor, "important");
            button.style.setProperty("border-radius", currentRadius, "important");
            button.style.setProperty("padding", currentPadding, "important");

            if (currentShadow) {
                button.style.setProperty("box-shadow", currentShadow, "important");
            }
            if (currentBorder) {
                button.style.setProperty("border", currentBorder, "important");
            }

            button.dataset.buttonBackground = currentBgColor;
            updatedCount++;
        });

        // Show success notification
        this.showNotification(
            `🎨 Applied button style to ${updatedCount} buttons in this section!`,
            "success"
        );

        // Save state for undo
        this.saveState();
    }

    /**
     * Update button element properties
     */
    updateButtonProperty(buttonElement, property, value) {
        if (!buttonElement) return;

        console.log(
            `Updating button ${property} to ${value} on element:`,
            buttonElement
        );

        // Apply the property based on its type
        switch (property) {
            case "buttonBackground":
                if (value === "custom") {
                    buttonElement.setAttribute("data-custom-color", "true");
                } else {
                    // Handle both solid colors and gradients
                    if (value.includes("linear-gradient") || value.includes("rgba")) {
                        buttonElement.style.setProperty(
                            "background",
                            value,
                            "important"
                        );
                    } else {
                        buttonElement.style.setProperty(
                            "background-color",
                            value,
                            "important"
                        );
                    }
                    buttonElement.removeAttribute("data-custom-color");
                }
                break;
            case "buttonTextColor":
                if (value === "custom") {
                    buttonElement.setAttribute("data-custom-text-color", "true");
                } else {
                    buttonElement.style.setProperty("color", value, "important");
                    buttonElement.removeAttribute("data-custom-text-color");
                }
                break;
            case "buttonRadius":
                buttonElement.style.setProperty(
                    "border-radius",
                    value + "px",
                    "important"
                );
                break;
            case "buttonPadding":
                buttonElement.style.setProperty("padding", value + "px", "important");
                break;
            case "buttonShadow":
                if (value) {
                    buttonElement.style.setProperty(
                        "box-shadow",
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        "important"
                    );
                } else {
                    buttonElement.style.removeProperty("box-shadow");
                }
                break;
            case "buttonBorder":
                if (value) {
                    buttonElement.style.setProperty(
                        "border",
                        "1px solid #E2E8F0",
                        "important"
                    );
                } else {
                    buttonElement.style.removeProperty("border");
                }
                break;
            case "buttonBorderColor":
                buttonElement.style.setProperty("border-color", value, "important");
                break;
            case "buttonSize":
                // Remove existing size classes
                buttonElement.classList.remove("btn-small", "btn-large");
                if (value === "large") {
                    buttonElement.classList.add("btn-large");
                } else if (value === "small") {
                    buttonElement.classList.add("btn-small");
                }
                break;
            case "buttonLink":
                // Set the button redirect URL
                if (value && value.trim()) {
                    // Convert button to a proper link or add click handler
                    this.setButtonRedirect(buttonElement, value.trim());
                } else {
                    // Remove redirect functionality
                    this.removeButtonRedirect(buttonElement);
                }
                break;
            case "buttonTarget":
                // Set how the link opens (same window or new tab)
                const currentUrl = buttonElement.dataset.buttonLink;
                if (currentUrl && currentUrl.trim()) {
                    this.setButtonRedirect(buttonElement, currentUrl, value);
                }
                buttonElement.dataset.buttonTarget = value;
                break;
            default:
                // Fallback to CSS custom property
                buttonElement.style.setProperty(`--${property}`, value);
                console.log(`Applied custom button property --${property}: ${value}`);
                break;
        }

        // Store the value in dataset for persistence
        buttonElement.dataset[property] = value;

        // Update any related UI elements
        this.updateSettingsUI(property, value);

        console.log(`Button property ${property} updated successfully`);
    }

    /**
     * Set button redirect functionality
     */
    setButtonRedirect(buttonElement, url, target = "_self") {
        if (!buttonElement || !url) return;

        // Store the redirect data
        buttonElement.dataset.buttonLink = url;
        buttonElement.dataset.buttonTarget = target || "_self";

        // Remove any existing click handlers by cloning the element
        const newButton = buttonElement.cloneNode(true);
        buttonElement.parentNode.replaceChild(newButton, buttonElement);

        // Re-add editor click handler if in edit mode
        if (this.isEditMode) {
            newButton.addEventListener("click", this.handleButtonClick.bind(this));
            newButton.style.cursor = "pointer";
        }

        // Add redirect click handler
        newButton.addEventListener("click", (e) => {
            // Only redirect if not in edit mode
            if (!this.isEditMode) {
                e.preventDefault();
                if (target === "_blank") {
                    window.open(url, "_blank", "noopener,noreferrer");
                } else {
                    window.location.href = url;
                }
            }
        });

        // Visual indicator that button has a link
        newButton.setAttribute("title", `Redirects to: ${url}`);
        newButton.style.setProperty(
            "cursor",
            this.isEditMode ? "pointer" : "pointer",
            "important"
        );

        // Update the selected element reference if this was the selected button
        if (this.selectedButtonElement === buttonElement) {
            this.selectedButtonElement = newButton;
            newButton.classList.add("button-selected");
        }

        console.log(`Set button redirect: ${url} (target: ${target})`);
    }

    /**
     * Remove button redirect functionality
     */
    removeButtonRedirect(buttonElement) {
        if (!buttonElement) return;

        // Clear redirect data
        delete buttonElement.dataset.buttonLink;
        delete buttonElement.dataset.buttonTarget;

        // Remove title attribute
        buttonElement.removeAttribute("title");

        // Remove any existing click handlers by cloning the element
        const newButton = buttonElement.cloneNode(true);
        buttonElement.parentNode.replaceChild(newButton, buttonElement);

        // Re-add only editor click handler if in edit mode
        if (this.isEditMode) {
            newButton.addEventListener("click", this.handleButtonClick.bind(this));
            newButton.style.cursor = "pointer";
        }

        // Update the selected element reference if this was the selected button
        if (this.selectedButtonElement === buttonElement) {
            this.selectedButtonElement = newButton;
            newButton.classList.add("button-selected");
        }

        console.log("Removed button redirect");
    }

    /**
     * Inject hover styles for navigation links
     * Creates a scoped style element for the block's hover effects
     */
    injectNavHoverStyles(block, hoverColor) {
        // Generate a unique ID for this block if it doesn't have one
        if (!block.id) {
            block.id = "nav-block-" + Date.now();
        }

        // Remove any existing hover style for this block
        const existingStyle = document.getElementById(`${block.id}-hover-style`);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Skip if custom color (handled by color picker)
        if (hoverColor === "custom") {
            return;
        }

        // Create and inject hover style
        const style = document.createElement("style");
        style.id = `${block.id}-hover-style`;
        style.textContent = `
            #${block.id} a:hover,
            #${block.id} .nav-link:hover,
            #${block.id} .navbar-link:hover {
                color: ${hoverColor} !important;
                transition: color 0.2s ease;
            }
        `;
        document.head.appendChild(style);

        console.log(`Injected hover styles for ${block.id} with color ${hoverColor}`);
    }

    updateSettingsUI(property, value) {
        const rangeValue = document.querySelector(`.range-value`);
        const colorText = document.querySelector(
            `input[data-property="${property}-text"]`
        );

        // Update range display
        const rangeInput = document.querySelector(`input[data-property="${property}"]`);
        if (rangeInput && rangeInput.type === "range") {
            const nextSibling = rangeInput.nextElementSibling;
            if (nextSibling && nextSibling.classList.contains("range-value")) {
                const settings = this.getBlockSettings(
                    this.selectedBlock?.dataset.blockType || "generic"
                );
                const setting = settings[property];
                const unit = setting?.unit || "";
                nextSibling.textContent = value + unit;
            }
        }

        // Update color text input
        if (colorText && rangeInput && rangeInput.type === "color") {
            colorText.value = value;
        }
    }

    // New methods for enhanced functionality
    resetBlockSettings() {
        if (!this.selectedBlock) return;

        const blockType = this.selectedBlock.dataset.blockType || "generic";
        const settings = this.getBlockSettings(blockType);

        Object.entries(settings).forEach(([key, setting]) => {
            if (setting.default !== undefined) {
                this.updateBlockProperty(this.selectedBlock, key, setting.default);
            }
        });

        // Refresh the settings panel
        this.showBlockSettings(this.selectedBlock);
        this.showNotification("Block settings reset to defaults", "success");
    }

    copyBlockSettings() {
        if (!this.selectedBlock) return;

        const settings = {};
        const blockType = this.selectedBlock.dataset.blockType || "generic";
        const availableSettings = this.getBlockSettings(blockType);

        Object.keys(availableSettings).forEach((key) => {
            settings[key] = this.getBlockProperty(this.selectedBlock, key);
        });

        this.copiedSettings = settings;
        this.showNotification("Block styles copied!", "success");
    }

    pasteBlockSettings() {
        if (!this.selectedBlock || !this.copiedSettings) {
            this.showNotification("No copied styles to paste", "error");
            return;
        }

        Object.entries(this.copiedSettings).forEach(([key, value]) => {
            if (value) {
                this.updateBlockProperty(this.selectedBlock, key, value);
            }
        });

        // Refresh the settings panel
        this.showBlockSettings(this.selectedBlock);
        this.showNotification("Block styles pasted!", "success");
    }

    async savePage() {
        // Clean up animation states before saving
        this.cleanAnimationStatesForSave();

        // Check if we're in database mode by looking at URL parameters or global variables
        const urlParams = new URLSearchParams(window.location.search);
        const dbMode = urlParams.get("dbMode") === "true";
        const userEmail = urlParams.get("user");
        const funnelId = urlParams.get("funnel");
        const isUserMode = !!(userEmail && funnelId);

        console.log(
            "🔄 Visual editor save - dbMode:",
            dbMode,
            "isUserMode:",
            isUserMode
        );

        if (
            isUserMode &&
            dbMode &&
            window.saveToDatabaseSync &&
            typeof window.saveToDatabaseSync === "function"
        ) {
            console.log("💾 Using database save from visual editor");
            try {
                const success = await window.saveToDatabaseSync();
                if (success) {
                    this.showNotification("Funnel saved to database!", "success");
                } else {
                    this.showNotification("Database save failed!", "error");
                }
                return;
            } catch (e) {
                console.error("❌ Database save failed:", e);
                this.showNotification("Database save failed!", "error");
                return;
            }
        }

        // Check if there's a custom localStorage save function from the parent page (funnel.html)
        if (
            window.saveUserFunnelContent &&
            typeof window.saveUserFunnelContent === "function"
        ) {
            console.log("🔄 Using custom localStorage save function from parent page");
            try {
                const success = window.saveUserFunnelContent();
                if (success) {
                    this.showNotification("Funnel saved locally!", "success");
                } else {
                    this.showNotification("Save failed!", "error");
                }
                return;
            } catch (e) {
                console.error(
                    "❌ Custom save function failed, falling back to default:",
                    e
                );
            }
        }

        // Fallback to simple localStorage save
        const pageData = {
            html: document.querySelector(".page-container").innerHTML,
            timestamp: new Date().toISOString(),
            version: "1.0",
        };

        // In a real implementation, this would save to a backend
        localStorage.setItem("funnel-page-data", JSON.stringify(pageData));

        // Show save confirmation
        this.showNotification("Page saved successfully!", "success");
    }

    // SMART text color based on automatic contrast calculation
    updateTextColorForBackground(block, backgroundColor) {
        // SMART: Use automatic contrast calculation instead of hardcoded rules
        const primaryColor = this.getContrastColor(backgroundColor);
        const secondaryColor = this.getSecondaryTextColor(backgroundColor);

        // Apply smart colors to all text elements
        block.style.setProperty("color", primaryColor, "important");

        const headings = block.querySelectorAll(
            "h1, h2, h3, .heading-1, .heading-2, .heading-3"
        );
        headings.forEach((h) =>
            h.style.setProperty("color", primaryColor, "important")
        );

        const paragraphs = block.querySelectorAll("p, .subheading");
        paragraphs.forEach((p) =>
            p.style.setProperty("color", secondaryColor, "important")
        );

        console.log(
            `🎨 Smart text colors applied: primary=${primaryColor}, secondary=${secondaryColor} for background=${backgroundColor}`
        );
    }

    // Get current section background color
    getCurrentSectionBackground(block) {
        // Check dataset first
        if (block.dataset.sectionBackground) {
            return block.dataset.sectionBackground;
        }

        // Check inline style
        if (block.style.background) {
            return block.style.background;
        }

        // Check computed style
        const computed = getComputedStyle(block).backgroundColor;
        if (computed && computed !== "rgba(0, 0, 0, 0)" && computed !== "transparent") {
            return this.rgbToHex(computed) || "#FFFFFF";
        }

        return "#FFFFFF";
    }

    // Get current text color
    getCurrentTextColor(textElement) {
        // Check dataset first
        if (textElement.dataset.textColor) {
            return textElement.dataset.textColor;
        }

        // Check inline style
        if (textElement.style.color) {
            return textElement.style.color;
        }

        // Check computed style
        const computed = getComputedStyle(textElement).color;
        if (computed && computed !== "rgba(0, 0, 0, 0)" && computed !== "transparent") {
            return this.rgbToHex(computed) || "#1F2937";
        }

        return "#1F2937";
    }

    // Get current block color
    getCurrentBlockColor(block) {
        // Check dataset first
        if (block.dataset.blockColor) {
            return block.dataset.blockColor;
        }

        // Check first card/block element in the section
        const cardElements = block.querySelectorAll(
            ".feature-card, .testimonial-card, .pricing-card, .faq-item"
        );
        if (cardElements.length > 0) {
            const firstCard = cardElements[0];
            if (firstCard.style.backgroundColor) {
                return firstCard.style.backgroundColor;
            }
        }

        return "#FFFFFF";
    }

    // Get current card color (for individual cards)
    getCurrentCardColor(cardElement) {
        // Check dataset first
        if (cardElement.dataset.cardBackground) {
            return cardElement.dataset.cardBackground;
        }

        // Check inline style - handle both background and background-color
        if (cardElement.style.background) {
            return cardElement.style.background;
        }
        if (cardElement.style.backgroundColor) {
            return cardElement.style.backgroundColor;
        }

        // Check computed style
        const computed = getComputedStyle(cardElement).backgroundColor;
        if (computed && computed !== "rgba(0, 0, 0, 0)" && computed !== "transparent") {
            return this.rgbToHex(computed) || "#FFFFFF";
        }

        return "#FFFFFF";
    }

    // Get text element property
    getTextProperty(textElement, property) {
        // Handle text color specially
        if (property === "textColor") {
            // Check dataset first
            if (textElement.dataset.textColor) {
                return textElement.dataset.textColor;
            }

            // Check for existing inline color style
            const colorStyle = textElement.style.color;
            if (colorStyle) {
                return colorStyle;
            }

            // Default to dark gray
            return "#1F2937";
        }

        // For other properties, check dataset or return default
        if (textElement.dataset[property]) {
            return textElement.dataset[property];
        }

        // Return appropriate defaults based on property
        const defaults = {
            fontSize: "16",
            fontWeight: "400",
            lineHeight: "1.5",
            letterSpacing: "0",
            textAlign: "left",
            textTransform: "none",
        };

        return defaults[property] || "";
    }

    // Get card element property
    getCardProperty(cardElement, property) {
        // Check dataset first
        if (cardElement.dataset[property]) {
            return cardElement.dataset[property];
        }

        // Handle specific card properties
        switch (property) {
            case "cardBackground":
                if (cardElement.style.background) {
                    return cardElement.style.background;
                }
                if (cardElement.style.backgroundColor) {
                    return cardElement.style.backgroundColor;
                }
                return "#FFFFFF";
            case "cardRadius":
                if (cardElement.style.borderRadius) {
                    return parseInt(cardElement.style.borderRadius) || 16;
                }
                return 16;
            case "cardPadding":
                if (cardElement.style.padding) {
                    return parseInt(cardElement.style.padding) || 24;
                }
                return 24;
            case "cardShadow":
                return cardElement.style.boxShadow ? true : false;
            case "cardBorder":
                return cardElement.style.border ? true : false;
            case "cardBorderColor":
                if (cardElement.style.borderColor) {
                    return cardElement.style.borderColor;
                }
                return "#E2E8F0";
            default:
                return "";
        }
    }

    // Get button element property
    getButtonProperty(buttonElement, property) {
        // Check dataset first
        if (buttonElement.dataset[property]) {
            return buttonElement.dataset[property];
        }

        // Handle specific button properties
        switch (property) {
            case "buttonBackground":
                if (buttonElement.style.background) {
                    return buttonElement.style.background;
                }
                if (buttonElement.style.backgroundColor) {
                    return buttonElement.style.backgroundColor;
                }
                return "#4F46E5";
            case "buttonTextColor":
                if (buttonElement.style.color) {
                    return buttonElement.style.color;
                }
                return "#FFFFFF";
            case "buttonRadius":
                if (buttonElement.style.borderRadius) {
                    return parseInt(buttonElement.style.borderRadius) || 8;
                }
                return 8;
            case "buttonPadding":
                if (buttonElement.style.padding) {
                    return parseInt(buttonElement.style.padding) || 12;
                }
                return 12;
            case "buttonShadow":
                return buttonElement.style.boxShadow ? true : false;
            case "buttonBorder":
                return buttonElement.style.border ? true : false;
            case "buttonBorderColor":
                if (buttonElement.style.borderColor) {
                    return buttonElement.style.borderColor;
                }
                return "#E2E8F0";
            case "buttonSize":
                if (buttonElement.classList.contains("btn-large")) return "large";
                if (buttonElement.classList.contains("btn-small")) return "small";
                return "medium";
            case "buttonLink":
                return buttonElement.dataset.buttonLink || "";
            case "buttonTarget":
                return buttonElement.dataset.buttonTarget || "_self";
            default:
                return "";
        }
    }

    // Get current button color (for individual buttons)
    getCurrentButtonColor(buttonElement) {
        // Check dataset first
        if (buttonElement.dataset.buttonBackground) {
            return buttonElement.dataset.buttonBackground;
        }

        // Check inline style - handle both background and background-color
        if (buttonElement.style.background) {
            return buttonElement.style.background;
        }
        if (buttonElement.style.backgroundColor) {
            return buttonElement.style.backgroundColor;
        }

        // Check computed style
        const computed = getComputedStyle(buttonElement).backgroundColor;
        if (computed && computed !== "rgba(0, 0, 0, 0)" && computed !== "transparent") {
            return this.rgbToHex(computed) || "#4F46E5";
        }

        return "#4F46E5";
    }

    // Custom Theme Management
    getCustomVariable(variableName) {
        // Check if we have a saved custom theme
        const savedTheme = localStorage.getItem("custom-theme-variables");
        if (savedTheme) {
            try {
                const themeData = JSON.parse(savedTheme);
                return themeData[variableName];
            } catch (e) {
                console.error("Error parsing saved theme:", e);
            }
        }

        // Fall back to computed style
        return getComputedStyle(document.documentElement)
            .getPropertyValue(variableName)
            .trim();
    }

    updateCustomVariable(variableName, value) {
        // Update CSS custom property in real-time
        document.documentElement.style.setProperty(variableName, value);

        // Force a stronger override by updating all matching elements directly
        switch (variableName) {
            case "--text-primary":
                document
                    .querySelectorAll(
                        "h1, h2, h3, .heading-1, .heading-2, .heading-3, p, .testimonial-quote"
                    )
                    .forEach((el) => {
                        el.style.setProperty("color", value, "important");
                    });
                break;
            case "--text-secondary":
                document
                    .querySelectorAll(
                        ".subheading, .feature-description, .testimonial-info p"
                    )
                    .forEach((el) => {
                        el.style.setProperty("color", value, "important");
                    });
                break;
            case "--bg-section-1":
                document.querySelectorAll(".bg-section-1").forEach((el) => {
                    el.style.setProperty("background", value, "important");
                });
                break;
            case "--bg-section-2":
                document.querySelectorAll(".bg-section-2").forEach((el) => {
                    el.style.setProperty("background", value, "important");
                });
                break;
            case "--bg-section-3":
                document.querySelectorAll(".bg-section-3").forEach((el) => {
                    el.style.setProperty("background", value, "important");
                });
                break;
            case "--primary-color":
                document
                    .querySelectorAll(".block-handle, .pricing-badge")
                    .forEach((el) => {
                        el.style.setProperty("background", value, "important");
                    });
                break;
            case "--secondary-color":
                document.querySelectorAll(".btn-secondary").forEach((el) => {
                    el.style.setProperty("background", value, "important");
                });
                break;
            case "--accent-color":
                document.querySelectorAll(".btn-primary").forEach((el) => {
                    el.style.setProperty("background", value, "important");
                });
                break;
        }

        // Save to localStorage for persistence
        const savedTheme = localStorage.getItem("custom-theme-variables");
        let themeData = {};

        if (savedTheme) {
            try {
                themeData = JSON.parse(savedTheme);
            } catch (e) {
                console.error("Error parsing saved theme:", e);
            }
        }

        themeData[variableName] = value;
        localStorage.setItem("custom-theme-variables", JSON.stringify(themeData));

        console.log(
            `Updated ${variableName} to ${value} and applied to specific elements`
        );
        this.showNotification(
            `Updated ${variableName.replace("--", "")} color`,
            "success"
        );
    }

    resetCustomTheme() {
        // Reset all custom variables to defaults
        const commonSettings = this.getBlockSettings("");
        const customTheme = commonSettings.customTheme;

        if (customTheme && customTheme.variables) {
            customTheme.variables.forEach((variable) => {
                document.documentElement.style.setProperty(
                    variable.name,
                    variable.default
                );
            });

            // Clear saved theme
            localStorage.removeItem("custom-theme-variables");

            // Refresh settings panel
            this.showBlockSettings(this.selectedBlock);

            this.showNotification("Theme reset to defaults!", "success");
        }
    }

    saveCustomTheme() {
        // Theme is auto-saved as you edit, this just shows confirmation
        const savedTheme = localStorage.getItem("custom-theme-variables");
        if (savedTheme) {
            try {
                const themeData = JSON.parse(savedTheme);
                const variableCount = Object.keys(themeData).length;
                this.showNotification(
                    `Custom theme saved! (${variableCount} variables)`,
                    "success"
                );
            } catch (e) {
                this.showNotification("Error saving theme", "error");
            }
        } else {
            this.showNotification("No custom theme to save", "info");
        }
    }

    loadSavedCustomTheme() {
        // Load saved custom theme on page load
        const savedTheme = localStorage.getItem("custom-theme-variables");
        if (savedTheme) {
            try {
                const themeData = JSON.parse(savedTheme);
                Object.entries(themeData).forEach(([variable, value]) => {
                    document.documentElement.style.setProperty(variable, value);
                });
                console.log(
                    "Loaded custom theme with",
                    Object.keys(themeData).length,
                    "variables"
                );
            } catch (e) {
                console.error("Error loading saved theme:", e);
            }
        }
    }

    // Export functionality removed - not needed in toolbar

    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add("show");
        }, 100);

        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    /**
     * Element Management System
     * Handles add/remove/reorganize functionality for dynamic elements
     */

    makeElementsManageable(block) {
        const blockType = block.dataset.blockType;

        // Add management controls based on block type
        switch (blockType) {
            case "testimonial":
                this.makeTestimonialsManageable(block);
                break;
            case "learn":
                this.makeLearnManageable(block);
                break;
            case "features":
                this.makeFeaturesManageable(block);
                break;
            case "faq":
                this.makeFaqsManageable(block);
                break;
            case "pricing":
                this.makePricingManageable(block);
                break;
        }
    }

    makeTestimonialsManageable(block) {
        const testimonials = block.querySelectorAll(".testimonial-card");
        testimonials.forEach((testimonial, index) => {
            this.addElementControls(testimonial, "testimonial", {
                onAdd: () => this.addTestimonial(block, testimonial),
                onRemove: () => this.removeTestimonial(testimonial),
                onMoveUp: () => this.moveTestimonialUp(testimonial),
                onMoveDown: () => this.moveTestimonialDown(testimonial),
            });
        });
    }

    makeLearnManageable(block) {
        const learns = block.querySelectorAll(".learn-card");
        learns.forEach((learn, index) => {
            this.addElementControls(learn, "learn", {
                onAdd: () => this.addLearn(block, learn),
                onRemove: () => this.removeLearn(learn),
                onMoveUp: () => this.moveLearnUp(learn),
                onMoveDown: () => this.moveLearnDown(learn),
            });
        });
    }

    makeFeaturesManageable(block) {
        const features = block.querySelectorAll(".feature-card");
        features.forEach((feature, index) => {
            this.addElementControls(feature, "feature", {
                onAdd: () => this.addFeature(block, feature),
                onRemove: () => this.removeFeature(feature),
                onMoveUp: () => this.moveFeatureUp(feature),
                onMoveDown: () => this.moveFeatureDown(feature),
            });
        });
    }

    makeFaqsManageable(block) {
        const faqs = block.querySelectorAll(".faq-item");
        faqs.forEach((faq, index) => {
            this.addElementControls(faq, "faq", {
                onAdd: () => this.addFaq(block, faq),
                onRemove: () => this.removeFaq(faq),
                onMoveUp: () => this.moveFaqUp(faq),
                onMoveDown: () => this.moveFaqDown(faq),
            });
        });
    }

    makePricingManageable(block) {
        // Handle pricing cards
        const pricingCards = block.querySelectorAll(".pricing-card");
        pricingCards.forEach((card, index) => {
            this.addElementControls(card, "pricing-plan", {
                onAdd: () => this.addPricingCard(block, card),
                onRemove: () => this.removePricingCard(card),
                onMoveUp: () => this.movePricingCardUp(card),
                onMoveDown: () => this.movePricingCardDown(card),
            });
        });

        // Handle pricing features within each card
        const pricingFeatures = block.querySelectorAll(".pricing-features li");
        pricingFeatures.forEach((feature, index) => {
            this.addElementControls(feature, "pricing-feature", {
                onAdd: () =>
                    this.addPricingFeature(feature.closest(".pricing-card"), feature),
                onRemove: () => this.removePricingFeature(feature),
                onMoveUp: () => this.movePricingFeatureUp(feature),
                onMoveDown: () => this.movePricingFeatureDown(feature),
            });
        });
    }

    addElementControls(element, type, actions) {
        // Remove existing controls
        const existingControls = element.querySelector(".element-controls");
        if (existingControls) {
            existingControls.remove();
        }

        // Create control panel
        const controls = document.createElement("div");
        controls.className = "element-controls";
        controls.innerHTML = `
      <div class="element-controls-panel">
        <button class="element-btn element-btn-add" title="Add ${type}">+</button>
        <button class="element-btn element-btn-move-up" title="Move up">↑</button>
        <button class="element-btn element-btn-move-down" title="Move down">↓</button>
        <button class="element-btn element-btn-remove" title="Remove ${type}">×</button>
      </div>
    `;

        // Add event listeners
        controls.querySelector(".element-btn-add").addEventListener("click", (e) => {
            e.stopPropagation();
            this.saveState();
            actions.onAdd();
            this.refreshElementControls();
        });

        controls.querySelector(".element-btn-remove").addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.confirmRemoval(type)) {
                this.saveState();
                actions.onRemove();
                this.refreshElementControls();
            }
        });

        controls
            .querySelector(".element-btn-move-up")
            .addEventListener("click", (e) => {
                e.stopPropagation();
                this.saveState();
                actions.onMoveUp();
                this.refreshElementControls();
            });

        controls
            .querySelector(".element-btn-move-down")
            .addEventListener("click", (e) => {
                e.stopPropagation();
                this.saveState();
                actions.onMoveDown();
                this.refreshElementControls();
            });

        element.appendChild(controls);
        element.classList.add("manageable-element");
    }

    confirmRemoval(type) {
        return confirm(`Are you sure you want to remove this ${type}?`);
    }

    refreshElementControls() {
        // Re-apply element management to all blocks
        if (this.isEditMode) {
            const blocks = document.querySelectorAll(".block");
            blocks.forEach((block) => {
                this.makeElementsManageable(block);
            });
        }
    }

    // Learn Management
    addLearn(block, afterElement) {
        const newLearn = document.createElement("div");
        newLearn.className = "learn-card";
        newLearn.innerHTML = `
      <div class="learn-number">${this.getNextLearnNumber(afterElement)}</div>
      <div class="learn-content">
        <h3 class="learn-title" data-editable="true">New Learning Outcome Title</h3>
        <p class="learn-description" data-editable="true">Describe what the user will learn and how it will benefit them in their journey.</p>
      </div>
    `;

        afterElement.insertAdjacentElement("afterend", newLearn);
        this.makeContentEditable(newLearn);
        this.updateLearnNumbers(afterElement.closest(".learn-grid"));
        this.showNotification("Learning outcome added!", "success");
    }

    removeLearn(learn) {
        const container = learn.parentElement;
        if (container.children.length > 1) {
            learn.remove();
            this.updateLearnNumbers(container);
            this.showNotification("Learning outcome removed!", "success");
        } else {
            this.showNotification("Cannot remove the last learning outcome", "error");
        }
    }

    moveLearnUp(learn) {
        const previousSibling = learn.previousElementSibling;
        if (previousSibling && previousSibling.classList.contains("learn-card")) {
            learn.parentNode.insertBefore(learn, previousSibling);
            this.updateLearnNumbers(learn.parentElement);
            this.showNotification("Learning outcome moved up!", "success");
        }
    }

    moveLearnDown(learn) {
        const nextSibling = learn.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains("learn-card")) {
            learn.parentNode.insertBefore(nextSibling, learn);
            this.updateLearnNumbers(learn.parentElement);
            this.showNotification("Learning outcome moved down!", "success");
        }
    }

    getNextLearnNumber(afterElement) {
        const container = afterElement.parentElement;
        const currentIndex = Array.from(container.children).indexOf(afterElement);
        return currentIndex + 2;
    }

    updateLearnNumbers(container) {
        const learnCards = container.querySelectorAll(".learn-card");
        learnCards.forEach((card, index) => {
            const numberElement = card.querySelector(".learn-number");
            if (numberElement) {
                numberElement.textContent = index + 1;
            }
        });
    }

    // Testimonial Management
    addTestimonial(block, afterElement) {
        const newTestimonial = document.createElement("div");
        newTestimonial.className = "testimonial-card";
        newTestimonial.innerHTML = `
      <p class="testimonial-quote" data-editable="true">"Your new testimonial quote here"</p>
      <p style="margin-bottom: var(--space-4); color: var(--text-secondary);" data-editable="true">Additional testimonial details and context.</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar"></div>
        <div class="testimonial-info">
          <h4 data-editable="true">Customer Name</h4>
          <p data-editable="true">Title & Company</p>
        </div>
      </div>
    `;

        afterElement.insertAdjacentElement("afterend", newTestimonial);
        this.makeContentEditable(newTestimonial);
        this.showNotification("Testimonial added!", "success");
    }

    removeTestimonial(testimonial) {
        const container = testimonial.parentElement;
        if (container.children.length > 1) {
            testimonial.remove();
            this.showNotification("Testimonial removed!", "success");
        } else {
            this.showNotification("Cannot remove the last testimonial", "error");
        }
    }

    moveTestimonialUp(testimonial) {
        const prev = testimonial.previousElementSibling;
        if (prev && prev.classList.contains("testimonial-card")) {
            testimonial.parentNode.insertBefore(testimonial, prev);
            this.showNotification("Testimonial moved up!", "success");
        }
    }

    moveTestimonialDown(testimonial) {
        const next = testimonial.nextElementSibling;
        if (next && next.classList.contains("testimonial-card")) {
            testimonial.parentNode.insertBefore(next, testimonial);
            this.showNotification("Testimonial moved down!", "success");
        }
    }

    // Feature Management
    addFeature(block, afterElement) {
        const newFeature = document.createElement("div");
        newFeature.className = "feature-card";
        const iconSvg = (typeof window !== 'undefined' && window.getIconSvg) ? window.getIconSvg('target') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
        newFeature.innerHTML = `
      <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${iconSvg}</div>
      <h3 class="feature-title" data-editable="true">New Feature</h3>
      <p class="feature-description" data-editable="true">Describe your amazing new feature here</p>
    `;

        afterElement.insertAdjacentElement("afterend", newFeature);
        this.makeContentEditable(newFeature);
        this.showNotification("Feature added!", "success");
    }

    removeFeature(feature) {
        const container = feature.parentElement;
        if (container.children.length > 1) {
            feature.remove();
            this.showNotification("Feature removed!", "success");
        } else {
            this.showNotification("Cannot remove the last feature", "error");
        }
    }

    moveFeatureUp(feature) {
        const prev = feature.previousElementSibling;
        if (prev && prev.classList.contains("feature-card")) {
            feature.parentNode.insertBefore(feature, prev);
            this.showNotification("Feature moved up!", "success");
        }
    }

    moveFeatureDown(feature) {
        const next = feature.nextElementSibling;
        if (next && next.classList.contains("feature-card")) {
            feature.parentNode.insertBefore(next, feature);
            this.showNotification("Feature moved down!", "success");
        }
    }

    // FAQ Management
    addFaq(block, afterElement) {
        const newFaq = document.createElement("div");
        newFaq.className = "faq-item";
        newFaq.innerHTML = `
      <div class="faq-question" data-editable="true">Your new question here?</div>
      <div class="faq-answer" data-editable="true">Your detailed answer here.</div>
    `;

        afterElement.insertAdjacentElement("afterend", newFaq);
        this.makeContentEditable(newFaq);

        // Apply current theme colors to the new FAQ
        this.applyThemeColorsToElement(newFaq);

        // Add FAQ toggle functionality
        const question = newFaq.querySelector(".faq-question");
        question.addEventListener("click", (e) => {
            // In edit mode, allow toggling unless specifically editing text
            if (this.isEditMode) {
                const isTextEdit = e.detail >= 2 || e.ctrlKey || e.metaKey;
                if (isTextEdit) {
                    return; // Allow text editing
                }
            }

            // Toggle FAQ
            e.preventDefault();
            e.stopPropagation();

            const answer = newFaq.querySelector(".faq-answer");
            const isActive = newFaq.classList.contains("active");

            // Close all other FAQ items first
            const allFaqItems = newFaq.parentElement.querySelectorAll(".faq-item");
            allFaqItems.forEach((otherItem) => {
                if (otherItem !== newFaq && otherItem.classList.contains("active")) {
                    otherItem.classList.remove("active");
                    const otherAnswer = otherItem.querySelector(".faq-answer");
                    if (otherAnswer) {
                        otherAnswer.style.maxHeight = "0px";
                    }
                }
            });

            // Toggle current item
            if (!isActive) {
                newFaq.classList.add("active");
                if (answer) {
                    // Calculate the actual height needed
                    answer.style.maxHeight = "none";
                    const height = answer.scrollHeight;
                    answer.style.maxHeight = "0px";
                    // Force reflow
                    answer.offsetHeight;
                    // Set the target height
                    answer.style.maxHeight = height + "px";
                }
            } else {
                newFaq.classList.remove("active");
                if (answer) {
                    answer.style.maxHeight = "0px";
                }
            }
        });

        this.showNotification("FAQ added!", "success");
    }

    removeFaq(faq) {
        const container = faq.parentElement;
        if (container.children.length > 1) {
            faq.remove();
            this.showNotification("FAQ removed!", "success");
        } else {
            this.showNotification("Cannot remove the last FAQ", "error");
        }
    }

    moveFaqUp(faq) {
        const prev = faq.previousElementSibling;
        if (prev && prev.classList.contains("faq-item")) {
            faq.parentNode.insertBefore(faq, prev);
            this.showNotification("FAQ moved up!", "success");
        }
    }

    moveFaqDown(faq) {
        const next = faq.nextElementSibling;
        if (next && next.classList.contains("faq-item")) {
            faq.parentNode.insertBefore(next, faq);
            this.showNotification("FAQ moved down!", "success");
        }
    }

    // Pricing Feature Management
    addPricingFeature(block, afterElement) {
        const newFeature = document.createElement("li");
        newFeature.setAttribute("data-editable", "true");
        newFeature.textContent = "New feature or benefit";

        afterElement.insertAdjacentElement("afterend", newFeature);
        this.makeContentEditable(newFeature);
        this.showNotification("Pricing feature added!", "success");
    }

    removePricingFeature(feature) {
        const container = feature.parentElement;
        if (container.children.length > 1) {
            feature.remove();
            this.showNotification("Pricing feature removed!", "success");
        } else {
            this.showNotification("Cannot remove the last pricing feature", "error");
        }
    }

    movePricingFeatureUp(feature) {
        const prev = feature.previousElementSibling;
        if (prev) {
            feature.parentNode.insertBefore(feature, prev);
            this.showNotification("Pricing feature moved up!", "success");
        }
    }

    movePricingFeatureDown(feature) {
        const next = feature.nextElementSibling;
        if (next) {
            feature.parentNode.insertBefore(next, feature);
            this.showNotification("Pricing feature moved down!", "success");
        }
    }

    makeContentEditable(container) {
        const editableElements = container.querySelectorAll("[data-editable]");
        editableElements.forEach((element) => {
            element.contentEditable = true;
            element.addEventListener("blur", this.handleContentChange.bind(this));
            element.addEventListener("keydown", this.handleKeyDown.bind(this));
        });
    }

    attachManagementButtonListeners(settingsPanel, block) {
        const managementButtons = settingsPanel.querySelectorAll("[data-action]");

        managementButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = button.dataset.action;
                const blockId = button.dataset.blockId;
                const targetBlock = document.getElementById(blockId) || block;

                this.saveState();

                switch (action) {
                    case "add-testimonial":
                        this.addTestimonialAtEnd(targetBlock);
                        break;
                    case "add-learn":
                        this.addLearnAtEnd(targetBlock);
                        break;
                    case "add-feature":
                        this.addFeatureAtEnd(targetBlock);
                        break;
                    case "add-faq":
                        this.addFaqAtEnd(targetBlock);
                        break;
                    case "add-pricing-plan":
                        this.addPricingCardAtEnd(targetBlock);
                        break;
                    case "add-pricing-feature":
                        this.addPricingFeatureAtEnd(targetBlock);
                        break;
                }

                // Refresh the settings panel to show updated counts
                setTimeout(() => {
                    this.showBlockSettings(targetBlock);
                    this.refreshElementControls();
                }, 100);
            });
        });
    }

    // Helper methods for adding elements at the end
    addLearnAtEnd(block) {
        console.log("Adding learning outcome to block:", block);
        const learnGrid = block.querySelector(".learn-grid");
        if (!learnGrid) {
            console.error("Learn grid not found in block");
            this.showNotification("Error: Learn grid not found", "error");
            return;
        }

        const lastLearn = learnGrid.lastElementChild;
        if (lastLearn) {
            this.addLearn(block, lastLearn);
            this.showNotification("Learning outcome added successfully!", "success");
        } else {
            // Create first learning outcome if none exist
            const newLearn = document.createElement("div");
            newLearn.className = "learn-card";
            newLearn.innerHTML = `
        <div class="learn-number">1</div>
        <div class="learn-content">
          <h3 class="learn-title" data-editable="true">New Learning Outcome Title</h3>
          <p class="learn-description" data-editable="true">Describe what the user will learn and how it will benefit them in their journey.</p>
        </div>
      `;
            learnGrid.appendChild(newLearn);
            this.makeContentEditable(newLearn);
            this.showNotification("First learning outcome created!", "success");
        }
    }

    addTestimonialAtEnd(block) {
        console.log("Adding testimonial to block:", block);
        const testimonialGrid = block.querySelector(".testimonial-grid");
        if (!testimonialGrid) {
            console.error("Testimonial grid not found in block");
            this.showNotification("Error: Testimonial grid not found", "error");
            return;
        }

        const lastTestimonial = testimonialGrid.lastElementChild;
        if (lastTestimonial) {
            this.addTestimonial(block, lastTestimonial);
            this.showNotification("Testimonial added successfully!", "success");
        } else {
            // Create first testimonial if none exist
            const newTestimonial = document.createElement("div");
            newTestimonial.className = "testimonial-card";
            newTestimonial.innerHTML = `
        <p class="testimonial-quote" data-editable="true">"Your new testimonial quote here"</p>
        <p style="margin-bottom: var(--space-4); color: var(--text-secondary);" data-editable="true">Additional testimonial details and context.</p>
        <div class="testimonial-author">
          <div class="testimonial-avatar"></div>
          <div class="testimonial-info">
            <h4 data-editable="true">Customer Name</h4>
            <p data-editable="true">Title & Company</p>
          </div>
        </div>
      `;
            testimonialGrid.appendChild(newTestimonial);
            this.makeContentEditable(newTestimonial);
            this.showNotification("First testimonial created!", "success");
        }
    }

    addFeatureAtEnd(block) {
        console.log("Adding feature to block:", block);
        const featuresGrid = block.querySelector(".features-grid");
        if (!featuresGrid) {
            console.error("Features grid not found in block");
            this.showNotification("Error: Features grid not found", "error");
            return;
        }

        const lastFeature = featuresGrid.lastElementChild;
        if (lastFeature) {
            this.addFeature(block, lastFeature);
            this.showNotification("Feature added successfully!", "success");
        } else {
            // Create first feature if none exist
            const newFeature = document.createElement("div");
            newFeature.className = "feature-card";
            const iconSvg = (typeof window !== 'undefined' && window.getIconSvg) ? window.getIconSvg('target') : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
            newFeature.innerHTML = `
        <div class="feature-icon" style="width: 48px; height: 48px; margin: 0 auto var(--space-4); color: hsl(103 89% 29%);">${iconSvg}</div>
        <h3 class="feature-title" data-editable="true">New Feature</h3>
        <p class="feature-description" data-editable="true">Describe your amazing new feature here</p>
      `;
            featuresGrid.appendChild(newFeature);
            this.makeContentEditable(newFeature);
            this.showNotification("First feature created!", "success");
        }
    }

    addFaqAtEnd(block) {
        console.log("Adding FAQ to block:", block);
        const faqContainer =
            block.querySelector(".faq-container") ||
            block.querySelector('div[style*="max-width: 800px"]') ||
            block.querySelector(".container > div:last-child");

        if (!faqContainer) {
            console.error("FAQ container not found in block");
            this.showNotification("Error: FAQ container not found", "error");
            return;
        }

        const lastFaq = Array.from(faqContainer.children)
            .reverse()
            .find((child) => child.classList.contains("faq-item"));

        if (lastFaq) {
            this.addFaq(block, lastFaq);
            this.showNotification("FAQ added successfully!", "success");
        } else {
            // Create first FAQ if none exist
            const newFaq = document.createElement("div");
            newFaq.className = "faq-item";
            newFaq.innerHTML = `
        <div class="faq-question" data-editable="true">Your new question here?</div>
        <div class="faq-answer" data-editable="true">Your detailed answer here.</div>
      `;
            faqContainer.appendChild(newFaq);
            this.makeContentEditable(newFaq);

            // Apply current theme colors to the new FAQ
            this.applyThemeColorsToElement(newFaq);

            // Add FAQ toggle functionality
            const question = newFaq.querySelector(".faq-question");
            question.addEventListener("click", (e) => {
                // In edit mode, allow toggling unless specifically editing text
                if (this.isEditMode) {
                    const isTextEdit = e.detail >= 2 || e.ctrlKey || e.metaKey;
                    if (isTextEdit) {
                        return; // Allow text editing
                    }
                }

                // Toggle FAQ
                e.preventDefault();
                e.stopPropagation();

                const answer = newFaq.querySelector(".faq-answer");
                const isActive = newFaq.classList.contains("active");

                // Close all other FAQ items first
                const allFaqItems = newFaq.parentElement.querySelectorAll(".faq-item");
                allFaqItems.forEach((otherItem) => {
                    if (
                        otherItem !== newFaq &&
                        otherItem.classList.contains("active")
                    ) {
                        otherItem.classList.remove("active");
                        const otherAnswer = otherItem.querySelector(".faq-answer");
                        if (otherAnswer) {
                            otherAnswer.style.maxHeight = "0px";
                        }
                    }
                });

                // Toggle current item
                if (!isActive) {
                    newFaq.classList.add("active");
                    if (answer) {
                        // Calculate the actual height needed
                        answer.style.maxHeight = "none";
                        const height = answer.scrollHeight;
                        answer.style.maxHeight = "0px";
                        // Force reflow
                        answer.offsetHeight;
                        // Set the target height
                        answer.style.maxHeight = height + "px";
                    }
                } else {
                    newFaq.classList.remove("active");
                    if (answer) {
                        answer.style.maxHeight = "0px";
                    }
                }
            });

            this.showNotification("First FAQ created!", "success");
        }
    }

    addPricingCardAtEnd(block) {
        console.log("Adding pricing card to block:", block);
        const pricingOptions = block.querySelector(".pricing-options");
        if (!pricingOptions) {
            console.error("Pricing options container not found in block");
            this.showNotification(
                "Error: Pricing options container not found",
                "error"
            );
            return;
        }

        const lastCard = pricingOptions.lastElementChild;
        if (lastCard) {
            this.addPricingCard(block, lastCard);
            this.showNotification("Pricing plan added successfully!", "success");
        } else {
            // Create first pricing card if none exist
            const newCard = document.createElement("div");
            newCard.className = "pricing-card";
            newCard.innerHTML = `
        <div class="pricing-badge" data-editable="true">New Plan</div>
        <div class="pricing-amount" data-editable="true">$99</div>
        <div class="pricing-period" data-editable="true">per month</div>
        <ul class="pricing-features">
          <li data-editable="true">Feature 1</li>
          <li data-editable="true">Feature 2</li>
          <li data-editable="true">Feature 3</li>
        </ul>
        <a href="#apply" class="btn btn-primary btn-large" data-editable="true">Choose Plan</a>
        <p style="margin-top: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary);" data-editable="true">
          Terms and conditions
        </p>
      `;
            pricingOptions.appendChild(newCard);
            this.makeContentEditable(newCard);
            this.showNotification("First pricing plan created!", "success");
        }
    }

    addPricingFeatureAtEnd(block) {
        console.log("Adding pricing feature to block:", block);
        const pricingCards = block.querySelectorAll(".pricing-card");
        if (pricingCards.length === 0) {
            this.showNotification(
                "No pricing plans found. Add a pricing plan first.",
                "error"
            );
            return;
        }

        // Add to the first pricing card by default
        const firstCard = pricingCards[0];
        const pricingFeatures = firstCard.querySelector(".pricing-features");
        if (!pricingFeatures) {
            this.showNotification("Error: Pricing features list not found", "error");
            return;
        }

        const lastFeature = pricingFeatures.lastElementChild;
        if (lastFeature) {
            this.addPricingFeature(firstCard, lastFeature);
            this.showNotification("Pricing feature added to first plan!", "success");
        } else {
            // Create first feature if none exist
            const newFeature = document.createElement("li");
            newFeature.setAttribute("data-editable", "true");
            newFeature.textContent = "New feature or benefit";
            pricingFeatures.appendChild(newFeature);
            this.makeContentEditable(newFeature);
            this.showNotification("First pricing feature created!", "success");
        }
    }

    /**
     * Component Library Integration
     */
    toggleComponentLibrary() {
        if (window.componentLibrary) {
            window.componentLibrary.toggleLibrary();
        } else {
            this.showNotification("Component library not loaded", "error");
        }
    }

    addCustomComponent(componentHTML, componentData) {
        this.saveState();

        // Find insertion point
        const pageContainer = document.querySelector(".page-container");
        if (!pageContainer) {
            this.showNotification("Page container not found", "error");
            return;
        }

        // Insert component
        if (this.selectedBlock) {
            this.selectedBlock.insertAdjacentHTML("afterend", componentHTML);
        } else {
            pageContainer.insertAdjacentHTML("beforeend", componentHTML);
        }

        // Make the new component editable if in edit mode
        if (this.isEditMode) {
            const newBlock = pageContainer.lastElementChild;
            if (newBlock) {
                this.makeBlockEditable(newBlock);
                // Auto-select the new block
                this.handleBlockClick({
                    currentTarget: newBlock,
                    stopPropagation: () => {},
                });
            }
        }

        this.showNotification(`${componentData.name} added successfully!`, "success");
    }

    // Enhanced drag and drop support for component library
    setupComponentDragDrop() {
        // Handle drop zones on the main page
        const pageContainer = document.querySelector(".page-container");
        if (!pageContainer) return;

        pageContainer.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";

            // Visual feedback
            const dropIndicator = this.createDropIndicator(e);
            this.showDropIndicator(dropIndicator, e);
        });

        pageContainer.addEventListener("drop", (e) => {
            e.preventDefault();

            const componentId = e.dataTransfer.getData("text/plain");
            if (componentId && window.componentLibrary) {
                // Find the closest block to insert after
                const closestBlock = this.findClosestBlock(e.clientY);

                // Add the component
                window.componentLibrary.addComponentToPage(componentId);
            }

            this.hideDropIndicator();
        });

        pageContainer.addEventListener("dragleave", (e) => {
            // Only hide if leaving the page container entirely
            if (!pageContainer.contains(e.relatedTarget)) {
                this.hideDropIndicator();
            }
        });
    }

    createDropIndicator(e) {
        let indicator = document.getElementById("drop-indicator");
        if (!indicator) {
            indicator = document.createElement("div");
            indicator.id = "drop-indicator";
            indicator.className = "drop-indicator";
            indicator.innerHTML = "<span>Drop component here</span>";
            document.body.appendChild(indicator);
        }
        return indicator;
    }

    showDropIndicator(indicator, e) {
        const closestBlock = this.findClosestBlock(e.clientY);
        if (closestBlock) {
            const rect = closestBlock.getBoundingClientRect();
            indicator.style.top = rect.bottom + window.scrollY + "px";
            indicator.style.left = rect.left + "px";
            indicator.style.width = rect.width + "px";
            indicator.style.display = "block";
        }
    }

    hideDropIndicator() {
        const indicator = document.getElementById("drop-indicator");
        if (indicator) {
            indicator.style.display = "none";
        }
    }

    findClosestBlock(clientY) {
        const blocks = document.querySelectorAll(".block");
        let closestBlock = null;
        let closestDistance = Infinity;

        blocks.forEach((block) => {
            const rect = block.getBoundingClientRect();
            const blockCenter = rect.top + rect.height / 2;
            const distance = Math.abs(clientY - blockCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestBlock = block;
            }
        });

        return closestBlock;
    }

    /**
     * Settings Panel Dragging and Controls
     */
    makeSettingsPanelDraggable(panel) {
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        let xOffset = 0;
        let yOffset = 0;

        const header = panel.querySelector(".settings-panel-header");
        if (!header) return;

        // Add draggable cursor to header
        header.style.cursor = "move";
        header.setAttribute("title", "Drag to move panel");

        header.addEventListener("mousedown", (e) => {
            // Don't start drag if clicking on control buttons
            if (e.target.closest(".panel-control-btn")) return;

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;

            panel.classList.add("dragging");
            document.body.style.userSelect = "none";
        });

        // Double-click to reset position
        header.addEventListener("dblclick", (e) => {
            if (e.target.closest(".panel-control-btn")) return;

            xOffset = 0;
            yOffset = 0;
            panel.style.transform = "";
            panel.style.position = "fixed";
            panel.style.top = "80px";
            panel.style.right = "24px";
            panel.style.left = "auto";

            localStorage.removeItem("settings-panel-position");
            this.showNotification("Panel position reset", "info");
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;

            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            // Constrain to viewport
            const rect = panel.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;

            xOffset = Math.max(0, Math.min(maxX, xOffset));
            yOffset = Math.max(0, Math.min(maxY, yOffset));

            panel.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            panel.style.position = "fixed";
            panel.style.top = "auto";
            panel.style.right = "auto";
            panel.style.left = "0";
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                panel.classList.remove("dragging");
                document.body.style.userSelect = "";

                // Save position
                localStorage.setItem(
                    "settings-panel-position",
                    JSON.stringify({ x: xOffset, y: yOffset })
                );
            }
        });

        // Restore saved position
        this.restorePanelPosition(panel);
    }

    restorePanelPosition(panel) {
        try {
            const savedPosition = localStorage.getItem("settings-panel-position");
            if (savedPosition) {
                const { x, y } = JSON.parse(savedPosition);
                panel.style.transform = `translate(${x}px, ${y}px)`;
                panel.style.position = "fixed";
                panel.style.top = "auto";
                panel.style.right = "auto";
                panel.style.left = "0";
            }
        } catch (error) {
            console.log("Could not restore panel position:", error);
        }
    }

    addPanelControls(panel) {
        // Add event listeners for panel controls
        const collapseBtn = panel.querySelector(".panel-collapse-btn");
        const closeBtn = panel.querySelector(".panel-close-btn");

        if (collapseBtn) {
            collapseBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.togglePanelCollapse(panel);
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.closePanelSettings(panel);
            });
        }
    }

    togglePanelCollapse(panel) {
        const content = panel.querySelector(".settings-panel-content");
        const collapseIcon = panel.querySelector(".collapse-icon");

        if (!content || !collapseIcon) return;

        const isCollapsed = panel.classList.contains("collapsed");

        if (isCollapsed) {
            // Expand
            panel.classList.remove("collapsed");
            content.style.display = "block";
            collapseIcon.textContent = "−";
            collapseIcon.parentElement.setAttribute("title", "Collapse panel");
        } else {
            // Collapse
            panel.classList.add("collapsed");
            content.style.display = "none";
            collapseIcon.textContent = "+";
            collapseIcon.parentElement.setAttribute("title", "Expand panel");
        }

        // Save collapse state
        localStorage.setItem(
            "settings-panel-collapsed",
            isCollapsed ? "false" : "true"
        );
    }

    closePanelSettings(panel) {
        panel.style.display = "none";

        // Clear selected block
        if (this.selectedBlock) {
            this.selectedBlock.classList.remove("block-selected");
            this.selectedBlock = null;
        }

        this.showNotification("Settings panel closed", "info");
    }

    // Restore collapse state when showing panel
    restorePanelState(panel) {
        try {
            const isCollapsed =
                localStorage.getItem("settings-panel-collapsed") === "true";
            if (isCollapsed) {
                this.togglePanelCollapse(panel);
            }
        } catch (error) {
            console.log("Could not restore panel state:", error);
        }
    }

    /**
     * Theme Switching System
     */
    showThemeSelector() {
        // Create theme selector modal
        const existingModal = document.getElementById("theme-selector-modal");
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement("div");
        modal.id = "theme-selector-modal";
        modal.className = "theme-selector-modal";
        modal.innerHTML = this.renderThemeSelector();

        document.body.appendChild(modal);

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add("show");
        }, 10);

        // Add event listeners
        this.attachThemeSelectorListeners(modal);
    }

    renderThemeSelector() {
        const themes = this.getThemePresets();
        const currentTheme = localStorage.getItem("selected-theme") || "default";

        return `
      <div class="theme-modal-backdrop">
        <div class="theme-modal-content">
          <div class="theme-modal-header">
            <div class="theme-header-content">
              <h3>🎨 Choose Your Perfect Theme</h3>
              <p class="theme-subtitle">Select from ${themes.length} beautiful, professionally designed themes</p>
            </div>
            <button class="theme-modal-close" title="Close">&times;</button>
          </div>
          <div class="theme-grid-container">
            <div class="theme-grid">
              ${themes
                  .map(
                      (theme) => `
                <div class="theme-card ${currentTheme === theme.id ? "active" : ""}" data-theme="${theme.id}">
                  <div class="theme-content">
                    <div class="theme-info">
                      <div class="theme-name">${theme.name}</div>
                      <div class="theme-description">${theme.description}</div>
                    </div>
                    <div class="theme-colors">
                      <div class="color-palette">
                        <span class="color-dot" style="background: ${theme.colors.primary};" title="Primary"></span>
                        <span class="color-dot" style="background: ${theme.colors.secondary};" title="Secondary"></span>
                        <span class="color-dot" style="background: ${theme.colors.accent};" title="Accent"></span>
                        <span class="color-dot" style="background: ${theme.colors.background}; border: 2px solid ${theme.colors.text === "#FFFFFF" ? "#E5E7EB" : theme.colors.text};" title="Background"></span>
                      </div>
                    </div>
                    <div class="theme-actions">
                      <button class="apply-theme-btn ${currentTheme === theme.id ? "applied" : ""}" data-theme="${theme.id}">
                        ${currentTheme === theme.id ? "✓ Applied" : "Apply Theme"}
                      </button>
                    </div>
                  </div>
                </div>
              `
                  )
                  .join("")}
            </div>
          </div>
          <div class="theme-modal-footer">
            <div class="theme-footer-actions">
              <button class="theme-action-btn reset-btn">
                <span class="btn-icon">↺</span>
                <span class="btn-text">Reset to Default</span>
              </button>
              <button class="theme-action-btn custom-btn">
                <span class="btn-icon">🎨</span>
                <span class="btn-text">Custom Colors</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    getThemePresets() {
        const themes = [
            {
                id: "default",
                name: "Growth Mastery",
                description: "Emerald & gold branding",
                colors: {
                    primary: "#138A36", // Deep Emerald hsl(103 89% 29%) from design system
                    secondary: "#34A853", // Medium emerald hsl(103 70% 45%) for gradients
                    accent: "#F5B800", // Gold/Amber hsl(45 93% 58%) from design system
                    background: "#FFFFFF",
                    text: "#111827",
                },
            },
            {
                id: "purple",
                name: "Purple Power",
                description: "Bold purple and pink",
                colors: {
                    primary: "#7C3AED",
                    secondary: "#EC4899",
                    accent: "#F59E0B",
                    background: "#FFFFFF",
                    text: "#111827",
                },
            },
            {
                id: "green",
                name: "Nature Green",
                description: "Fresh green and teal",
                colors: {
                    primary: "#059669",
                    secondary: "#0891B2",
                    accent: "#F59E0B",
                    background: "#FFFFFF",
                    text: "#111827",
                },
            },
            {
                id: "orange",
                name: "Energy Orange",
                description: "Vibrant orange and red",
                colors: {
                    primary: "#EA580C",
                    secondary: "#DC2626",
                    accent: "#7C3AED",
                    background: "#FFFFFF",
                    text: "#111827",
                },
            },
            {
                id: "dark",
                name: "Dark Mode",
                description: "Professional dark theme",
                colors: {
                    primary: "#6366F1",
                    secondary: "#10B981",
                    accent: "#F59E0B",
                    background: "#1F2937",
                    text: "#F9FAFB",
                },
            },
            {
                id: "minimal",
                name: "Minimal Gray",
                description: "Clean monochrome theme",
                colors: {
                    primary: "#374151",
                    secondary: "#6B7280",
                    accent: "#F59E0B",
                    background: "#FFFFFF",
                    text: "#111827",
                },
            },
            // NEW THEMES BASED ON COLOR PICKER PALETTE
            {
                id: "ocean",
                name: "🌊 Ocean Depths",
                description: "Deep ocean blues and purples",
                colors: {
                    primary: "#667eea",
                    secondary: "#764ba2",
                    accent: "#74b9ff",
                    background: "#FFFFFF",
                    text: "#1F2937",
                },
            },
            {
                id: "forest",
                name: "🌲 Forest Canopy",
                description: "Rich forest greens and earth tones",
                colors: {
                    primary: "#134e5e",
                    secondary: "#71b280",
                    accent: "#48c9b0",
                    background: "#FFFFFF",
                    text: "#111827",
                },
            },
            {
                id: "sunset",
                name: "🌅 Sunset Glow",
                description: "Warm sunset oranges and pinks",
                colors: {
                    primary: "#ee5a24",
                    secondary: "#feca57",
                    accent: "#ff6b6b",
                    background: "#FFFFFF",
                    text: "#1F2937",
                },
            },
            {
                id: "galaxy",
                name: "🌌 Galaxy Night",
                description: "Deep space blues and cosmic colors",
                colors: {
                    primary: "#1e3c72",
                    secondary: "#2a5298",
                    accent: "#74b9ff",
                    background: "#0F172A",
                    text: "#F9FAFB",
                },
            },
            {
                id: "coral",
                name: "🪸 Coral Reef",
                description: "Vibrant coral and tropical colors",
                colors: {
                    primary: "#ff6b6b",
                    secondary: "#feca57",
                    accent: "#48c9b0",
                    background: "#FFFFFF",
                    text: "#1F2937",
                },
            },
            {
                id: "mint",
                name: "🌿 Fresh Mint",
                description: "Cool mint and aqua tones",
                colors: {
                    primary: "#48c9b0",
                    secondary: "#96e6a1",
                    accent: "#11998e",
                    background: "#FFFFFF",
                    text: "#134e5e",
                },
            },
            {
                id: "lavender",
                name: "💜 Lavender Dreams",
                description: "Soft lavender and pastel tones",
                colors: {
                    primary: "#764ba2",
                    secondary: "#f093fb",
                    accent: "#a8edea",
                    background: "#FFFFFF",
                    text: "#374151",
                },
            },
            {
                id: "royal",
                name: "👑 Royal Purple",
                description: "Regal purples and blues",
                colors: {
                    primary: "#4f46e5",
                    secondary: "#7c3aed",
                    accent: "#ec4899",
                    background: "#FFFFFF",
                    text: "#111827",
                },
            },
            {
                id: "emerald",
                name: "💎 Emerald Luxury",
                description: "Rich emerald and jade tones",
                colors: {
                    primary: "#11998e",
                    secondary: "#38ef7d",
                    accent: "#059669",
                    background: "#FFFFFF",
                    text: "#1F2937",
                },
            },
            {
                id: "flame",
                name: "🔥 Fire Flame",
                description: "Hot flame colors and energy",
                colors: {
                    primary: "#ee5a24",
                    secondary: "#feca57",
                    accent: "#ff0099",
                    background: "#FFFFFF",
                    text: "#1F2937",
                },
            },
            {
                id: "arctic",
                name: "🧊 Arctic Ice",
                description: "Cool arctic blues and whites",
                colors: {
                    primary: "#74b9ff",
                    secondary: "#0984e3",
                    accent: "#667eea",
                    background: "#FFFFFF",
                    text: "#1F2937",
                },
            },
            {
                id: "cosmic",
                name: "🌌 Cosmic Pink",
                description: "Bold cosmic pinks and darks",
                colors: {
                    primary: "#ff0099",
                    secondary: "#493240",
                    accent: "#f093fb",
                    background: "#1F2937",
                    text: "#F9FAFB",
                },
            },
            {
                id: "dawn",
                name: "🌸 Rose Dawn",
                description: "Soft rose and morning colors",
                colors: {
                    primary: "#f093fb",
                    secondary: "#f5576c",
                    accent: "#feca57",
                    background: "#FFFFFF",
                    text: "#374151",
                },
            },
            {
                id: "peach",
                name: "🍑 Peach Sorbet",
                description: "Sweet peach and cream tones",
                colors: {
                    primary: "#ffecd2",
                    secondary: "#fcb69f",
                    accent: "#ff6b6b",
                    background: "#FFFFFF",
                    text: "#1F2937",
                },
            },
            {
                id: "neon",
                name: "⚡ Electric Neon",
                description: "Bright electric and neon colors",
                colors: {
                    primary: "#4ecdc4",
                    secondary: "#44a08d",
                    accent: "#f093fb",
                    background: "#0F172A",
                    text: "#F9FAFB",
                },
            },
            {
                id: "vintage",
                name: "📸 Vintage Film",
                description: "Warm vintage and retro tones",
                colors: {
                    primary: "#6B7280",
                    secondary: "#9CA3AF",
                    accent: "#F59E0B",
                    background: "#F9FAFB",
                    text: "#374151",
                },
            },
            {
                id: "cyber",
                name: "🤖 Cyber Tech",
                description: "Futuristic cyber tech colors",
                colors: {
                    primary: "#667eea",
                    secondary: "#4ecdc4",
                    accent: "#f093fb",
                    background: "#111827",
                    text: "#F9FAFB",
                },
            },
            {
                id: "earth",
                name: "🌍 Earth Tones",
                description: "Natural earth and soil colors",
                colors: {
                    primary: "#8B4513",
                    secondary: "#D2691E",
                    accent: "#228B22",
                    background: "#F5F5DC",
                    text: "#2F4F4F",
                },
            },
            {
                id: "monochrome",
                name: "⚫ Pure Monochrome",
                description: "Classic black and white only",
                colors: {
                    primary: "#000000",
                    secondary: "#4B5563",
                    accent: "#9CA3AF",
                    background: "#FFFFFF",
                    text: "#000000",
                },
            },
            {
                id: "golden",
                name: "✨ Golden Luxury",
                description: "Luxurious gold and warm tones",
                colors: {
                    primary: "#FFD700",
                    secondary: "#FFA500",
                    accent: "#FF8C00",
                    background: "#FFFAF0",
                    text: "#8B4513",
                },
            },
            {
                id: "watercolor",
                name: "🎨 Watercolor Soft",
                description: "Soft watercolor pastels",
                colors: {
                    primary: "#B19CD9",
                    secondary: "#FFB3BA",
                    accent: "#BFFCC6",
                    background: "#FFFFFF",
                    text: "#4A4A4A",
                },
            },
        ];

        // Add custom theme if it exists
        const customColors = localStorage.getItem("custom-theme-colors");
        if (customColors) {
            themes.unshift({
                id: "custom",
                name: "🎨 My Custom Theme",
                description: "Your personalized color scheme",
                colors: JSON.parse(customColors),
            });
        }

        return themes;
    }

    attachThemeSelectorListeners(modal) {
        // Close modal
        modal.querySelector(".theme-modal-close").addEventListener("click", () => {
            this.closeThemeSelector(modal);
        });

        modal.querySelector(".theme-modal-backdrop").addEventListener("click", (e) => {
            if (e.target === modal.querySelector(".theme-modal-backdrop")) {
                this.closeThemeSelector(modal);
            }
        });

        // Apply theme buttons
        modal.querySelectorAll(".apply-theme-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const themeId = e.target.dataset.theme;
                this.applyTheme(themeId);
                this.closeThemeSelector(modal);
            });
        });

        // Theme card selection
        modal.querySelectorAll(".theme-card").forEach((card) => {
            card.addEventListener("click", (e) => {
                if (e.target.closest(".apply-theme-btn")) return;

                // Remove active from all cards
                modal
                    .querySelectorAll(".theme-card")
                    .forEach((c) => c.classList.remove("active"));
                // Add active to clicked card
                card.classList.add("active");
            });
        });

        // Reset button
        modal.querySelector(".reset-btn").addEventListener("click", () => {
            this.applyTheme("default");
            this.closeThemeSelector(modal);
        });

        // Custom colors button
        modal.querySelector(".custom-btn").addEventListener("click", () => {
            this.closeThemeSelector(modal);
            this.showCustomColorEditor();
        });
    }

    applyTheme(themeId) {
        const themes = this.getThemePresets();
        const theme = themes.find((t) => t.id === themeId);

        if (!theme) {
            this.showNotification("Theme not found", "error");
            return;
        }

        // Apply CSS custom properties
        const root = document.documentElement;
        root.style.setProperty("--primary-color", theme.colors.primary);
        root.style.setProperty("--secondary-color", theme.colors.secondary);
        root.style.setProperty("--accent-color", theme.colors.accent);
        root.style.setProperty("--bg-primary", theme.colors.background);

        // Smart contrast detection for text colors
        const primaryTextColor = this.getContrastColor(theme.colors.background);
        const secondaryTextColor = this.getSecondaryTextColor(theme.colors.background);

        root.style.setProperty("--text-primary", primaryTextColor);
        root.style.setProperty("--text-secondary", secondaryTextColor);
        root.style.setProperty("--text-white", "#ffffff");

        // Update additional theme variables with contrast awareness
        root.style.setProperty(
            "--primary-dark",
            this.darkenColor(theme.colors.primary, 20)
        );
        root.style.setProperty(
            "--bg-secondary",
            this.lightenColor(theme.colors.background, 3)
        );
        root.style.setProperty(
            "--bg-tertiary",
            this.lightenColor(theme.colors.background, 6)
        );

        // Update gradients
        root.style.setProperty(
            "--bg-gradient",
            `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
        );
        root.style.setProperty(
            "--bg-hero",
            `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
        );
        root.style.setProperty(
            "--bg-cta",
            `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`
        );
        root.style.setProperty(
            "--bg-footer",
            `linear-gradient(135deg, ${theme.colors.secondary}, ${theme.colors.primary})`
        );

        // Set all section backgrounds with smart contrast
        const lightBg1 = this.lightenColor(theme.colors.background, 2);
        const lightBg2 = this.lightenColor(theme.colors.background, 5);
        const lightBg3 = this.lightenColor(theme.colors.background, 8);
        const lightBg4 = this.lightenColor(theme.colors.background, 11);
        const lightBg5 = this.lightenColor(theme.colors.background, 14);

        root.style.setProperty("--bg-section-1", lightBg1);
        root.style.setProperty("--bg-section-2", lightBg2);
        root.style.setProperty("--bg-section-3", lightBg3);
        root.style.setProperty("--bg-section-4", lightBg4);
        root.style.setProperty("--bg-section-5", lightBg5);
        root.style.setProperty(
            "--bg-features",
            `linear-gradient(135deg, ${theme.colors.secondary}15, ${theme.colors.primary}08)`
        );

        // Update section backgrounds with smart contrast
        this.updateSectionBackgrounds(theme.colors);

        // Update card colors to use theme colors
        this.updateCardColors(theme.colors);

        // Save theme preference
        localStorage.setItem("selected-theme", themeId);

        // Clear custom colors if switching to preset theme
        if (themeId !== "custom") {
            localStorage.removeItem("custom-theme-colors");
        }

        // Show success notification
        this.showNotification(`${theme.name} theme applied!`, "success");

        // Refresh all existing sections with new theme colors
        setTimeout(() => {
            this.refreshAllSectionThemes();
        }, 100);

        // Update theme button appearance
        this.updateThemeButton(theme);
    }

    closeThemeSelector(modal) {
        modal.classList.remove("show");
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    updateThemeButton(theme) {
        const themeBtn = document.getElementById("theme-switcher");
        if (themeBtn) {
            const icon = themeBtn.querySelector(".btn-icon");
            if (icon) {
                // Change icon color to match theme
                themeBtn.style.background = theme.colors.primary;
                themeBtn.style.borderColor = theme.colors.primary;
                themeBtn.style.color = "white";
            }
        }
    }

    // Load saved theme on initialization
    loadSavedTheme() {
        const savedTheme = localStorage.getItem("selected-theme");
        if (savedTheme && savedTheme !== "default") {
            this.applyTheme(savedTheme);
        } else {
            // Apply default emerald/gold theme with full color system
            this.applyTheme("default");
        }
    }

    // Custom Color Editor
    showCustomColorEditor() {
        const currentTheme = this.getCurrentThemeColors();
        const modal = document.createElement("div");
        modal.className = "custom-color-modal";
        modal.innerHTML = this.renderCustomColorEditor(currentTheme);

        document.body.appendChild(modal);

        // Animate in
        setTimeout(() => {
            modal.classList.add("show");
        }, 10);

        this.attachCustomColorListeners(modal);
    }

    getCurrentThemeColors() {
        const currentThemeId = localStorage.getItem("selected-theme") || "default";
        const customColors = localStorage.getItem("custom-theme-colors");

        if (customColors) {
            return JSON.parse(customColors);
        }

        const themes = this.getThemePresets();
        const theme = themes.find((t) => t.id === currentThemeId);
        return theme ? theme.colors : this.getThemePresets()[0].colors;
    }

    renderCustomColorEditor(colors) {
        return `
      <div class="custom-color-backdrop">
        <div class="custom-color-content">
          <div class="custom-color-header">
            <div class="custom-header-content">
              <h3>🎨 Custom Color Editor</h3>
              <p class="custom-subtitle">Customize your theme colors to match your brand perfectly</p>
            </div>
            <button class="custom-color-close" title="Close">&times;</button>
          </div>

          <div class="custom-color-body">
            <div class="color-sections">
              <div class="color-section">
                <h4>🌈 Brand Colors</h4>
                <div class="color-controls">
                  <div class="color-control">
                    <label>Primary Color <span class="color-usage">(Headers, gradients)</span></label>
                    <div class="color-input-group">
                      <div class="color-preview" style="background: ${colors.primary};" data-color="primary"></div>
                      <input type="color" class="color-picker" data-property="primary" value="${colors.primary}">
                      <input type="text" class="color-text" data-property="primary" value="${colors.primary}" placeholder="#4F46E5">
                    </div>
                  </div>

                  <div class="color-control">
                    <label>Secondary Color <span class="color-usage">(Secondary buttons, gradients)</span></label>
                    <div class="color-input-group">
                      <div class="color-preview" style="background: ${colors.secondary};" data-color="secondary"></div>
                      <input type="color" class="color-picker" data-property="secondary" value="${colors.secondary}">
                      <input type="text" class="color-text" data-property="secondary" value="${colors.secondary}" placeholder="#10B981">
                    </div>
                  </div>

                  <div class="color-control">
                    <label>Accent Color <span class="color-usage">(Primary buttons, CTAs)</span></label>
                    <div class="color-input-group">
                      <div class="color-preview" style="background: ${colors.accent};" data-color="accent"></div>
                      <input type="color" class="color-picker" data-property="accent" value="${colors.accent}">
                      <input type="text" class="color-text" data-property="accent" value="${colors.accent}" placeholder="#F59E0B">
                    </div>
                  </div>
                </div>
              </div>

              <div class="color-section">
                <h4>📄 Background & Text</h4>
                <div class="color-controls">
                  <div class="color-control">
                    <label>Background Color</label>
                    <div class="color-input-group">
                      <div class="color-preview" style="background: ${colors.background}; border: 1px solid #E5E7EB;" data-color="background"></div>
                      <input type="color" class="color-picker" data-property="background" value="${colors.background}">
                      <input type="text" class="color-text" data-property="background" value="${colors.background}" placeholder="#FFFFFF">
                    </div>
                  </div>

                  <div class="color-control">
                    <label>Text Color</label>
                    <div class="color-input-group">
                      <div class="color-preview" style="background: ${colors.text};" data-color="text"></div>
                      <input type="color" class="color-picker" data-property="text" value="${colors.text}">
                      <input type="text" class="color-text" data-property="text" value="${colors.text}" placeholder="#111827">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="color-preview-section">
              <h4>✨ Live Preview</h4>
              <div class="theme-preview-card" id="live-preview">
                <div class="preview-header" style="background: ${colors.primary};">
                  <div class="preview-title" style="color: ${colors.text === "#FFFFFF" || colors.text === "#F9FAFB" ? "#FFFFFF" : "#FFFFFF"};">Your Amazing Funnel</div>
                </div>
                <div class="preview-content" style="background: ${colors.background}; color: ${colors.text};">
                  <div class="preview-hero" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});">
                    <h3 style="color: #FFFFFF;">Hero Section (Primary + Secondary)</h3>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                      <button style="background: ${colors.accent}; color: #FFFFFF; padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600;">Primary Button</button>
                      <span style="font-size: 10px; color: rgba(255,255,255,0.8);">uses Accent Color for contrast</span>
                    </div>
                  </div>
                  <div class="preview-text">
                    <p>This is how your content will look with these colors.</p>
                    <p style="color: ${colors.secondary};">Secondary color for highlights and emphasis.</p>
                    <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center;">
                      <button style="background: ${colors.secondary}; color: #FFFFFF; padding: 6px 12px; border: none; border-radius: 6px; font-size: 12px;">Secondary Button</button>
                      <span style="font-size: 11px; color: ${colors.text}; opacity: 0.7;">uses Secondary Color</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="custom-color-footer">
            <div class="custom-footer-actions">
              <button class="custom-action-btn cancel-btn">
                <span class="btn-icon">✕</span>
                <span class="btn-text">Cancel</span>
              </button>
              <button class="custom-action-btn reset-btn">
                <span class="btn-icon">↺</span>
                <span class="btn-text">Reset Colors</span>
              </button>
              <button class="custom-action-btn apply-btn">
                <span class="btn-icon">✓</span>
                <span class="btn-text">Apply Custom Theme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    attachCustomColorListeners(modal) {
        const currentColors = { ...this.getCurrentThemeColors() };

        // Close modal
        modal.querySelector(".custom-color-close").addEventListener("click", () => {
            this.closeCustomColorEditor(modal);
        });

        modal.querySelector(".cancel-btn").addEventListener("click", () => {
            this.closeCustomColorEditor(modal);
        });

        modal.querySelector(".custom-color-backdrop").addEventListener("click", (e) => {
            if (e.target === modal.querySelector(".custom-color-backdrop")) {
                this.closeCustomColorEditor(modal);
            }
        });

        // Color picker changes
        modal.querySelectorAll(".color-picker").forEach((picker) => {
            picker.addEventListener("input", (e) => {
                const property = e.target.dataset.property;
                const value = e.target.value;
                this.updateColorPreview(modal, property, value);
                this.updateLivePreview(modal);
            });
        });

        // Text input changes
        modal.querySelectorAll(".color-text").forEach((input) => {
            input.addEventListener("input", (e) => {
                const property = e.target.dataset.property;
                const value = e.target.value;

                // Validate hex color
                if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
                    this.updateColorPreview(modal, property, value);
                    this.updateColorPicker(modal, property, value);
                    this.updateLivePreview(modal);
                }
            });
        });

        // Reset colors
        modal.querySelector(".reset-btn").addEventListener("click", () => {
            this.resetCustomColors(modal, currentColors);
        });

        // Apply custom theme
        modal.querySelector(".apply-btn").addEventListener("click", () => {
            this.applyCustomTheme(modal);
        });
    }

    updateColorPreview(modal, property, value) {
        const preview = modal.querySelector(`[data-color="${property}"]`);
        if (preview) {
            preview.style.background = value;
        }
    }

    updateColorPicker(modal, property, value) {
        const picker = modal.querySelector(
            `.color-picker[data-property="${property}"]`
        );
        if (picker) {
            picker.value = value;
        }
    }

    updateLivePreview(modal) {
        const colors = this.getColorsFromEditor(modal);
        const preview = modal.querySelector("#live-preview");

        if (preview) {
            const header = preview.querySelector(".preview-header");
            const content = preview.querySelector(".preview-content");
            const hero = preview.querySelector(".preview-hero");
            const primaryButton = hero.querySelector("button");
            const secondaryButton = preview.querySelector(".preview-text button");
            const secondaryText = preview.querySelector('p[style*="color:"]');

            header.style.background = colors.primary;
            content.style.background = colors.background;
            content.style.color = colors.text;
            hero.style.background = `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;

            // Primary buttons use accent color for maximum contrast
            if (primaryButton) {
                primaryButton.style.background = colors.accent;
            }

            // Secondary buttons use secondary color
            if (secondaryButton) {
                secondaryButton.style.background = colors.secondary;
            }

            // Update helper text colors
            const primaryHelper = hero.querySelector("span");
            if (primaryHelper) {
                primaryHelper.style.color = "rgba(255,255,255,0.8)";
            }

            const secondaryHelper = preview.querySelector(".preview-text span");
            if (secondaryHelper) {
                secondaryHelper.style.color = colors.text;
                secondaryHelper.style.opacity = "0.7";
            }

            secondaryText.style.color = colors.secondary;
        }
    }

    getColorsFromEditor(modal) {
        return {
            primary: modal.querySelector('.color-picker[data-property="primary"]')
                .value,
            secondary: modal.querySelector('.color-picker[data-property="secondary"]')
                .value,
            accent: modal.querySelector('.color-picker[data-property="accent"]').value,
            background: modal.querySelector('.color-picker[data-property="background"]')
                .value,
            text: modal.querySelector('.color-picker[data-property="text"]').value,
        };
    }

    resetCustomColors(modal, originalColors) {
        Object.entries(originalColors).forEach(([property, color]) => {
            const picker = modal.querySelector(
                `.color-picker[data-property="${property}"]`
            );
            const textInput = modal.querySelector(
                `.color-text[data-property="${property}"]`
            );
            const preview = modal.querySelector(`[data-color="${property}"]`);

            if (picker) picker.value = color;
            if (textInput) textInput.value = color;
            if (preview) preview.style.background = color;
        });

        this.updateLivePreview(modal);
    }

    applyCustomTheme(modal) {
        const customColors = this.getColorsFromEditor(modal);

        // Save custom colors
        localStorage.setItem("custom-theme-colors", JSON.stringify(customColors));
        localStorage.setItem("selected-theme", "custom");

        // Apply to CSS variables
        const root = document.documentElement;
        root.style.setProperty("--primary-color", customColors.primary);
        root.style.setProperty("--secondary-color", customColors.secondary);
        root.style.setProperty("--accent-color", customColors.accent);
        root.style.setProperty("--bg-primary", customColors.background);

        // Smart contrast detection for custom colors
        const primaryTextColor = this.getContrastColor(customColors.background);
        const secondaryTextColor = this.getSecondaryTextColor(customColors.background);

        root.style.setProperty("--text-primary", primaryTextColor);
        root.style.setProperty("--text-secondary", secondaryTextColor);

        // Update additional theme variables with all section backgrounds
        root.style.setProperty(
            "--primary-dark",
            this.darkenColor(customColors.primary, 20)
        );
        root.style.setProperty(
            "--bg-secondary",
            this.lightenColor(customColors.background, 3)
        );
        root.style.setProperty(
            "--bg-tertiary",
            this.lightenColor(customColors.background, 6)
        );

        // Set all section backgrounds for custom colors too
        const lightBg1 = this.lightenColor(customColors.background, 2);
        const lightBg2 = this.lightenColor(customColors.background, 5);
        const lightBg3 = this.lightenColor(customColors.background, 8);
        const lightBg4 = this.lightenColor(customColors.background, 11);
        const lightBg5 = this.lightenColor(customColors.background, 14);

        root.style.setProperty("--bg-section-1", lightBg1);
        root.style.setProperty("--bg-section-2", lightBg2);
        root.style.setProperty("--bg-section-3", lightBg3);
        root.style.setProperty("--bg-section-4", lightBg4);
        root.style.setProperty("--bg-section-5", lightBg5);

        // Update gradients
        root.style.setProperty(
            "--bg-gradient",
            `linear-gradient(135deg, ${customColors.primary}, ${customColors.secondary})`
        );
        root.style.setProperty(
            "--bg-hero",
            `linear-gradient(135deg, ${customColors.primary}, ${customColors.secondary})`
        );
        root.style.setProperty(
            "--bg-cta",
            `linear-gradient(135deg, ${customColors.primary}, ${customColors.accent})`
        );
        root.style.setProperty(
            "--bg-footer",
            `linear-gradient(135deg, ${customColors.secondary}, ${customColors.primary})`
        );

        // Set feature section to use secondary color for contrast
        root.style.setProperty(
            "--bg-features",
            `linear-gradient(135deg, ${customColors.secondary}15, ${customColors.primary}08)`
        );

        // Update section backgrounds with smart contrast for custom colors
        this.updateSectionBackgrounds(customColors);

        // Update card colors to use theme colors
        this.updateCardColors(customColors);

        this.closeCustomColorEditor(modal);
        this.showNotification("🎨 Custom theme applied successfully!", "success");

        // Refresh all existing sections with new custom theme colors
        setTimeout(() => {
            this.refreshAllSectionThemes();
        }, 100);

        // Update theme button to show custom
        this.updateThemeButton({ name: "Custom Theme", colors: customColors });
    }

    closeCustomColorEditor(modal) {
        modal.classList.remove("show");
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    // Color manipulation helpers
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const B = ((num >> 8) & 0x00ff) - amt;
        const G = (num & 0x0000ff) - amt;
        return (
            "#" +
            (
                0x1000000 +
                (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
                (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
                (G < 255 ? (G < 1 ? 0 : G) : 255)
            )
                .toString(16)
                .slice(1)
        );
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const B = ((num >> 8) & 0x00ff) + amt;
        const G = (num & 0x0000ff) + amt;
        return (
            "#" +
            (
                0x1000000 +
                (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
                (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
                (G < 255 ? (G < 1 ? 0 : G) : 255)
            )
                .toString(16)
                .slice(1)
        );
    }

    // Check if a color is light or dark for proper contrast
    isLightColor(color) {
        // Convert color to RGB values
        let r, g, b;

        if (color.startsWith("#")) {
            const hex = color.replace("#", "");
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else if (color.startsWith("rgb")) {
            const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (matches) {
                r = parseInt(matches[1]);
                g = parseInt(matches[2]);
                b = parseInt(matches[3]);
            }
        } else {
            // Default to light for unknown formats
            return true;
        }

        // Calculate luminance using the standard formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return true if light (luminance > 0.5), false if dark
        return luminance > 0.5;
    }

    // Get contrasting text color for a given background
    getContrastColor(backgroundColor) {
        return this.isLightColor(backgroundColor) ? "#111827" : "#ffffff";
    }

    // Get secondary text color for a given background
    getSecondaryTextColor(backgroundColor) {
        return this.isLightColor(backgroundColor) ? "#6B7280" : "#D1D5DB";
    }

    // New function to update section backgrounds with smart contrast
    updateSectionBackgrounds(colors) {
        const sections = document.querySelectorAll(".block");

        sections.forEach((section) => {
            let bgColor, textColor, secondaryTextColor;

            // Handle all section background classes
            if (section.classList.contains("bg-section-1")) {
                bgColor = this.lightenColor(colors.background, 2);
            } else if (section.classList.contains("bg-section-2")) {
                bgColor = this.lightenColor(colors.background, 5);
            } else if (section.classList.contains("bg-section-3")) {
                bgColor = this.lightenColor(colors.background, 8);
            } else if (section.classList.contains("bg-section-4")) {
                bgColor = this.lightenColor(colors.background, 11);
            } else if (section.classList.contains("bg-section-5")) {
                bgColor = this.lightenColor(colors.background, 14);
            }

            if (bgColor) {
                textColor = this.getContrastColor(bgColor);
                secondaryTextColor = this.getSecondaryTextColor(bgColor);

                // Update text colors for this section
                const headings = section.querySelectorAll(
                    "h1, h2, h3, h4, .heading-1, .heading-2, .heading-3"
                );
                headings.forEach((heading) => {
                    if (!heading.style.color || heading.style.color.includes("var(")) {
                        heading.style.setProperty("color", textColor, "important");
                    }
                });

                const paragraphs = section.querySelectorAll("p, .subheading");
                paragraphs.forEach((p) => {
                    if (!p.style.color || p.style.color.includes("var(")) {
                        p.style.setProperty("color", secondaryTextColor, "important");
                    }
                });
            }
        });
    }

    updateCardColors(colors) {
        // Update all buttons to use proper theme colors for better contrast
        const buttons = document.querySelectorAll(".btn-primary");
        buttons.forEach((btn) => {
            btn.style.backgroundColor = colors.primary;
            btn.style.color = this.getContrastColor(colors.primary);
            btn.style.borderColor = colors.primary;
        });

        const secondaryButtons = document.querySelectorAll(".btn-secondary");
        secondaryButtons.forEach((btn) => {
            btn.style.backgroundColor = colors.secondary;
            btn.style.color = this.getContrastColor(colors.secondary);
            btn.style.borderColor = colors.secondary;
        });

        // Apply theme colors to feature cards and sections
        this.applyThemeToSections(colors);
    }

    applyThemeToSections(colors) {
        const root = document.documentElement;

        // Set feature section background to contrast with main background
        const featureBlocks = document.querySelectorAll(
            '.features-block, [class*="features"], .why-choose'
        );
        featureBlocks.forEach((block) => {
            if (colors.background === "#FFFFFF" || colors.background === "#ffffff") {
                // Light background - use subtle colored background
                block.style.background = `linear-gradient(135deg, ${colors.secondary}08, ${colors.primary}05)`;
            } else {
                // Dark background - use lighter version
                block.style.background = this.lightenColor(colors.background, 5);
            }
        });

        // Apply gorgeous gradient backgrounds to different card types
        this.applyCardGradients(colors);
    }

    applyCardGradients(colors) {
        // Clean, simple gradient approach - same as headers!
        const cardTypes = [
            {
                selector: ".testimonial-card",
                gradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            },
            {
                selector: ".pricing-card",
                gradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            },
            {
                selector: ".feature-card",
                gradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            },
            {
                selector: '.step-card, .process-card, [class*="step-"]',
                gradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            },
            {
                selector: ".faq-item",
                gradient: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            },
        ];

        cardTypes.forEach(({ selector, gradient }) => {
            const cards = document.querySelectorAll(selector);
            cards.forEach((card, index) => {
                // Remove any existing overlays - clean slate!
                const overlays = card.querySelectorAll(
                    ".card-overlay, .card-gradient-overlay"
                );
                overlays.forEach((overlay) => overlay.remove());

                // Apply clean header-style gradient
                card.style.background = gradient;
                card.style.color = "white";
                card.style.border = "none";
                card.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.15)";

                // Reset positioning and z-index - no more complex layering
                card.style.position = "relative";
                card.style.zIndex = "auto";

                // Make sure all text in cards is white for contrast
                const textElements = card.querySelectorAll(
                    "h1, h2, h3, h4, h5, h6, p, span, div, li"
                );
                textElements.forEach((el) => {
                    if (!el.closest("button")) {
                        // Don't override button text colors
                        el.style.color = "white";
                    }
                });
            });
        });

        // Premium pricing cards get accent color accent
        const premiumCards = document.querySelectorAll(".pricing-card-premium");
        premiumCards.forEach((card) => {
            card.style.background = `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})`;
            card.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.20)";
        });

        // Update CSS custom properties to match
        const root = document.documentElement;
        root.style.setProperty(
            "--card-gradient-testimonial",
            `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
        );
        root.style.setProperty(
            "--card-gradient-pricing",
            `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
        );
        root.style.setProperty(
            "--card-gradient-premium",
            `linear-gradient(135deg, ${colors.secondary}, ${colors.accent})`
        );
        root.style.setProperty(
            "--card-gradient-feature",
            `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
        );
    }

    // Legacy method removed - custom theme editor now integrated into settings panel

    // Pricing Card Management
    addPricingCard(block, afterElement) {
        const newCard = document.createElement("div");
        newCard.className = "pricing-card";
        newCard.innerHTML = `
      <div class="pricing-badge" data-editable="true">New Plan</div>
      <div class="pricing-amount" data-editable="true">$99</div>
      <div class="pricing-period" data-editable="true">per month</div>
      <ul class="pricing-features">
        <li data-editable="true">Feature 1</li>
        <li data-editable="true">Feature 2</li>
        <li data-editable="true">Feature 3</li>
      </ul>
      <a href="#apply" class="btn btn-primary btn-large" data-editable="true">Choose Plan</a>
      <p style="margin-top: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary);" data-editable="true">
        Terms and conditions
      </p>
    `;

        afterElement.insertAdjacentElement("afterend", newCard);
        this.makeContentEditable(newCard);
        this.showNotification("Pricing plan added!", "success");
    }

    removePricingCard(card) {
        const container = card.parentElement;
        if (container.children.length > 1) {
            card.remove();
            this.showNotification("Pricing plan removed!", "success");
        } else {
            this.showNotification("Cannot remove the last pricing plan", "error");
        }
    }

    movePricingCardUp(card) {
        const prev = card.previousElementSibling;
        if (prev && prev.classList.contains("pricing-card")) {
            card.parentNode.insertBefore(card, prev);
            this.showNotification("Pricing plan moved up!", "success");
        }
    }

    movePricingCardDown(card) {
        const next = card.nextElementSibling;
        if (next && next.classList.contains("pricing-card")) {
            card.parentNode.insertBefore(next, card);
            this.showNotification("Pricing plan moved down!", "success");
        }
    }

    /**
     * Setup image upload functionality
     */
    setupImageUpload() {
        // Create hidden file input for image uploads
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        fileInput.id = "image-upload-input";
        document.body.appendChild(fileInput);

        this.currentImageTarget = null;
        this.currentImageType = null; // 'background' or 'photo'

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });
    }

    /**
     * Handle image upload - with smart fallback for static servers
     */
    async handleImageUpload(file) {
        if (!file || !this.currentImageTarget) return;

        try {
            this.showNotification("Uploading image...", "info");

            // Create FormData with just the image
            const formData = new FormData();
            formData.append("image", file);

            // Smart API URL detection for development vs production
            const apiBaseUrl =
                window.location.hostname === "localhost"
                    ? "http://localhost:3000"
                    : window.location.origin;

            // Try to upload to Next.js server (check multiple ports)
            let response;
            const uploadUrls = [
                "/api/upload-image", // Same port (if on Next.js)
                apiBaseUrl + "/api/upload-image", // Smart detection
                "http://localhost:3000/api/upload-image", // Development fallback
                "http://localhost:3001/api/upload-image", // Secondary fallback
            ];

            let uploadSuccess = false;
            for (const url of uploadUrls) {
                try {
                    response = await fetch(url, {
                        method: "POST",
                        body: formData,
                    });
                    if (response.ok) {
                        uploadSuccess = true;
                        break;
                    }
                } catch (e) {
                    console.log(`Upload attempt to ${url} failed:`, e.message);
                    continue;
                }
            }

            if (!uploadSuccess) {
                throw new Error("No upload server available");
            }

            if (!response.ok) {
                // If server upload fails, fall back to local base64
                throw new Error(`Server upload failed: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Use the hosted image URL directly
                this.updateImageSource(result.imageUrl, result.filename);
                this.showNotification(
                    "Image uploaded and hosted successfully!",
                    "success"
                );
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (error) {
            console.error("Server upload failed, using local fallback:", error);

            // Fallback to base64 for static server environments
            this.showNotification(
                "Server unavailable, storing image locally...",
                "info"
            );
            this.handleImageUploadFallback(file);
        }

        // Reset target
        this.currentImageTarget = null;
        this.currentImageType = null;
    }

    /**
     * Fallback to base64 storage for static environments
     */
    handleImageUploadFallback(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            this.updateImageSource(
                imageUrl,
                `local-${Date.now()}.${file.name.split(".").pop()}`
            );
            this.showNotification(
                "Image stored locally (will work in this session)",
                "success"
            );
        };
        reader.readAsDataURL(file);
    }

    /**
     * Update image source in the DOM
     */
    updateImageSource(imageUrl, filename) {
        if (!this.currentImageTarget) return;

        if (this.currentImageType === "background") {
            // Update background image for quote sections
            const currentStyle = this.currentImageTarget.getAttribute("style");
            const newStyle = currentStyle.replace(
                /url\(['"]?[^'"]+['"]?\)/,
                `url('${imageUrl}')`
            );
            this.currentImageTarget.setAttribute("style", newStyle);
        } else if (this.currentImageType === "photo") {
            // Update src for img elements (like founder photo)
            this.currentImageTarget.src = imageUrl;
        }

        // Save the change
        this.saveState();
    }

    /**
     * Show image upload option for quote backgrounds
     */
    showImageUploadForBackground(element) {
        this.currentImageTarget = element;
        this.currentImageType = "background";
        document.getElementById("image-upload-input").click();
    }

    /**
     * Show image upload option for photos
     */
    showImageUploadForPhoto(element) {
        this.currentImageTarget = element;
        this.currentImageType = "photo";
        document.getElementById("image-upload-input").click();
    }

    /**
     * Render image upload section HTML
     */
    renderImageUploadSection(title, type, element, description) {
        const currentImageSrc = this.getCurrentImageSource(element, type);
        const previewHtml = currentImageSrc
            ? `<div class="current-image-preview">
        <img src="${currentImageSrc}" alt="Current ${title}" style="max-width: 100px; max-height: 100px; border-radius: 8px; object-fit: cover;">
      </div>`
            : "";

        return `
      <div class="image-upload-section">
        <div class="setting-group">
          <label>${title}</label>
          <p class="setting-description">${description}</p>
          ${previewHtml}
          <div class="image-upload-controls">
            <button type="button" class="image-upload-btn" data-type="${type}" data-target="${element.id || element.className}">
              📷 Choose ${title}
            </button>
            ${currentImageSrc ? `<button type="button" class="image-remove-btn" data-type="${type}" data-target="${element.id || element.className}">🗑️ Remove</button>` : ""}
          </div>
        </div>
      </div>
    `;
    }

    /**
     * Get current image source for preview
     */
    getCurrentImageSource(element, type) {
        if (type === "background") {
            const style = element.getAttribute("style") || "";
            const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            return match ? match[1] : null;
        } else if (type === "photo") {
            const img = element.querySelector(
                'img[data-editable="true"], .story-image img'
            );
            return img ? img.src : null;
        }
        return null;
    }

    /**
     * Remove background image and restore default
     */
    removeBackgroundImage(element) {
        const currentStyle = element.getAttribute("style") || "";
        // Remove the url() part and restore your mountain background
        const newStyle = currentStyle.replace(
            /url\(['"]?[^'"]+['"]?\)/,
            "url('/Screenshot 2568-09-30 at 2.22.29 AM.png')"
        );
        element.setAttribute("style", newStyle);

        // Refresh the settings panel to update the preview
        this.showBlockSettings(element);
        this.showNotification("Background restored to default!", "success");
        this.saveState();
    }

    /**
     * Remove photo image and restore default placeholder
     */
    removePhotoImage(element) {
        const img = element.querySelector(
            'img[data-editable="true"], .story-image img'
        );
        if (img) {
            // Use a reliable placeholder that works offline
            img.src =
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNEY0NkU1Ci8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K";
        }

        // Refresh the settings panel to update the preview
        this.showBlockSettings(element);
        this.showNotification("Photo restored to placeholder!", "success");
        this.saveState();
    }

    /**
     * Render funnel settings section (slug, name, etc.)
     */
    renderFunnelSettingsSection() {
        // Get current funnel info from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const funnelId = urlParams.get("funnel");
        const currentSlug = this.getCurrentSlug();
        const currentName = this.getCurrentFunnelName();

        return `
      <div class="funnel-settings-section">
        <div class="setting-group">
          <label>🌐 Funnel URL</label>
          <p class="setting-description">Customize your funnel's public URL</p>
          <div class="url-preview">
            <span class="base-url">${window.location.origin}/funnel/</span>
            <input type="text" class="slug-input" value="${currentSlug || "your-slug"}"
                   placeholder="your-custom-slug" data-funnel-id="${funnelId}">
          </div>
          <button type="button" class="update-slug-btn" data-funnel-id="${funnelId}">
            💾 Update URL
          </button>
          <div class="current-url">
            <small>Current URL: <a href="${window.location.origin}/funnel/${currentSlug || "your-slug"}" target="_blank">${window.location.origin}/funnel/${currentSlug || "your-slug"}</a></small>
          </div>
        </div>
      </div>
    `;
    }

    /**
     * Get current funnel slug from page or URL
     */
    getCurrentSlug() {
        // Try to get from URL first, then from page data
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("slug") || "test"; // Default to test for Nick's funnel
    }

    /**
     * Get current funnel name
     */
    getCurrentFunnelName() {
        const heroTitle = document.querySelector(".hero-title");
        return heroTitle
            ? heroTitle.textContent.substring(0, 50) + "..."
            : "Untitled Funnel";
    }

    /**
     * Update funnel slug
     */
    async updateFunnelSlug(funnelId, newSlug) {
        try {
            this.showNotification("Updating URL...", "info");

            // Validate slug format
            const validSlug = newSlug
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .trim();

            if (!validSlug) {
                throw new Error("Please enter a valid URL slug");
            }

            // Smart API URL detection
            const apiBaseUrl =
                window.location.hostname === "localhost"
                    ? "http://localhost:3000"
                    : window.location.origin;

            const response = await fetch(`${apiBaseUrl}/api/funnels/${funnelId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    funnel_slug: validSlug,
                }),
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification("URL updated successfully!", "success");

                // Update the URL preview in settings
                const urlPreview = document.querySelector(".current-url a");
                if (urlPreview) {
                    const newUrl = `${window.location.origin}/funnel/${validSlug}`;
                    urlPreview.href = newUrl;
                    urlPreview.textContent = newUrl;
                }

                // Update the slug input to show the cleaned version
                const slugInput = document.querySelector(".slug-input");
                if (slugInput) {
                    slugInput.value = validSlug;
                }
            } else {
                throw new Error(result.error || "Failed to update URL");
            }
        } catch (error) {
            console.error("Slug update error:", error);
            this.showNotification(`Failed to update URL: ${error.message}`, "error");
        }
    }

    /**
     * Clean animation states before saving to prevent invisible content
     */
    cleanAnimationStatesForSave() {
        console.log("🧹 Cleaning animation states before save...");

        // Get all blocks with fade-in animations
        const fadeInElements = document.querySelectorAll(".fade-in");
        let cleanedCount = 0;

        fadeInElements.forEach((element) => {
            // Ensure all fade-in elements are visible before saving
            if (!element.classList.contains("visible")) {
                element.classList.add("visible");
                cleanedCount++;
            }

            // Also clean up any editor-specific classes that shouldn't be saved
            element.classList.remove(
                "block-selected",
                "text-selected",
                "card-selected",
                "button-selected"
            );
            element.setAttribute("data-editor-mode", "false");
            element.setAttribute("contenteditable", "false");
        });

        // Clean up any editor controls that shouldn't be saved
        const editorControls = document.querySelectorAll(
            ".element-controls, .section-controls, .block-handle"
        );
        editorControls.forEach((control) => {
            control.style.display = "none";
        });

        console.log(
            `✅ Animation cleanup completed - made ${cleanedCount} sections visible before save`
        );
    }
}

// Initialize the visual editor when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.visualEditor = new VisualEditor();

    // Setup component drag and drop
    if (window.visualEditor.setupComponentDragDrop) {
        window.visualEditor.setupComponentDragDrop();
    }

    // Add global click handler to hide element controls when clicking outside
    document.addEventListener("click", (e) => {
        if (
            !e.target.closest(".manageable-element") &&
            !e.target.closest(".element-controls")
        ) {
            // Hide all element controls when clicking outside
            const controls = document.querySelectorAll(".element-controls");
            controls.forEach((control) => {
                control.style.display = "none";
            });
        }
    });

    // Show element controls on hover when in edit mode
    document.addEventListener("mouseover", (e) => {
        if (window.visualEditor && window.visualEditor.isEditMode) {
            const manageableElement = e.target.closest(".manageable-element");
            if (manageableElement) {
                const controls = manageableElement.querySelector(".element-controls");
                if (controls) {
                    controls.style.display = "block";
                }
            }
        }
    });

    document.addEventListener("mouseleave", (e) => {
        if (
            window.visualEditor &&
            window.visualEditor.isEditMode &&
            e.target &&
            e.target.closest
        ) {
            const manageableElement = e.target.closest(".manageable-element");
            if (manageableElement && !manageableElement.matches(":hover")) {
                const controls = manageableElement.querySelector(".element-controls");
                if (controls) {
                    setTimeout(() => {
                        if (!manageableElement.matches(":hover")) {
                            controls.style.display = "none";
                        }
                    }, 100);
                }
            }
        }
    });
});

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
    module.exports = VisualEditor;
}
