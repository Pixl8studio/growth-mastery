# Component: Contact Management & Analytics

## What It Is

The tracking and intelligence layer that captures every prospect interaction across the
funnel, segments them behaviorally, and delivers that data to both Growth Mastery
analytics and the creator's external CRM via webhooks.

## Why It Exists

**Problem**: Creators need to know who's engaged, what they did, and where they are in
the journey. Most funnel builders track page views but not meaningful behavior.

**Solution**: Complete contact lifecycle tracking with behavioral segmentation, webhook
delivery for CRM integration, and actionable analytics dashboards.

## Contact Lifecycle

### Stage 1: Lead (Registration)

**Trigger**: Submit registration form on public page **Data Captured**:

- First name, last name, email, phone (optional)
- UTM parameters (source, medium, campaign, content, term)
- Referral code (if present)
- Registration page ID
- IP address + user agent

**Database Record**: Created in `contacts` table **Webhook Sent**: `registration` event
to creator's CRM **Status**: Lead (not yet watched)

**Key Decision**: Capture UTM params for attribution tracking **Why**: Creators need to
know which traffic sources convert

### Stage 2: Engaged (Video Started)

**Trigger**: Click play on watch page **Data Captured**:

- Video ID watched
- Start timestamp
- Watch page ID

**Event Logged**: `video_started` in `contact_events` **Contact Updated**: `stage` →
`engaged` **Webhook Sent**: `video_started` event

**Key Decision**: Don't send webhook for every second **Why**: Too noisy, CRMs would
complain

### Stage 3: Watching (Milestone Progress)

**Triggers**: Reach 25%, 50%, 75%, 100% watched **Data Captured**:

- Milestone reached (enum: 25, 50, 75, 100)
- Current watch percentage
- Time spent watching

**Events Logged**: `video_progress` events **Contact Updated**: `watch_percentage` field
**Webhooks Sent**: Only on major milestones (25, 50, 75, 100)

**Key Decision**: 25% increments (not 10% or 1%) **Why**: Balance between granularity
and noise

### Stage 4: Offer Viewed (Enrollment Page Visit)

**Trigger**: Visit enrollment page **Data Captured**:

- Enrollment page ID
- Timestamp
- Referrer (usually watch page)

**Event Logged**: `enrollment_viewed` **Contact Updated**: `stage` → `offer_viewed`
**Webhook Sent**: `enrollment_viewed` event

**Significance**: High intent signal (viewed pricing/offer)

### Stage 5: Converted (Purchase/Booking)

**Trigger**: Complete purchase or book call **Data Captured**:

- Transaction ID (if purchase)
- Amount paid
- Calendar booking ID (if booking)

**Event Logged**: `purchase_completed` or `call_booked` **Contact Updated**: `stage` →
`converted` **Webhook Sent**: `conversion` event with value

**Key Decision**: Track both purchases and bookings as conversions **Why**: Different
offer types have different conversion actions

## Behavioral Segmentation

### Automatic Segment Assignment

Based on `watch_percentage` field:

| Segment | Watch % | Auto-Assigned                  |
| ------- | ------- | ------------------------------ |
| No-Show | 0%      | Yes (24h after registration)   |
| Skimmer | 1-24%   | Yes (immediately on milestone) |
| Sampler | 25-49%  | Yes (immediately on milestone) |
| Engaged | 50-74%  | Yes (immediately on milestone) |
| Hot     | 75-100% | Yes (immediately on milestone) |

**Why Automatic**: Enables real-time follow-up triggers **How**: Database trigger on
`watch_percentage` update **Used By**: Follow-Up Engine for sequence selection

### Manual Segmentation (Future)

Creators can manually tag/segment:

- By offer interest
- By objection type
- By custom criteria

**Phase**: Phase 2 (not implemented yet)

## Analytics Tracking

### Event Types Captured

**Registration Events**:

- `registration` - Form submission
- `registration_confirmed` - Email verified (if enabled)

**Video Events**:

- `video_started` - Clicked play
- `video_progress` - Milestone reached (25/50/75/100%)
- `video_completed` - Finished watching
- `video_replayed` - Watched again

**Page Events**:

- `watch_page_viewed` - Visited watch page
- `enrollment_viewed` - Visited enrollment page
- `registration_page_viewed` - Visited registration page

**Conversion Events**:

- `offer_clicked` - Clicked CTA to enrollment
- `purchase_initiated` - Started checkout
- `purchase_completed` - Successful purchase
- `call_booked` - Scheduled consultation

**Engagement Events**:

- `email_opened` - Follow-up email opened
- `email_clicked` - Link in email clicked
- `sms_replied` - Replied to SMS
- `page_shared` - Shared funnel page

### Data Schema

**contacts** table:

- Identity (name, email, phone)
- Attribution (UTM params, referral)
- Status (stage, segment, watch %)
- Engagement (first seen, last seen, visit count)
- Conversion (converted, amount, date)

**contact_events** table:

- Contact ID (who)
- Event type (what)
- Funnel project ID (which funnel)
- Page ID (where - registration, watch, enrollment)
- Metadata (JSON - flexible data per event)
- Timestamp (when)

**funnel_analytics** table (aggregates):

- Project ID
- Date
- Registrations, views, conversions (counts)
- Conversion rate calculations
- Revenue tracking

### Dashboard Views

**Overview Dashboard**:

- Total registrations
- Total views
- Total conversions
- Conversion funnel visualization
- Revenue (if connected to Stripe)

**Engagement Dashboard**:

