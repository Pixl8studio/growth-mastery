# Growth Mastery - Product Boundaries

## What We Are NOT Building

Clear boundaries prevent scope creep and keep us focused on what we do best: AI-powered
webinar funnel creation.

---

## ❌ NOT a Full CRM System

**What We Won't Do**:

- Full contact lifecycle management
- Email marketing automation platform
- Deal pipeline and sales forecasting
- Team collaboration and assignment
- Custom fields and complex segmentation

**What We DO**:

- Contact creation from registration forms
- Basic engagement tracking (video watch %, page views)
- Event timeline for funnel activities
- Webhook delivery to THEIR CRM
- 5-segment behavioral ladder for follow-up

**Why This Boundary**:

- Users already have CRMs they love (HubSpot, ActiveCampaign, etc.)
- CRMs are complex, feature-heavy platforms
- Better to integrate deeply than compete poorly
- Webhooks let us be CRM-agnostic

**The Line**: We track what happens in our funnel, send it to their CRM, then step back.

---

## ❌ NOT a Video Hosting Platform

**What We Won't Do**:

- Unlimited video storage
- Advanced video editing tools
- Multiple bitrate encoding
- Global CDN optimization (beyond Cloudflare's default)
- Video analytics beyond basic engagement

**What We DO**:

- Cloudflare Stream integration for reliable hosting
- Basic upload interface
- Watch tracking (0-25-50-75-100% milestones)
- Responsive video player
- CTA overlays at strategic points

**Why This Boundary**:

- Wistia, Vimeo, Cloudflare already excel at this
- Video infrastructure is expensive and complex
- Not our core competency
- Cloudflare provides enterprise-grade delivery

**The Line**: We make it easy to upload and embed. Cloudflare handles the rest.

---

## ❌ NOT a General Purpose Page Builder

**What We Won't Do**:

- Drag-and-drop page builder
- Unlimited design flexibility
- Custom CSS/HTML editing
- Build any type of landing page
- Thousands of templates for every use case

**What We DO**:

- Three specific page types (registration, watch, enrollment)
- AI-generated content optimized for conversion
- Professional designs that work out of the box
- Light customization (colors, images, copy editing)
- Opinionated structure based on what converts

**Why This Boundary**:

- Unbounce, Instapage, ClickFunnels own this space
- Infinite flexibility = paralysis
- Webinar funnels have proven patterns
- Constraints enable AI generation

**The Line**: If it's not a webinar funnel, build it elsewhere.

---

## ❌ NOT a Payment Processor

**What We Won't Do**:

- Process payments directly
- Hold funds in escrow
- Handle chargebacks and disputes
- Manage merchant accounts
- Multi-currency conversion
- Payment method innovation

**What We DO**:

- Stripe Connect integration (creators bring their Stripe)
- 2.5% platform fee on transactions
- Payment link generation
- Transaction webhooks for tracking
- Simple enrollment tracking

**Why This Boundary**:

- Stripe is industry-standard, trusted, comprehensive
- Payment processing requires serious compliance (PCI-DSS)
- Not differentiating - everyone uses Stripe
- Platform fee model aligns our incentives with creator success

**The Line**: We facilitate. Stripe processes.

---

## ❌ NOT a Webinar Hosting Platform

**What We Won't Do**:

- Live webinar delivery
- Interactive chat and Q&A
- Screen sharing and presentations
- Multi-presenter support
- Live streaming infrastructure

**What We DO**:

- Evergreen (pre-recorded) webinar funnels
- Video delivery via Cloudflare
- Simulated "live" experience optional
- Focus on automated, scalable funnels

**Why This Boundary**:

- Zoom, WebinarJam, Demio own live webinars
- Live infrastructure is expensive and complex
- Our strength is AI-generated evergreen content
- Automated funnels scale, live doesn't

**The Line**: If you need live interaction, use Zoom. If you need evergreen automation,
use us.

---

## ❌ NOT an Email Marketing Platform

**What We Won't Do**:

- Full email marketing suite
- Advanced segmentation and tagging
- Email design builder
- A/B testing infrastructure
- Deliverability optimization tools
- List management and cleaning

**What We DO**:

- AI-generated follow-up sequences (5 messages over 3 days)
- Basic email/SMS delivery via integrations
- Behavioral triggering based on funnel activity
- Webhook to their email platform for advanced automation

**Why This Boundary**:

- ConvertKit, ActiveCampaign, Mailchimp are specialized here
- Email deliverability is an entire discipline
- Creators already have email platforms
- Better as add-on/integration than replacement

**The Line**: We generate the sequences and trigger them. Their platform delivers.

---

## ❌ NOT a Presentation Creation Tool

**What We Won't Do**:

- General purpose slide builder
- Compete with PowerPoint/Keynote
- Infinite design flexibility
- Non-webinar presentation types
- Advanced animations and transitions

**What We DO**:

- AI-generated 55-slide webinar decks
- Gamma integration for professional design
- 20 pre-selected themes optimized for webinars
- Proven structure (Magnetic Masterclass framework)
- Export to Gamma for advanced editing if needed

**Why This Boundary**:

- Gamma, Canva, PowerPoint excel at general presentations
- Webinar decks follow specific patterns
- AI generation requires constraints
- 55-slide structure is proven framework

**The Line**: If it's a webinar funnel, we generate it. If it's a pitch deck or
training, use Gamma/Canva directly.

---

## ❌ NOT White-Label (Yet)

**What We Won't Do** (Phase 1):

- Remove Growth Mastery branding
- Custom domains for entire platform
- Agency/reseller programs
- Multi-tenant architecture
- Client management features

**What We MIGHT Do** (Phase 2):

- White-label option for agencies at premium price
- Custom branding on public funnel pages
- Agency management console

**Why This Boundary Now**:

- Adds significant complexity
- Detracts from core product development
- Small market initially
- Can add later if demand validates

**The Line**: Phase 1 = Direct to creator. Phase 2 = Agency tier.

---

## ❌ NOT a Multi-Language Platform (Yet)

**What We Won't Do** (Phase 1):

- Support non-English content generation
- Internationalization (i18n) of UI
- Currency/payment localization beyond Stripe's default
- Regional compliance (GDPR, etc. - only US initially)

**What We MIGHT Do** (Phase 2-3):

- Spanish support (large market)
- European market expansion with GDPR compliance
- Multi-currency and regional Stripe accounts

**Why This Boundary Now**:

- AI prompts are English-optimized
- Adds translation complexity
- US/English market is sufficient for Phase 1
- Can expand once proven

**The Line**: English-speaking markets first. Validate. Then expand.

---

## ❌ NOT Enterprise/Team Features (Yet)

**What We Won't Do** (Phase 1):

- Team collaboration and roles
- Multi-user accounts
- Approval workflows
- Advanced permissions
- SSO/SAML authentication

**What We MIGHT Do** (Phase 2):

- Simple team sharing (view-only access)
- Agency features (manage multiple creator accounts)

**Why This Boundary Now**:

- Individual creators don't need this
- Significant complexity for small benefit
- Can add once we have agency customers

**The Line**: Solo creator in Phase 1. Teams in Phase 2 if validated.

---

## How to Use These Boundaries

### When Evaluating Feature Requests

Ask: **"Does this fit within our boundaries?"**

If NO → Either:

1. Redirect to integration partner ("Use Zapier for that")
2. Defer to Phase 2/3 ("Great idea for agency tier")
3. Decline politely ("That's outside our scope")

If YES → Ask: **"Does this help Sarah (primary persona) launch faster or convert
better?"**

### When Designing New Features

Check boundaries first. If it requires expanding boundaries:

1. Validate demand (not just one user request)
2. Assess complexity (is it core or peripheral?)
3. Evaluate alternatives (can they use integration instead?)
4. Get explicit approval (don't drift slowly)

### Saying No Gracefully

**Bad**: "We don't do that" **Good**: "We focus on webinar funnels specifically. For
[feature], I'd recommend [tool they already use]"

---

## Boundaries Can Change

These aren't forever. But they should only change with:

1. Strong market validation (pattern, not anecdote)
2. Strategic fit (helps us win our space)
3. Resource reality (can we do it well?)
4. Explicit decision (not feature creep)

**Review boundaries**: Quarterly

---

_Last Updated: 2025-12-03_ _Status: Phase 1 boundaries - Focused on webinar funnel
creation_ _Next Review: Q2 2025 (after 100 creators launched)_
