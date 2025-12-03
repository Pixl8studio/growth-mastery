# Test Coverage Batches

**Total Tests Needed:** ~420 **Batch Size:** ~20 tests per batch **Total Batches:** 25

Each batch keeps related files together. Execute batches in order for optimal coverage
progression.

---

## BATCH 1: Stripe & Critical Payment Logic (6 tests)

**Priority:** P0 - CRITICAL

| #   | Source File                          | Test File                                             |
| --- | ------------------------------------ | ----------------------------------------------------- |
| 1   | `lib/stripe/client.ts`               | `__tests__/unit/lib/stripe/client.test.ts`            |
| 2   | `lib/stripe/connect.ts`              | `__tests__/unit/lib/stripe/connect.test.ts`           |
| 3   | `lib/stripe/payments.ts`             | `__tests__/unit/lib/stripe/payments.test.ts`          |
| 4   | `app/api/stripe/connect/route.ts`    | `__tests__/integration/api/stripe/connect.test.ts`    |
| 5   | `app/api/stripe/callback/route.ts`   | `__tests__/integration/api/stripe/callback.test.ts`   |
| 6   | `app/api/stripe/disconnect/route.ts` | `__tests__/integration/api/stripe/disconnect.test.ts` |
| 7   | `app/api/stripe/webhook/route.ts`    | `__tests__/integration/api/stripe/webhook.test.ts`    |

---

## BATCH 2: Auth & Security (8 tests)

**Priority:** P0 - CRITICAL

| #   | Source File                               | Test File                                                  |
| --- | ----------------------------------------- | ---------------------------------------------------------- |
| 1   | `lib/auth.ts`                             | `__tests__/unit/lib/auth.test.ts`                          |
| 2   | `lib/crypto/token-encryption.ts`          | `__tests__/unit/lib/crypto/token-encryption.test.ts`       |
| 3   | `lib/integrations/crypto.ts`              | `__tests__/unit/lib/integrations/crypto.test.ts`           |
| 4   | `app/api/auth/logout/route.ts`            | `__tests__/integration/api/auth/logout.test.ts`            |
| 5   | `app/api/auth/validate-referral/route.ts` | `__tests__/integration/api/auth/validate-referral.test.ts` |
| 6   | `app/api/admin/referral-codes/route.ts`   | `__tests__/integration/api/admin/referral-codes.test.ts`   |
| 7   | `lib/middleware/rate-limit.ts`            | `__tests__/unit/lib/middleware/rate-limit.test.ts`         |
| 8   | `lib/env.ts`                              | `__tests__/unit/lib/env.test.ts`                           |

---

## BATCH 3: Business Profile (7 tests)

**Priority:** P0 - CRITICAL

| #   | Source File                                     | Test File                                                           |
| --- | ----------------------------------------------- | ------------------------------------------------------------------- |
| 1   | `lib/business-profile/service.ts`               | `__tests__/unit/lib/business-profile/service.test.ts`               |
| 2   | `lib/business-profile/ai-section-generator.ts`  | `__tests__/unit/lib/business-profile/ai-section-generator.test.ts`  |
| 3   | `lib/business-profile/generator-integration.ts` | `__tests__/unit/lib/business-profile/generator-integration.test.ts` |
| 4   | `lib/business-profile/index.ts`                 | `__tests__/unit/lib/business-profile/index.test.ts`                 |
| 5   | `app/api/context/business-profile/route.ts`     | `__tests__/integration/api/context/business-profile.test.ts`        |
| 6   | `app/api/context/generate-section/route.ts`     | `__tests__/integration/api/context/generate-section.test.ts`        |
| 7   | `app/api/context/parse-gpt-paste/route.ts`      | `__tests__/integration/api/context/parse-gpt-paste.test.ts`         |

---

## BATCH 4: Social Integrations - Part 1 (8 tests)

**Priority:** P0 - CRITICAL

| #   | Source File                     | Test File                                           |
| --- | ------------------------------- | --------------------------------------------------- |
| 1   | `lib/integrations/facebook.ts`  | `__tests__/unit/lib/integrations/facebook.test.ts`  |
| 2   | `lib/integrations/instagram.ts` | `__tests__/unit/lib/integrations/instagram.test.ts` |
| 3   | `lib/integrations/twitter.ts`   | `__tests__/unit/lib/integrations/twitter.test.ts`   |
| 4   | `lib/integrations/linkedin.ts`  | `__tests__/unit/lib/integrations/linkedin.test.ts`  |
| 5   | `lib/integrations/gmail.ts`     | `__tests__/unit/lib/integrations/gmail.test.ts`     |
| 6   | `lib/integrations/calendar.ts`  | `__tests__/unit/lib/integrations/calendar.test.ts`  |
| 7   | `lib/integrations/meta-ads.ts`  | `__tests__/unit/lib/integrations/meta-ads.test.ts`  |

---

## BATCH 5: Marketing Services - Part 1 (10 tests)

**Priority:** P0/P1

| #   | Source File                                    | Test File                                                          |
| --- | ---------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `lib/marketing/publisher-service.ts`           | `__tests__/unit/lib/marketing/publisher-service.test.ts`           |
| 2   | `lib/marketing/content-architect-service.ts`   | `__tests__/unit/lib/marketing/content-architect-service.test.ts`   |
| 3   | `lib/marketing/analytics-collector-service.ts` | `__tests__/unit/lib/marketing/analytics-collector-service.test.ts` |
| 4   | `lib/marketing/cta-strategist-service.ts`      | `__tests__/unit/lib/marketing/cta-strategist-service.test.ts`      |
| 5   | `lib/marketing/intake-integration-service.ts`  | `__tests__/unit/lib/marketing/intake-integration-service.test.ts`  |
| 6   | `lib/marketing/niche-model-service.ts`         | `__tests__/unit/lib/marketing/niche-model-service.test.ts`         |
| 7   | `lib/marketing/preflight-service.ts`           | `__tests__/unit/lib/marketing/preflight-service.test.ts`           |
| 8   | `lib/marketing/social-scraper-service.ts`      | `__tests__/unit/lib/marketing/social-scraper-service.test.ts`      |
| 9   | `lib/marketing/story-weaver-service.ts`        | `__tests__/unit/lib/marketing/story-weaver-service.test.ts`        |
| 10  | `lib/marketing/trend-scanner-service.ts`       | `__tests__/unit/lib/marketing/trend-scanner-service.test.ts`       |

---

## BATCH 6: Marketing API Routes - Part 1 (20 tests)

**Priority:** P1

