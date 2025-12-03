# Test Coverage Gaps - Comprehensive List

**Goal:** 90% test coverage **Current Coverage:** 3.6% **Generated:** December 3, 2025

This document lists every file that needs tests to achieve 90% coverage. Tests are
organized by priority and category.

---

## Summary

| Category    | Has Tests | Needs Tests | Total   |
| ----------- | --------- | ----------- | ------- |
| Lib modules | 24        | 93          | 117     |
| API routes  | 4         | 142         | 146     |
| Components  | 9         | 145         | 154     |
| Pages       | 0         | 40          | 40      |
| **Total**   | **37**    | **420**     | **457** |

---

## 🔴 PRIORITY 1: Core Business Logic (lib/)

These are critical business logic files that power the application.

### lib/stripe/ - Payment Processing (CRITICAL)

| File                     | Test Path                                    | Priority |
| ------------------------ | -------------------------------------------- | -------- |
| `lib/stripe/client.ts`   | `__tests__/unit/lib/stripe/client.test.ts`   | P0       |
| `lib/stripe/connect.ts`  | `__tests__/unit/lib/stripe/connect.test.ts`  | P0       |
| `lib/stripe/payments.ts` | `__tests__/unit/lib/stripe/payments.test.ts` | P0       |

### lib/business-profile/ - Core AI Context (CRITICAL)

| File                                            | Test Path                                                           | Priority |
| ----------------------------------------------- | ------------------------------------------------------------------- | -------- |
| `lib/business-profile/service.ts`               | `__tests__/unit/lib/business-profile/service.test.ts`               | P0       |
| `lib/business-profile/ai-section-generator.ts`  | `__tests__/unit/lib/business-profile/ai-section-generator.test.ts`  | P0       |
| `lib/business-profile/generator-integration.ts` | `__tests__/unit/lib/business-profile/generator-integration.test.ts` | P0       |
| `lib/business-profile/index.ts`                 | `__tests__/unit/lib/business-profile/index.test.ts`                 | P1       |

### lib/marketing/ - Social Media Publishing (CRITICAL)

| File                                           | Test Path                                                          | Priority |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------- |
| `lib/marketing/publisher-service.ts`           | `__tests__/unit/lib/marketing/publisher-service.test.ts`           | P0       |
| `lib/marketing/content-architect-service.ts`   | `__tests__/unit/lib/marketing/content-architect-service.test.ts`   | P0       |
| `lib/marketing/analytics-collector-service.ts` | `__tests__/unit/lib/marketing/analytics-collector-service.test.ts` | P0       |
| `lib/marketing/cta-strategist-service.ts`      | `__tests__/unit/lib/marketing/cta-strategist-service.test.ts`      | P1       |
| `lib/marketing/intake-integration-service.ts`  | `__tests__/unit/lib/marketing/intake-integration-service.test.ts`  | P1       |
| `lib/marketing/niche-model-service.ts`         | `__tests__/unit/lib/marketing/niche-model-service.test.ts`         | P1       |
| `lib/marketing/preflight-service.ts`           | `__tests__/unit/lib/marketing/preflight-service.test.ts`           | P1       |
| `lib/marketing/social-scraper-service.ts`      | `__tests__/unit/lib/marketing/social-scraper-service.test.ts`      | P1       |
| `lib/marketing/story-weaver-service.ts`        | `__tests__/unit/lib/marketing/story-weaver-service.test.ts`        | P1       |
| `lib/marketing/trend-scanner-service.ts`       | `__tests__/unit/lib/marketing/trend-scanner-service.test.ts`       | P1       |

**Note:** `brand-voice-service.ts` and `platform-knowledge-service.ts` already have
tests.

### lib/integrations/ - OAuth & Social Connections (CRITICAL)

| File                            | Test Path                                           | Priority |
| ------------------------------- | --------------------------------------------------- | -------- |
| `lib/integrations/crypto.ts`    | `__tests__/unit/lib/integrations/crypto.test.ts`    | P0       |
| `lib/integrations/facebook.ts`  | `__tests__/unit/lib/integrations/facebook.test.ts`  | P0       |
| `lib/integrations/gmail.ts`     | `__tests__/unit/lib/integrations/gmail.test.ts`     | P0       |
| `lib/integrations/instagram.ts` | `__tests__/unit/lib/integrations/instagram.test.ts` | P0       |
| `lib/integrations/twitter.ts`   | `__tests__/unit/lib/integrations/twitter.test.ts`   | P0       |
| `lib/integrations/linkedin.ts`  | `__tests__/unit/lib/integrations/linkedin.test.ts`  | P1       |
| `lib/integrations/calendar.ts`  | `__tests__/unit/lib/integrations/calendar.test.ts`  | P1       |
| `lib/integrations/meta-ads.ts`  | `__tests__/unit/lib/integrations/meta-ads.test.ts`  | P1       |

### lib/crypto/ - Token Encryption (CRITICAL)

| File                             | Test Path                                            | Priority |
| -------------------------------- | ---------------------------------------------------- | -------- |
| `lib/crypto/token-encryption.ts` | `__tests__/unit/lib/crypto/token-encryption.test.ts` | P0       |

### lib/auth.ts - Authentication (CRITICAL)

| File          | Test Path                         | Priority |
| ------------- | --------------------------------- | -------- |
| `lib/auth.ts` | `__tests__/unit/lib/auth.test.ts` | P0       |

---

## 🟠 PRIORITY 2: Important Business Logic

### lib/ads/ - Ad Campaign Management

| File                             | Test Path                                            | Priority |
| -------------------------------- | ---------------------------------------------------- | -------- |
| `lib/ads/ad-generator.ts`        | `__tests__/unit/lib/ads/ad-generator.test.ts`        | P1       |
| `lib/ads/metrics-fetcher.ts`     | `__tests__/unit/lib/ads/metrics-fetcher.test.ts`     | P1       |
| `lib/ads/optimization-engine.ts` | `__tests__/unit/lib/ads/optimization-engine.test.ts` | P1       |
| `lib/ads/validation-schemas.ts`  | `__tests__/unit/lib/ads/validation-schemas.test.ts`  | P2       |

### lib/ai-assistant/ - AI Chat Context

| File                                   | Test Path                                                  | Priority |
| -------------------------------------- | ---------------------------------------------------------- | -------- |
| `lib/ai-assistant/action-executor.ts`  | `__tests__/unit/lib/ai-assistant/action-executor.test.ts`  | P1       |
| `lib/ai-assistant/business-context.ts` | `__tests__/unit/lib/ai-assistant/business-context.test.ts` | P1       |
| `lib/ai-assistant/page-context.ts`     | `__tests__/unit/lib/ai-assistant/page-context.test.ts`     | P2       |

### lib/followup/ - Follow-up Engine (PARTIALLY TESTED - fill gaps)

| File                                          | Test Path                                                         | Priority |
| --------------------------------------------- | ----------------------------------------------------------------- | -------- |
| `lib/followup/analytics-service.ts`           | `__tests__/unit/lib/followup/analytics-service.test.ts`           | P1       |
| `lib/followup/delivery-service.ts`            | `__tests__/unit/lib/followup/delivery-service.test.ts`            | P1       |
| `lib/followup/gmail-oauth-service.ts`         | `__tests__/unit/lib/followup/gmail-oauth-service.test.ts`         | P1       |
| `lib/followup/global-analytics-service.ts`    | `__tests__/unit/lib/followup/global-analytics-service.test.ts`    | P1       |
| `lib/followup/iterative-message-generator.ts` | `__tests__/unit/lib/followup/iterative-message-generator.test.ts` | P1       |
| `lib/followup/knowledge-base-aggregator.ts`   | `__tests__/unit/lib/followup/knowledge-base-aggregator.test.ts`   | P1       |
| `lib/followup/message-generation-service.ts`  | `__tests__/unit/lib/followup/message-generation-service.test.ts`  | P1       |
| `lib/followup/queue-processor.ts`             | `__tests__/unit/lib/followup/queue-processor.test.ts`             | P1       |
| `lib/followup/segmentation-service.ts`        | `__tests__/unit/lib/followup/segmentation-service.test.ts`        | P1       |
| `lib/followup/template-generator-service.ts`  | `__tests__/unit/lib/followup/template-generator-service.test.ts`  | P1       |
| `lib/followup/default-templates.ts`           | `__tests__/unit/lib/followup/default-templates.test.ts`           | P2       |
| `lib/followup/message-templates.ts`           | `__tests__/unit/lib/followup/message-templates.test.ts`           | P2       |
| `lib/followup/providers/email-provider.ts`    | `__tests__/unit/lib/followup/providers/email-provider.test.ts`    | P1       |
| `lib/followup/providers/gmail-provider.ts`    | `__tests__/unit/lib/followup/providers/gmail-provider.test.ts`    | P1       |
| `lib/followup/providers/sms-provider.ts`      | `__tests__/unit/lib/followup/providers/sms-provider.test.ts`      | P1       |

