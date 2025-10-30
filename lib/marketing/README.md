# Marketing Content Engine - Service Layer

This directory contains the core services for the Marketing Content Engine. These
services handle AI-powered content generation, platform optimization, publishing, and
analytics.

## Services Overview

### Brand Voice Service (`brand-voice-service.ts`)

**Purpose**: Manages brand voice profiles and Echo Mode voice mirroring

**Key Functions**:

- `initializeProfile()` - Auto-populate from intake and offer data
- `generateEchoModeProfile()` - Analyze sample content for voice patterns
- `calibrateVoice()` - Update tone settings
- `getVoiceGuidelines()` - Format guidelines for AI prompts

**Used By**: Profile APIs, all content generation

---

### Platform Knowledge Service (`platform-knowledge-service.ts`)

**Purpose**: Platform-specific rules and content validation

**Key Functions**:

- `getPlatformSpec()` - Fetch specs for IG/FB/LI/X
- `validateContent()` - Check against platform rules
- `calculateReadabilityLevel()` - Flesch-Kincaid grade level
- `updatePlatformSpecs()` - Nightly PKG refresh

**Used By**: Content generation, preflight validation

---

### Story Weaver Service (`story-weaver-service.ts`)

**Purpose**: Generate story angles using narrative frameworks

**Key Functions**:

- `generateStoryAngles()` - Create 3 variants (Founder, Myth-Buster, POV)
- `expandStory()` - Full content generation from angle
- `generateFrameworkStory()` - Framework-specific generation
- `adaptToFramework()` - Convert between frameworks

**Frameworks**:

- Founder Saga, Myth-Buster, Philosophy POV, Current Event, How-To

**Used By**: Content generation API

---

### Content Architect Service (`content-architect-service.ts`)

**Purpose**: Platform-specific content optimization

**Key Functions**:

- `generatePlatformVariants()` - Create variants for each platform
- `atomizeBrief()` - Break brief into platform plans
- `optimizeForPlatform()` - Platform-specific refinement
- `generateHashtags()` - Relevant hashtag generation

**Platform Adaptations**:

- Instagram: Visual-first, emojis, bio link
- Facebook: Conversational, community-driven
- LinkedIn: Professional, thought leadership
- Twitter: Ultra-brief, punchy

**Used By**: Content generation API

---

### CTA Strategist Service (`cta-strategist-service.ts`)

**Purpose**: Generate conversion-optimized calls-to-action

**Key Functions**:

- `generateCTA()` - Platform-appropriate CTAs
- `generateLinkStrategy()` - UTM parameters
- `generateCTAVariants()` - A/B test variants
- `analyzeCTAEffectiveness()` - Score effectiveness

**CTA Types**:

- Bio Link, DM Keyword, Comment Trigger, Direct Link

**Used By**: Content generation, variant editing

---

### Preflight Validation Service (`preflight-service.ts`)

**Purpose**: Pre-publish validation and compliance

**Key Functions**:

- `runPreflightValidation()` - Complete 4-stage validation
- `validateCompliance()` - Legal/safety checks
- `checkAccessibility()` - Alt text, reading level
- `verifyBrandVoice()` - Echo Mode drift detection

**Validation Stages**:

1. Compliance (disclaimers, claims)
2. Accessibility (alt text, Grade 8)
3. Brand Voice (70+ alignment)
4. Character Limits (platform-specific)

**Used By**: Content generation, variant editing, publishing

---

### Trend Scanner Service (`trend-scanner-service.ts`)

**Purpose**: Identify trending topics and opportunities

**Key Functions**:

- `scanTrends()` - Daily trend discovery
- `suggestTopicsFromTrend()` - Generate content angles
- `rankTrendRelevance()` - Score 0-100 relevance
- `getActiveTrends()` - Fetch current opportunities

**Used By**: Trends API, daily jobs

---

### Niche Model Service (`niche-model-service.ts`)

**Purpose**: ML-based prediction and learning

**Key Functions**:

- `predictBestFormat()` - Format recommendation
- `learnFromPerformance()` - Update from analytics
- `getBanditAllocation()` - 70/30 split
- `getNextContentRecommendation()` - What to create next