| #   | Source File                                                   | Test File                                                         |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `app/api/marketing/briefs/route.ts`                           | `__tests__/integration/api/marketing/briefs.test.ts`              |
| 2   | `app/api/marketing/briefs/[briefId]/generate/route.ts`        | `__tests__/integration/api/marketing/brief-generate.test.ts`      |
| 3   | `app/api/marketing/briefs/[briefId]/variants/route.ts`        | `__tests__/integration/api/marketing/brief-variants.test.ts`      |
| 4   | `app/api/marketing/calendar/route.ts`                         | `__tests__/integration/api/marketing/calendar.test.ts`            |
| 5   | `app/api/marketing/calendar/[entryId]/route.ts`               | `__tests__/integration/api/marketing/calendar-entry.test.ts`      |
| 6   | `app/api/marketing/calendar/[entryId]/promote/route.ts`       | `__tests__/integration/api/marketing/calendar-promote.test.ts`    |
| 7   | `app/api/marketing/profiles/route.ts`                         | `__tests__/integration/api/marketing/profiles.test.ts`            |
| 8   | `app/api/marketing/profiles/[profileId]/route.ts`             | `__tests__/integration/api/marketing/profile-by-id.test.ts`       |
| 9   | `app/api/marketing/profiles/[profileId]/analyze-url/route.ts` | `__tests__/integration/api/marketing/profile-analyze-url.test.ts` |
| 10  | `app/api/marketing/profiles/[profileId]/calibrate/route.ts`   | `__tests__/integration/api/marketing/profile-calibrate.test.ts`   |
| 11  | `app/api/marketing/publish/route.ts`                          | `__tests__/integration/api/marketing/publish.test.ts`             |
| 12  | `app/api/marketing/publish/[publishId]/status/route.ts`       | `__tests__/integration/api/marketing/publish-status.test.ts`      |
| 13  | `app/api/marketing/publish/test/route.ts`                     | `__tests__/integration/api/marketing/publish-test.test.ts`        |
| 14  | `app/api/marketing/variants/[variantId]/route.ts`             | `__tests__/integration/api/marketing/variant-by-id.test.ts`       |
| 15  | `app/api/marketing/variants/[variantId]/approve/route.ts`     | `__tests__/integration/api/marketing/variant-approve.test.ts`     |
| 16  | `app/api/marketing/variants/[variantId]/reject/route.ts`      | `__tests__/integration/api/marketing/variant-reject.test.ts`      |
| 17  | `app/api/marketing/variants/approval-queue/route.ts`          | `__tests__/integration/api/marketing/approval-queue.test.ts`      |
| 18  | `app/api/marketing/validate/route.ts`                         | `__tests__/integration/api/marketing/validate.test.ts`            |
| 19  | `app/api/marketing/validate/[variantId]/route.ts`             | `__tests__/integration/api/marketing/validate-variant.test.ts`    |
| 20  | `app/api/marketing/analytics/route.ts`                        | `__tests__/integration/api/marketing/analytics.test.ts`           |

---

## BATCH 7: Marketing API Routes - Part 2 (10 tests)

**Priority:** P1/P2

| #   | Source File                                          | Test File                                                           |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | `app/api/marketing/analytics/experiments/route.ts`   | `__tests__/integration/api/marketing/analytics-experiments.test.ts` |
| 2   | `app/api/marketing/analytics/post/[postId]/route.ts` | `__tests__/integration/api/marketing/analytics-post.test.ts`        |
| 3   | `app/api/marketing/activity-log/route.ts`            | `__tests__/integration/api/marketing/activity-log.test.ts`          |
| 4   | `app/api/marketing/experiments/route.ts`             | `__tests__/integration/api/marketing/experiments.test.ts`           |
| 5   | `app/api/marketing/export/route.ts`                  | `__tests__/integration/api/marketing/export.test.ts`                |
| 6   | `app/api/marketing/import/route.ts`                  | `__tests__/integration/api/marketing/import.test.ts`                |
| 7   | `app/api/marketing/media/route.ts`                   | `__tests__/integration/api/marketing/media.test.ts`                 |
| 8   | `app/api/marketing/templates/route.ts`               | `__tests__/integration/api/marketing/templates.test.ts`             |
| 9   | `app/api/marketing/trends/route.ts`                  | `__tests__/integration/api/marketing/trends.test.ts`                |
| 10  | `app/api/marketing/trends/[trendId]/brief/route.ts`  | `__tests__/integration/api/marketing/trend-brief.test.ts`           |

---

## BATCH 8: Followup Services - Gaps (15 tests)

**Priority:** P1

| #   | Source File                                   | Test File                                                         |
| --- | --------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `lib/followup/analytics-service.ts`           | `__tests__/unit/lib/followup/analytics-service.test.ts`           |
| 2   | `lib/followup/delivery-service.ts`            | `__tests__/unit/lib/followup/delivery-service.test.ts`            |
| 3   | `lib/followup/gmail-oauth-service.ts`         | `__tests__/unit/lib/followup/gmail-oauth-service.test.ts`         |
| 4   | `lib/followup/global-analytics-service.ts`    | `__tests__/unit/lib/followup/global-analytics-service.test.ts`    |
| 5   | `lib/followup/iterative-message-generator.ts` | `__tests__/unit/lib/followup/iterative-message-generator.test.ts` |
| 6   | `lib/followup/knowledge-base-aggregator.ts`   | `__tests__/unit/lib/followup/knowledge-base-aggregator.test.ts`   |
| 7   | `lib/followup/message-generation-service.ts`  | `__tests__/unit/lib/followup/message-generation-service.test.ts`  |
| 8   | `lib/followup/queue-processor.ts`             | `__tests__/unit/lib/followup/queue-processor.test.ts`             |
| 9   | `lib/followup/segmentation-service.ts`        | `__tests__/unit/lib/followup/segmentation-service.test.ts`        |
| 10  | `lib/followup/template-generator-service.ts`  | `__tests__/unit/lib/followup/template-generator-service.test.ts`  |
| 11  | `lib/followup/default-templates.ts`           | `__tests__/unit/lib/followup/default-templates.test.ts`           |
| 12  | `lib/followup/message-templates.ts`           | `__tests__/unit/lib/followup/message-templates.test.ts`           |
| 13  | `lib/followup/providers/email-provider.ts`    | `__tests__/unit/lib/followup/providers/email-provider.test.ts`    |
| 14  | `lib/followup/providers/gmail-provider.ts`    | `__tests__/unit/lib/followup/providers/gmail-provider.test.ts`    |
| 15  | `lib/followup/providers/sms-provider.ts`      | `__tests__/unit/lib/followup/providers/sms-provider.test.ts`      |

---

## BATCH 9: Followup API Routes - Part 1 (20 tests)

**Priority:** P1

| #   | Source File                                                                        | Test File                                                            |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | `app/api/followup/sequences/route.ts`                                              | `__tests__/integration/api/followup/sequences.test.ts`               |
| 2   | `app/api/followup/sequences/[sequenceId]/route.ts`                                 | `__tests__/integration/api/followup/sequence-by-id.test.ts`          |
| 3   | `app/api/followup/sequences/[sequenceId]/messages/route.ts`                        | `__tests__/integration/api/followup/sequence-messages.test.ts`       |
| 4   | `app/api/followup/sequences/[sequenceId]/messages/[messageId]/route.ts`            | `__tests__/integration/api/followup/message-by-id.test.ts`           |
| 5   | `app/api/followup/sequences/[sequenceId]/messages/[messageId]/regenerate/route.ts` | `__tests__/integration/api/followup/message-regenerate.test.ts`      |
| 6   | `app/api/followup/sequences/[sequenceId]/generate-messages/route.ts`               | `__tests__/integration/api/followup/generate-messages.test.ts`       |
| 7   | `app/api/followup/sequences/create-default/route.ts`                               | `__tests__/integration/api/followup/create-default-sequence.test.ts` |
| 8   | `app/api/followup/sequences/generate/route.ts`                                     | `__tests__/integration/api/followup/generate-sequence.test.ts`       |
| 9   | `app/api/followup/prospects/route.ts`                                              | `__tests__/integration/api/followup/prospects.test.ts`               |
| 10  | `app/api/followup/prospects/[prospectId]/route.ts`                                 | `__tests__/integration/api/followup/prospect-by-id.test.ts`          |
| 11  | `app/api/followup/stories/route.ts`                                                | `__tests__/integration/api/followup/stories.test.ts`                 |
| 12  | `app/api/followup/stories/[storyId]/route.ts`                                      | `__tests__/integration/api/followup/story-by-id.test.ts`             |
| 13  | `app/api/followup/agent-configs/route.ts`                                          | `__tests__/integration/api/followup/agent-configs.test.ts`           |
| 14  | `app/api/followup/agent-configs/[configId]/route.ts`                               | `__tests__/integration/api/followup/agent-config-by-id.test.ts`      |
| 15  | `app/api/followup/analytics/route.ts`                                              | `__tests__/integration/api/followup/analytics.test.ts`               |
| 16  | `app/api/followup/global-analytics/route.ts`                                       | `__tests__/integration/api/followup/global-analytics.test.ts`        |
| 17  | `app/api/followup/global-prospects/route.ts`                                       | `__tests__/integration/api/followup/global-prospects.test.ts`        |
| 18  | `app/api/followup/messages/route.ts`                                               | `__tests__/integration/api/followup/messages.test.ts`                |
| 19  | `app/api/followup/track/route.ts`                                                  | `__tests__/integration/api/followup/track.test.ts`                   |
| 20  | `app/api/followup/trigger/route.ts`                                                | `__tests__/integration/api/followup/trigger.test.ts`                 |