### lib/generators/ - Page Generators (PARTIALLY TESTED - fill gaps)

| File                                                                | Test Path                                                                               | Priority |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| `lib/generators/enrollment-page-generator.ts`                       | `__tests__/unit/lib/generators/enrollment-page-generator.test.ts`                       | P1       |
| `lib/generators/watch-page-generator.ts`                            | `__tests__/unit/lib/generators/watch-page-generator.test.ts`                            | P1       |
| `lib/generators/enrollment-framework-prompts.ts`                    | `__tests__/unit/lib/generators/enrollment-framework-prompts.test.ts`                    | P2       |
| `lib/generators/registration-framework-prompts.ts`                  | `__tests__/unit/lib/generators/registration-framework-prompts.test.ts`                  | P2       |
| `lib/generators/section-templates/cta-template.ts`                  | `__tests__/unit/lib/generators/section-templates/cta-template.test.ts`                  | P2       |
| `lib/generators/section-templates/faq-template.ts`                  | `__tests__/unit/lib/generators/section-templates/faq-template.test.ts`                  | P2       |
| `lib/generators/section-templates/features-template.ts`             | `__tests__/unit/lib/generators/section-templates/features-template.test.ts`             | P2       |
| `lib/generators/section-templates/footer-template.ts`               | `__tests__/unit/lib/generators/section-templates/footer-template.test.ts`               | P2       |
| `lib/generators/section-templates/hero-template.ts`                 | `__tests__/unit/lib/generators/section-templates/hero-template.test.ts`                 | P2       |
| `lib/generators/section-templates/pricing-template.ts`              | `__tests__/unit/lib/generators/section-templates/pricing-template.test.ts`              | P2       |
| `lib/generators/section-templates/proof-template.ts`                | `__tests__/unit/lib/generators/section-templates/proof-template.test.ts`                | P2       |
| `lib/generators/section-templates/story-template.ts`                | `__tests__/unit/lib/generators/section-templates/story-template.test.ts`                | P2       |
| `lib/generators/section-templates/testimonial-template.ts`          | `__tests__/unit/lib/generators/section-templates/testimonial-template.test.ts`          | P2       |
| `lib/generators/section-templates/three-step-framework-template.ts` | `__tests__/unit/lib/generators/section-templates/three-step-framework-template.test.ts` | P2       |

### lib/pages/ - Landing Page Logic

| File                                  | Test Path                                                 | Priority |
| ------------------------------------- | --------------------------------------------------------- | -------- |
| `lib/pages/section-copy-generator.ts` | `__tests__/unit/lib/pages/section-copy-generator.test.ts` | P1       |

### lib/intake/ - Content Intake Processing

| File                       | Test Path                                      | Priority |
| -------------------------- | ---------------------------------------------- | -------- |
| `lib/intake/processors.ts` | `__tests__/unit/lib/intake/processors.test.ts` | P1       |

---

## 🟡 PRIORITY 3: Supporting Infrastructure

### lib/supabase/ - Database Client

| File                         | Test Path                                        | Priority |
| ---------------------------- | ------------------------------------------------ | -------- |
| `lib/supabase/client.ts`     | `__tests__/unit/lib/supabase/client.test.ts`     | P2       |
| `lib/supabase/server.ts`     | `__tests__/unit/lib/supabase/server.test.ts`     | P2       |
| `lib/supabase/middleware.ts` | `__tests__/unit/lib/supabase/middleware.test.ts` | P2       |

### lib/cloudflare/ - Video Processing

| File                       | Test Path                                      | Priority |
| -------------------------- | ---------------------------------------------- | -------- |
| `lib/cloudflare/client.ts` | `__tests__/unit/lib/cloudflare/client.test.ts` | P2       |
| `lib/cloudflare/types.ts`  | `__tests__/unit/lib/cloudflare/types.test.ts`  | P3       |

### lib/gamma/ - Deck Export

| File                  | Test Path                                 | Priority |
| --------------------- | ----------------------------------------- | -------- |
| `lib/gamma/client.ts` | `__tests__/unit/lib/gamma/client.test.ts` | P2       |
| `lib/gamma/types.ts`  | `__tests__/unit/lib/gamma/types.test.ts`  | P3       |

### lib/vapi/ - Voice AI

| File                 | Test Path                                | Priority |
| -------------------- | ---------------------------------------- | -------- |
| `lib/vapi/client.ts` | `__tests__/unit/lib/vapi/client.test.ts` | P2       |
| `lib/vapi/types.ts`  | `__tests__/unit/lib/vapi/types.test.ts`  | P3       |

### lib/openai/ - OpenAI Integration

| File                              | Test Path                                             | Priority |
| --------------------------------- | ----------------------------------------------------- | -------- |
| `lib/openai/assistants-client.ts` | `__tests__/unit/lib/openai/assistants-client.test.ts` | P2       |

### lib/ai/ - AI Utilities (PARTIALLY TESTED)

| File                                 | Test Path                                                | Priority |
| ------------------------------------ | -------------------------------------------------------- | -------- |
| `lib/ai/client.ts`                   | `__tests__/unit/lib/ai/client.test.ts`                   | P2       |
| `lib/ai/design-system-guidelines.ts` | `__tests__/unit/lib/ai/design-system-guidelines.test.ts` | P3       |
| `lib/ai/types.ts`                    | `__tests__/unit/lib/ai/types.test.ts`                    | P3       |

### lib/scraping/ - Web Scraping (PARTIALLY TESTED)

| File                                | Test Path                                               | Priority |
| ----------------------------------- | ------------------------------------------------------- | -------- |
| `lib/scraping/cache.ts`             | `__tests__/unit/lib/scraping/cache.test.ts`             | P2       |
| `lib/scraping/constants.ts`         | `__tests__/unit/lib/scraping/constants.test.ts`         | P3       |
| `lib/scraping/content-extractor.ts` | `__tests__/unit/lib/scraping/content-extractor.test.ts` | P2       |
| `lib/scraping/facebook-api.ts`      | `__tests__/unit/lib/scraping/facebook-api.test.ts`      | P2       |
| `lib/scraping/instagram-api.ts`     | `__tests__/unit/lib/scraping/instagram-api.test.ts`     | P2       |
| `lib/scraping/linkedin-api.ts`      | `__tests__/unit/lib/scraping/linkedin-api.test.ts`      | P2       |

### lib/middleware/ - Request Middleware

| File                           | Test Path                                          | Priority |
| ------------------------------ | -------------------------------------------------- | -------- |
| `lib/middleware/rate-limit.ts` | `__tests__/unit/lib/middleware/rate-limit.test.ts` | P2       |

### lib/utils/ - Utility Functions

| File                          | Test Path                                         | Priority |
| ----------------------------- | ------------------------------------------------- | -------- |
| `lib/utils/color-contrast.ts` | `__tests__/unit/lib/utils/color-contrast.test.ts` | P2       |
| `lib/utils/icon-mapper.ts`    | `__tests__/unit/lib/utils/icon-mapper.test.ts`    | P3       |

### Other lib files

| File                         | Test Path                                        | Priority |
| ---------------------------- | ------------------------------------------------ | -------- |
| `lib/client-logger.ts`       | `__tests__/unit/lib/client-logger.test.ts`       | P3       |
| `lib/logger.ts`              | `__tests__/unit/lib/logger.test.ts`              | P3       |
| `lib/env.ts`                 | `__tests__/unit/lib/env.test.ts`                 | P3       |
| `lib/get-public-url.ts`      | `__tests__/unit/lib/get-public-url.test.ts`      | P3       |
| `lib/mobile-utils.client.ts` | `__tests__/unit/lib/mobile-utils.client.test.ts` | P3       |
| `lib/mobile-utils.server.ts` | `__tests__/unit/lib/mobile-utils.server.test.ts` | P3       |
| `lib/webhook-service.ts`     | `__tests__/unit/lib/webhook-service.test.ts`     | P2       |

---

## 🔴 PRIORITY 1: API Routes (CRITICAL)

API routes need integration tests. Group related routes in single test files.

