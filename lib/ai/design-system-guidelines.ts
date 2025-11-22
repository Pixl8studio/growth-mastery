/**
 * Design System Guidelines for AI Content Generation
 * These rules ensure AI-generated HTML follows our design system
 */

export const DESIGN_SYSTEM_GUIDELINES = `
## Design System Guidelines

### Spacing
- Use py-24 for main section vertical padding
- Use px-8 md:px-12 for horizontal container padding
- Use gap-8 for grid spacing
- Use mb-6 for heading margins
- Use mb-4 for subheading margins
- Use mb-3 for small spacing between elements

### Typography
- H1 (Hero): text-5xl md:text-7xl, font-black, leading-[1.2]
- H2 (Section): text-3xl md:text-5xl, font-bold, leading-tight
- H3 (Card/Feature): text-xl md:text-2xl, font-semibold
- Body: text-base md:text-lg, leading-relaxed
- Small text: text-sm, text-muted-foreground
- Use Poppins for headings (via font-heading class)
- Use Inter for body text (default)

### Colors (HSL Format)
- Primary (Emerald): hsl(103 89% 29%)
- Accent (Gold): hsl(45 93% 58%)
- Background (Light): hsl(48 38% 97%)
- Text (Dark): hsl(0 0% 12%)
- Text (Muted): hsl(0 0% 45%)
- Soft Background: hsl(120 30% 92%)

### Border Radius
- Cards: rounded-lg (0.5rem)
- Buttons: rounded-md (0.375rem)
- Images: rounded-xl (0.75rem)
- Small elements: rounded (0.25rem)

### Shadows
- Cards: shadow-md (0 4px 6px rgba(0,0,0,0.1))
- Hover states: shadow-lg (0 10px 15px rgba(0,0,0,0.1))
- Buttons: shadow-sm (0 1px 2px rgba(0,0,0,0.05))

### Icons
- ALWAYS use Lucide icon names, NEVER emojis
- Icon examples: target, zap, rocket, lightbulb, graduation-cap, dollar-sign, bar-chart-3, user, message-square, star
- Icons should be embedded as data attributes or icon names, not emoji characters

### Grid Layouts
- Features grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
- Two-column: grid-cols-1 md:grid-cols-2 gap-8
- Cards: min-w-[300px] for responsive cards

### Responsive Design
- Mobile-first approach
- Breakpoints: md:768px, lg:1024px, xl:1280px
- Always include mobile base styles first, then md: and lg: variants
- Stack vertically on mobile, horizontal on desktop

### Buttons
- Primary: bg-[hsl(103 89% 29%)] hover:bg-[hsl(103 89% 24%)] text-white
- Use py-3 px-6 for button padding
- Font: font-semibold text-base
- Include hover: states for interactivity

### Gradients
- Hero backgrounds: linear-gradient(135deg, hsl(48 38% 97%), hsl(145 40% 88%))
- Soft sections: linear-gradient(135deg, hsl(120 30% 96%), hsl(48 38% 98%))
- CTA sections: linear-gradient(135deg, hsl(103 89% 29%), hsl(103 89% 35%))

### Content Guidelines
- Keep headings concise (10-15 words for H1, 15-25 for H2)
- Use active voice
- Focus on benefits over features
- Include clear calls-to-action
- Use whitespace generously
- Avoid ALL CAPS except for small CTA buttons
`;

export const ICON_USAGE_GUIDELINES = `
## Icon Usage Guidelines

CRITICAL: Never use emoji icons (🎯, ⚡, 🚀, etc.) in generated HTML.

Instead, use icon name references:
- "target" instead of 🎯
- "zap" instead of ⚡
- "rocket" instead of 🚀
- "lightbulb" instead of 💡
- "graduation-cap" instead of 🎓
- "dollar-sign" instead of 💰
- "bar-chart-3" instead of 📊
- "user" instead of 👤
- "message-square" instead of 💬
- "star" instead of ⭐

Icon names will be converted to SVG icons automatically by the rendering system.
`;
