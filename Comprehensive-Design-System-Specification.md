# **Comprehensive Design System Specification**

## **1\. Color System (HSL Format Only)**

### **Primary Color Palette**

- **Primary (Deep Emerald)**: `hsl(103 89% 29%)`
- **Primary Foreground**: `hsl(0 0% 100%)` (white text on primary)
- **Primary Light**: `hsl(120 45% 45%)`
- **Primary Glow**: `hsl(120 55% 55%)`

### **Secondary Color Palette**

- **Secondary (Forest Green)**: `hsl(152 88% 15%)`
- **Secondary Foreground**: `hsl(0 0% 100%)`

### **Accent Colors**

- **Accent (Gold/Amber)**: `hsl(45 93% 58%)`
- **Accent Foreground**: `hsl(0 0% 12%)`
- **Accent Light**: `hsl(48 95% 68%)`

### **Brand Highlight Colors**

- **Emerald**: `hsl(103 89% 29%)`
- **Emerald Glow**: `hsl(120 55% 55%)`
- **Gold**: `hsl(45 93% 58%)`

### **Neutral Colors**

- **Background (Light)**: `hsl(48 38% 97%)`
- **Foreground (Text)**: `hsl(0 0% 12%)`
- **Muted**: `hsl(120 30% 92%)`
- **Muted Foreground**: `hsl(0 0% 45%)`
- **Border**: `hsl(120 15% 85%)`
- **Input**: `hsl(120 15% 90%)`

### **Semantic Colors**

- **Card**: `hsl(0 0% 100%)`
- **Card Foreground**: `hsl(0 0% 12%)`
- **Destructive**: `hsl(0 84% 60%)`

### **Dark Mode Variants**

All colors have dark mode equivalents defined with adjusted lightness values to ensure
proper contrast.

---

## **2\. Gradient System**

### **Primary Gradients**

- **gradient-primary**: `linear-gradient(135deg, hsl(103 89% 29%), hsl(120 55% 55%))`
- **gradient-emerald**: `linear-gradient(135deg, hsl(103 89% 29%), hsl(120 55% 55%))`
- **gradient-gold**: `linear-gradient(135deg, hsl(45 93% 58%), hsl(48 95% 68%))`

### **Background Gradients**

- **gradient-hero**: `linear-gradient(135deg, hsl(48 38% 97%), hsl(145 40% 88%))`
- **gradient-dark**: `linear-gradient(180deg, hsl(152 88% 15%), hsl(103 89% 29%))`
- **gradient-glow**:
  `radial-gradient(circle at 50% 50%, hsl(120 55% 55% / 0.3), transparent 70%)`

### **Gradient Application Methods**

1. **Background**: `.gradient-primary` class
2. **Text**:
   `bg-gradient-to-r from-emerald via-emerald-glow to-gold bg-clip-text text-transparent`
3. **Drop Shadow Enhancement**: `drop-shadow-[0_0_40px_hsl(120_55%_55%/0.3)]`

---

## **3\. Example Shadow System**

### **Shadow Variants**

- **shadow-soft**: `0 4px 20px hsl(103 89% 29% / 0.1)` \- Subtle elevation
- **shadow-float**: `0 8px 30px hsl(103 89% 29% / 0.15)` \- Medium elevation
- **shadow-glow**: `0 0 40px hsl(120 55% 55% / 0.3)` \- Glowing effect
- **shadow-emerald**: `0 10px 40px -10px hsl(103 89% 29% / 0.3)` \- Emerald glow
- **shadow-card**: `0 4px 24px -4px hsl(0 0% 12% / 0.1)` \- Card shadow

### **Usage Guidelines**

- Use `shadow-soft` for subtle UI elements (cards, buttons)
- Use `shadow-glow` for interactive hover states
- Use `shadow-emerald` for primary action buttons
- Layer shadows with background blur for depth

---

## **4\. Typography System**

### **Font Families**

- **Headings**: `'Poppins', system-ui, -apple-system, sans-serif`
- **Body**: `'Inter', system-ui, -apple-system, sans-serif`

### **Heading Hierarchy**