### Stripe API Routes (CRITICAL - handles money)

| Route                                | Test Path                                             | Priority |
| ------------------------------------ | ----------------------------------------------------- | -------- |
| `app/api/stripe/connect/route.ts`    | `__tests__/integration/api/stripe/connect.test.ts`    | P0       |
| `app/api/stripe/callback/route.ts`   | `__tests__/integration/api/stripe/callback.test.ts`   | P0       |
| `app/api/stripe/disconnect/route.ts` | `__tests__/integration/api/stripe/disconnect.test.ts` | P0       |
| `app/api/stripe/webhook/route.ts`    | `__tests__/integration/api/stripe/webhook.test.ts`    | P0       |

### Auth API Routes (CRITICAL)

| Route                                     | Test Path                                                  | Priority |
| ----------------------------------------- | ---------------------------------------------------------- | -------- |
| `app/api/auth/logout/route.ts`            | `__tests__/integration/api/auth/logout.test.ts`            | P0       |
| `app/api/auth/validate-referral/route.ts` | `__tests__/integration/api/auth/validate-referral.test.ts` | P0       |

### Contacts API Routes

| Route                                   | Test Path                                                  | Priority |
| --------------------------------------- | ---------------------------------------------------------- | -------- |
| `app/api/contacts/route.ts`             | `__tests__/integration/api/contacts/contacts.test.ts`      | P1       |
| `app/api/contacts/[contactId]/route.ts` | `__tests__/integration/api/contacts/contact-by-id.test.ts` | P1       |

### Domains API Routes

| Route                                        | Test Path                                                | Priority |
| -------------------------------------------- | -------------------------------------------------------- | -------- |
| `app/api/domains/route.ts`                   | `__tests__/integration/api/domains/domains.test.ts`      | P1       |
| `app/api/domains/[domainId]/route.ts`        | `__tests__/integration/api/domains/domain-by-id.test.ts` | P1       |
| `app/api/domains/[domainId]/verify/route.ts` | `__tests__/integration/api/domains/verify.test.ts`       | P1       |

### Business Profile/Context API Routes

| Route                                       | Test Path                                                    | Priority |
| ------------------------------------------- | ------------------------------------------------------------ | -------- |
| `app/api/context/business-profile/route.ts` | `__tests__/integration/api/context/business-profile.test.ts` | P0       |
| `app/api/context/generate-section/route.ts` | `__tests__/integration/api/context/generate-section.test.ts` | P1       |
| `app/api/context/parse-gpt-paste/route.ts`  | `__tests__/integration/api/context/parse-gpt-paste.test.ts`  | P1       |

### AI Assistant API Routes

| Route                                   | Test Path                                                | Priority |
| --------------------------------------- | -------------------------------------------------------- | -------- |
| `app/api/ai-assistant/context/route.ts` | `__tests__/integration/api/ai-assistant/context.test.ts` | P1       |

### Generation API Routes

| Route                                                 | Test Path                                                       | Priority |
| ----------------------------------------------------- | --------------------------------------------------------------- | -------- |
| `app/api/generate/offer/route.ts`                     | `__tests__/integration/api/generate/offer.test.ts`              | P1       |
| `app/api/generate/offer-alternatives/route.ts`        | `__tests__/integration/api/generate/offer-alternatives.test.ts` | P1       |
| `app/api/generate/auto-generate-all/route.ts`         | `__tests__/integration/api/generate/auto-generate-all.test.ts`  | P1       |
| `app/api/generate/deck-structure/route.ts`            | `__tests__/integration/api/generate/deck-structure.test.ts`     | P1       |
| `app/api/generate/enrollment-copy/route.ts`           | `__tests__/integration/api/generate/enrollment-copy.test.ts`    | P1       |
| `app/api/generate/registration-copy/route.ts`         | `__tests__/integration/api/generate/registration-copy.test.ts`  | P1       |
| `app/api/generate/watch-copy/route.ts`                | `__tests__/integration/api/generate/watch-copy.test.ts`         | P1       |
| `app/api/generate/gamma-decks/route.ts`               | `__tests__/integration/api/generate/gamma-decks.test.ts`        | P2       |
| `app/api/generate/generation-status/route.ts`         | `__tests__/integration/api/generate/generation-status.test.ts`  | P2       |
| `app/api/generate/talk-track/route.ts`                | Already has tests ✅                                            | -        |
| `app/api/generate/talk-track/status/[jobId]/route.ts` | `__tests__/integration/api/generate/talk-track-status.test.ts`  | P2       |

### Followup API Routes

| Route                                                                              | Test Path                                                            | Priority |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| `app/api/followup/sequences/route.ts`                                              | `__tests__/integration/api/followup/sequences.test.ts`               | P1       |
| `app/api/followup/sequences/[sequenceId]/route.ts`                                 | `__tests__/integration/api/followup/sequence-by-id.test.ts`          | P1       |
| `app/api/followup/sequences/[sequenceId]/messages/route.ts`                        | `__tests__/integration/api/followup/sequence-messages.test.ts`       | P1       |
| `app/api/followup/sequences/[sequenceId]/messages/[messageId]/route.ts`            | `__tests__/integration/api/followup/message-by-id.test.ts`           | P1       |
| `app/api/followup/sequences/[sequenceId]/messages/[messageId]/regenerate/route.ts` | `__tests__/integration/api/followup/message-regenerate.test.ts`      | P2       |
| `app/api/followup/sequences/[sequenceId]/generate-messages/route.ts`               | `__tests__/integration/api/followup/generate-messages.test.ts`       | P1       |
| `app/api/followup/sequences/create-default/route.ts`                               | `__tests__/integration/api/followup/create-default-sequence.test.ts` | P1       |
| `app/api/followup/sequences/generate/route.ts`                                     | `__tests__/integration/api/followup/generate-sequence.test.ts`       | P1       |
| `app/api/followup/prospects/route.ts`                                              | `__tests__/integration/api/followup/prospects.test.ts`               | P1       |
| `app/api/followup/prospects/[prospectId]/route.ts`                                 | `__tests__/integration/api/followup/prospect-by-id.test.ts`          | P1       |
| `app/api/followup/stories/route.ts`                                                | `__tests__/integration/api/followup/stories.test.ts`                 | P1       |
| `app/api/followup/stories/[storyId]/route.ts`                                      | `__tests__/integration/api/followup/story-by-id.test.ts`             | P1       |
| `app/api/followup/agent-configs/route.ts`                                          | `__tests__/integration/api/followup/agent-configs.test.ts`           | P1       |
| `app/api/followup/agent-configs/[configId]/route.ts`                               | `__tests__/integration/api/followup/agent-config-by-id.test.ts`      | P1       |
| `app/api/followup/analytics/route.ts`                                              | `__tests__/integration/api/followup/analytics.test.ts`               | P1       |
| `app/api/followup/global-analytics/route.ts`                                       | `__tests__/integration/api/followup/global-analytics.test.ts`        | P1       |
| `app/api/followup/global-prospects/route.ts`                                       | `__tests__/integration/api/followup/global-prospects.test.ts`        | P1       |
| `app/api/followup/content/select/route.ts`                                         | `__tests__/integration/api/followup/content-select.test.ts`          | P2       |
| `app/api/followup/generate-brand-voice/route.ts`                                   | `__tests__/integration/api/followup/generate-brand-voice.test.ts`    | P2       |
| `app/api/followup/messages/route.ts`                                               | `__tests__/integration/api/followup/messages.test.ts`                | P1       |
| `app/api/followup/sender/update/route.ts`                                          | `__tests__/integration/api/followup/sender-update.test.ts`           | P2       |
| `app/api/followup/test-message/route.ts`                                           | `__tests__/integration/api/followup/test-message.test.ts`            | P2       |
| `app/api/followup/track/route.ts`                                                  | `__tests__/integration/api/followup/track.test.ts`                   | P1       |
| `app/api/followup/trigger/route.ts`                                                | `__tests__/integration/api/followup/trigger.test.ts`                 | P1       |
| `app/api/followup/webhooks/email/route.ts`                                         | `__tests__/integration/api/followup/webhooks-email.test.ts`          | P1       |
| `app/api/followup/webhooks/sms/route.ts`                                           | `__tests__/integration/api/followup/webhooks-sms.test.ts`            | P1       |
| `app/api/followup/gmail/connect/route.ts`                                          | `__tests__/integration/api/followup/gmail-connect.test.ts`           | P1       |
| `app/api/followup/gmail/callback/route.ts`                                         | `__tests__/integration/api/followup/gmail-callback.test.ts`          | P1       |
| `app/api/followup/gmail/disconnect/route.ts`                                       | `__tests__/integration/api/followup/gmail-disconnect.test.ts`        | P1       |
| `app/api/followup/gmail/status/route.ts`                                           | `__tests__/integration/api/followup/gmail-status.test.ts`            | P1       |

