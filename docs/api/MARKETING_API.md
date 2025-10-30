# Marketing Content Engine - API Documentation

## Authentication

All endpoints require authentication via Supabase Auth. Include the session token in
request headers.

**Error Codes:**

- `401` - Unauthorized (no valid session)
- `403` - Forbidden (access denied to resource)
- `404` - Not Found
- `400` - Validation Error
- `500` - Internal Server Error

---

## Profile Management

### Create Profile

**POST** `/api/marketing/profiles`

Create a new marketing profile for a funnel.

**Request Body:**

```json
{
  "funnel_project_id": "uuid",
  "name": "Main Marketing Profile"
}
```

**Response:**

```json
{
  "success": true,
  "profile": {
    /* MarketingProfile object */
  }
}
```

### List Profiles

**GET** `/api/marketing/profiles?funnel_project_id=uuid`

List all profiles for user or specific funnel.

**Query Parameters:**

- `funnel_project_id` (optional) - Filter by funnel

**Response:**

```json
{
  "success": true,
  "profiles": [
    /* Array of MarketingProfile */
  ]
}
```

### Update Profile

**PUT** `/api/marketing/profiles/{profileId}`

Update profile settings.

**Request Body:**

```json
{
  "brand_voice": "string",
  "tone_settings": {
    /* ToneSettings */
  },
  "story_themes": ["founder_saga", "myth_buster"]
}
```

### Calibrate Voice

**POST** `/api/marketing/profiles/{profileId}/calibrate`

Run Echo Mode calibration.

**Request Body:**

```json
{
  "sample_content": ["Sample post 1...", "Sample post 2...", "Sample post 3..."]
}
```

**Response:**

```json
{
  "success": true,
  "echo_mode_config": {
    /* EchoModeConfig */
  }
}
```

---

## Content Generation

### Create Brief

**POST** `/api/marketing/briefs`

Create a content brief.

**Request Body:**

```json
{
  "name": "Q1 Campaign",
  "goal": "drive_registrations",
  "topic": "Content topic",
  "funnel_project_id": "uuid",
  "marketing_profile_id": "uuid",
  "icp_description": "Target audience description",
  "transformation_focus": "Desired outcome",
  "target_platforms": ["instagram", "facebook"],
  "preferred_framework": "founder_saga"
}
```

### Generate Content

**POST** `/api/marketing/briefs/{briefId}/generate`

Generate story angles and platform variants.

**Request Body:**

```json
{
  "platforms": ["instagram", "facebook", "linkedin", "twitter"],
  "selected_angle": {
    /* Optional StoryAngle */
  },
  "base_content": "Optional base content",
  "base_url": "https://example.com/register"
}
```

**Response:**

```json
{
  "success": true,
  "story_angles": [
    /* Array of StoryAngle */
  ],
  "variants": [
    /* Array of PostVariant */
  ]
}
```

### List Variants

**GET** `/api/marketing/briefs/{briefId}/variants`

Get all variants for a brief.

### Update Variant

**PUT** `/api/marketing/variants/{variantId}`

Edit a variant.

**Request Body:**

```json
{
  "copy_text": "Updated copy",
  "alt_text": "Image description",
  "hashtags": ["#tag1", "#tag2"]
}
```

---

## Trends

### Get Trends

**GET** `/api/marketing/trends?limit=10`

Fetch active trending topics.

**Query Parameters:**

- `limit` (optional, default: 10) - Max trends to return

**Response:**

```json
{
  "success": true,
  "trends": [
    /* Array of TrendSignal */
  ]
}
```

### Create Brief from Trend

**POST** `/api/marketing/trends/{trendId}/brief`

Create a content brief from a trending topic.

**Request Body:**

```json
{
  "funnel_project_id": "uuid",
  "marketing_profile_id": "uuid",
  "selected_angle": "founder_perspective",
  "goal": "drive_registrations"
}
```

### Dismiss Trend

**DELETE** `/api/marketing/trends?trend_id=uuid`

Mark a trend as not relevant.

---

## Calendar & Scheduling

### Get Calendar

**GET** `/api/marketing/calendar?start=2025-01-01&end=2025-01-31&space=sandbox`

Fetch calendar entries.

**Query Parameters:**

- `start` (optional) - ISO date string
- `end` (optional) - ISO date string
- `space` (optional) - "sandbox" or "production"

### Schedule Post

**POST** `/api/marketing/calendar`

Schedule a post for future publishing.

**Request Body:**