- **H1 (Hero)**: `text-5xl md:text-7xl lg:text-8xl font-black leading-tight`
- **H2 (Section)**: `text-4xl md:text-5xl lg:text-6xl font-black leading-tight`
- **H3 (Subsection)**: `text-3xl md:text-4xl font-bold`
- **H4**: `text-2xl font-bold`

### **Body Text Scales**

- **Large**: `text-xl md:text-2xl lg:text-3xl leading-relaxed`
- **Medium**: `text-lg leading-relaxed`
- **Base**: `text-base leading-relaxed`
- **Small**: `text-sm`

### **Font Weights**

- **Black**: `font-black` (900) \- Hero headlines only
- **Bold**: `font-bold` (700) \- Headings
- **Semibold**: `font-semibold` (600) \- Labels, emphasis
- **Normal**: `font-normal` (400) \- Body text

### **Text Colors & Semantic Usage**

- **Primary Text**: `text-foreground` (dark on light)
- **Secondary Text**: `text-muted-foreground`
- **Gradient Text**: `gradient-text` utility class
- **White Text**: `text-white` (on dark backgrounds only)

---

## **5\. Spacing System**

### **Container Patterns**

- **Max Width**: `max-w-5xl` (sections), `max-w-4xl` (transformation), `max-w-2xl`
  (forms)
- **Horizontal Padding**: `px-4` (mobile), `px-8 md:px-12` (forms)
- **Vertical Padding**: `py-24` (sections), `py-32` (hero sections)

### **Gap System**

- **Small**: `gap-2` (8px) \- Tight elements
- **Medium**: `gap-4` (16px), `gap-6` (24px) \- Standard spacing
- **Large**: `gap-8` (32px) \- Section spacing

### **Margin & Padding Scale**

- Follow Tailwind's default spacing scale (4px increments)
- Use responsive variants: `mb-4 md:mb-8`

---

## **6\. Border Radius System**

### **Radius Scale**

- **Small**: `rounded-md` or `calc(var(--radius) - 2px)`
- **Medium**: `rounded-lg` or `var(--radius)` (0.75rem)
- **Large**: `rounded-xl`, `rounded-2xl`
- **Circle/Pills**: `rounded-full`

### **Application**

- Cards: `rounded-lg`
- Buttons: `rounded-md` (default), `rounded-full` (CTA)
- Badges: `rounded-full`
- Images: `rounded-full` (profile), `rounded-xl` (featured)

---

## **7\. Animation System**

### **Keyframe Animations**

\- fade-in-up: translateY(30px) → translateY(0), opacity 0 → 1  
\- fade-in: opacity 0 → 1  
\- scale-in: scale(0.9) → scale(1), opacity 0 → 1  
\- glow-pulse: opacity oscillates 0.5 → 1 → 0.5  
\- float: translateY(0) → translateY(-20px) → translateY(0)  
\- accordion-down/up: height animations

### **Animation Classes**

- **animate-fade-in-up**: 0.6s ease-out
- **animate-fade-in**: 0.8s ease-out
- **animate-scale-in**: 0.5s ease-out
- **animate-glow-pulse**: 3s infinite ease-in-out
- **animate-float**: 6s infinite ease-in-out
- **animate-pulse-slow**: 4s infinite cubic-bezier
- **animate-bounce**: Default Tailwind bounce
- **animate-spin-slow**: Custom slow spin (8s-30s)

### **Animation Delays**

- Use inline styles: `style={{ animationDelay: "1s" }}`
- Stagger animations: `${index * 0.5}s`

### **Transition System**

- **Smooth**: `var(--transition-smooth)` \- `0.4s cubic-bezier(0.4, 0, 0.2, 1)`
- **Bounce**: `var(--transition-bounce)` \-
  `0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)`
- **Default**: `transition-all duration-300`
- **Transforms**: `transition-transform duration-200`

---

## **8\. Responsive Design Breakpoints**

### **Tailwind Breakpoints**

- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1400px (custom container)

### **Mobile-First Patterns**

1. Base styles for mobile
2. Add `md:` prefix for tablet+
3. Add `lg:` prefix for desktop+
4. Use responsive text: `text-5xl md:text-7xl lg:text-8xl`
5. Use responsive spacing: `py-8 md:py-12`
6. Use responsive grids: `grid md:grid-cols-2`

