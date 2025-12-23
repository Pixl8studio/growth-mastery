# Admin Dashboard Design Specification

## Overview

An AI-first admin dashboard for premium customer support, enabling the Growth Mastery
team to monitor user experience, provide proactive support, debug issues, and manage API
costs—all from within the existing application.

---

## 1. Access & Security

### 1.1 Role Hierarchy

Three roles with increasing permissions:

| Role          | Permissions                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `support`     | View users, view funnels (read-only), see health scores, view notifications                              |
| `admin`       | All support permissions + impersonation mode, take actions on behalf of users, acknowledge notifications |
| `super_admin` | All admin permissions + manage admin roles, configure notification recipients, system settings           |

### 1.2 Database Schema Changes

```sql
-- Add role to user_profiles
ALTER TABLE user_profiles
ADD COLUMN role TEXT DEFAULT 'user'
CHECK (role IN ('user', 'support', 'admin', 'super_admin'));

-- Set initial super_admin
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'joe@growthmastery.ai';

-- Admin audit log (retained forever)
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES user_profiles(id) NOT NULL,
  target_user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'view', 'edit', 'impersonate', 'admin_change'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin notifications
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'error', 'cost_alert', 'user_struggling', 'ai_suggestion'
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'normal')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id UUID REFERENCES user_profiles(id),
  metadata JSONB,
  requires_acknowledgment BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification recipients (managed by super_admin)
CREATE TABLE admin_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES user_profiles(id) NOT NULL,
  notification_types TEXT[] NOT NULL, -- which types they receive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_user_id)
);

-- API usage tracking
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  service TEXT NOT NULL, -- 'openai', 'claude', 'stripe', 'cloudflare', etc.
  endpoint TEXT,
  tokens_used INTEGER,
  cost_cents INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hourly aggregates (for performance)
CREATE TABLE api_usage_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  service TEXT NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  UNIQUE(user_id, service, hour)
);

-- Monthly summaries
CREATE TABLE api_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  month DATE NOT NULL, -- first of month
  service TEXT NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  UNIQUE(user_id, service, month)
);

-- User health scores (calculated periodically)
CREATE TABLE user_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
  success_score INTEGER CHECK (success_score BETWEEN 0 AND 100),
  technical_score INTEGER CHECK (technical_score BETWEEN 0 AND 100),
  billing_score INTEGER CHECK (billing_score BETWEEN 0 AND 100),
  factors JSONB, -- detailed breakdown
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- AI-drafted emails awaiting approval
CREATE TABLE admin_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID REFERENCES user_profiles(id) NOT NULL,
  trigger_reason TEXT NOT NULL, -- why AI drafted this
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'rejected')),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 Access Pattern

- Admin section appears as new item in Settings sidebar (`/settings/admin`)
- **Only visible to users with role `support`, `admin`, or `super_admin`**
- **Regular users see nothing** - the "Admin" menu item simply doesn't render for them
- No 404, no error, no indication the feature exists - they'd have to guess the URL
- If a non-admin somehow navigates to `/settings/admin`, they are silently redirected to
  `/settings`
- All admin actions are logged to `admin_audit_logs`

### 1.4 RLS Policies

```sql
-- Admin audit logs: admins can insert, super_admins can view all
CREATE POLICY admin_audit_insert ON admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('support', 'admin', 'super_admin')
    )
  );

CREATE POLICY admin_audit_select ON admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Similar patterns for other admin tables...
```

---

## 2. Navigation & Layout

### 2.1 Settings Sidebar Addition

```
Profile
Integrations
Payments
Domains
Trash
─────────────  (divider, only shown to admins)
Admin          (only shown to support/admin/super_admin)
```

### 2.2 Admin Section Structure

```
/settings/admin
├── /overview          # Dashboard with aggregate stats
├── /users             # User list with health scores
├── /users/[id]        # Individual user detail + impersonation
├── /notifications     # Notification center
├── /costs             # API usage & cost monitoring
├── /emails            # AI-drafted emails awaiting approval
├── /reports           # Report generation
└── /settings          # Admin settings (super_admin only)
    ├── /roles         # Manage admin roles
    └── /recipients    # Configure notification recipients