```json
{
  "post_variant_id": "uuid",
  "scheduled_publish_at": "2025-02-01T14:00:00Z",
  "space": "sandbox",
  "publish_notes": "Optional notes"
}
```

### Update Schedule

**PUT** `/api/marketing/calendar/{entryId}`

Reschedule or update a calendar entry.

**Request Body:**

```json
{
  "scheduled_publish_at": "2025-02-02T14:00:00Z",
  "publish_notes": "Updated notes"
}
```

### Cancel Scheduled Post

**DELETE** `/api/marketing/calendar/{entryId}`

Cancel a scheduled post.

### Promote to Production

**POST** `/api/marketing/calendar/{entryId}/promote`

Move content from sandbox to production space.

---

## Publishing

### Publish Now

**POST** `/api/marketing/publish`

Immediately publish content.

**Request Body:**

```json
{
  "post_variant_id": "uuid",
  "platform": "instagram"
}
```

**Response:**

```json
{
  "success": true,
  "provider_post_id": "ig_12345",
  "platform_url": "https://www.instagram.com/p/12345/"
}
```

### Test Publish

**POST** `/api/marketing/publish/test`

Validate content without publishing.

**Request Body:**

```json
{
  "post_variant_id": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "validation": {
    /* PreflightResult */
  },
  "ready_to_publish": true
}
```

### Check Publish Status

**GET** `/api/marketing/publish/{publishId}/status`

Get status of a published post.

---

## Analytics

### Get Dashboard Analytics

**GET** `/api/marketing/analytics?funnel_project_id=uuid`

Get comprehensive analytics dashboard.

**Query Parameters:**

- `funnel_project_id` (required)
- `start_date` (optional) - ISO date string
- `end_date` (optional) - ISO date string

**Response:**

```json
{
  "success": true,
  "dashboard": {
    "overview": {
      "total_posts": 25,
      "total_impressions": 50000,
      "total_opt_ins": 150,
      "overall_oi_1000": 3.0,
      "avg_engagement_rate": 4.5
    },
    "by_platform": {
      /* Platform breakdown */
    },
    "by_framework": {
      /* Framework performance */
    },
    "top_performers": [
      /* Top 10 posts */
    ],
    "experiments": [
      /* Active experiments */
    ]
  }
}
```

### Get Post Analytics

**GET** `/api/marketing/analytics/post/{postId}`

Get detailed analytics for a specific post.

### Get Experiments

**GET** `/api/marketing/analytics/experiments?funnel_project_id=uuid&status=running`

Get A/B test results.

---

## Import/Export

### Import Content

**POST** `/api/marketing/import`

Bulk import existing content.

**Request Body:**

```json
{
  "funnel_project_id": "uuid",
  "content_items": [
    {
      "platform": "instagram",
      "copy_text": "Post content...",
      "hashtags": ["#tag1"],
      "published_at": "2025-01-15T10:00:00Z",
      "analytics": {
        "impressions": 1000,
        "opt_ins": 5,
        "oi_1000": 5.0
      }
    }
  ]
}
```

### Export Content

**GET** `/api/marketing/export?funnel_project_id=uuid&format=json`

Export all content and analytics.

**Query Parameters:**

- `funnel_project_id` (required)
- `format` (optional) - "json" or "csv"

**Response (JSON):**

```json
{
  "success": true,
  "export_data": {
    "funnel_name": "My Funnel",
    "exported_at": "2025-01-30T12:00:00Z",
    "briefs": [
      /* All briefs */
    ],
    "variants": [
      /* All variants */
    ],
    "analytics": [
      /* All analytics */
    ]
  }
}
```

---

## Rate Limits

- **Content Generation**: 20 requests per hour per user
- **Publishing**: 100 posts per day per platform
- **Analytics**: 1,000 requests per day per user

Rate limit headers included in responses:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Webhooks (Future)

Future support for webhook notifications:

- `content.generated` - When variants are created
- `content.published` - When post goes live
- `content.performed` - When O/I-1000 exceeds threshold
- `experiment.completed` - When A/B test concludes

---

## TypeScript SDK (Example)

```typescript
import type {
  CreateBriefInput,
  MarketingProfile,
  PostVariant,
} from "@/types/marketing";

// Create a brief
const brief: CreateBriefInput = {
  name: "Campaign Name",
  goal: "drive_registrations",
  topic: "Your topic",
  // ... other fields
};

const response = await fetch("/api/marketing/briefs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(brief),
});

const data = await response.json();
```

---

## Support

For API issues:

- Check authentication tokens are valid
- Verify request body structure matches docs
- Review error messages in response
- Check server logs for detailed error context