**Learning Loop**: Post → Analytics → Learn → Update Model → Better Predictions

**Used By**: Content recommendations, analytics updates

---

### Publisher Service (`publisher-service.ts`)

**Purpose**: Multi-platform publishing and scheduling

**Key Functions**:

- `publishNow()` - Immediate publishing
- `schedulePost()` - Add to calendar
- `retryFailedPost()` - Auto-retry logic
- `getPublishingQueue()` - For worker processing

**Platforms**: Instagram, Facebook, LinkedIn, Twitter

**Used By**: Publishing API, background worker

---

### Analytics Collector Service (`analytics-collector-service.ts`)

**Purpose**: Collect and aggregate performance metrics

**Key Functions**:

- `recordOptIn()` - Track conversions
- `calculateOI1000()` - North-star metric
- `getDashboardAnalytics()` - Aggregate view
- `collectDailyAnalytics()` - Daily job

**North-Star**: O/I-1000 (Opt-ins per 1,000 impressions)

**Used By**: Analytics API, daily jobs, niche model

---

## Service Dependencies

```
brand-voice-service (foundational)
    ↓
story-weaver-service → uses voice guidelines
    ↓
content-architect-service → uses stories + platform knowledge
    ↓
cta-strategist-service → uses generated content
    ↓
preflight-service → validates everything
    ↓
publisher-service → publishes validated content
    ↓
analytics-collector-service → tracks performance
    ↓
niche-model-service → learns and improves

trend-scanner-service (parallel)
    ↓
Feeds into content-architect-service
```

## Usage Examples

### Initialize Profile

```typescript
import { initializeProfile } from "@/lib/marketing/brand-voice-service";

const result = await initializeProfile(userId, funnelProjectId, "Main Profile");

if (result.success) {
  console.log("Profile created:", result.profile);
}
```

### Generate Content

```typescript
import { generateStoryAngles } from "@/lib/marketing/story-weaver-service";
import { generatePlatformVariants } from "@/lib/marketing/content-architect-service";

// 1. Generate angles
const anglesResult = await generateStoryAngles(brief, profileId);

// 2. Generate platform variants
const variantsResult = await generatePlatformVariants({
  baseContent: anglesResult.angles[0].story_outline,
  platforms: ["instagram", "linkedin"],
  brief,
  profileId,
  storyAngle: anglesResult.angles[0],
});
```

### Validate and Publish

```typescript
import { runPreflightValidation } from "@/lib/marketing/preflight-service";
import { publishNow } from "@/lib/marketing/publisher-service";

// 1. Validate
const validation = await runPreflightValidation(variant, platform, profileId);

if (validation.result?.passed) {
  // 2. Publish
  const result = await publishNow(variantId, platform, userId);
  console.log("Published:", result.providerPostId);
}
```

---

## Error Handling

All services follow consistent error handling:

```typescript
type ServiceResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

Always check `success` before accessing `data`:

```typescript
const result = await someService();

if (result.success) {
  // Safe to use result.data
  console.log(result.data);
} else {
  // Handle error
  console.error(result.error);
}
```

---

## Logging

All services use structured logging:

```typescript
import { logger } from "@/lib/logger";

logger.info({ userId, briefId }, "Content generated");
logger.error({ error, platform }, "Publishing failed");
```

---

## Testing

Run service tests:

```bash
pnpm test lib/marketing
```

Individual service tests:

```bash
pnpm test brand-voice-service
pnpm test platform-knowledge-service
```

---

## Performance Considerations

### Parallel Processing

Services that can run in parallel (use `Promise.all`):

- Platform variant generation (one per platform)
- Preflight checks (4 stages)
- Analytics collection (multiple posts)

### Caching

Recommended caching:

- Platform specs: 24 hour TTL
- Voice guidelines: 1 hour TTL per profile
- Niche models: 1 hour TTL

### Rate Limiting

- OpenAI: Implement exponential backoff
- Platform APIs: Respect rate limits
- Database: Use connection pooling

---

For detailed information, see:

- API Documentation: `docs/api/MARKETING_API.md`
- Architecture Guide: `docs/dev/MARKETING_ARCHITECTURE.md`
- User Guide: `docs/MARKETING_CONTENT_ENGINE.md`
