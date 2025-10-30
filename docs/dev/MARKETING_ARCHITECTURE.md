# Marketing Content Engine - Architecture Documentation

## System Overview

The Marketing Content Engine is a sophisticated multi-layer system that generates,
validates, and publishes organic social media content optimized for lead generation.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React)                    │
│  Step 12 UI • Profile • Generator • Calendar • Analytics    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  22 RESTful endpoints • Authentication • Validation          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Service Layer (TypeScript)                │
│  8 Core Services • AI Integration • Platform APIs            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Data Layer (PostgreSQL)                    │
│  9 Tables • RLS Policies • Indexes • Triggers                │
└─────────────────────────────────────────────────────────────┘
```

## Core Services

### 1. Brand Voice Service

**Purpose**: Manages brand voice profiles and Echo Mode

**Key Functions:**

- `initializeProfile()` - Auto-populate from intake/offer data
- `generateEchoModeProfile()` - Analyze sample content for voice patterns
- `calibrateVoice()` - Update tone settings
- `getVoiceGuidelines()` - Format guidelines for AI prompts

**Dependencies:**

- OpenAI API for voice analysis
- Supabase for profile storage

### 2. Platform Knowledge Service

**Purpose**: Platform-specific rules and validation

**Key Functions:**

- `getPlatformSpec()` - Fetch platform specifications
- `validateContent()` - Check against platform rules
- `updatePlatformSpecs()` - Nightly PKG refresh
- `calculateReadabilityLevel()` - Flesch-Kincaid grade level

**Platform Specs:**

- Instagram: 2,200 chars, 30 hashtags, alt text required
- Facebook: 63,206 chars, 30 hashtags
- LinkedIn: 3,000 chars, 3-5 hashtags optimal
- Twitter: 280 chars, 1-2 hashtags optimal

### 3. Story Weaver Service

**Purpose**: Generate story angles using narrative frameworks

**Key Functions:**

- `generateStoryAngles()` - Create 3 variants (Founder, Myth-Buster, POV)
- `expandStory()` - Full content generation
- `generateFrameworkStory()` - Framework-specific generation
- `adaptToFramework()` - Convert between frameworks

**Frameworks:**

1. **Founder Saga**: Personal journey, vulnerability, transformation
2. **Myth-Buster**: Challenge beliefs, reveal truth
3. **Philosophy POV**: Thought leadership, expert insight
4. **Current Event**: Timely relevance, trend connection
5. **How-To**: Actionable education, step-by-step

### 4. Content Architect Service

**Purpose**: Platform-specific content optimization

**Key Functions:**

- `generatePlatformVariants()` - Adapt content per platform
- `atomizeBrief()` - Break brief into platform plans
- `optimizeForPlatform()` - Platform-specific refinement
- `generateHashtags()` - Relevant hashtag generation

**Platform Adaptations:**

- **Instagram**: Visual-first, line breaks, emojis, bio link CTA
- **Facebook**: Concise, conversation-driven, community focus
- **LinkedIn**: Professional, white space, thought leadership
- **Twitter**: Ultra-brief, thread-aware, punchy hooks

### 5. CTA Strategist Service

**Purpose**: Generate conversion-optimized calls-to-action

**Key Functions:**

- `generateCTA()` - Platform-appropriate CTAs
- `generateLinkStrategy()` - UTM parameters and tracking
- `generateCTAVariants()` - A/B test variants
- `optimizeCTA()` - Improve existing CTAs

**CTA Types:**

- Bio Link (Instagram, Twitter)
- DM Keyword (Instagram, Facebook)
- Comment Trigger (All platforms)
- Direct Link (LinkedIn, Facebook)

### 6. Preflight Validation Service

**Purpose**: Pre-publish validation and compliance

**Key Functions:**

- `runPreflightValidation()` - Complete validation suite
- `validateCompliance()` - Legal/safety checks
- `checkAccessibility()` - Alt text, reading level
- `verifyBrandVoice()` - Echo Mode drift detection

**Validation Checks:**

- Compliance: Disclaimers, claims, testimonials
- Accessibility: Alt text, Grade 8 reading level
- Brand Voice: 70+ alignment score required
- Character Limits: Platform-specific validation

### 7. Trend Scanner Service

**Purpose**: Identify trending topics and opportunities

**Key Functions:**

- `scanTrends()` - Daily trend discovery
- `suggestTopicsFromTrend()` - Generate content angles
- `rankTrendRelevance()` - Score 0-100 relevance
- `getActiveTrends()` - Fetch current opportunities

**Relevance Scoring:**

- 86-100: Highly relevant, urgent opportunity
- 61-85: Relevant, good content opportunity
- 31-60: Somewhat relevant, creative angle needed
- 0-30: Not relevant, don't suggest

### 8. Niche Conversion Model Service

**Purpose**: Learn from performance and predict best content

**Key Functions:**

- `predictBestFormat()` - ML-based format selection
- `learnFromPerformance()` - Update model from analytics
- `getBanditAllocation()` - 70/30 split allocation
- `getNextContentRecommendation()` - Suggest what to create

**Bandit Allocation:**

- 70% → Top performing formats and frameworks
- 30% → Experimental/underexplored options
- Auto-scales winners, pauses losers
- Minimum 10 samples before high confidence

## Data Model

### Core Relationships

```
user_profiles
    └── marketing_profiles (1:many)
            ├── marketing_content_briefs (1:many)
            │       └── marketing_post_variants (1:many)
            │               ├── marketing_content_calendar (1:1)
            │               └── marketing_analytics (1:1)
            └── marketing_niche_models (1:many)

