# Competitive Analysis Command

You are conducting a comprehensive competitive analysis of a competitor website.

## Arguments

- **$1**: Competitor URL (e.g., stormmcp.ai)
- **$2** (optional): Our product URL (defaults to mcphubby.ai)
- **$3** (optional): Output folder name (defaults to competitor domain name)

## Process

### 1. Setup & Planning

- Create output folder: `docs/{competitor-name}/`
- Create screenshots subfolder: `docs/{competitor-name}/screenshots/`
- Initialize comprehensive todo list with all analysis tasks

### 2. Review Our Positioning

- Navigate to our product URL ($2 or mcphubby.ai)
- Take full-page screenshot: `{competitor-name}/screenshots/our-homepage.png`
- Document our current:
  - Main value proposition and messaging
  - Key features
  - Pricing (if visible)
  - Target audience positioning

### 3. Navigate to Competitor Site

- Navigate to competitor URL ($1)
- Open in browser (using Playwright if available)
- If login is required, pause and let user log in
- Wait for user confirmation before proceeding

### 4. Systematic Feature Exploration

**Public/Marketing Pages:**

- Homepage (full-page screenshot: `marketing-homepage.png`)
- Features/Product pages
- Pricing page
- Documentation/Guides
- Blog/Resources
- About/Team pages

**Logged-In Dashboard (if applicable):**

- Main dashboard
- All navigation sections
- Settings/configuration
- Admin/management features
- Analytics/reporting features

**For Each Section:**

- Take viewport screenshot: `{section-name}-page.png`
- Take full-page screenshot if content is long
- Document features, UI patterns, and capabilities

### 5. Data Collection

**Integration/Features Inventory:**

- Count total integrations/features
- Categorize by type
- Document unique features
- Note any innovative approaches

**Pricing Analysis:**

- Document all tiers
- Compare features per tier
- Note any hidden costs or limitations
- Compare to our pricing

**Marketing Copy Analysis:**

- Headline and subheadlines
- Value propositions
- Pain points addressed
- Social proof elements (metrics, testimonials, logos)
- Call-to-action patterns

**Technical Features:**

- Authentication methods
- Setup process complexity
- Documentation quality
- Community presence

### 6. Document Creation

Create 4 comprehensive documents in `docs/{competitor-name}/`:

#### 6.1 `executive-summary.md`

- TL;DR findings
- What they do well vs what we do better
- Critical gaps to close
- Pricing comparison
- Immediate action items (Week 1-2)
- 90-day roadmap
- 12-month vision
- Success metrics
- Key decisions needed

#### 6.2 `competitive-analysis.md`

- Product feature comparison (detailed)
- Integration/feature library analysis
- Unique features breakdown
- Marketing & positioning analysis
- Pricing comparison
- Documentation & developer experience
- User experience analysis
- Feature gap analysis (critical, important, nice-to-have)
- Competitive advantages (theirs and ours)
- Strategic recommendations
- Copy & messaging we can borrow
- Competitive positioning matrix
- Risk analysis
- Conclusion

#### 6.3 `feature-gap-prioritization.md`

- Priority framework (P0 MUST-HAVE, P1 SHOULD-HAVE, P2 NICE-TO-HAVE, SKIP)
- Must-have features with timelines and effort estimates
- Should-have features
- Nice-to-have features
- Features to intentionally skip (with reasoning)
- Quick wins (high impact, low effort)
- Recommended roadmap (Phases 1-3: Foundation, Differentiation, Scale)
- Resource allocation recommendations
- Success metrics per phase

#### 6.4 `copy-messaging-suggestions.md`

- Core messaging strategy
- Homepage hero improvements
- Value propositions we can adapt
- Pain points section enhancements
- Feature messaging templates
- Before/after comparisons
- Trust & credibility messaging
- CTA copy suggestions
- Email marketing templates
- FAQ copy
- Documentation copy improvements
- Blog post ideas
- Launch announcement templates
- A/B test ideas
- Key messaging principles

#### 6.5 `README.md`

- Navigation guide for all documents
- Quick start section
- Document overview with reading times
- Screenshots reference
- Key findings at a glance
- Recommended action plan
- Integration categories (if applicable)
- Pricing strategy summary
- Top messaging themes
- Next steps

### 7. Analysis & Recommendations

**Competitive Advantages:**

- What they do better than us
- What we do better than them
- Unique differentiators

**Strategic Positioning:**

- Target customer profile comparison
- Competitive differentiation strategy
- Our recommended positioning

**Feature Gaps:**

- Critical gaps (must fix immediately)
- Important gaps (should fix soon)
- Nice-to-have gaps (can defer)

**Actionable Roadmap:**

- Week 1-2: Quick wins
- Month 1-3: Foundation building
- Month 4-6: Differentiation
- Month 7-12: Scale and optimization

### 8. Output & Summary

**Create comprehensive summary including:**

- Total number of screenshots captured
- Number of features/integrations documented
- Key competitive insights
- Prioritized action items
- Recommended next steps

**Update todo list** to mark all tasks as completed.

**Provide user with:**

- Clear summary of findings
- Links to all created documents
- Top 3-5 immediate action items
- Recommended reading order

## Important Guidelines

### Research Approach

- Be thorough but efficient - prioritize breadth over depth initially
- Document everything you observe
- Take screenshots liberally - they're valuable reference material
- Look for both obvious and subtle differentiators

### Analysis Quality

- Be objective - acknowledge both their strengths and weaknesses
- Provide specific, actionable recommendations
- Quantify where possible (timelines, effort, impact)
- Consider our specific context and constraints

### Documentation Standards

- Use clear, scannable formatting (headers, lists, tables)
- Include concrete examples and specifics
- Provide context for recommendations
- Link between related sections

### Competitive Positioning

- Don't try to copy everything - identify our unique strengths
- Recommend differentiation, not just feature parity
- Consider resource constraints and prioritize ruthlessly
- Balance short-term gaps with long-term strategy

### Tone

- Professional but conversational
- Honest about both opportunities and challenges
- Action-oriented and practical
- Optimistic but realistic

## Success Criteria

A successful competitive analysis should provide:

1. **Complete picture** of competitor's offering
2. **Clear gaps** between their product and ours
3. **Prioritized roadmap** for closing critical gaps
4. **Differentiation strategy** that plays to our strengths
5. **Actionable next steps** with clear timelines
6. **Copy/messaging inspiration** we can adapt

## Notes

- If the competitor site requires login, pause and wait for user to authenticate
- If you encounter rate limiting or access issues, document what you were able to review
- If the competitor has many features, categorize and sample rather than documenting
  everything
- Focus on features and positioning relevant to our product
- Update user periodically on progress through the todo list

## Example Usage

```
/competitor-analysis stormmcp.ai
/competitor-analysis competitorsite.com myproduct.com
/competitor-analysis example.com myproduct.com custom-folder-name
```

Begin by confirming the competitor URL and asking if you need to wait for login access.