---

## BATCH 10: Followup API Routes - Part 2 (12 tests)

**Priority:** P1/P2

| #   | Source File                                      | Test File                                                         |
| --- | ------------------------------------------------ | ----------------------------------------------------------------- |
| 1   | `app/api/followup/content/select/route.ts`       | `__tests__/integration/api/followup/content-select.test.ts`       |
| 2   | `app/api/followup/generate-brand-voice/route.ts` | `__tests__/integration/api/followup/generate-brand-voice.test.ts` |
| 3   | `app/api/followup/sender/update/route.ts`        | `__tests__/integration/api/followup/sender-update.test.ts`        |
| 4   | `app/api/followup/test-message/route.ts`         | `__tests__/integration/api/followup/test-message.test.ts`         |
| 5   | `app/api/followup/webhooks/email/route.ts`       | `__tests__/integration/api/followup/webhooks-email.test.ts`       |
| 6   | `app/api/followup/webhooks/sms/route.ts`         | `__tests__/integration/api/followup/webhooks-sms.test.ts`         |
| 7   | `app/api/followup/gmail/connect/route.ts`        | `__tests__/integration/api/followup/gmail-connect.test.ts`        |
| 8   | `app/api/followup/gmail/callback/route.ts`       | `__tests__/integration/api/followup/gmail-callback.test.ts`       |
| 9   | `app/api/followup/gmail/disconnect/route.ts`     | `__tests__/integration/api/followup/gmail-disconnect.test.ts`     |
| 10  | `app/api/followup/gmail/status/route.ts`         | `__tests__/integration/api/followup/gmail-status.test.ts`         |

---

## BATCH 11: Ads Module (13 tests)

**Priority:** P1

| #   | Source File                                 | Test File                                                   |
| --- | ------------------------------------------- | ----------------------------------------------------------- |
| 1   | `lib/ads/ad-generator.ts`                   | `__tests__/unit/lib/ads/ad-generator.test.ts`               |
| 2   | `lib/ads/metrics-fetcher.ts`                | `__tests__/unit/lib/ads/metrics-fetcher.test.ts`            |
| 3   | `lib/ads/optimization-engine.ts`            | `__tests__/unit/lib/ads/optimization-engine.test.ts`        |
| 4   | `lib/ads/validation-schemas.ts`             | `__tests__/unit/lib/ads/validation-schemas.test.ts`         |
| 5   | `app/api/ads/accounts/route.ts`             | `__tests__/integration/api/ads/accounts.test.ts`            |
| 6   | `app/api/ads/campaigns/create/route.ts`     | `__tests__/integration/api/ads/campaigns-create.test.ts`    |
| 7   | `app/api/ads/metrics/[campaignId]/route.ts` | `__tests__/integration/api/ads/metrics.test.ts`             |
| 8   | `app/api/ads/optimize/route.ts`             | `__tests__/integration/api/ads/optimize.test.ts`            |
| 9   | `app/api/ads/sync/route.ts`                 | `__tests__/integration/api/ads/sync.test.ts`                |
| 10  | `app/api/ads/variations/generate/route.ts`  | `__tests__/integration/api/ads/variations-generate.test.ts` |

---

## BATCH 12: Generation API Routes (12 tests)

**Priority:** P1

| #   | Source File                                           | Test File                                                       |
| --- | ----------------------------------------------------- | --------------------------------------------------------------- |
| 1   | `app/api/generate/offer/route.ts`                     | `__tests__/integration/api/generate/offer.test.ts`              |
| 2   | `app/api/generate/offer-alternatives/route.ts`        | `__tests__/integration/api/generate/offer-alternatives.test.ts` |
| 3   | `app/api/generate/auto-generate-all/route.ts`         | `__tests__/integration/api/generate/auto-generate-all.test.ts`  |
| 4   | `app/api/generate/deck-structure/route.ts`            | `__tests__/integration/api/generate/deck-structure.test.ts`     |
| 5   | `app/api/generate/enrollment-copy/route.ts`           | `__tests__/integration/api/generate/enrollment-copy.test.ts`    |
| 6   | `app/api/generate/registration-copy/route.ts`         | `__tests__/integration/api/generate/registration-copy.test.ts`  |
| 7   | `app/api/generate/watch-copy/route.ts`                | `__tests__/integration/api/generate/watch-copy.test.ts`         |
| 8   | `app/api/generate/gamma-decks/route.ts`               | `__tests__/integration/api/generate/gamma-decks.test.ts`        |
| 9   | `app/api/generate/generation-status/route.ts`         | `__tests__/integration/api/generate/generation-status.test.ts`  |
| 10  | `app/api/generate/talk-track/status/[jobId]/route.ts` | `__tests__/integration/api/generate/talk-track-status.test.ts`  |

---

## BATCH 13: Generators Library (16 tests)

**Priority:** P1/P2

| #   | Source File                                                         | Test File                                                                               |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | `lib/generators/enrollment-page-generator.ts`                       | `__tests__/unit/lib/generators/enrollment-page-generator.test.ts`                       |
| 2   | `lib/generators/watch-page-generator.ts`                            | `__tests__/unit/lib/generators/watch-page-generator.test.ts`                            |
| 3   | `lib/generators/enrollment-framework-prompts.ts`                    | `__tests__/unit/lib/generators/enrollment-framework-prompts.test.ts`                    |
| 4   | `lib/generators/registration-framework-prompts.ts`                  | `__tests__/unit/lib/generators/registration-framework-prompts.test.ts`                  |
| 5   | `lib/generators/section-templates/cta-template.ts`                  | `__tests__/unit/lib/generators/section-templates/cta-template.test.ts`                  |
| 6   | `lib/generators/section-templates/faq-template.ts`                  | `__tests__/unit/lib/generators/section-templates/faq-template.test.ts`                  |
| 7   | `lib/generators/section-templates/features-template.ts`             | `__tests__/unit/lib/generators/section-templates/features-template.test.ts`             |
| 8   | `lib/generators/section-templates/footer-template.ts`               | `__tests__/unit/lib/generators/section-templates/footer-template.test.ts`               |
| 9   | `lib/generators/section-templates/hero-template.ts`                 | `__tests__/unit/lib/generators/section-templates/hero-template.test.ts`                 |
| 10  | `lib/generators/section-templates/pricing-template.ts`              | `__tests__/unit/lib/generators/section-templates/pricing-template.test.ts`              |
| 11  | `lib/generators/section-templates/proof-template.ts`                | `__tests__/unit/lib/generators/section-templates/proof-template.test.ts`                |
| 12  | `lib/generators/section-templates/story-template.ts`                | `__tests__/unit/lib/generators/section-templates/story-template.test.ts`                |
| 13  | `lib/generators/section-templates/testimonial-template.ts`          | `__tests__/unit/lib/generators/section-templates/testimonial-template.test.ts`          |
| 14  | `lib/generators/section-templates/three-step-framework-template.ts` | `__tests__/unit/lib/generators/section-templates/three-step-framework-template.test.ts` |

---

## BATCH 14: Pages API Routes (20 tests)

**Priority:** P1