marketing_platform_specs (singleton per platform)
marketing_trend_signals (global or user-specific)
marketing_experiments (tracks A/B tests)
```

### Key Tables

**marketing_profiles**: Brand voice, Echo Mode config, tone settings
**marketing_platform_specs**: PKG - platform rules and specifications
**marketing_content_briefs**: Content generation requests **marketing_post_variants**:
Platform-specific generated content **marketing_content_calendar**: Scheduling and
publishing **marketing_trend_signals**: Trending topics and suggestions
**marketing_niche_models**: NCM - learned performance patterns **marketing_analytics**:
Performance tracking (O/I-1000) **marketing_experiments**: A/B testing and optimization

## AI Integration

### OpenAI Usage

**Models:**

- Primary: `gpt-4o` (content generation)
- Fallback: `gpt-4-turbo-preview`

**Key Prompts:**

1. **Brand Voice Analysis** - Analyzes sample content for Echo Mode
2. **Story Angle Generation** - Creates 3 framework variants
3. **Platform Optimization** - Adapts content per platform
4. **CTA Generation** - Creates conversion-focused CTAs
5. **Voice Alignment Check** - Verifies brand voice consistency

**Token Management:**

- Average brief generation: ~2,000 tokens
- Platform variants: ~1,500 tokens each
- Voice calibration: ~1,000 tokens
- Monthly estimate: 50,000-100,000 tokens per active user

### Future: Provider Agnostic

Architecture supports adding:

- Anthropic Claude
- Google Gemini
- Custom fine-tuned models

Add provider adapter in `lib/ai/providers/`

## Publishing Flow

### Content Generation Flow

```
1. User creates brief → marketing_content_briefs
2. AI generates 3 story angles → StoryWeaver
3. User selects angle
4. AI generates platform variants → ContentArchitect
5. CTAs added → CTAStrategist
6. Preflight validation → PreflightService
7. Variants saved → marketing_post_variants
```

### Publishing Flow

```
1. User schedules or publishes now
2. Entry created → marketing_content_calendar
3. Publishing worker picks up (if scheduled)
4. Platform API call → PublisherService
5. Status updated → publish_status
6. Analytics initialized → marketing_analytics
```

### Analytics Flow

```
1. Daily cron runs → collectDailyAnalytics()
2. Platform APIs queried for metrics
3. Analytics updated → marketing_analytics
4. O/I-1000 calculated
5. Niche model updated → learnFromPerformance()
6. Bandit allocation adjusted
```

## Background Jobs

### Daily Jobs (2am-4am UTC)

**2am: Platform Spec Updates**

- Fetches latest platform rules
- Updates `marketing_platform_specs`
- Versions maintained for auditing

**3am: Trend Scanning**

- Queries trend sources
- Scores relevance per user niche
- Stores in `marketing_trend_signals`
- Expires after 7 days

**4am: Analytics Collection**

- Pulls metrics from platform APIs
- Updates `marketing_analytics`
- Calculates O/I-1000
- Updates niche models

### Publishing Worker (Every 5 minutes)

**Queue Processing:**

1. Query `marketing_content_calendar` for due posts
2. Filter by `space=production` and `status=scheduled`
3. Publish via platform APIs
4. Update status and metrics
5. Handle retries (max 3 attempts)

**Retry Logic:**

- Exponential backoff: 5min, 15min, 45min
- Max 3 attempts per post
- 99.5%+ success rate target

## Security

### Authentication

- Supabase Auth required for all endpoints
- RLS policies enforce user data isolation
- Platform tokens encrypted at rest

### Data Protection

- Social tokens encrypted using `encryptToken()`
- Decrypted only when needed for API calls
- Token rotation supported
- Expired tokens trigger reconnection flow

### Compliance

- Automatic disclaimer detection
- FTC compliance for affiliate links
- GDPR-compliant data handling
- Audit logs for all publishes

## Performance

### Optimization Targets

**Content Generation:**

- Story angles: <10 seconds
- Platform variants: <5 seconds per platform
- Total brief to variants: <30 seconds for 4 platforms

**Publishing:**

- Immediate publish: <3 seconds
- Queue processing: 50 posts per cycle
- Success rate: 99.5%+

**Analytics:**

- Dashboard load: <2 seconds
- Daily collection: Parallel processing
- Real-time O/I-1000 calculation

### Caching Strategy

**Cached:**

- Platform specifications (24 hour TTL)
- Niche models (1 hour TTL)
- Analytics dashboards (5 minute TTL)

**Real-time:**

- Content generation (always fresh)
- Publishing status
- Calendar entries

## Deployment

### Environment Variables Required

```
# OpenAI
OPENAI_API_KEY=sk-...