### Marketing API Routes

| Route                                                         | Test Path                                                           | Priority |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| `app/api/marketing/briefs/route.ts`                           | `__tests__/integration/api/marketing/briefs.test.ts`                | P1       |
| `app/api/marketing/briefs/[briefId]/generate/route.ts`        | `__tests__/integration/api/marketing/brief-generate.test.ts`        | P1       |
| `app/api/marketing/briefs/[briefId]/variants/route.ts`        | `__tests__/integration/api/marketing/brief-variants.test.ts`        | P1       |
| `app/api/marketing/calendar/route.ts`                         | `__tests__/integration/api/marketing/calendar.test.ts`              | P1       |
| `app/api/marketing/calendar/[entryId]/route.ts`               | `__tests__/integration/api/marketing/calendar-entry.test.ts`        | P1       |
| `app/api/marketing/calendar/[entryId]/promote/route.ts`       | `__tests__/integration/api/marketing/calendar-promote.test.ts`      | P2       |
| `app/api/marketing/profiles/route.ts`                         | `__tests__/integration/api/marketing/profiles.test.ts`              | P1       |
| `app/api/marketing/profiles/[profileId]/route.ts`             | `__tests__/integration/api/marketing/profile-by-id.test.ts`         | P1       |
| `app/api/marketing/profiles/[profileId]/analyze-url/route.ts` | `__tests__/integration/api/marketing/profile-analyze-url.test.ts`   | P2       |
| `app/api/marketing/profiles/[profileId]/calibrate/route.ts`   | `__tests__/integration/api/marketing/profile-calibrate.test.ts`     | P2       |
| `app/api/marketing/publish/route.ts`                          | `__tests__/integration/api/marketing/publish.test.ts`               | P1       |
| `app/api/marketing/publish/[publishId]/status/route.ts`       | `__tests__/integration/api/marketing/publish-status.test.ts`        | P1       |
| `app/api/marketing/publish/test/route.ts`                     | `__tests__/integration/api/marketing/publish-test.test.ts`          | P2       |
| `app/api/marketing/variants/[variantId]/route.ts`             | `__tests__/integration/api/marketing/variant-by-id.test.ts`         | P1       |
| `app/api/marketing/variants/[variantId]/approve/route.ts`     | `__tests__/integration/api/marketing/variant-approve.test.ts`       | P1       |
| `app/api/marketing/variants/[variantId]/reject/route.ts`      | `__tests__/integration/api/marketing/variant-reject.test.ts`        | P1       |
| `app/api/marketing/variants/approval-queue/route.ts`          | `__tests__/integration/api/marketing/approval-queue.test.ts`        | P1       |
| `app/api/marketing/validate/route.ts`                         | `__tests__/integration/api/marketing/validate.test.ts`              | P1       |
| `app/api/marketing/validate/[variantId]/route.ts`             | `__tests__/integration/api/marketing/validate-variant.test.ts`      | P1       |
| `app/api/marketing/analytics/route.ts`                        | `__tests__/integration/api/marketing/analytics.test.ts`             | P1       |
| `app/api/marketing/analytics/experiments/route.ts`            | `__tests__/integration/api/marketing/analytics-experiments.test.ts` | P2       |
| `app/api/marketing/analytics/post/[postId]/route.ts`          | `__tests__/integration/api/marketing/analytics-post.test.ts`        | P2       |
| `app/api/marketing/activity-log/route.ts`                     | `__tests__/integration/api/marketing/activity-log.test.ts`          | P2       |
| `app/api/marketing/experiments/route.ts`                      | `__tests__/integration/api/marketing/experiments.test.ts`           | P2       |
| `app/api/marketing/export/route.ts`                           | `__tests__/integration/api/marketing/export.test.ts`                | P2       |
| `app/api/marketing/import/route.ts`                           | `__tests__/integration/api/marketing/import.test.ts`                | P2       |
| `app/api/marketing/media/route.ts`                            | `__tests__/integration/api/marketing/media.test.ts`                 | P2       |
| `app/api/marketing/templates/route.ts`                        | `__tests__/integration/api/marketing/templates.test.ts`             | P1       |
| `app/api/marketing/trends/route.ts`                           | `__tests__/integration/api/marketing/trends.test.ts`                | P1       |
| `app/api/marketing/trends/[trendId]/brief/route.ts`           | `__tests__/integration/api/marketing/trend-brief.test.ts`           | P2       |

### Pages API Routes

| Route                                                           | Test Path                                                               | Priority |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| `app/api/pages/route.ts`                                        | `__tests__/integration/api/pages/pages.test.ts`                         | P1       |
| `app/api/pages/[pageId]/webhook/route.ts`                       | `__tests__/integration/api/pages/page-webhook.test.ts`                  | P1       |
| `app/api/pages/registration/[pageId]/route.ts`                  | `__tests__/integration/api/pages/registration.test.ts`                  | P1       |
| `app/api/pages/registration/[pageId]/publish/route.ts`          | `__tests__/integration/api/pages/registration-publish.test.ts`          | P1       |
| `app/api/pages/registration/[pageId]/regenerate/route.ts`       | `__tests__/integration/api/pages/registration-regenerate.test.ts`       | P2       |
| `app/api/pages/registration/[pageId]/regenerate-field/route.ts` | `__tests__/integration/api/pages/registration-regenerate-field.test.ts` | P2       |
| `app/api/pages/registration/[pageId]/rewrite-field/route.ts`    | `__tests__/integration/api/pages/registration-rewrite-field.test.ts`    | P2       |
| `app/api/pages/enrollment/[pageId]/route.ts`                    | `__tests__/integration/api/pages/enrollment.test.ts`                    | P1       |
| `app/api/pages/enrollment/[pageId]/publish/route.ts`            | `__tests__/integration/api/pages/enrollment-publish.test.ts`            | P1       |
| `app/api/pages/enrollment/[pageId]/regenerate/route.ts`         | `__tests__/integration/api/pages/enrollment-regenerate.test.ts`         | P2       |
| `app/api/pages/enrollment/[pageId]/regenerate-field/route.ts`   | `__tests__/integration/api/pages/enrollment-regenerate-field.test.ts`   | P2       |
| `app/api/pages/enrollment/[pageId]/rewrite-field/route.ts`      | `__tests__/integration/api/pages/enrollment-rewrite-field.test.ts`      | P2       |
| `app/api/pages/watch/[pageId]/route.ts`                         | `__tests__/integration/api/pages/watch.test.ts`                         | P1       |
| `app/api/pages/watch/[pageId]/publish/route.ts`                 | `__tests__/integration/api/pages/watch-publish.test.ts`                 | P1       |
| `app/api/pages/watch/[pageId]/rewrite-field/route.ts`           | `__tests__/integration/api/pages/watch-rewrite-field.test.ts`           | P2       |
| `app/api/pages/generate-image/route.ts`                         | `__tests__/integration/api/pages/generate-image.test.ts`                | P2       |
| `app/api/pages/generate-section-copy/route.ts`                  | `__tests__/integration/api/pages/generate-section-copy.test.ts`         | P1       |
| `app/api/pages/media/route.ts`                                  | `__tests__/integration/api/pages/media.test.ts`                         | P2       |
| `app/api/pages/pitch-videos/route.ts`                           | `__tests__/integration/api/pages/pitch-videos.test.ts`                  | P2       |
| `app/api/pages/upload-image/route.ts`                           | `__tests__/integration/api/pages/upload-image.test.ts`                  | P2       |

### Ads API Routes

| Route                                       | Test Path                                                   | Priority |
| ------------------------------------------- | ----------------------------------------------------------- | -------- |
| `app/api/ads/accounts/route.ts`             | `__tests__/integration/api/ads/accounts.test.ts`            | P1       |
| `app/api/ads/campaigns/create/route.ts`     | `__tests__/integration/api/ads/campaigns-create.test.ts`    | P1       |
| `app/api/ads/metrics/[campaignId]/route.ts` | `__tests__/integration/api/ads/metrics.test.ts`             | P1       |
| `app/api/ads/optimize/route.ts`             | `__tests__/integration/api/ads/optimize.test.ts`            | P1       |
| `app/api/ads/sync/route.ts`                 | `__tests__/integration/api/ads/sync.test.ts`                | P1       |
| `app/api/ads/variations/generate/route.ts`  | `__tests__/integration/api/ads/variations-generate.test.ts` | P1       |