| #   | Source File                                                     | Test File                                                               |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `app/api/pages/route.ts`                                        | `__tests__/integration/api/pages/pages.test.ts`                         |
| 2   | `app/api/pages/[pageId]/webhook/route.ts`                       | `__tests__/integration/api/pages/page-webhook.test.ts`                  |
| 3   | `app/api/pages/registration/[pageId]/route.ts`                  | `__tests__/integration/api/pages/registration.test.ts`                  |
| 4   | `app/api/pages/registration/[pageId]/publish/route.ts`          | `__tests__/integration/api/pages/registration-publish.test.ts`          |
| 5   | `app/api/pages/registration/[pageId]/regenerate/route.ts`       | `__tests__/integration/api/pages/registration-regenerate.test.ts`       |
| 6   | `app/api/pages/registration/[pageId]/regenerate-field/route.ts` | `__tests__/integration/api/pages/registration-regenerate-field.test.ts` |
| 7   | `app/api/pages/registration/[pageId]/rewrite-field/route.ts`    | `__tests__/integration/api/pages/registration-rewrite-field.test.ts`    |
| 8   | `app/api/pages/enrollment/[pageId]/route.ts`                    | `__tests__/integration/api/pages/enrollment.test.ts`                    |
| 9   | `app/api/pages/enrollment/[pageId]/publish/route.ts`            | `__tests__/integration/api/pages/enrollment-publish.test.ts`            |
| 10  | `app/api/pages/enrollment/[pageId]/regenerate/route.ts`         | `__tests__/integration/api/pages/enrollment-regenerate.test.ts`         |
| 11  | `app/api/pages/enrollment/[pageId]/regenerate-field/route.ts`   | `__tests__/integration/api/pages/enrollment-regenerate-field.test.ts`   |
| 12  | `app/api/pages/enrollment/[pageId]/rewrite-field/route.ts`      | `__tests__/integration/api/pages/enrollment-rewrite-field.test.ts`      |
| 13  | `app/api/pages/watch/[pageId]/route.ts`                         | `__tests__/integration/api/pages/watch.test.ts`                         |
| 14  | `app/api/pages/watch/[pageId]/publish/route.ts`                 | `__tests__/integration/api/pages/watch-publish.test.ts`                 |
| 15  | `app/api/pages/watch/[pageId]/rewrite-field/route.ts`           | `__tests__/integration/api/pages/watch-rewrite-field.test.ts`           |
| 16  | `app/api/pages/generate-image/route.ts`                         | `__tests__/integration/api/pages/generate-image.test.ts`                |
| 17  | `app/api/pages/generate-section-copy/route.ts`                  | `__tests__/integration/api/pages/generate-section-copy.test.ts`         |
| 18  | `app/api/pages/media/route.ts`                                  | `__tests__/integration/api/pages/media.test.ts`                         |
| 19  | `app/api/pages/pitch-videos/route.ts`                           | `__tests__/integration/api/pages/pitch-videos.test.ts`                  |
| 20  | `app/api/pages/upload-image/route.ts`                           | `__tests__/integration/api/pages/upload-image.test.ts`                  |

---

## BATCH 15: Funnel Integration API Routes (15 tests)

**Priority:** P1

| #   | Source File                                                           | Test File                                                                  |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `app/api/funnel/flows/create/route.ts`                                | `__tests__/integration/api/funnel/flows-create.test.ts`                    |
| 2   | `app/api/funnel/[projectId]/integrations/facebook/connect/route.ts`   | `__tests__/integration/api/funnel/integrations/facebook-connect.test.ts`   |
| 3   | `app/api/funnel/[projectId]/integrations/facebook/callback/route.ts`  | `__tests__/integration/api/funnel/integrations/facebook-callback.test.ts`  |
| 4   | `app/api/funnel/[projectId]/integrations/instagram/connect/route.ts`  | `__tests__/integration/api/funnel/integrations/instagram-connect.test.ts`  |
| 5   | `app/api/funnel/[projectId]/integrations/instagram/callback/route.ts` | `__tests__/integration/api/funnel/integrations/instagram-callback.test.ts` |
| 6   | `app/api/funnel/[projectId]/integrations/twitter/connect/route.ts`    | `__tests__/integration/api/funnel/integrations/twitter-connect.test.ts`    |
| 7   | `app/api/funnel/[projectId]/integrations/twitter/callback/route.ts`   | `__tests__/integration/api/funnel/integrations/twitter-callback.test.ts`   |
| 8   | `app/api/funnel/[projectId]/integrations/linkedin/connect/route.ts`   | `__tests__/integration/api/funnel/integrations/linkedin-connect.test.ts`   |
| 9   | `app/api/funnel/[projectId]/integrations/linkedin/callback/route.ts`  | `__tests__/integration/api/funnel/integrations/linkedin-callback.test.ts`  |
| 10  | `app/api/funnel/[projectId]/integrations/gmail/connect/route.ts`      | `__tests__/integration/api/funnel/integrations/gmail-connect.test.ts`      |
| 11  | `app/api/funnel/[projectId]/integrations/gmail/callback/route.ts`     | `__tests__/integration/api/funnel/integrations/gmail-callback.test.ts`     |
| 12  | `app/api/funnel/[projectId]/integrations/calendar/connect/route.ts`   | `__tests__/integration/api/funnel/integrations/calendar-connect.test.ts`   |
| 13  | `app/api/funnel/[projectId]/integrations/calendar/callback/route.ts`  | `__tests__/integration/api/funnel/integrations/calendar-callback.test.ts`  |
| 14  | `app/api/funnel/[projectId]/integrations/disconnect/route.ts`         | `__tests__/integration/api/funnel/integrations/disconnect.test.ts`         |

---

## BATCH 16: Core API Routes (20 tests)

**Priority:** P1

| #   | Source File                                  | Test File                                                  |
| --- | -------------------------------------------- | ---------------------------------------------------------- |
| 1   | `app/api/contacts/route.ts`                  | `__tests__/integration/api/contacts/contacts.test.ts`      |
| 2   | `app/api/contacts/[contactId]/route.ts`      | `__tests__/integration/api/contacts/contact-by-id.test.ts` |
| 3   | `app/api/domains/route.ts`                   | `__tests__/integration/api/domains/domains.test.ts`        |
| 4   | `app/api/domains/[domainId]/route.ts`        | `__tests__/integration/api/domains/domain-by-id.test.ts`   |
| 5   | `app/api/domains/[domainId]/verify/route.ts` | `__tests__/integration/api/domains/verify.test.ts`         |
| 6   | `app/api/ai-assistant/context/route.ts`      | `__tests__/integration/api/ai-assistant/context.test.ts`   |
| 7   | `app/api/analytics/funnel/route.ts`          | `__tests__/integration/api/analytics/funnel.test.ts`       |
| 8   | `app/api/analytics/track/route.ts`           | `__tests__/integration/api/analytics/track.test.ts`        |
| 9   | `app/api/intake/paste/route.ts`              | `__tests__/integration/api/intake/paste.test.ts`           |
| 10  | `app/api/intake/scrape/route.ts`             | `__tests__/integration/api/intake/scrape.test.ts`          |
| 11  | `app/api/intake/upload/route.ts`             | `__tests__/integration/api/intake/upload.test.ts`          |
| 12  | `app/api/intake/rename/route.ts`             | `__tests__/integration/api/intake/rename.test.ts`          |
| 13  | `app/api/intake/google-drive/route.ts`       | `__tests__/integration/api/intake/google-drive.test.ts`    |
| 14  | `app/api/health/route.ts`                    | `__tests__/integration/api/health.test.ts`                 |
| 15  | `lib/pages/section-copy-generator.ts`        | `__tests__/unit/lib/pages/section-copy-generator.test.ts`  |
| 16  | `lib/intake/processors.ts`                   | `__tests__/unit/lib/intake/processors.test.ts`             |
| 17  | `lib/ai-assistant/action-executor.ts`        | `__tests__/unit/lib/ai-assistant/action-executor.test.ts`  |
| 18  | `lib/ai-assistant/business-context.ts`       | `__tests__/unit/lib/ai-assistant/business-context.test.ts` |
| 19  | `lib/ai-assistant/page-context.ts`           | `__tests__/unit/lib/ai-assistant/page-context.test.ts`     |