- Segment distribution (pie chart)
- Watch percentage histogram
- Average watch time
- Replay rate

**Attribution Dashboard**:

- Traffic sources (UTM source)
- Campaign performance (UTM campaign)
- Referral code performance

**Timeline View**:

- Contact-level event timeline
- See individual journey
- Identify drop-off points

## Webhook System

### Purpose

Send contact data to creator's CRM (HubSpot, ActiveCampaign, etc.) for advanced
automation and nurture.

### Event Webhooks

**Sent On**:

- Registration (immediate)
- Video milestones (25%, 50%, 75%, 100%)
- Enrollment page view (immediate)
- Conversion (immediate)

**Payload Example**:

```json
{
  "event": "video_progress",
  "contact": {
    "email": "sarah@example.com",
    "first_name": "Sarah",
    "last_name": "Johnson",
    "phone": "+1234567890"
  },
  "data": {
    "watch_percentage": 75,
    "segment": "Engaged",
    "video_title": "How to Scale Your Coaching",
    "funnel_id": "uuid-here"
  },
  "timestamp": "2025-12-03T10:30:00Z"
}
```

**Delivery**:

- HTTP POST to creator's webhook URL
- Retry logic (3 attempts, exponential backoff)
- Signature verification (HMAC)
- Delivery logged in `webhook_logs`

**Key Decision**: Webhook per event (not batching) **Why**: Real-time automation in
their CRM **Trade-off**: More requests, but better UX

### Webhook Configuration

**Settings** (`user_profiles.webhook_url`):

- Webhook URL (where to send)
- Secret key (for signature verification)
- Events to send (checkboxes for each type)
- Active/paused toggle

**Testing**:

- Test button sends sample payload
- Shows response status
- Logs visible in UI

**Monitoring**:

- Delivery success rate
- Failed deliveries with retry status
- Response times
- Error messages

## Key Design Decisions

### Decision: Server-Side Tracking (not client-side pixels)

**Why**: More reliable, can't be blocked by ad blockers **How**: API endpoints called
from frontend **Trade-off**: Slightly more latency, but accurate

### Decision: Real-Time Updates (not batched)

**Why**: Enable instant follow-up triggers **How**: Direct database writes + webhooks
**Cost**: More database writes, acceptable

### Decision: Webhook Delivery (not require OAuth)

**Why**: Lower barrier to integration **How**: Simple HTTP POST with signature
**Trade-off**: Less "official" but more flexible

### Decision: UTM Capture (not just source)

**Why**: Full attribution tracking **How**: Parse URL params on registration
**Benefit**: Know which campaigns convert

### Decision: Stage + Segment (two dimensions)

**Why**: Stage = where they are, Segment = how engaged **How**: Two separate fields,
both updated automatically **Usage**: Stage for funnel progress, Segment for follow-up

## Metrics to Track

**Contact Health**:

- Total contacts
- Growth rate (new/day, new/week)
- Active contacts (engaged in last 30 days)
- Segment distribution

**Funnel Performance**:

- Registration → View rate (should be 60-80%)
- View → 25% watch rate (should be 80%+)
- 75% watch → Conversion rate (goal: 10%+)
- Overall conversion rate (goal: 5-10%)

**Engagement Quality**:

- Average watch percentage (goal: 60%+)
- Completion rate (goal: 40%+)
- Replay rate (indicator of quality)
- Time to conversion (faster = better)

**Technical**:

- Event capture latency
- Webhook delivery success rate (goal: 99%+)
- Database query performance
- Analytics dashboard load time

## Common Issues & Solutions

### Issue: Duplicate Contacts

**Symptom**: Same email registered multiple times **Solution**: Unique constraint on
(email, project_id) **Status**: Implemented

### Issue: Webhook Failures

**Symptom**: Creator's CRM rejecting webhooks **Solution**: Retry logic + clear error
messages **Status**: Implemented

### Issue: Missing UTM Params

**Symptom**: Attribution data incomplete **Solution**: Graceful handling (null OK)
**Status**: Implemented

### Issue: Slow Analytics Queries

**Symptom**: Dashboard takes >3s to load **Solution**: Aggregate tables + indexes
**Status**: Optimized

## Future Enhancements

### Phase 2

- [ ] Custom fields (creator-defined)
- [ ] Manual tagging system
- [ ] Export contacts (CSV)
- [ ] Advanced filtering
- [ ] Bulk actions (segment → tag all)

### Phase 3

- [ ] Predictive scoring (AI predicts conversion)
- [ ] Anomaly detection (unusual drop-offs)
- [ ] Cohort analysis
- [ ] Funnel comparison (A/B testing)
- [ ] Revenue attribution (LTV calculations)

## Privacy & Compliance

**GDPR Considerations**:

- Contact consent (implied via registration)
- Right to deletion (admin endpoint)
- Data portability (export feature)
- Privacy policy linked on forms

**Data Retention**:

- Active contacts: Indefinite
- Unengaged (12+ months): Archive or purge
- Deleted contacts: Hard delete (GDPR)

**Security**:

- PII encrypted at rest (Supabase RLS)
- Webhook signatures prevent spoofing
- API authentication required
- No public access to contact data

## Related Components

- AI Follow-Up Engine (`knowledge/components/ai-followup-engine.md`)
- Public Pages (data capture forms)
- Webhook System (`lib/webhook-service.ts`)

---

_Last Updated: 2025-12-03_ _Status: ✅ Complete contact lifecycle tracking operational_
_Key Metric: 99%+ event capture rate_ _Integration: Webhook delivery for any CRM_