### Funnel Integration API Routes

| Route                                                                 | Test Path                                                                  | Priority |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| `app/api/funnel/flows/create/route.ts`                                | `__tests__/integration/api/funnel/flows-create.test.ts`                    | P1       |
| `app/api/funnel/[projectId]/integrations/facebook/connect/route.ts`   | `__tests__/integration/api/funnel/integrations/facebook-connect.test.ts`   | P1       |
| `app/api/funnel/[projectId]/integrations/facebook/callback/route.ts`  | `__tests__/integration/api/funnel/integrations/facebook-callback.test.ts`  | P1       |
| `app/api/funnel/[projectId]/integrations/instagram/connect/route.ts`  | `__tests__/integration/api/funnel/integrations/instagram-connect.test.ts`  | P1       |
| `app/api/funnel/[projectId]/integrations/instagram/callback/route.ts` | `__tests__/integration/api/funnel/integrations/instagram-callback.test.ts` | P1       |
| `app/api/funnel/[projectId]/integrations/twitter/connect/route.ts`    | `__tests__/integration/api/funnel/integrations/twitter-connect.test.ts`    | P1       |
| `app/api/funnel/[projectId]/integrations/twitter/callback/route.ts`   | `__tests__/integration/api/funnel/integrations/twitter-callback.test.ts`   | P1       |
| `app/api/funnel/[projectId]/integrations/linkedin/connect/route.ts`   | `__tests__/integration/api/funnel/integrations/linkedin-connect.test.ts`   | P1       |
| `app/api/funnel/[projectId]/integrations/linkedin/callback/route.ts`  | `__tests__/integration/api/funnel/integrations/linkedin-callback.test.ts`  | P1       |
| `app/api/funnel/[projectId]/integrations/gmail/connect/route.ts`      | `__tests__/integration/api/funnel/integrations/gmail-connect.test.ts`      | P1       |
| `app/api/funnel/[projectId]/integrations/gmail/callback/route.ts`     | `__tests__/integration/api/funnel/integrations/gmail-callback.test.ts`     | P1       |
| `app/api/funnel/[projectId]/integrations/calendar/connect/route.ts`   | `__tests__/integration/api/funnel/integrations/calendar-connect.test.ts`   | P2       |
| `app/api/funnel/[projectId]/integrations/calendar/callback/route.ts`  | `__tests__/integration/api/funnel/integrations/calendar-callback.test.ts`  | P2       |
| `app/api/funnel/[projectId]/integrations/disconnect/route.ts`         | `__tests__/integration/api/funnel/integrations/disconnect.test.ts`         | P1       |

### Intake API Routes

| Route                                  | Test Path                                               | Priority |
| -------------------------------------- | ------------------------------------------------------- | -------- |
| `app/api/intake/paste/route.ts`        | `__tests__/integration/api/intake/paste.test.ts`        | P1       |
| `app/api/intake/scrape/route.ts`       | `__tests__/integration/api/intake/scrape.test.ts`       | P1       |
| `app/api/intake/upload/route.ts`       | `__tests__/integration/api/intake/upload.test.ts`       | P1       |
| `app/api/intake/rename/route.ts`       | `__tests__/integration/api/intake/rename.test.ts`       | P2       |
| `app/api/intake/google-drive/route.ts` | `__tests__/integration/api/intake/google-drive.test.ts` | P2       |

### Analytics API Routes

| Route                               | Test Path                                            | Priority |
| ----------------------------------- | ---------------------------------------------------- | -------- |
| `app/api/analytics/funnel/route.ts` | `__tests__/integration/api/analytics/funnel.test.ts` | P1       |
| `app/api/analytics/track/route.ts`  | `__tests__/integration/api/analytics/track.test.ts`  | P1       |

### Cloudflare API Routes

| Route                                         | Test Path                                                 | Priority |
| --------------------------------------------- | --------------------------------------------------------- | -------- |
| `app/api/cloudflare/upload-url/route.ts`      | `__tests__/integration/api/cloudflare/upload-url.test.ts` | P2       |
| `app/api/cloudflare/video/[videoId]/route.ts` | `__tests__/integration/api/cloudflare/video.test.ts`      | P2       |

### Support API Routes

| Route                                   | Test Path                                                | Priority |
| --------------------------------------- | -------------------------------------------------------- | -------- |
| `app/api/support/chat/thread/route.ts`  | `__tests__/integration/api/support/chat-thread.test.ts`  | P2       |
| `app/api/support/chat/message/route.ts` | `__tests__/integration/api/support/chat-message.test.ts` | P2       |

### Miscellaneous API Routes

| Route                                   | Test Path                                                | Priority |
| --------------------------------------- | -------------------------------------------------------- | -------- |
| `app/api/health/route.ts`               | `__tests__/integration/api/health.test.ts`               | P1       |
| `app/api/admin/referral-codes/route.ts` | `__tests__/integration/api/admin/referral-codes.test.ts` | P1       |
| `app/api/gamma/export/route.ts`         | `__tests__/integration/api/gamma/export.test.ts`         | P2       |
| `app/api/scrape/brand-colors/route.ts`  | `__tests__/integration/api/scrape/brand-colors.test.ts`  | P2       |
| `app/api/user/webhook/test/route.ts`    | `__tests__/integration/api/user/webhook-test.test.ts`    | P2       |
| `app/api/vapi/initiate-call/route.ts`   | `__tests__/integration/api/vapi/initiate-call.test.ts`   | P2       |
| `app/api/vapi/webhook/route.ts`         | `__tests__/integration/api/vapi/webhook.test.ts`         | P2       |
| `app/api/debug-env/route.ts`            | `__tests__/integration/api/debug-env.test.ts`            | P3       |

---

## 🟠 PRIORITY 2: Components

Components need unit tests with React Testing Library.

### Ads Components

| Component                                      | Test Path                                                          | Priority |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------- |
| `components/ads/ad-variations-review.tsx`      | `__tests__/unit/components/ads/ad-variations-review.test.tsx`      | P1       |
| `components/ads/ads-performance-dashboard.tsx` | `__tests__/unit/components/ads/ads-performance-dashboard.test.tsx` | P1       |
| `components/ads/audience-builder.tsx`          | `__tests__/unit/components/ads/audience-builder.test.tsx`          | P1       |
| `components/ads/campaign-deployer.tsx`         | `__tests__/unit/components/ads/campaign-deployer.test.tsx`         | P1       |
| `components/ads/meta-account-selector.tsx`     | `__tests__/unit/components/ads/meta-account-selector.test.tsx`     | P2       |

### Auth Components

| Component                           | Test Path                                               | Priority |
| ----------------------------------- | ------------------------------------------------------- | -------- |
| `components/auth/logout-button.tsx` | `__tests__/unit/components/auth/logout-button.test.tsx` | P1       |

### Context Components

| Component                                        | Test Path                                                            | Priority |
| ------------------------------------------------ | -------------------------------------------------------------------- | -------- |
| `components/context/context-method-selector.tsx` | `__tests__/unit/components/context/context-method-selector.test.tsx` | P1       |
| `components/context/context-wizard.tsx`          | `__tests__/unit/components/context/context-wizard.test.tsx`          | P1       |
| `components/context/gpt-paste-mode.tsx`          | `__tests__/unit/components/context/gpt-paste-mode.test.tsx`          | P1       |
| `components/context/section-progress.tsx`        | `__tests__/unit/components/context/section-progress.test.tsx`        | P2       |
| `components/context/wizard-question.tsx`         | `__tests__/unit/components/context/wizard-question.test.tsx`         | P2       |
| `components/context/wizard-section.tsx`          | `__tests__/unit/components/context/wizard-section.test.tsx`          | P2       |

### Editor Components

| Component                                   | Test Path                                                       | Priority |
| ------------------------------------------- | --------------------------------------------------------------- | -------- |
| `components/editor/editor-page-wrapper.tsx` | `__tests__/unit/components/editor/editor-page-wrapper.test.tsx` | P2       |

### Followup Components