---

## BATCH 17: Infrastructure & External Services (18 tests)

**Priority:** P2

| #   | Source File                                   | Test File                                                 |
| --- | --------------------------------------------- | --------------------------------------------------------- |
| 1   | `lib/supabase/client.ts`                      | `__tests__/unit/lib/supabase/client.test.ts`              |
| 2   | `lib/supabase/server.ts`                      | `__tests__/unit/lib/supabase/server.test.ts`              |
| 3   | `lib/supabase/middleware.ts`                  | `__tests__/unit/lib/supabase/middleware.test.ts`          |
| 4   | `lib/cloudflare/client.ts`                    | `__tests__/unit/lib/cloudflare/client.test.ts`            |
| 5   | `lib/cloudflare/types.ts`                     | `__tests__/unit/lib/cloudflare/types.test.ts`             |
| 6   | `lib/gamma/client.ts`                         | `__tests__/unit/lib/gamma/client.test.ts`                 |
| 7   | `lib/gamma/types.ts`                          | `__tests__/unit/lib/gamma/types.test.ts`                  |
| 8   | `lib/vapi/client.ts`                          | `__tests__/unit/lib/vapi/client.test.ts`                  |
| 9   | `lib/vapi/types.ts`                           | `__tests__/unit/lib/vapi/types.test.ts`                   |
| 10  | `lib/openai/assistants-client.ts`             | `__tests__/unit/lib/openai/assistants-client.test.ts`     |
| 11  | `lib/ai/client.ts`                            | `__tests__/unit/lib/ai/client.test.ts`                    |
| 12  | `app/api/cloudflare/upload-url/route.ts`      | `__tests__/integration/api/cloudflare/upload-url.test.ts` |
| 13  | `app/api/cloudflare/video/[videoId]/route.ts` | `__tests__/integration/api/cloudflare/video.test.ts`      |
| 14  | `app/api/gamma/export/route.ts`               | `__tests__/integration/api/gamma/export.test.ts`          |
| 15  | `app/api/vapi/initiate-call/route.ts`         | `__tests__/integration/api/vapi/initiate-call.test.ts`    |
| 16  | `app/api/vapi/webhook/route.ts`               | `__tests__/integration/api/vapi/webhook.test.ts`          |
| 17  | `app/api/support/chat/thread/route.ts`        | `__tests__/integration/api/support/chat-thread.test.ts`   |
| 18  | `app/api/support/chat/message/route.ts`       | `__tests__/integration/api/support/chat-message.test.ts`  |

---

## BATCH 18: Scraping & Utils (14 tests)

**Priority:** P2

| #   | Source File                            | Test File                                                |
| --- | -------------------------------------- | -------------------------------------------------------- |
| 1   | `lib/scraping/cache.ts`                | `__tests__/unit/lib/scraping/cache.test.ts`              |
| 2   | `lib/scraping/constants.ts`            | `__tests__/unit/lib/scraping/constants.test.ts`          |
| 3   | `lib/scraping/content-extractor.ts`    | `__tests__/unit/lib/scraping/content-extractor.test.ts`  |
| 4   | `lib/scraping/facebook-api.ts`         | `__tests__/unit/lib/scraping/facebook-api.test.ts`       |
| 5   | `lib/scraping/instagram-api.ts`        | `__tests__/unit/lib/scraping/instagram-api.test.ts`      |
| 6   | `lib/scraping/linkedin-api.ts`         | `__tests__/unit/lib/scraping/linkedin-api.test.ts`       |
| 7   | `lib/utils/color-contrast.ts`          | `__tests__/unit/lib/utils/color-contrast.test.ts`        |
| 8   | `lib/utils/icon-mapper.ts`             | `__tests__/unit/lib/utils/icon-mapper.test.ts`           |
| 9   | `lib/ai/design-system-guidelines.ts`   | `__tests__/unit/lib/ai/design-system-guidelines.test.ts` |
| 10  | `lib/ai/types.ts`                      | `__tests__/unit/lib/ai/types.test.ts`                    |
| 11  | `lib/webhook-service.ts`               | `__tests__/unit/lib/webhook-service.test.ts`             |
| 12  | `app/api/scrape/brand-colors/route.ts` | `__tests__/integration/api/scrape/brand-colors.test.ts`  |
| 13  | `app/api/user/webhook/test/route.ts`   | `__tests__/integration/api/user/webhook-test.test.ts`    |
| 14  | `app/api/debug-env/route.ts`           | `__tests__/integration/api/debug-env.test.ts`            |

---

## BATCH 19: Followup Components (17 tests)

**Priority:** P1

| #   | Source File                                       | Test File                                                             |
| --- | ------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | `components/followup/agent-config-form.tsx`       | `__tests__/unit/components/followup/agent-config-form.test.tsx`       |
| 2   | `components/followup/ai-followup-dashboard.tsx`   | `__tests__/unit/components/followup/ai-followup-dashboard.test.tsx`   |
| 3   | `components/followup/analytics-dashboard.tsx`     | `__tests__/unit/components/followup/analytics-dashboard.test.tsx`     |
| 4   | `components/followup/global-dashboard.tsx`        | `__tests__/unit/components/followup/global-dashboard.test.tsx`        |
| 5   | `components/followup/global-prospect-list.tsx`    | `__tests__/unit/components/followup/global-prospect-list.test.tsx`    |
| 6   | `components/followup/global-prospects-table.tsx`  | `__tests__/unit/components/followup/global-prospects-table.test.tsx`  |
| 7   | `components/followup/message-preview.tsx`         | `__tests__/unit/components/followup/message-preview.test.tsx`         |
| 8   | `components/followup/message-template-editor.tsx` | `__tests__/unit/components/followup/message-template-editor.test.tsx` |
| 9   | `components/followup/onboarding-banner.tsx`       | `__tests__/unit/components/followup/onboarding-banner.test.tsx`       |
| 10  | `components/followup/prospect-list.tsx`           | `__tests__/unit/components/followup/prospect-list.test.tsx`           |
| 11  | `components/followup/prospects-kanban.tsx`        | `__tests__/unit/components/followup/prospects-kanban.test.tsx`        |
| 12  | `components/followup/sender-setup-tab.tsx`        | `__tests__/unit/components/followup/sender-setup-tab.test.tsx`        |
| 13  | `components/followup/sequence-builder.tsx`        | `__tests__/unit/components/followup/sequence-builder.test.tsx`        |
| 14  | `components/followup/sequence-manager.tsx`        | `__tests__/unit/components/followup/sequence-manager.test.tsx`        |
| 15  | `components/followup/story-library-manager.tsx`   | `__tests__/unit/components/followup/story-library-manager.test.tsx`   |
| 16  | `components/followup/story-library.tsx`           | `__tests__/unit/components/followup/story-library.test.tsx`           |
| 17  | `components/followup/test-message-modal.tsx`      | `__tests__/unit/components/followup/test-message-modal.test.tsx`      |

---

## BATCH 20: Marketing Components - Part 1 (20 tests)

**Priority:** P1