```

---

## 3. Dashboard Overview (`/settings/admin/overview`)

### 3.1 Key Metrics Cards

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Total Users    │  Active Today   │  Avg Health     │  Total Cost     │
│     247         │      34         │     78/100      │   $1,247/mo     │
│  +12 this week  │  ↑ 15% vs avg   │  ↓ 3 pts        │  ↑ 8% vs last   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### 3.2 AI-Prioritized Attention Feed

Primary view showing users who need attention, sorted by urgency:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔴 URGENT: Sarah Chen experienced 12 errors in last hour             │
│    Sentry: "TypeError in FunnelEditor" - View Details →              │
├──────────────────────────────────────────────────────────────────────┤
│ 🟡 NORMAL: Mike Johnson approaching $50 usage limit ($47.23)         │
│    Current month: 94% of threshold - View Usage →                    │
├──────────────────────────────────────────────────────────────────────┤
│ 🟡 NORMAL: AI suggests reaching out to Lisa Park                     │
│    Started funnel 5 days ago, hasn't published - Draft Ready →       │
├──────────────────────────────────────────────────────────────────────┤
│ 🟢 INFO: 3 new users signed up today                                 │
│    View onboarding progress →                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Quick Stats Sections

**User Segments:**

- New users (< 7 days): count + avg health
- Active users (used in last 7 days): count + avg health
- At-risk users (health < 50): count + list preview
- Power users (most active): count + top 5

**Recent Activity:**

- Real-time feed of user actions (funnel created, page published, etc.)
- Filterable by user, action type, time range

**Error Summary:**

- Sentry integration showing recent errors grouped by user
- Click to see user context + error details

---

## 4. User Management (`/settings/admin/users`)

### 4.1 User List View

Sortable, filterable table:

| User         | Health | Plan | Funnels | Last Active | API Cost | Status   |
| ------------ | ------ | ---- | ------- | ----------- | -------- | -------- |
| Sarah Chen   | 🔴 34  | Pro  | 3       | 2 hrs ago   | $23.45   | Errors   |
| Mike Johnson | 🟡 67  | Pro  | 7       | 1 day ago   | $47.23   | Limit    |
| Lisa Park    | 🟡 52  | Free | 1       | 5 days ago  | $2.10    | Inactive |
| David Kim    | 🟢 89  | Pro  | 12      | 30 min ago  | $31.20   | Healthy  |

**Filters:**

- Health score range
- Plan type
- Signup date range
- Last active range
- Has errors (boolean)
- Approaching cost limit (boolean)

**Bulk Actions (admin+ only):**

- Export selected to CSV
- Generate report for selected

### 4.2 User Detail View (`/settings/admin/users/[id]`)

#### Profile Section

```
┌─────────────────────────────────────────────────────────────────┐
│ Sarah Chen                                    [Impersonate →]   │
│ sarah@example.com                                               │
│ Pro Plan • Joined Jan 15, 2025 • Last active 2 hours ago       │
├─────────────────────────────────────────────────────────────────┤
│ Business Context                                                │
│ Industry: Coaching    Audience: 5,000    Revenue Tier: $10k+   │
├─────────────────────────────────────────────────────────────────┤
│ Health Score: 34/100  🔴                                        │
│ ├─ Engagement: 45  (logins, time in app)                       │
│ ├─ Success: 20  (no published funnels)                         │
│ ├─ Technical: 15  (12 errors this week)                        │
│ └─ Billing: 95  (payment current)                              │
└─────────────────────────────────────────────────────────────────┘
```

#### Tabs

**Funnels Tab:**

- List of all user's funnels with status (draft/published)
- Preview thumbnails
- Click to view in impersonation mode

**Activity Tab:**

- Timeline of user actions
- Session replays (if implemented)
- Login history

**Errors Tab:**

- Sentry errors for this user
- Error timeline
- Stack traces with context

**Usage Tab:**

- API cost breakdown by service
- Hourly/daily/monthly charts
- Projected month-end cost

**Support History Tab:**

- Previous outreach
- Tickets/conversations
- Admin actions taken

**Actions Panel (admin+ only):**

```
┌─────────────────────────────┐
│ Quick Actions               │
├─────────────────────────────┤
│ [Send Email]                │
│ [Reset Password]            │
│ [Extend Trial]              │
│ [Apply Credit]              │
│ [Impersonate User]          │
├─────────────────────────────┤
│ ⚠️ Dangerous Actions        │
│ [Suspend Account]           │
│ [Delete Account]            │
└─────────────────────────────┘
```

---

## 5. Impersonation Mode

### 5.1 Activation

Click "Impersonate" button on user detail page.

### 5.2 UI Behavior

Opens as a **slide-out drawer** (70% width) showing the user's dashboard exactly as they
see it:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Admin Panel (30%)           │ User View (70%)                            │
│                             │ ┌────────────────────────────────────────┐ │
│ Viewing as: Sarah Chen      │ │ 🔴 IMPERSONATION MODE                  │ │
│ [Exit Impersonation]        │ │ Viewing as Sarah Chen • Read-only      │ │
│                             │ ├────────────────────────────────────────┤ │
│ Quick Info:                 │ │                                        │ │
│ • Health: 34/100            │ │   [User's actual dashboard view]       │ │
│ • Errors: 12 this week      │ │                                        │ │
│ • Last error: 2 hrs ago     │ │   All navigation works                 │ │
│                             │ │   See exactly what they see            │ │
│ Actions:                    │ │                                        │ │
│ [Draft Email]               │ │                                        │ │
│ [View Errors]               │ │                                        │ │
│ [Take Action...]            │ │                                        │ │
│                             │ └────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Impersonation Rules

- **Read-only by default** - navigation works, but no changes
- **Admin can enable edit mode** - with explicit toggle + confirmation
- **All actions logged** - every page view, every edit recorded in audit log
- **Visual banner always visible** - user view always shows impersonation indicator
- **Auto-timeout** - impersonation ends after 30 minutes of inactivity

---

## 6. Notification Center (`/settings/admin/notifications`)

### 6.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Notifications                              [Mark All Read]      │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Urgent ▼] [Requires Action ▼]                 │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 URGENT • Requires Action                        2 hours ago  │
│ User Error Spike: Sarah Chen                                    │
│ 12 errors in the last hour. Sentry shows TypeError in          │
│ FunnelEditor component.                                         │
│ [View User] [View in Sentry] [Mark Handled]                    │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 URGENT                                          4 hours ago  │
│ Cost Threshold Alert: Mike Johnson                              │
│ User has reached $47.23 of $50.00 monthly limit (94%)          │
│ [View Usage] [Adjust Limit] [Dismiss]                          │
├─────────────────────────────────────────────────────────────────┤
│ 🟡 NORMAL                                          1 day ago    │
│ AI Outreach Suggestion: Lisa Park                               │
│ User started funnel 5 days ago but hasn't published.           │
│ AI has drafted a check-in email.                                │
│ [View Draft] [View User] [Dismiss]                             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Notification Types

| Type              | Priority | Requires Ack | Trigger                       |
| ----------------- | -------- | ------------ | ----------------------------- |
| `error_spike`     | Urgent   | Yes          | User has 5+ errors in 1 hour  |
| `cost_alert`      | Urgent   | No           | User exceeds $50/month        |
| `payment_failed`  | Urgent   | Yes          | Stripe payment failure        |
| `user_struggling` | Normal   | No           | AI detects struggling pattern |
| `ai_suggestion`   | Normal   | No           | AI drafts outreach email      |
| `new_user`        | Normal   | No           | New signup                    |
| `milestone`       | Normal   | No           | User publishes first funnel   |

### 6.3 Notification Recipients (Super Admin Config)

Super admins can configure which admins receive which notification types:

```
┌─────────────────────────────────────────────────────────────────┐
│ Notification Recipients                                         │
├─────────────────────────────────────────────────────────────────┤
│ Joe (super_admin)                                               │
│ ☑️ Error alerts  ☑️ Cost alerts  ☑️ AI suggestions  ☑️ New users │
├─────────────────────────────────────────────────────────────────┤
│ Support Agent 1 (support)                                       │
│ ☑️ Error alerts  ☐ Cost alerts  ☑️ AI suggestions  ☑️ New users │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Cost Monitoring (`/settings/admin/costs`)