| Component                                         | Test Path                                                             | Priority |
| ------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| `components/followup/agent-config-form.tsx`       | `__tests__/unit/components/followup/agent-config-form.test.tsx`       | P1       |
| `components/followup/ai-followup-dashboard.tsx`   | `__tests__/unit/components/followup/ai-followup-dashboard.test.tsx`   | P1       |
| `components/followup/analytics-dashboard.tsx`     | `__tests__/unit/components/followup/analytics-dashboard.test.tsx`     | P1       |
| `components/followup/global-dashboard.tsx`        | `__tests__/unit/components/followup/global-dashboard.test.tsx`        | P1       |
| `components/followup/global-prospect-list.tsx`    | `__tests__/unit/components/followup/global-prospect-list.test.tsx`    | P1       |
| `components/followup/global-prospects-table.tsx`  | `__tests__/unit/components/followup/global-prospects-table.test.tsx`  | P1       |
| `components/followup/message-preview.tsx`         | `__tests__/unit/components/followup/message-preview.test.tsx`         | P2       |
| `components/followup/message-template-editor.tsx` | `__tests__/unit/components/followup/message-template-editor.test.tsx` | P2       |
| `components/followup/onboarding-banner.tsx`       | `__tests__/unit/components/followup/onboarding-banner.test.tsx`       | P2       |
| `components/followup/prospect-list.tsx`           | `__tests__/unit/components/followup/prospect-list.test.tsx`           | P1       |
| `components/followup/prospects-kanban.tsx`        | `__tests__/unit/components/followup/prospects-kanban.test.tsx`        | P1       |
| `components/followup/sender-setup-tab.tsx`        | `__tests__/unit/components/followup/sender-setup-tab.test.tsx`        | P1       |
| `components/followup/sequence-builder.tsx`        | `__tests__/unit/components/followup/sequence-builder.test.tsx`        | P1       |
| `components/followup/sequence-manager.tsx`        | `__tests__/unit/components/followup/sequence-manager.test.tsx`        | P1       |
| `components/followup/story-library-manager.tsx`   | `__tests__/unit/components/followup/story-library-manager.test.tsx`   | P2       |
| `components/followup/story-library.tsx`           | `__tests__/unit/components/followup/story-library.test.tsx`           | P2       |
| `components/followup/test-message-modal.tsx`      | `__tests__/unit/components/followup/test-message-modal.test.tsx`      | P2       |

### Funnel Components (PARTIALLY TESTED)

| Component                                              | Test Path                                                                  | Priority |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | -------- |
| `components/funnel/analytics-dashboard.tsx`            | `__tests__/unit/components/funnel/analytics-dashboard.test.tsx`            | P1       |
| `components/funnel/deck-structure-editor.tsx`          | `__tests__/unit/components/funnel/deck-structure-editor.test.tsx`          | P1       |
| `components/funnel/dependency-warning.tsx`             | `__tests__/unit/components/funnel/dependency-warning.test.tsx`             | P2       |
| `components/funnel/funnel-contacts-view.tsx`           | `__tests__/unit/components/funnel/funnel-contacts-view.test.tsx`           | P1       |
| `components/funnel/funnel-dashboard-tabs.tsx`          | `__tests__/unit/components/funnel/funnel-dashboard-tabs.test.tsx`          | P1       |
| `components/funnel/funnel-followup-view.tsx`           | `__tests__/unit/components/funnel/funnel-followup-view.test.tsx`           | P1       |
| `components/funnel/funnel-pages-view.tsx`              | `__tests__/unit/components/funnel/funnel-pages-view.test.tsx`              | P1       |
| `components/funnel/funnel-settings-view.tsx`           | `__tests__/unit/components/funnel/funnel-settings-view.test.tsx`           | P1       |
| `components/funnel/gamma-theme-selector.tsx`           | `__tests__/unit/components/funnel/gamma-theme-selector.test.tsx`           | P2       |
| `components/funnel/horizontal-master-steps.tsx`        | `__tests__/unit/components/funnel/horizontal-master-steps.test.tsx`        | P2       |
| `components/funnel/offer-editor.tsx`                   | `__tests__/unit/components/funnel/offer-editor.test.tsx`                   | P1       |
| `components/funnel/step-layout.tsx`                    | `__tests__/unit/components/funnel/step-layout.test.tsx`                    | P2       |
| `components/funnel/stepper-nav.tsx`                    | `__tests__/unit/components/funnel/stepper-nav.test.tsx`                    | P2       |
| `components/funnel/vapi-call-widget.tsx`               | `__tests__/unit/components/funnel/vapi-call-widget.test.tsx`               | P2       |
| `components/funnel/video-uploader.tsx`                 | `__tests__/unit/components/funnel/video-uploader.test.tsx`                 | P1       |
| `components/funnel/settings/calendar-integration.tsx`  | `__tests__/unit/components/funnel/settings/calendar-integration.test.tsx`  | P2       |
| `components/funnel/settings/domain-settings.tsx`       | `__tests__/unit/components/funnel/settings/domain-settings.test.tsx`       | P2       |
| `components/funnel/settings/facebook-integration.tsx`  | `__tests__/unit/components/funnel/settings/facebook-integration.test.tsx`  | P2       |
| `components/funnel/settings/gmail-integration.tsx`     | `__tests__/unit/components/funnel/settings/gmail-integration.test.tsx`     | P2       |
| `components/funnel/settings/instagram-integration.tsx` | `__tests__/unit/components/funnel/settings/instagram-integration.test.tsx` | P2       |
| `components/funnel/settings/social-integrations.tsx`   | `__tests__/unit/components/funnel/settings/social-integrations.test.tsx`   | P2       |
| `components/funnel/settings/twitter-integration.tsx`   | `__tests__/unit/components/funnel/settings/twitter-integration.test.tsx`   | P2       |

### Funnel Builder Components

| Component                                           | Test Path                                                               | Priority |
| --------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| `components/funnel-builder/master-section-card.tsx` | `__tests__/unit/components/funnel-builder/master-section-card.test.tsx` | P1       |
| `components/funnel-builder/pages-list.tsx`          | `__tests__/unit/components/funnel-builder/pages-list.test.tsx`          | P1       |
| `components/funnel-builder/project-card.tsx`        | `__tests__/unit/components/funnel-builder/project-card.test.tsx`        | P1       |

### Intake Components

| Component                                      | Test Path                                                          | Priority |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------- |
| `components/intake/brand-data-display.tsx`     | `__tests__/unit/components/intake/brand-data-display.test.tsx`     | P1       |
| `components/intake/google-drive-intake.tsx`    | `__tests__/unit/components/intake/google-drive-intake.test.tsx`    | P2       |
| `components/intake/intake-data-viewer.tsx`     | `__tests__/unit/components/intake/intake-data-viewer.test.tsx`     | P1       |
| `components/intake/intake-method-selector.tsx` | `__tests__/unit/components/intake/intake-method-selector.test.tsx` | P1       |
| `components/intake/metadata-display.tsx`       | `__tests__/unit/components/intake/metadata-display.test.tsx`       | P2       |
| `components/intake/paste-intake.tsx`           | `__tests__/unit/components/intake/paste-intake.test.tsx`           | P1       |
| `components/intake/pricing-display.tsx`        | `__tests__/unit/components/intake/pricing-display.test.tsx`        | P2       |
| `components/intake/scrape-intake.tsx`          | `__tests__/unit/components/intake/scrape-intake.test.tsx`          | P1       |
| `components/intake/upload-intake.tsx`          | `__tests__/unit/components/intake/upload-intake.test.tsx`          | P1       |

### Layout Components

| Component                                           | Test Path                                                               | Priority |
| --------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| `components/layout/footer.tsx`                      | `__tests__/unit/components/layout/footer.test.tsx`                      | P3       |
| `components/layout/generation-progress-tracker.tsx` | `__tests__/unit/components/layout/generation-progress-tracker.test.tsx` | P1       |
| `components/layout/header.tsx`                      | `__tests__/unit/components/layout/header.test.tsx`                      | P2       |
| `components/layout/mobile-header.tsx`               | `__tests__/unit/components/layout/mobile-header.test.tsx`               | P3       |

### Marketing Components