| #   | Source File                                                       | Test File                                                                             |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | `components/marketing/approval-workflow-modal.tsx`                | `__tests__/unit/components/marketing/approval-workflow-modal.test.tsx`                |
| 2   | `components/marketing/brief-template-library.tsx`                 | `__tests__/unit/components/marketing/brief-template-library.test.tsx`                 |
| 3   | `components/marketing/compliance-validator.tsx`                   | `__tests__/unit/components/marketing/compliance-validator.test.tsx`                   |
| 4   | `components/marketing/content-calendar-enhanced.tsx`              | `__tests__/unit/components/marketing/content-calendar-enhanced.test.tsx`              |
| 5   | `components/marketing/content-calendar.tsx`                       | `__tests__/unit/components/marketing/content-calendar.test.tsx`                       |
| 6   | `components/marketing/content-generator-enhanced.tsx`             | `__tests__/unit/components/marketing/content-generator-enhanced.test.tsx`             |
| 7   | `components/marketing/content-generator.tsx`                      | `__tests__/unit/components/marketing/content-generator.test.tsx`                      |
| 8   | `components/marketing/experiment-creator-modal.tsx`               | `__tests__/unit/components/marketing/experiment-creator-modal.test.tsx`               |
| 9   | `components/marketing/marketing-analytics-dashboard-enhanced.tsx` | `__tests__/unit/components/marketing/marketing-analytics-dashboard-enhanced.test.tsx` |
| 10  | `components/marketing/marketing-analytics-dashboard.tsx`          | `__tests__/unit/components/marketing/marketing-analytics-dashboard.test.tsx`          |
| 11  | `components/marketing/marketing-settings-enhanced.tsx`            | `__tests__/unit/components/marketing/marketing-settings-enhanced.test.tsx`            |
| 12  | `components/marketing/marketing-settings.tsx`                     | `__tests__/unit/components/marketing/marketing-settings.test.tsx`                     |
| 13  | `components/marketing/media-library-modal.tsx`                    | `__tests__/unit/components/marketing/media-library-modal.test.tsx`                    |
| 14  | `components/marketing/platform-preview-modal.tsx`                 | `__tests__/unit/components/marketing/platform-preview-modal.test.tsx`                 |
| 15  | `components/marketing/post-variant-card-enhanced.tsx`             | `__tests__/unit/components/marketing/post-variant-card-enhanced.test.tsx`             |
| 16  | `components/marketing/post-variant-card.tsx`                      | `__tests__/unit/components/marketing/post-variant-card.test.tsx`                      |
| 17  | `components/marketing/profile-config-form-enhanced.tsx`           | `__tests__/unit/components/marketing/profile-config-form-enhanced.test.tsx`           |
| 18  | `components/marketing/profile-config-form.tsx`                    | `__tests__/unit/components/marketing/profile-config-form.test.tsx`                    |
| 19  | `components/marketing/scheduling-modal.tsx`                       | `__tests__/unit/components/marketing/scheduling-modal.test.tsx`                       |
| 20  | `components/marketing/variant-inline-editor.tsx`                  | `__tests__/unit/components/marketing/variant-inline-editor.test.tsx`                  |

---

## BATCH 21: Marketing Components - Part 2 & Funnel Components (20 tests)

**Priority:** P1/P2

| #   | Source File                                         | Test File                                                               |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `components/marketing/recurring-post-scheduler.tsx` | `__tests__/unit/components/marketing/recurring-post-scheduler.test.tsx` |
| 2   | `components/marketing/story-angle-selector.tsx`     | `__tests__/unit/components/marketing/story-angle-selector.test.tsx`     |
| 3   | `components/marketing/token-insertion-menu.tsx`     | `__tests__/unit/components/marketing/token-insertion-menu.test.tsx`     |
| 4   | `components/marketing/trend-explorer-enhanced.tsx`  | `__tests__/unit/components/marketing/trend-explorer-enhanced.test.tsx`  |
| 5   | `components/marketing/trend-explorer.tsx`           | `__tests__/unit/components/marketing/trend-explorer.test.tsx`           |
| 6   | `components/marketing/utm-builder.tsx`              | `__tests__/unit/components/marketing/utm-builder.test.tsx`              |
| 7   | `components/funnel/analytics-dashboard.tsx`         | `__tests__/unit/components/funnel/analytics-dashboard.test.tsx`         |
| 8   | `components/funnel/deck-structure-editor.tsx`       | `__tests__/unit/components/funnel/deck-structure-editor.test.tsx`       |
| 9   | `components/funnel/dependency-warning.tsx`          | `__tests__/unit/components/funnel/dependency-warning.test.tsx`          |
| 10  | `components/funnel/funnel-contacts-view.tsx`        | `__tests__/unit/components/funnel/funnel-contacts-view.test.tsx`        |
| 11  | `components/funnel/funnel-dashboard-tabs.tsx`       | `__tests__/unit/components/funnel/funnel-dashboard-tabs.test.tsx`       |
| 12  | `components/funnel/funnel-followup-view.tsx`        | `__tests__/unit/components/funnel/funnel-followup-view.test.tsx`        |
| 13  | `components/funnel/funnel-pages-view.tsx`           | `__tests__/unit/components/funnel/funnel-pages-view.test.tsx`           |
| 14  | `components/funnel/funnel-settings-view.tsx`        | `__tests__/unit/components/funnel/funnel-settings-view.test.tsx`        |
| 15  | `components/funnel/gamma-theme-selector.tsx`        | `__tests__/unit/components/funnel/gamma-theme-selector.test.tsx`        |
| 16  | `components/funnel/horizontal-master-steps.tsx`     | `__tests__/unit/components/funnel/horizontal-master-steps.test.tsx`     |
| 17  | `components/funnel/offer-editor.tsx`                | `__tests__/unit/components/funnel/offer-editor.test.tsx`                |
| 18  | `components/funnel/step-layout.tsx`                 | `__tests__/unit/components/funnel/step-layout.test.tsx`                 |
| 19  | `components/funnel/stepper-nav.tsx`                 | `__tests__/unit/components/funnel/stepper-nav.test.tsx`                 |
| 20  | `components/funnel/video-uploader.tsx`              | `__tests__/unit/components/funnel/video-uploader.test.tsx`              |

---

## BATCH 22: Funnel Settings & Builder Components (20 tests)

**Priority:** P2

| #   | Source File                                            | Test File                                                                  |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | `components/funnel/vapi-call-widget.tsx`               | `__tests__/unit/components/funnel/vapi-call-widget.test.tsx`               |
| 2   | `components/funnel/settings/calendar-integration.tsx`  | `__tests__/unit/components/funnel/settings/calendar-integration.test.tsx`  |
| 3   | `components/funnel/settings/domain-settings.tsx`       | `__tests__/unit/components/funnel/settings/domain-settings.test.tsx`       |
| 4   | `components/funnel/settings/facebook-integration.tsx`  | `__tests__/unit/components/funnel/settings/facebook-integration.test.tsx`  |
| 5   | `components/funnel/settings/gmail-integration.tsx`     | `__tests__/unit/components/funnel/settings/gmail-integration.test.tsx`     |
| 6   | `components/funnel/settings/instagram-integration.tsx` | `__tests__/unit/components/funnel/settings/instagram-integration.test.tsx` |
| 7   | `components/funnel/settings/social-integrations.tsx`   | `__tests__/unit/components/funnel/settings/social-integrations.test.tsx`   |
| 8   | `components/funnel/settings/twitter-integration.tsx`   | `__tests__/unit/components/funnel/settings/twitter-integration.test.tsx`   |
| 9   | `components/funnel-builder/master-section-card.tsx`    | `__tests__/unit/components/funnel-builder/master-section-card.test.tsx`    |
| 10  | `components/funnel-builder/pages-list.tsx`             | `__tests__/unit/components/funnel-builder/pages-list.test.tsx`             |
| 11  | `components/funnel-builder/project-card.tsx`           | `__tests__/unit/components/funnel-builder/project-card.test.tsx`           |
| 12  | `components/ads/ad-variations-review.tsx`              | `__tests__/unit/components/ads/ad-variations-review.test.tsx`              |
| 13  | `components/ads/ads-performance-dashboard.tsx`         | `__tests__/unit/components/ads/ads-performance-dashboard.test.tsx`         |
| 14  | `components/ads/audience-builder.tsx`                  | `__tests__/unit/components/ads/audience-builder.test.tsx`                  |
| 15  | `components/ads/campaign-deployer.tsx`                 | `__tests__/unit/components/ads/campaign-deployer.test.tsx`                 |
| 16  | `components/ads/meta-account-selector.tsx`             | `__tests__/unit/components/ads/meta-account-selector.test.tsx`             |
| 17  | `components/auth/logout-button.tsx`                    | `__tests__/unit/components/auth/logout-button.test.tsx`                    |
| 18  | `components/settings/domains-settings.tsx`             | `__tests__/unit/components/settings/domains-settings.test.tsx`             |
| 19  | `components/settings/integrations-settings.tsx`        | `__tests__/unit/components/settings/integrations-settings.test.tsx`        |
| 20  | `components/settings/payments-settings.tsx`            | `__tests__/unit/components/settings/payments-settings.test.tsx`            |