### 7.1 Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ API Costs - December 2025                                       │
├────────────────┬────────────────┬────────────────┬──────────────┤
│ Total Spend    │ OpenAI/Claude  │ Stripe Fees    │ Other        │
│ $1,247.89      │ $892.34        │ $312.55        │ $43.00       │
│ ↑ 8% vs Nov    │ 71% of total   │ 25% of total   │ 4% of total  │
└────────────────┴────────────────┴────────────────┴──────────────┘
```

### 7.2 Cost by User Table

| User         | AI Tokens | Stripe | Video | Email | Total  | % of Limit |
| ------------ | --------- | ------ | ----- | ----- | ------ | ---------- |
| Mike Johnson | $38.45    | $6.78  | $2.00 | $0.00 | $47.23 | 94% 🔴     |
| David Kim    | $24.12    | $5.08  | $2.00 | $0.00 | $31.20 | 62%        |
| Sarah Chen   | $18.90    | $3.55  | $1.00 | $0.00 | $23.45 | 47%        |

### 7.3 Charts

- **Hourly usage** (last 24 hours) - line chart
- **Daily usage** (last 30 days) - bar chart
- **Monthly trend** (last 12 months) - area chart
- **By service** - pie chart breakdown

### 7.4 Cost Attribution

Drill down to see costs per:

- User
- Funnel
- Feature (AI editor, video hosting, etc.)
- API endpoint

### 7.5 Alerts Configuration

Global threshold: **$50/month per user**

When exceeded:

1. Urgent notification created
2. User flagged in user list
3. (Optional) Auto-email to user about usage

---

## 8. AI Features

### 8.1 Struggling User Detection

AI analyzes user behavior to identify struggling users based on:

| Signal                         | Weight | Description                              |
| ------------------------------ | ------ | ---------------------------------------- |
| Funnel started, not published  | 25%    | Created funnel 3+ days ago, still draft  |
| High error rate                | 25%    | 5+ errors in session                     |
| Confusion patterns             | 20%    | Excessive undo, repeated failed actions  |
| Low engagement post-onboarding | 15%    | Completed onboarding but < 2 logins/week |
| Approaching limits             | 15%    | > 80% of usage threshold                 |

### 8.2 AI Email Drafting

When AI identifies a struggling user, it drafts a personalized email:

```
┌─────────────────────────────────────────────────────────────────┐
│ AI-Drafted Email for Lisa Park                                  │
├─────────────────────────────────────────────────────────────────┤
│ Trigger: Started funnel 5 days ago, hasn't published            │
├─────────────────────────────────────────────────────────────────┤
│ Subject: Quick check-in on your funnel progress                 │
│                                                                 │
│ Hi Lisa,                                                        │
│                                                                 │
│ I noticed you started building your webinar funnel a few days   │
│ ago - exciting! I wanted to check in and see how it's going.    │
│                                                                 │
│ Is there anything blocking you from publishing? I'd be happy    │
│ to hop on a quick call or answer any questions.                 │
│                                                                 │
│ Best,                                                           │
│ [Your name]                                                     │
├─────────────────────────────────────────────────────────────────┤
│ [Edit Draft] [Approve & Send] [Reject]                         │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 AI Chatbot (Future Phase)