# Platform OAuth
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
INSTAGRAM_APP_ID=... (same as Facebook)
INSTAGRAM_APP_SECRET=... (same as Facebook)
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Cron Configuration

Add to your deployment platform (Vercel Cron, GitHub Actions, etc.):

```yaml
# .github/workflows/marketing-cron.yml
name: Marketing Daily Jobs
on:
  schedule:
    - cron: '0 2 * * *'  # 2am UTC - Platform specs
    - cron: '0 3 * * *'  # 3am UTC - Trend scanning
    - cron: '0 4 * * *'  # 4am UTC - Analytics

jobs:
  daily:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: tsx scripts/marketing-daily-jobs.ts

# Publishing worker (every 5 min)
name: Publishing Worker
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: tsx scripts/marketing-publish-worker.ts
```

### Database Migrations

Run migrations in order:

```bash
# Run marketing engine migration
supabase db push
```

Verify tables created:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'marketing_%';
```

## Monitoring

### Key Metrics to Track

**System Health:**

- Content generation success rate
- Publishing success rate (target: 99.5%+)
- API response times
- Background job completion

**Business Metrics:**

- Overall O/I-1000 trend
- Posts per user per month
- Platform connection health
- Experiment completion rate

### Logging

Structured logs with Pino:

```typescript
logger.info(
  {
    briefId,
    variantCount,
    platform,
  },
  "Content generated"
);
```

### Error Tracking

Sentry integration for:

- Generation failures
- Publishing errors
- Platform API issues
- Preflight validation failures

## Scaling Considerations

### Database

- Partitioning: `marketing_analytics` by month
- Indexing: All foreign keys and query filters
- Archiving: Variants older than 1 year

### AI Costs

- Average: $0.10 per brief generation
- Optimization: Cache voice guidelines per profile
- Batching: Generate multiple platforms in parallel

### Platform APIs

- Rate limiting: Respect platform limits
- Token refresh: Automatic before expiry
- Circuit breaker: Pause on repeated failures

## Testing Strategy

### Unit Tests

- All service functions
- Validation logic
- Calculation functions (O/I-1000, readability)

### Integration Tests

- End-to-end generation flow
- Publishing workflow
- Analytics aggregation

### E2E Tests

- Complete UI workflows
- Platform OAuth flows
- Calendar scheduling

## Future Enhancements

### Planned Features

1. **Visual Content Generation**: AI-generated images via DALL-E or Midjourney
2. **Video Content**: Automated video creation and captions
3. **Advanced Scheduling**: Optimal time prediction per user audience
4. **Multi-language**: Content generation in multiple languages
5. **Competitor Analysis**: Track competitor content and gaps

### Provider Abstraction

Move from OpenAI-specific to provider-agnostic:

```typescript
interface AIProvider {
  generateContent(prompt: string): Promise<string>;
  analyzeVoice(samples: string[]): Promise<VoiceProfile>;
}