---

## BATCH 23: Pages, Intake & Context Components (20 tests)

**Priority:** P1/P2

| #   | Source File                                    | Test File                                                          |
| --- | ---------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `components/settings/profile-settings.tsx`     | `__tests__/unit/components/settings/profile-settings.test.tsx`     |
| 2   | `components/pages/field-ai-rewrite-button.tsx` | `__tests__/unit/components/pages/field-ai-rewrite-button.test.tsx` |
| 3   | `components/pages/field-regenerate-modal.tsx`  | `__tests__/unit/components/pages/field-regenerate-modal.test.tsx`  |
| 4   | `components/pages/image-generation-modal.tsx`  | `__tests__/unit/components/pages/image-generation-modal.test.tsx`  |
| 5   | `components/pages/image-upload-button.tsx`     | `__tests__/unit/components/pages/image-upload-button.test.tsx`     |
| 6   | `components/pages/page-regenerate-button.tsx`  | `__tests__/unit/components/pages/page-regenerate-button.test.tsx`  |
| 7   | `components/pages/page-type-badge.tsx`         | `__tests__/unit/components/pages/page-type-badge.test.tsx`         |
| 8   | `components/pages/page-webhook-settings.tsx`   | `__tests__/unit/components/pages/page-webhook-settings.test.tsx`   |
| 9   | `components/pages/pages-filter-bar.tsx`        | `__tests__/unit/components/pages/pages-filter-bar.test.tsx`        |
| 10  | `components/pages/pages-table.tsx`             | `__tests__/unit/components/pages/pages-table.test.tsx`             |
| 11  | `components/pages/publish-toggle.tsx`          | `__tests__/unit/components/pages/publish-toggle.test.tsx`          |
| 12  | `components/pages/published-badge.tsx`         | `__tests__/unit/components/pages/published-badge.test.tsx`         |
| 13  | `components/pages/section-block-generator.tsx` | `__tests__/unit/components/pages/section-block-generator.test.tsx` |
| 14  | `components/pages/share-button.tsx`            | `__tests__/unit/components/pages/share-button.test.tsx`            |
| 15  | `components/pages/slug-editor.tsx`             | `__tests__/unit/components/pages/slug-editor.test.tsx`             |
| 16  | `components/pages/video-selector-modal.tsx`    | `__tests__/unit/components/pages/video-selector-modal.test.tsx`    |
| 17  | `components/intake/brand-data-display.tsx`     | `__tests__/unit/components/intake/brand-data-display.test.tsx`     |
| 18  | `components/intake/google-drive-intake.tsx`    | `__tests__/unit/components/intake/google-drive-intake.test.tsx`    |
| 19  | `components/intake/intake-data-viewer.tsx`     | `__tests__/unit/components/intake/intake-data-viewer.test.tsx`     |
| 20  | `components/intake/intake-method-selector.tsx` | `__tests__/unit/components/intake/intake-method-selector.test.tsx` |

---

## BATCH 24: Remaining Components (20 tests)

**Priority:** P2

| #   | Source File                                         | Test File                                                               |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `components/intake/metadata-display.tsx`            | `__tests__/unit/components/intake/metadata-display.test.tsx`            |
| 2   | `components/intake/paste-intake.tsx`                | `__tests__/unit/components/intake/paste-intake.test.tsx`                |
| 3   | `components/intake/pricing-display.tsx`             | `__tests__/unit/components/intake/pricing-display.test.tsx`             |
| 4   | `components/intake/scrape-intake.tsx`               | `__tests__/unit/components/intake/scrape-intake.test.tsx`               |
| 5   | `components/intake/upload-intake.tsx`               | `__tests__/unit/components/intake/upload-intake.test.tsx`               |
| 6   | `components/context/context-method-selector.tsx`    | `__tests__/unit/components/context/context-method-selector.test.tsx`    |
| 7   | `components/context/context-wizard.tsx`             | `__tests__/unit/components/context/context-wizard.test.tsx`             |
| 8   | `components/context/gpt-paste-mode.tsx`             | `__tests__/unit/components/context/gpt-paste-mode.test.tsx`             |
| 9   | `components/context/section-progress.tsx`           | `__tests__/unit/components/context/section-progress.test.tsx`           |
| 10  | `components/context/wizard-question.tsx`            | `__tests__/unit/components/context/wizard-question.test.tsx`            |
| 11  | `components/context/wizard-section.tsx`             | `__tests__/unit/components/context/wizard-section.test.tsx`             |
| 12  | `components/public/enrollment-page-template.tsx`    | `__tests__/unit/components/public/enrollment-page-template.test.tsx`    |
| 13  | `components/public/hero.tsx`                        | `__tests__/unit/components/public/hero.test.tsx`                        |
| 14  | `components/public/pricing.tsx`                     | `__tests__/unit/components/public/pricing.test.tsx`                     |
| 15  | `components/public/public-page-wrapper.tsx`         | `__tests__/unit/components/public/public-page-wrapper.test.tsx`         |
| 16  | `components/public/registration-page-template.tsx`  | `__tests__/unit/components/public/registration-page-template.test.tsx`  |
| 17  | `components/public/watch-page-template.tsx`         | `__tests__/unit/components/public/watch-page-template.test.tsx`         |
| 18  | `components/layout/generation-progress-tracker.tsx` | `__tests__/unit/components/layout/generation-progress-tracker.test.tsx` |
| 19  | `components/layout/header.tsx`                      | `__tests__/unit/components/layout/header.test.tsx`                      |
| 20  | `components/editor/editor-page-wrapper.tsx`         | `__tests__/unit/components/editor/editor-page-wrapper.test.tsx`         |

---

## BATCH 25: Low Priority Components & E2E Tests (35 tests)

**Priority:** P2/P3