- Answers common questions before escalating
- Available in user-facing app
- Escalates to human when confidence is low

### 8.4 AI Issue Diagnosis

When Sentry errors occur:

1. AI analyzes stack trace + user context
2. Suggests likely cause
3. Recommends fix or workaround
4. Drafts response to user if needed

### 8.5 Churn Prediction

AI scores users on churn risk (0-100) based on:

- Engagement trend (declining = higher risk)
- Error frequency
- Support interactions
- Payment history
- Feature adoption

---

## 9. Health Score Calculation

### 9.1 Components

| Component  | Weight | Factors                                            |
| ---------- | ------ | -------------------------------------------------- |
| Engagement | 25%    | Logins/week, time in app, actions taken            |
| Success    | 30%    | Funnels published, pages live, conversions         |
| Technical  | 25%    | Error rate, failed API calls, page load times      |
| Billing    | 20%    | Payment status, approaching limits, failed charges |

### 9.2 Score Ranges

- 🟢 **80-100**: Healthy - thriving user
- 🟡 **50-79**: Moderate - may need attention
- 🔴 **0-49**: At-risk - needs intervention

### 9.3 Calculation Frequency

- Real-time updates for critical events (errors, payments)
- Hourly recalculation for engagement metrics
- Full recalculation daily

---