### **Critical Mobile Adjustments**

- Fixed heights → `min-h-[Xpx]` on mobile
- Text scale reductions for mobile
- Icon sizes: `h-3.5 w-3.5 md:h-5 md:w-5`
- Conditional rendering based on screen width (when necessary)

---

## **9\. Component Patterns**

### **Button Variants**

\- default: gradient-primary background  
\- outline: border with transparent bg  
\- secondary: secondary color background  
\- ghost: transparent with hover  
\- link: text-only with underline

### **Button Sizes**

- **sm**: `h-9 px-3`
- **default**: `h-10 px-4 py-2`
- **lg**: `h-11 px-8`, `h-14 px-8` (CTAs)

### **Button States**

- Hover: `hover:scale-105`, `hover:shadow-glow`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
- Disabled: `disabled:opacity-50 disabled:pointer-events-none`
- Loading: Custom text \+ `isLoading` state

### **Card Component**

- Base: `rounded-lg border bg-card text-card-foreground shadow-sm`
- Enhanced: `border-primary/20 shadow-emerald`
- With backdrop: `bg-card/80 backdrop-blur-sm`

### **Form Inputs**

- Height: `h-12` (large forms)
- Label: `text-base font-semibold`
- Placeholder: Descriptive
- Required fields: Use `required` attribute
- Validation: Real-time with error states

---

## **10\. Layout Patterns**

### **Section Structure**

    {/\* Content \*/}

### **Grid Layouts**

- Two-column: `grid md:grid-cols-2 gap-8`
- Auto-fit: Rarely used, prefer explicit columns
- Flexbox alternative: `flex flex-col md:flex-row`

### **Centering Patterns**

- Flex: `flex items-center justify-center`
- Absolute: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
- Text: `text-center`
- Container: `mx-auto`

---

## **11\. Visual Effects**

### **Background Effects**

1. **Ambient Glow Layers**: Multiple positioned blur circles with
   `bg-primary/20 blur-3xl`
2. **Gradient Overlays**: `absolute inset-0 gradient-glow opacity-50`
3. **Backdrop Blur**: `backdrop-blur-sm` on cards

### **Glow Effects**

- **Icon Glow**: Wrap in gradient container with `shadow-glow`
- **Text Glow**: `drop-shadow-[0_0_40px_hsl(...)]`
- **Button Glow**: `hover:shadow-glow transition-all`
- **Card Glow**: Absolute positioned blur layer behind card

### **Layering & Z-Index**

- Background effects: `z-0` or no z-index
- Content: `relative z-10`
- Floating elements: `z-20`
- Modals/Dialogs: Handled by Radix UI

---

## **12\. Icon System**

### **Icon Library**

- **Lucide React**: Primary icon library
- Import: `import { IconName } from "lucide-react"`

### **Icon Sizing**

- Small: `h-4 w-4`
- Medium: `h-5 w-5`, `h-6 w-6`
- Large: `h-14 w-14` (hero icons)
- Responsive: `h-3.5 w-3.5 md:h-5 md:w-5`

### **Icon Usage**

- Always with semantic meaning
- Consistent size within context
- Wrapped in gradient containers for emphasis
- Animated when appropriate: `animate-pulse`, `animate-bounce`

---

## **13\. Accessibility Guidelines**

### **Semantic HTML**