| #   | Source File                                        | Test File                                                              |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | `components/public/countdown-deal-banner.tsx`      | `__tests__/unit/components/public/countdown-deal-banner.test.tsx`      |
| 2   | `components/public/dashboard-preview.tsx`          | `__tests__/unit/components/public/dashboard-preview.test.tsx`          |
| 3   | `components/public/faq.tsx`                        | `__tests__/unit/components/public/faq.test.tsx`                        |
| 4   | `components/public/final-cta.tsx`                  | `__tests__/unit/components/public/final-cta.test.tsx`                  |
| 5   | `components/public/follow-up-engine.tsx`           | `__tests__/unit/components/public/follow-up-engine.test.tsx`           |
| 6   | `components/public/founder-letter.tsx`             | `__tests__/unit/components/public/founder-letter.test.tsx`             |
| 7   | `components/public/how-it-works.tsx`               | `__tests__/unit/components/public/how-it-works.test.tsx`               |
| 8   | `components/public/marketing-engine.tsx`           | `__tests__/unit/components/public/marketing-engine.test.tsx`           |
| 9   | `components/public/offer-optimizer.tsx`            | `__tests__/unit/components/public/offer-optimizer.test.tsx`            |
| 10  | `components/public/presentation-builder.tsx`       | `__tests__/unit/components/public/presentation-builder.test.tsx`       |
| 11  | `components/support/advanced-ai-assistant.tsx`     | `__tests__/unit/components/support/advanced-ai-assistant.test.tsx`     |
| 12  | `components/support/context-aware-help-widget.tsx` | `__tests__/unit/components/support/context-aware-help-widget.test.tsx` |
| 13  | `components/support/help-widget.tsx`               | `__tests__/unit/components/support/help-widget.test.tsx`               |
| 14  | `components/layout/footer.tsx`                     | `__tests__/unit/components/layout/footer.test.tsx`                     |
| 15  | `components/layout/mobile-header.tsx`              | `__tests__/unit/components/layout/mobile-header.test.tsx`              |
| 16  | `components/mobile/desktop-required-notice.tsx`    | `__tests__/unit/components/mobile/desktop-required-notice.test.tsx`    |
| 17  | `components/mobile/mobile-nav-drawer.tsx`          | `__tests__/unit/components/mobile/mobile-nav-drawer.test.tsx`          |
| 18  | `lib/client-logger.ts`                             | `__tests__/unit/lib/client-logger.test.ts`                             |
| 19  | `lib/logger.ts`                                    | `__tests__/unit/lib/logger.test.ts`                                    |
| 20  | `lib/get-public-url.ts`                            | `__tests__/unit/lib/get-public-url.test.ts`                            |
| 21  | `lib/mobile-utils.client.ts`                       | `__tests__/unit/lib/mobile-utils.client.test.ts`                       |
| 22  | `lib/mobile-utils.server.ts`                       | `__tests__/unit/lib/mobile-utils.server.test.ts`                       |
| 23  | `app/(auth)/login/page.tsx`                        | `__tests__/e2e/auth/login.spec.ts`                                     |
| 24  | `app/(auth)/signup/page.tsx`                       | `__tests__/e2e/auth/signup.spec.ts`                                    |
| 25  | `app/page.tsx`                                     | `__tests__/e2e/homepage.spec.ts`                                       |
| 26  | `app/dashboard/page.tsx`                           | `__tests__/e2e/dashboard.spec.ts`                                      |
| 27  | `app/funnel-builder/page.tsx`                      | `__tests__/e2e/funnel-builder/list.spec.ts`                            |
| 28  | `app/funnel-builder/create/page.tsx`               | `__tests__/e2e/funnel-builder/create.spec.ts`                          |
| 29  | `app/contacts/page.tsx`                            | `__tests__/e2e/contacts/list.spec.ts`                                  |
| 30  | `app/ads-manager/page.tsx`                         | `__tests__/e2e/ads-manager.spec.ts`                                    |
| 31  | `app/ai-followup/page.tsx`                         | `__tests__/e2e/ai-followup.spec.ts`                                    |
| 32  | `app/settings/page.tsx`                            | `__tests__/e2e/settings/index.spec.ts`                                 |
| 33  | `app/settings/integrations/page.tsx`               | `__tests__/e2e/settings/integrations.spec.ts`                          |
| 34  | `app/p/[pageId]/page.tsx`                          | `__tests__/e2e/public/landing-page.spec.ts`                            |
| 35  | `app/pages/page.tsx`                               | `__tests__/e2e/pages/list.spec.ts`                                     |

---

## BATCH 26: UI Primitives (Optional - 19 tests)

**Priority:** P3 - Skip if time constrained

| #   | Source File                       | Test File                                             |
| --- | --------------------------------- | ----------------------------------------------------- |
| 1   | `components/ui/accordion.tsx`     | `__tests__/unit/components/ui/accordion.test.tsx`     |
| 2   | `components/ui/card.tsx`          | `__tests__/unit/components/ui/card.test.tsx`          |
| 3   | `components/ui/checkbox.tsx`      | `__tests__/unit/components/ui/checkbox.test.tsx`      |
| 4   | `components/ui/dialog.tsx`        | `__tests__/unit/components/ui/dialog.test.tsx`        |
| 5   | `components/ui/dropdown-menu.tsx` | `__tests__/unit/components/ui/dropdown-menu.test.tsx` |
| 6   | `components/ui/input.tsx`         | `__tests__/unit/components/ui/input.test.tsx`         |
| 7   | `components/ui/label.tsx`         | `__tests__/unit/components/ui/label.test.tsx`         |
| 8   | `components/ui/progress.tsx`      | `__tests__/unit/components/ui/progress.test.tsx`      |
| 9   | `components/ui/radio-group.tsx`   | `__tests__/unit/components/ui/radio-group.test.tsx`   |
| 10  | `components/ui/select.tsx`        | `__tests__/unit/components/ui/select.test.tsx`        |
| 11  | `components/ui/separator.tsx`     | `__tests__/unit/components/ui/separator.test.tsx`     |
| 12  | `components/ui/skeleton.tsx`      | `__tests__/unit/components/ui/skeleton.test.tsx`      |
| 13  | `components/ui/slider.tsx`        | `__tests__/unit/components/ui/slider.test.tsx`        |
| 14  | `components/ui/switch.tsx`        | `__tests__/unit/components/ui/switch.test.tsx`        |
| 15  | `components/ui/tabs.tsx`          | `__tests__/unit/components/ui/tabs.test.tsx`          |
| 16  | `components/ui/textarea.tsx`      | `__tests__/unit/components/ui/textarea.test.tsx`      |
| 17  | `components/ui/toast.tsx`         | `__tests__/unit/components/ui/toast.test.tsx`         |
| 18  | `components/ui/toaster.tsx`       | `__tests__/unit/components/ui/toaster.test.tsx`       |
| 19  | `components/ui/tooltip.tsx`       | `__tests__/unit/components/ui/tooltip.test.tsx`       |

---

## Summary

| Batch     | Focus Area                    | Test Count | Priority |
| --------- | ----------------------------- | ---------- | -------- |
| 1         | Stripe & Payment              | 7          | P0       |
| 2         | Auth & Security               | 8          | P0       |
| 3         | Business Profile              | 7          | P0       |
| 4         | Social Integrations           | 7          | P0       |
| 5         | Marketing Services            | 10         | P0/P1    |
| 6         | Marketing API Part 1          | 20         | P1       |
| 7         | Marketing API Part 2          | 10         | P1/P2    |
| 8         | Followup Services             | 15         | P1       |
| 9         | Followup API Part 1           | 20         | P1       |
| 10        | Followup API Part 2           | 10         | P1/P2    |
| 11        | Ads Module                    | 10         | P1       |
| 12        | Generation API                | 10         | P1       |
| 13        | Generators Library            | 14         | P1/P2    |
| 14        | Pages API                     | 20         | P1       |
| 15        | Funnel Integration API        | 14         | P1       |
| 16        | Core API Routes               | 19         | P1       |
| 17        | Infrastructure                | 18         | P2       |
| 18        | Scraping & Utils              | 14         | P2       |
| 19        | Followup Components           | 17         | P1       |
| 20        | Marketing Components 1        | 20         | P1       |
| 21        | Marketing & Funnel Components | 20         | P1/P2    |
| 22        | Funnel & Settings Components  | 20         | P2       |
| 23        | Pages & Intake Components     | 20         | P1/P2    |
| 24        | Remaining Components          | 20         | P2       |
| 25        | Low Priority & E2E            | 35         | P2/P3    |
| 26        | UI Primitives (Optional)      | 19         | P3       |
| **TOTAL** |                               | **~424**   |          |

---

## Execution Notes for AI

1. **Execute batches in order** - Earlier batches cover critical payment and auth code
2. **Use existing test patterns** - Check `__tests__/unit/lib/followup/` for examples
3. **Mock external services** - Supabase, OpenAI, Stripe, social APIs
4. **Run tests after each batch** - `pnpm test` to verify
5. **Skip Batch 26** if time constrained - UI primitives from shadcn/ui are well-tested
   upstream