## 10. Sentry Integration

### 10.1 Error Linking

Every Sentry error includes:

- `user_id` tag
- `user_email` tag
- `funnel_id` context (if applicable)
- `session_id` for replay

### 10.2 Admin Dashboard Integration

- Errors appear in user's detail page
- Error spike triggers urgent notification
- Click-through to Sentry for full details
- AI summarizes error pattern for non-technical admins

### 10.3 Proactive Monitoring

Background job checks Sentry every 5 minutes:

- New errors for any user → link to user
- Error spikes (5+ in 1 hour) → create urgent notification
- Recurring errors → flag pattern for investigation

---

## 11. Reports (`/settings/admin/reports`)

### 11.1 Available Reports

| Report            | Content                                     | Format   |
| ----------------- | ------------------------------------------- | -------- |
| User Summary      | All users with health scores, usage, status | PDF, CSV |
| Monthly Billing   | Cost breakdown by user and service          | PDF, CSV |
| Error Report      | All errors grouped by type and user         | PDF      |
| Engagement Report | Login frequency, feature usage, trends      | PDF      |
| Churn Risk        | At-risk users with recommended actions      | PDF      |

### 11.2 Generation

- On-demand generation
- Scheduled weekly/monthly summaries (super_admin configurable)
- Email delivery option

---

## 12. Audit Logging

### 12.1 Logged Actions

Every admin action is logged:

```json
{
  "admin_user_id": "uuid",
  "target_user_id": "uuid",
  "action": "impersonation_started",
  "action_type": "impersonate",
  "details": {
    "duration_seconds": 342,
    "pages_viewed": ["/funnel-builder", "/settings"],
    "edits_made": false
  },
  "created_at": "2025-01-15T10:30:00Z"
}
```

### 12.2 Action Types

- `view` - Viewed user profile, funnels, etc.
- `edit` - Made changes on behalf of user
- `impersonate` - Entered impersonation mode
- `admin_change` - Changed another user's admin role
- `email_sent` - Sent outreach email
- `action_taken` - Reset password, extended trial, etc.

### 12.3 Retention

**Forever** - audit logs are never deleted for compliance and accountability.

### 12.4 Audit Log Viewer (Super Admin)

Searchable, filterable log of all admin actions:

- Filter by admin, target user, action type, date range
- Export to CSV for compliance

---

## 13. Admin Settings (Super Admin Only)

### 13.1 Role Management (`/settings/admin/settings/roles`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin Roles                                    [Invite Admin]   │
├─────────────────────────────────────────────────────────────────┤
│ joe@growthmastery.ai          super_admin     [Cannot change]   │
│ support@growthmastery.ai      support         [Change Role ▼]   │
│ admin2@growthmastery.ai       admin           [Change Role ▼]   │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Global Settings