| Component                                                         | Test Path                                                                             | Priority |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| `components/marketing/approval-workflow-modal.tsx`                | `__tests__/unit/components/marketing/approval-workflow-modal.test.tsx`                | P1       |
| `components/marketing/brief-template-library.tsx`                 | `__tests__/unit/components/marketing/brief-template-library.test.tsx`                 | P1       |
| `components/marketing/compliance-validator.tsx`                   | `__tests__/unit/components/marketing/compliance-validator.test.tsx`                   | P1       |
| `components/marketing/content-calendar-enhanced.tsx`              | `__tests__/unit/components/marketing/content-calendar-enhanced.test.tsx`              | P1       |
| `components/marketing/content-calendar.tsx`                       | `__tests__/unit/components/marketing/content-calendar.test.tsx`                       | P1       |
| `components/marketing/content-generator-enhanced.tsx`             | `__tests__/unit/components/marketing/content-generator-enhanced.test.tsx`             | P1       |
| `components/marketing/content-generator.tsx`                      | `__tests__/unit/components/marketing/content-generator.test.tsx`                      | P1       |
| `components/marketing/experiment-creator-modal.tsx`               | `__tests__/unit/components/marketing/experiment-creator-modal.test.tsx`               | P2       |
| `components/marketing/marketing-analytics-dashboard-enhanced.tsx` | `__tests__/unit/components/marketing/marketing-analytics-dashboard-enhanced.test.tsx` | P1       |
| `components/marketing/marketing-analytics-dashboard.tsx`          | `__tests__/unit/components/marketing/marketing-analytics-dashboard.test.tsx`          | P1       |
| `components/marketing/marketing-settings-enhanced.tsx`            | `__tests__/unit/components/marketing/marketing-settings-enhanced.test.tsx`            | P1       |
| `components/marketing/marketing-settings.tsx`                     | `__tests__/unit/components/marketing/marketing-settings.test.tsx`                     | P1       |
| `components/marketing/media-library-modal.tsx`                    | `__tests__/unit/components/marketing/media-library-modal.test.tsx`                    | P2       |
| `components/marketing/platform-preview-modal.tsx`                 | `__tests__/unit/components/marketing/platform-preview-modal.test.tsx`                 | P2       |
| `components/marketing/post-variant-card-enhanced.tsx`             | `__tests__/unit/components/marketing/post-variant-card-enhanced.test.tsx`             | P1       |
| `components/marketing/post-variant-card.tsx`                      | `__tests__/unit/components/marketing/post-variant-card.test.tsx`                      | P1       |
| `components/marketing/profile-config-form-enhanced.tsx`           | `__tests__/unit/components/marketing/profile-config-form-enhanced.test.tsx`           | P1       |
| `components/marketing/profile-config-form.tsx`                    | `__tests__/unit/components/marketing/profile-config-form.test.tsx`                    | P1       |
| `components/marketing/recurring-post-scheduler.tsx`               | `__tests__/unit/components/marketing/recurring-post-scheduler.test.tsx`               | P2       |
| `components/marketing/scheduling-modal.tsx`                       | `__tests__/unit/components/marketing/scheduling-modal.test.tsx`                       | P1       |
| `components/marketing/story-angle-selector.tsx`                   | `__tests__/unit/components/marketing/story-angle-selector.test.tsx`                   | P2       |
| `components/marketing/token-insertion-menu.tsx`                   | `__tests__/unit/components/marketing/token-insertion-menu.test.tsx`                   | P2       |
| `components/marketing/trend-explorer-enhanced.tsx`                | `__tests__/unit/components/marketing/trend-explorer-enhanced.test.tsx`                | P1       |
| `components/marketing/trend-explorer.tsx`                         | `__tests__/unit/components/marketing/trend-explorer.test.tsx`                         | P1       |
| `components/marketing/utm-builder.tsx`                            | `__tests__/unit/components/marketing/utm-builder.test.tsx`                            | P2       |
| `components/marketing/variant-inline-editor.tsx`                  | `__tests__/unit/components/marketing/variant-inline-editor.test.tsx`                  | P1       |

### Mobile Components

| Component                                       | Test Path                                                           | Priority |
| ----------------------------------------------- | ------------------------------------------------------------------- | -------- |
| `components/mobile/desktop-required-notice.tsx` | `__tests__/unit/components/mobile/desktop-required-notice.test.tsx` | P3       |
| `components/mobile/mobile-nav-drawer.tsx`       | `__tests__/unit/components/mobile/mobile-nav-drawer.test.tsx`       | P3       |

### Pages Components

| Component                                      | Test Path                                                          | Priority |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------- |
| `components/pages/field-ai-rewrite-button.tsx` | `__tests__/unit/components/pages/field-ai-rewrite-button.test.tsx` | P1       |
| `components/pages/field-regenerate-modal.tsx`  | `__tests__/unit/components/pages/field-regenerate-modal.test.tsx`  | P1       |
| `components/pages/image-generation-modal.tsx`  | `__tests__/unit/components/pages/image-generation-modal.test.tsx`  | P1       |
| `components/pages/image-upload-button.tsx`     | `__tests__/unit/components/pages/image-upload-button.test.tsx`     | P1       |
| `components/pages/page-regenerate-button.tsx`  | `__tests__/unit/components/pages/page-regenerate-button.test.tsx`  | P1       |
| `components/pages/page-type-badge.tsx`         | `__tests__/unit/components/pages/page-type-badge.test.tsx`         | P2       |
| `components/pages/page-webhook-settings.tsx`   | `__tests__/unit/components/pages/page-webhook-settings.test.tsx`   | P1       |
| `components/pages/pages-filter-bar.tsx`        | `__tests__/unit/components/pages/pages-filter-bar.test.tsx`        | P2       |
| `components/pages/pages-table.tsx`             | `__tests__/unit/components/pages/pages-table.test.tsx`             | P1       |
| `components/pages/publish-toggle.tsx`          | `__tests__/unit/components/pages/publish-toggle.test.tsx`          | P1       |
| `components/pages/published-badge.tsx`         | `__tests__/unit/components/pages/published-badge.test.tsx`         | P2       |
| `components/pages/section-block-generator.tsx` | `__tests__/unit/components/pages/section-block-generator.test.tsx` | P1       |
| `components/pages/share-button.tsx`            | `__tests__/unit/components/pages/share-button.test.tsx`            | P2       |
| `components/pages/slug-editor.tsx`             | `__tests__/unit/components/pages/slug-editor.test.tsx`             | P1       |
| `components/pages/video-selector-modal.tsx`    | `__tests__/unit/components/pages/video-selector-modal.test.tsx`    | P1       |

### Public Components

| Component                                          | Test Path                                                              | Priority |
| -------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| `components/public/countdown-deal-banner.tsx`      | `__tests__/unit/components/public/countdown-deal-banner.test.tsx`      | P2       |
| `components/public/dashboard-preview.tsx`          | `__tests__/unit/components/public/dashboard-preview.test.tsx`          | P2       |
| `components/public/enrollment-page-template.tsx`   | `__tests__/unit/components/public/enrollment-page-template.test.tsx`   | P1       |
| `components/public/faq.tsx`                        | `__tests__/unit/components/public/faq.test.tsx`                        | P2       |
| `components/public/final-cta.tsx`                  | `__tests__/unit/components/public/final-cta.test.tsx`                  | P2       |
| `components/public/follow-up-engine.tsx`           | `__tests__/unit/components/public/follow-up-engine.test.tsx`           | P2       |
| `components/public/founder-letter.tsx`             | `__tests__/unit/components/public/founder-letter.test.tsx`             | P2       |
| `components/public/hero.tsx`                       | `__tests__/unit/components/public/hero.test.tsx`                       | P1       |
| `components/public/how-it-works.tsx`               | `__tests__/unit/components/public/how-it-works.test.tsx`               | P2       |
| `components/public/marketing-engine.tsx`           | `__tests__/unit/components/public/marketing-engine.test.tsx`           | P2       |
| `components/public/offer-optimizer.tsx`            | `__tests__/unit/components/public/offer-optimizer.test.tsx`            | P2       |
| `components/public/presentation-builder.tsx`       | `__tests__/unit/components/public/presentation-builder.test.tsx`       | P2       |
| `components/public/pricing.tsx`                    | `__tests__/unit/components/public/pricing.test.tsx`                    | P1       |
| `components/public/public-page-wrapper.tsx`        | `__tests__/unit/components/public/public-page-wrapper.test.tsx`        | P1       |
| `components/public/registration-page-template.tsx` | `__tests__/unit/components/public/registration-page-template.test.tsx` | P1       |
| `components/public/watch-page-template.tsx`        | `__tests__/unit/components/public/watch-page-template.test.tsx`        | P1       |

### Settings Components

| Component                                       | Test Path                                                           | Priority |
| ----------------------------------------------- | ------------------------------------------------------------------- | -------- |
| `components/settings/domains-settings.tsx`      | `__tests__/unit/components/settings/domains-settings.test.tsx`      | P1       |
| `components/settings/integrations-settings.tsx` | `__tests__/unit/components/settings/integrations-settings.test.tsx` | P1       |
| `components/settings/payments-settings.tsx`     | `__tests__/unit/components/settings/payments-settings.test.tsx`     | P1       |
| `components/settings/profile-settings.tsx`      | `__tests__/unit/components/settings/profile-settings.test.tsx`      | P1       |