// lib/ai/providers/openai.ts
// lib/ai/providers/claude.ts
// lib/ai/providers/gemini.ts
```

### Advanced Analytics

- Sentiment analysis on comments
- Audience demographics from platforms
- Conversion funnel attribution
- Lifetime value tracking

## Maintenance

### Daily Tasks (Automated)

- Platform spec updates
- Trend scanning
- Analytics collection
- Niche model training

### Weekly Tasks (Manual)

- Review experiment results
- Audit publishing success rate
- Check platform connection health
- Review compliance logs

### Monthly Tasks

- Performance optimization review
- Cost analysis (AI tokens, platform APIs)
- User feedback integration
- Documentation updates

---

## Developer Guide

### Adding a New Platform

1. **Add enum value**: `types/marketing.ts`
2. **Add platform spec**: Seed data in migration
3. **Create OAuth integration**: `lib/integrations/[platform].ts`
4. **Add API routes**: `app/api/funnel/[projectId]/integrations/[platform]/`
5. **Add publisher logic**: `lib/marketing/publisher-service.ts`
6. **Update UI**: Add platform to Settings tab
7. **Test**: OAuth flow, content generation, publishing

### Adding a Story Framework

1. **Add enum**: `marketing_story_framework` in migration
2. **Implement generation**: `lib/marketing/story-weaver-service.ts`
3. **Add to UI**: Profile preferences and Generator dropdown
4. **Create prompts**: Framework-specific prompt engineering
5. **Test**: Generate content with new framework

### Customizing Preflight Validation

1. **Add check**: `lib/marketing/preflight-service.ts`
2. **Update PreflightStatus type**: `types/marketing.ts`
3. **Display in UI**: Post variant card
4. **Log results**: Structured logging
5. **Test**: Various content scenarios

---

## Troubleshooting

### Content Not Generating

- **Check**: OpenAI API key configured
- **Check**: Profile exists and has voice guidelines
- **Check**: Intake and offer data populated
- **Logs**: Search for generation errors

### Publishing Failures

- **Check**: Platform connection active
- **Check**: Token not expired
- **Check**: Content passes preflight
- **Retry**: Automatic retry up to 3 times
- **Logs**: Platform API error messages

### Performance Issues

- **Check**: Database indexes present
- **Check**: API response times
- **Optimize**: Add caching where appropriate
- **Scale**: Increase background worker frequency

---

**For questions or issues, contact the development team or file a GitHub issue.**