- Cost alert threshold (default: $50)
- Health score weights (configurable)
- Notification settings
- Report schedules

---

## 14. Technical Implementation Notes

### 14.1 File Structure

```
app/
├── settings/
│   └── admin/
│       ├── layout.tsx           # Admin layout with role check
│       ├── page.tsx             # Redirects to /overview
│       ├── overview/
│       │   └── page.tsx         # Dashboard overview
│       ├── users/
│       │   ├── page.tsx         # User list
│       │   └── [id]/
│       │       └── page.tsx     # User detail
│       ├── notifications/
│       │   └── page.tsx
│       ├── costs/
│       │   └── page.tsx
│       ├── emails/
│       │   └── page.tsx
│       ├── reports/
│       │   └── page.tsx
│       └── settings/            # Super admin only
│           ├── page.tsx
│           ├── roles/
│           │   └── page.tsx
│           └── recipients/
│               └── page.tsx
│
components/
├── admin/
│   ├── AdminSidebar.tsx
│   ├── UserHealthBadge.tsx
│   ├── ImpersonationDrawer.tsx
│   ├── NotificationCard.tsx
│   ├── CostChart.tsx
│   ├── EmailDraftCard.tsx
│   └── AuditLogTable.tsx
│
lib/
├── admin/
│   ├── roles.ts                 # Role checking utilities
│   ├── audit.ts                 # Audit logging
│   ├── health-score.ts          # Health score calculation
│   ├── ai-detection.ts          # Struggling user detection
│   └── cost-tracking.ts         # API cost aggregation
│
api/
├── admin/
│   ├── users/
│   │   └── route.ts
│   ├── notifications/
│   │   └── route.ts
│   ├── costs/
│   │   └── route.ts
│   ├── impersonate/
│   │   └── route.ts
│   ├── reports/
│   │   └── route.ts
│   └── audit-log/
│       └── route.ts
```

### 14.2 Middleware

Admin routes protected by middleware that:

1. Checks authentication
2. Verifies admin role (`support`, `admin`, or `super_admin`)
3. Logs access to audit log
4. **Silently redirects non-admins to `/settings`** - no error message, no indication
   the feature exists

### 14.3 Background Jobs

| Job                      | Frequency | Purpose                                    |
| ------------------------ | --------- | ------------------------------------------ |
| Health score calculation | Hourly    | Update all user health scores              |
| API usage aggregation    | Hourly    | Roll up usage logs to hourly table         |
| Sentry sync              | 5 minutes | Check for new errors, create notifications |
| AI struggling detection  | Hourly    | Identify struggling users, draft emails    |
| Monthly rollup           | Daily     | Update monthly usage summaries             |

---

## 15. Implementation Phases

> **Current Status (December 2024):** Phase 1 (Foundation) is complete. The admin
> dashboard includes database schema, role system with RLS, layout, overview dashboard,
> user list, and audit logging. Features from Phase 2+ (including impersonation mode,
> health score calculations, and AI features) are not yet implemented.

### Phase 1: Foundation

- [x] Database schema + migrations
- [x] Role system + RLS policies
- [x] Admin layout + sidebar integration
- [x] Basic user list view
- [x] Audit logging

### Phase 2: User Management

- [ ] User detail page
- [ ] Health score calculation
- [ ] Impersonation mode (read-only)
- [ ] Basic actions (reset password, etc.)

### Phase 3: Monitoring

- [ ] API usage tracking
- [ ] Cost dashboard
- [ ] Sentry integration
- [ ] Notification system

### Phase 4: AI Features

- [ ] Struggling user detection
- [ ] AI email drafting
- [ ] AI issue diagnosis
- [ ] Churn prediction

### Phase 5: Polish

- [ ] Report generation
- [ ] Full impersonation (with edits)
- [ ] Advanced filtering/search
- [ ] Mobile responsiveness

---