- Use proper heading hierarchy (h1 → h2 → h3)
- Use `,` , `,` tags
- Use \`\` with form inputs

### **ARIA & Attributes**

- `alt` text on all images (descriptive)
- `aria-label` on icon-only buttons
- `role="alert"` on toast notifications
- Required fields marked with `required` attribute

### **Focus States**

- Visible focus rings: `focus-visible:ring-2 focus-visible:ring-ring`
- Skip to content (if needed)
- Keyboard navigation support (native with Radix UI)

### **Color Contrast**

- All text meets WCAG AA standards
- Test foreground/background combinations
- Use `text-white` only on dark backgrounds
- Avoid low-contrast text-on-text

---

## **14\. Image Guidelines**

### **Image Optimization**

- Use appropriate formats (JPG for photos, PNG for graphics)
- Import images as ES6 modules from `src/assets/`
- Provide descriptive alt text

### **Image Display**

- Profile images: `rounded-full` with border
- Feature images: `rounded-xl` or `rounded-2xl`
- Aspect ratios: Use `aspect-square` or explicit dimensions
- Object fit: `object-cover` for contained images

---

## **15\. Non-Breaking Space Strategy**

### **Line Break Control**

- Use \`\` to keep critical word pairs together
- Example: `"Webinar in a Day"` keeps "a Day" together
- Prevents awkward single-word lines on mobile
- Apply to: CTAs, headlines, important phrases

---

## **16\. Form Design Patterns**

### **Form Structure**

- Card container with padding: `p-8 md:p-12`
- Form spacing: `space-y-6`
- Field spacing: `space-y-2`

### **Labels & Inputs**

- Label: `text-base font-semibold`
- Optional indicators: \`\`
- Input height: `h-12 text-base`
- Consistent placeholder text

### **Consent & Legal**

- Checkbox with descriptive label
- Small legal text: `text-sm leading-relaxed`
- Privacy notices below submit button

### **Submit Buttons**

- Full width: `w-full`
- Large size: `h-14 text-lg`
- Loading states: Change text dynamically
- Hover effects: `hover:scale-[1.02]`

---

## **17\. Interaction States**

### **Hover States**

- Scale: `hover:scale-105`, `hover:scale-110`
- Shadow: `hover:shadow-glow`
- Opacity: `hover:opacity-90`
- Border: `hover:border-primary/60`

### **Active States**

- Scale down: `active:scale-95`
- Brightness: `active:brightness-90`

### **Disabled States**

- Opacity: `disabled:opacity-50`
- Pointer events: `disabled:pointer-events-none`
- Cursor: `disabled:cursor-not-allowed`

---

## **18\. Data Visualization Patterns**

### **Orbital/Radial Layouts**

- Central element with surrounding items
- Calculate positions: `Math.cos/sin(angle * PI / 180) * radius`
- Responsive radius: `window.innerWidth < 768 ? 140 : 240`
- Connecting lines/beams with gradients

### **Floating Elements**

- Multiple rotating rings: Different durations, directions
- Staggered animations: `animationDelay`
- Ambient glow layers underneath

---

## **19\. Code Organization Principles**

### **Component Structure**

1. Imports
2. Props interface
3. State declarations
4. Event handlers
5. Derived/computed values
6. JSX return

### **Styling Approach**

- Utility-first with Tailwind
- Use design system tokens (NO hardcoded colors)
- Responsive modifiers inline
- Extract repeated patterns to utility classes
- Component-specific styles in `@layer utilities`

### **File Naming**

- PascalCase for components: `Hero.tsx`
- kebab-case for utilities: `use-toast.ts`
- camelCase for assets: `joeHeadshot.jpg`

---

## **20\. Performance Considerations**

### **Animation Performance**

- Use `transform` and `opacity` (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left`
- Use `will-change` sparingly: `will-change: transform`

### **Image Loading**

- Lazy load below-fold images
- Provide width/height to prevent layout shift
- Use appropriate image dimensions

### **Bundle Size**

- Tree-shakeable icon imports
- Import only needed UI components
- Avoid importing entire libraries

---

## **Key Design Principles Summary**

1. **Semantic Tokens**: Never use direct colors; always use CSS variables
2. **HSL Color Format**: All colors must be HSL for consistency
3. **Mobile-First**: Design for mobile, enhance for desktop
4. **Gradient Emphasis**: Use gradients to highlight key elements
5. **Smooth Animations**: Subtle, purposeful animations enhance UX
6. **Consistent Spacing**: Follow Tailwind's spacing scale
7. **Typography Hierarchy**: Clear visual hierarchy with Poppins \+ Inter
8. **Glow Effects**: Signature emerald/gold glow for brand identity
9. **Accessibility First**: Semantic HTML, ARIA labels, focus states
10. **Component Reusability**: DRY principle with Shadcn components