### Support Components

| Component                                          | Test Path                                                              | Priority |
| -------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| `components/support/advanced-ai-assistant.tsx`     | `__tests__/unit/components/support/advanced-ai-assistant.test.tsx`     | P2       |
| `components/support/context-aware-help-widget.tsx` | `__tests__/unit/components/support/context-aware-help-widget.test.tsx` | P2       |
| `components/support/help-widget.tsx`               | `__tests__/unit/components/support/help-widget.test.tsx`               | P2       |

### UI Components (Generic - lower priority)

| Component                         | Test Path                                             | Priority |
| --------------------------------- | ----------------------------------------------------- | -------- |
| `components/ui/accordion.tsx`     | `__tests__/unit/components/ui/accordion.test.tsx`     | P3       |
| `components/ui/card.tsx`          | `__tests__/unit/components/ui/card.test.tsx`          | P3       |
| `components/ui/checkbox.tsx`      | `__tests__/unit/components/ui/checkbox.test.tsx`      | P3       |
| `components/ui/dialog.tsx`        | `__tests__/unit/components/ui/dialog.test.tsx`        | P3       |
| `components/ui/dropdown-menu.tsx` | `__tests__/unit/components/ui/dropdown-menu.test.tsx` | P3       |
| `components/ui/input.tsx`         | `__tests__/unit/components/ui/input.test.tsx`         | P3       |
| `components/ui/label.tsx`         | `__tests__/unit/components/ui/label.test.tsx`         | P3       |
| `components/ui/progress.tsx`      | `__tests__/unit/components/ui/progress.test.tsx`      | P3       |
| `components/ui/radio-group.tsx`   | `__tests__/unit/components/ui/radio-group.test.tsx`   | P3       |
| `components/ui/select.tsx`        | `__tests__/unit/components/ui/select.test.tsx`        | P3       |
| `components/ui/separator.tsx`     | `__tests__/unit/components/ui/separator.test.tsx`     | P3       |
| `components/ui/skeleton.tsx`      | `__tests__/unit/components/ui/skeleton.test.tsx`      | P3       |
| `components/ui/slider.tsx`        | `__tests__/unit/components/ui/slider.test.tsx`        | P3       |
| `components/ui/switch.tsx`        | `__tests__/unit/components/ui/switch.test.tsx`        | P3       |
| `components/ui/tabs.tsx`          | `__tests__/unit/components/ui/tabs.test.tsx`          | P3       |
| `components/ui/textarea.tsx`      | `__tests__/unit/components/ui/textarea.test.tsx`      | P3       |
| `components/ui/toast.tsx`         | `__tests__/unit/components/ui/toast.test.tsx`         | P3       |
| `components/ui/toaster.tsx`       | `__tests__/unit/components/ui/toaster.test.tsx`       | P3       |
| `components/ui/tooltip.tsx`       | `__tests__/unit/components/ui/tooltip.test.tsx`       | P3       |

---

## 🟡 PRIORITY 3: E2E Tests for Pages

These require Playwright E2E tests.

### Auth Pages

| Page                         | Test Path                           | Priority |
| ---------------------------- | ----------------------------------- | -------- |
| `app/(auth)/login/page.tsx`  | `__tests__/e2e/auth/login.spec.ts`  | P1       |
| `app/(auth)/signup/page.tsx` | `__tests__/e2e/auth/signup.spec.ts` | P1       |

### Core App Pages

| Page                                                               | Test Path                                       | Priority |
| ------------------------------------------------------------------ | ----------------------------------------------- | -------- |
| `app/page.tsx`                                                     | `__tests__/e2e/homepage.spec.ts`                | P1       |
| `app/dashboard/page.tsx`                                           | `__tests__/e2e/dashboard.spec.ts`               | P1       |
| `app/funnel-builder/page.tsx`                                      | `__tests__/e2e/funnel-builder/list.spec.ts`     | P1       |
| `app/funnel-builder/create/page.tsx`                               | `__tests__/e2e/funnel-builder/create.spec.ts`   | P1       |
| `app/funnel-builder/[projectId]/page.tsx`                          | `__tests__/e2e/funnel-builder/project.spec.ts`  | P1       |
| `app/funnel-builder/[projectId]/step/1/page.tsx` through `step/14` | `__tests__/e2e/funnel-builder/steps.spec.ts`    | P1       |
| `app/funnel-builder/[projectId]/followup/page.tsx`                 | `__tests__/e2e/funnel-builder/followup.spec.ts` | P1       |
| `app/funnel-builder/[projectId]/pages/*/page.tsx`                  | `__tests__/e2e/funnel-builder/pages.spec.ts`    | P1       |
| `app/contacts/page.tsx`                                            | `__tests__/e2e/contacts/list.spec.ts`           | P1       |
| `app/contacts/[contactId]/page.tsx`                                | `__tests__/e2e/contacts/detail.spec.ts`         | P1       |
| `app/ads-manager/page.tsx`                                         | `__tests__/e2e/ads-manager.spec.ts`             | P1       |
| `app/ai-followup/page.tsx`                                         | `__tests__/e2e/ai-followup.spec.ts`             | P1       |
| `app/pages/page.tsx`                                               | `__tests__/e2e/pages/list.spec.ts`              | P1       |

### Settings Pages

| Page                                 | Test Path                                     | Priority |
| ------------------------------------ | --------------------------------------------- | -------- |
| `app/settings/page.tsx`              | `__tests__/e2e/settings/index.spec.ts`        | P2       |
| `app/settings/profile/page.tsx`      | `__tests__/e2e/settings/profile.spec.ts`      | P2       |
| `app/settings/integrations/page.tsx` | `__tests__/e2e/settings/integrations.spec.ts` | P2       |
| `app/settings/payments/page.tsx`     | `__tests__/e2e/settings/payments.spec.ts`     | P2       |
| `app/settings/domains/page.tsx`      | `__tests__/e2e/settings/domains.spec.ts`      | P2       |

### Public Pages

| Page                             | Test Path                                   | Priority |
| -------------------------------- | ------------------------------------------- | -------- |
| `app/p/[pageId]/page.tsx`        | `__tests__/e2e/public/landing-page.spec.ts` | P1       |
| `app/[username]/[slug]/page.tsx` | `__tests__/e2e/public/user-page.spec.ts`    | P2       |

---

## Execution Order Recommendation

To reach 90% coverage efficiently:

### Phase 1: Critical Business Logic (Week 1-2)

1. All `lib/stripe/` tests
2. All `lib/business-profile/` tests
3. All `lib/integrations/` tests
4. `lib/crypto/token-encryption.ts` test
5. `lib/auth.ts` test
6. Stripe API route tests

### Phase 2: Core Features (Week 3-4)

1. All `lib/marketing/` tests
2. All remaining `lib/followup/` tests
3. All `lib/ads/` tests
4. Core API route tests (auth, contacts, domains, context)

### Phase 3: Page Generators & AI (Week 5-6)

1. All remaining `lib/generators/` tests
2. All `lib/ai-assistant/` tests
3. All generation API route tests
4. All pages API route tests

### Phase 4: Components (Week 7-8)

1. Followup components
2. Marketing components
3. Funnel components
4. Pages components
5. Settings components

### Phase 5: E2E & Polish (Week 9-10)

1. Auth E2E tests
2. Core flow E2E tests
3. Settings E2E tests
4. Remaining unit tests for infrastructure

---

## Test File Template

For the AI executing tests, use this template:

```typescript
/**
 * Tests for [module/component name]
 *
 * Test file: [test path]
 * Source file: [source path]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// For components:
// import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';

describe("[Module/Component Name]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("[function/feature name]", () => {
    it("should [expected behavior]", async () => {
      // Arrange
      // Act
      // Assert
    });

    it("should handle [edge case]", async () => {
      // Test edge cases
    });

    it("should throw error when [error condition]", async () => {
      // Test error handling
    });
  });
});
```

---

## Notes for Test Execution AI

1. **Mock external dependencies**: Supabase, OpenAI, Stripe, etc.
2. **Use factory functions** for test data
3. **Test error paths** not just happy paths
4. **Keep tests focused** - one concept per test
5. **Use descriptive test names** that explain the expected behavior
6. **Check existing test patterns** in `__tests__/unit/lib/followup/` for examples