## 16. Sentry Session Replay Integration

### 16.1 Overview

Leverage Sentry's built-in Session Replay feature to watch user sessions directly from
the admin dashboard. No additional tools needed.

### 16.2 Implementation

- Sentry Session Replay already configured in the app
- Each user's errors link to their session replays
- Replays embedded in user detail page via Sentry API
- Click any error to watch what the user did leading up to it

### 16.3 Admin View Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ Session Replays - Sarah Chen                                    │
├─────────────────────────────────────────────────────────────────┤
│ ▶ Dec 22, 10:34 AM - 12 min session (3 errors)                 │
│   [Watch Replay] [View Errors]                                  │
├─────────────────────────────────────────────────────────────────┤
│ ▶ Dec 21, 3:15 PM - 8 min session (0 errors)                   │
│   [Watch Replay]                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 17. Team Notes & Follow-up Tasks

### 17.1 Overview

Internal notes on user profiles visible to all admins, with optional follow-up task
reminders.

### 17.2 Database Schema

```sql
-- Admin notes on users
CREATE TABLE admin_user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  admin_user_id UUID REFERENCES user_profiles(id) NOT NULL,
  content TEXT NOT NULL,
  follow_up_date DATE, -- optional reminder
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_completed_by UUID REFERENCES user_profiles(id),
  follow_up_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 17.3 UI - Notes Section on User Detail

```
┌─────────────────────────────────────────────────────────────────┐
│ Team Notes                                      [+ Add Note]    │
├─────────────────────────────────────────────────────────────────┤
│ Joe • Dec 22, 2025 at 10:30 AM                                 │
│ Spoke with Sarah about Stripe Connect setup. She's confused    │
│ about the payout schedule. Sent her documentation link.        │
│ 📅 Follow up: Dec 29, 2025  [Mark Complete]                    │
├─────────────────────────────────────────────────────────────────┤
│ Support Agent • Dec 20, 2025 at 2:15 PM                        │
│ User reported slow page loads. Investigated - no issues found  │
│ on our end. Likely her internet connection.                    │
│ ✅ Completed Dec 21 by Joe                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 17.4 Follow-up Notifications

When a follow-up date is reached:

1. Normal notification created for all admins
2. Appears in notification center
3. Links directly to user profile

---

## 18. SLA Tracking & Response Metrics

### 18.1 Overview

Full SLA tracking to measure support quality: response times, resolution times, tracked
per admin with trends.

### 18.2 Database Schema

```sql
-- Support interactions for SLA tracking
CREATE TABLE admin_support_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  admin_user_id UUID REFERENCES user_profiles(id),
  type TEXT NOT NULL, -- 'error_response', 'outreach', 'ticket_response'
  trigger_notification_id UUID REFERENCES admin_notifications(id),

  -- Timestamps for SLA calculation
  issue_detected_at TIMESTAMPTZ NOT NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Calculated metrics (in minutes)
  response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily SLA aggregates per admin
CREATE TABLE admin_sla_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES user_profiles(id) NOT NULL,
  date DATE NOT NULL,
  interactions_count INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC,
  avg_resolution_time_minutes NUMERIC,
  issues_unresolved INTEGER DEFAULT 0,
  UNIQUE(admin_user_id, date)
);
```

### 18.3 SLA Dashboard (`/settings/admin/sla`)

```
┌─────────────────────────────────────────────────────────────────┐
│ SLA Metrics - December 2025                                     │
├────────────────┬────────────────┬────────────────┬──────────────┤
│ Avg Response   │ Avg Resolution │ Open Issues    │ Total Handled│
│ 23 minutes     │ 4.2 hours      │ 3              │ 47           │
│ ↓ 15% vs Nov   │ ↓ 8% vs Nov    │                │ ↑ 12% vs Nov │
└────────────────┴────────────────┴────────────────┴──────────────┘
```

### 18.4 Per-Admin Breakdown

