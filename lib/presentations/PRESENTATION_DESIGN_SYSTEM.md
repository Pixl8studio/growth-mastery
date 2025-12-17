# AI Presentation Design System

## Comprehensive Guide for Premium PowerPoint Generation

This document defines the design standards for AI-generated presentations in Genie v3.

---

## 1. Model Recommendations

**Recommended Models (in order of preference):**

| Model           | Quality   | Code Accuracy | Creative Risk-Taking |
| --------------- | --------- | ------------- | -------------------- |
| Claude Opus 4   | Excellent | Excellent     | Very High            |
| Claude Sonnet 4 | Excellent | Excellent     | High                 |
| GPT-4o          | Decent    | Good          | Low                  |

**Current Implementation:** Claude Sonnet 4 via Anthropic API

---

## 2. Design Philosophy

### Core Principles

1. **Commit to a Bold Aesthetic Direction**
   - Every presentation needs a DISTINCTIVE visual identity
   - One dominant color owns 60-70% of visual weight
   - One "signature move" - a recurring visual element

2. **Design for Moments, Not Pages**
   - Each slide communicates ONE idea clearly
   - Readable in 3 seconds
   - Clear focal point
   - Create emotional impact

3. **Restraint Creates Impact**
   - Maximum 3 font sizes per slide
   - Maximum 3 colors per slide
   - Maximum 5 bullet points per list
   - Maximum 2 sentences per paragraph

4. **Visual Hierarchy is Non-Negotiable**
   - PRIMARY: What the eye sees first (large, bold, contrasting)
   - SECONDARY: Supporting information (medium, readable)
   - TERTIARY: Details, sources (small, muted)

5. **Consistency Builds Trust**
   - Same spacing values (4px/8px/12px/16px/20px scale)
   - Same corner radius on rounded elements
   - Same shadow values on elevated elements

---

## 3. Color System

### Palette Generation from Brand Colors

From a primary color, generate:

- **Primary**: User-provided brand color
- **Primary Light**: Primary + 20% white
- **Primary Dark**: Primary + 20% black
- **Surface**: Background color (light: #F8F9FA, dark: #0A0E17)
- **Surface Foreground**: Primary text color
- **Muted**: Secondary backgrounds
- **Muted Foreground**: Secondary text
- **Border**: Lines and dividers
- **Accent/CTA**: Complementary or triadic color

### 60-30-10 Rule

- 60% dominant color (usually background/surface)
- 30% secondary (cards, sections)
- 10% accent (CTAs, highlights)

### Theme Selection

**Dark Theme for:**

- Tech, SaaS, Gaming, Finance, Crypto, AI
- Brand personality: innovative, bold, technical, sophisticated
- Pitch decks, keynotes, product launches

**Light Theme for:**

- Healthcare, Education, Non-profit, Consumer
- Brand personality: trustworthy, warm, approachable
- Training, reports, educational content

---

## 4. Typography System

### Web-Safe Fonts Only

**Sans-Serif (Modern, Clean):**

- Arial (default safe choice)
- Helvetica
- Verdana (excellent readability)
- Tahoma (compact, professional)
- Trebuchet MS (slightly friendly)

**Serif (Traditional, Sophisticated):**

- Georgia (elegant, readable)
- Times New Roman (formal)

**Monospace (Technical):**

- Courier New

### Typography Scale (960x540px slides)

| Element          | Size    | Weight    |
| ---------------- | ------- | --------- |
| Slide Title (H1) | 36-44px | Bold      |
| Section Header   | 24-28px | Bold      |
| Card Title       | 18-20px | Semi-bold |
| Body Text        | 14-16px | Regular   |
| Supporting Text  | 12-13px | Regular   |
| Fine Print       | 10-11px | Muted     |

### Line Height

- Headlines: 1.1-1.2
- Body text: 1.4-1.5
- Dense content: 1.3

---

## 5. Layout Architecture

### Slide Zones (960x540px canvas)

```
┌─────────────────────────────────────────────────────────────┐
│ TOP PADDING: 20-36px                                         │
├─────────────────────────────────────────────────────────────┤
│ TITLE ZONE (height: ~80-100px)                              │
│ - Full width, 40px left/right padding                       │
├─────────────────────────────────────────────────────────────┤
│ CONTENT ZONE (height: ~340-380px)                           │
│ - 40-60px left/right padding                                │
│ - Main slide content                                        │
├─────────────────────────────────────────────────────────────┤
│ FOOTNOTE ZONE (height: ~30-40px)                            │
│ - Sources, page numbers                                     │
├─────────────────────────────────────────────────────────────┤
│ BOTTOM PADDING: 24-40px (CRITICAL - content must not touch) │
└─────────────────────────────────────────────────────────────┘
```

### Layout Patterns

1. **Full-Width Statement** - Opening slides, key messages
2. **Two-Column (40/60 or 50/50)** - Comparisons, text + visual
3. **Three-Column Cards** - Features, benefits, team
4. **Stacked List** - Process steps, feature lists
5. **Big Number/Statistic** - Metrics, impact
6. **Grid (2x2 or 2x3)** - Multiple features, portfolio

---

## 6. Slide Type Patterns

### 10 Layout Types

1. **title** - First slide, large centered text
2. **section** - Section headers, colored background
3. **bullets** - Default content, text-focused
4. **quote** - Testimonials, large punctuation
5. **statistics** - Data slides, 3-column grid
6. **comparison** - Before/after, 2-column
7. **process** - Step-by-step, sequential
8. **content_left** - Text left, image right
9. **content_right** - Image left, text right
10. **cta** - Call-to-action, solid color background

---

## 7. Anti-Patterns (Never Do These)

### Forbidden Color Choices

- Generic blue gradients
- Purple-to-pink gradients (overused)
- Rainbow gradients
- Low-contrast text
- Neon colors on white

### Forbidden Layout Patterns

- Centering ALL elements on every slide
- Same layout for 2+ consecutive slides
- Walls of bullet points (>5 items)
- Paragraphs longer than 2 sentences
- Content touching slide edges

### Forbidden Typography

- More than 3 font sizes on one slide
- All caps for body text
- Centered body paragraphs
- Decorative fonts for body
- Font sizes below 10pt

---

## 8. Signature Moves

Every presentation should have ONE recurring visual element:

1. Gradient accent bar at top/bottom
2. Colored left border on cards
3. Circular elements or rounded corners
4. Diagonal cuts or angled sections
5. Corner accents
6. Large stylized numbers for sequences
7. Consistent icon treatment
8. Color blocking
9. Serif + Sans-serif pairing
10. Consistent, dramatic shadows

---

## 9. Image Guidelines

### AI Image Generation Prompts

When generating image prompts:

- Be specific about style (photography, illustration, abstract)
- Include mood/tone descriptors
- Specify color palette alignment with brand
- Avoid cliches (handshakes, people pointing at screens)
- Focus on conceptual/metaphorical imagery

### Image Placement

- content_left: Image on right (40% width)
- content_right: Image on left (40% width)
- title/section: Full-bleed or decorative
- Other layouts: Supporting or optional

---

## 10. Quality Checklist

### Per-Slide

- [ ] One main idea
- [ ] Text within limits (bullets ≤5, sentences ≤2)
- [ ] Clear visual hierarchy
- [ ] Adequate padding (40px+ sides, 24px+ bottom)
- [ ] Text contrast meets 4.5:1 minimum
- [ ] Colors from defined palette only

### Deck-Wide

- [ ] Same spacing throughout
- [ ] Consistent color palette
- [ ] Signature element on most slides
- [ ] No 2+ consecutive identical layouts
- [ ] Strong opening slide
- [ ] Clear CTA on closing