| Admin         | Avg Response | Avg Resolution | Handled | Unresolved |
| ------------- | ------------ | -------------- | ------- | ---------- |
| Joe           | 18 min       | 3.5 hrs        | 28      | 1          |
| Support Agent | 31 min       | 5.1 hrs        | 19      | 2          |

### 18.5 Trend Charts

- Response time over time (daily/weekly)
- Resolution time over time
- Volume of issues by type
- Comparison between admins

---

## 19. NPS & Feedback Collection

### 19.1 Overview

Multi-pronged feedback collection: quarterly NPS surveys + post-support interaction
feedback.

### 19.2 Database Schema

```sql
-- NPS survey responses
CREATE TABLE nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  feedback TEXT,
  survey_type TEXT NOT NULL, -- 'quarterly', 'milestone', 'churn_prevention'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-support feedback
CREATE TABLE support_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  interaction_id UUID REFERENCES admin_support_interactions(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), -- 1-5 stars
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 19.3 NPS Survey Triggers

| Trigger                   | Timing          | Survey Type        |
| ------------------------- | --------------- | ------------------ |
| Quarterly                 | Every 90 days   | `quarterly`        |
| First funnel published    | After publish   | `milestone`        |
| Low health score detected | When score < 40 | `churn_prevention` |

### 19.4 Admin Dashboard View

```
┌─────────────────────────────────────────────────────────────────┐
│ NPS Overview                                                    │
├────────────────┬────────────────┬────────────────┬──────────────┤
│ Current NPS    │ Promoters      │ Passives       │ Detractors   │
│    +42         │ 58% (9-10)     │ 26% (7-8)      │ 16% (0-6)    │
│ ↑ 5 pts vs Q3  │                │                │              │
└────────────────┴────────────────┴────────────────┴──────────────┘

Recent Detractor Alerts:
┌─────────────────────────────────────────────────────────────────┐
│ 🔴 Lisa Park scored 3 - "The editor keeps crashing"            │
│    [View User] [Draft Outreach]                    2 hours ago  │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 Mike Wilson scored 4 - "Too expensive for what I get"       │
│    [View User] [Draft Outreach]                    1 day ago    │
└─────────────────────────────────────────────────────────────────┘
```

### 19.5 Post-Support Feedback

After admin interaction resolves:

1. User receives "How was your support experience?" prompt
2. 1-5 star rating + optional comment
3. Low ratings (1-2) trigger notification for review

---

## 20. In-App Messaging (Future Phase)

**Deferred** - Start with email-only outreach. Add in-app messaging in a future phase if
needed.

When implemented:

- Message center in user's dashboard
- Real-time notifications for new messages
- Message history tied to support interactions

---

## 21. Updated Implementation Phases

### Phase 1: Foundation

- [x] Database schema + migrations
- [x] Role system + RLS policies
- [x] Admin layout + sidebar integration
- [x] Basic user list view
- [x] Audit logging

### Phase 2: User Management

- [ ] User detail page
- [ ] Health score calculation
- [ ] Impersonation mode (read-only)
- [ ] Basic actions (reset password, etc.)
- [ ] Team notes with follow-up tasks

### Phase 3: Monitoring

- [ ] API usage tracking
- [ ] Cost dashboard
- [ ] Sentry integration + session replays
- [ ] Notification system

### Phase 4: AI Features

- [ ] Struggling user detection
- [ ] AI email drafting
- [ ] AI issue diagnosis
- [ ] Churn prediction

### Phase 5: Support Quality

- [ ] SLA tracking + response metrics
- [ ] NPS quarterly surveys
- [ ] Post-support feedback collection
- [ ] Report generation

### Phase 6: Polish

- [ ] Full impersonation (with edits)
- [ ] Advanced filtering/search
- [ ] Mobile responsiveness
- [ ] In-app messaging (if needed)

---

_Document created: December 22, 2025_ _Updated: December 22, 2025 - Added session
replay, team notes, SLA tracking, NPS/feedback_ _First super_admin:
joe@growthmastery.ai_
