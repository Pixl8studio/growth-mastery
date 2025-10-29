# AI Assistant Quick Start Guide

## 5-Minute Integration

### Step 1: Add Widget to Layout (2 minutes)

```typescript
// app/layout.tsx or your main layout file
import { ContextAwareHelpWidget } from "@/components/support/context-aware-help-widget";

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                {children}
                <ContextAwareHelpWidget />
            </body>
        </html>
    );
}
```

### Step 2: Register Page Context (3 minutes)

In any page component where you want AI assistance:

```typescript
"use client";

import { useState } from "react";
import { usePageContextRegistration } from "@/hooks/use-page-context";

export default function MyPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    // Register context - CRITICAL: IDs must match DOM element IDs
    usePageContextRegistration({
        pageId: "my-page",
        pageName: "My Page Name",
        pageType: "form",
        description: "What this page does",

        forms: [
            {
                id: "my-form",
                name: "My Form",
                fields: [
                    {
                        id: "name", // ← Must match <input id="name" />
                        name: "name",
                        type: "text",
                        label: "Name",
                        value: name,
                        required: true,
                    },
                    {
                        id: "email", // ← Must match <input id="email" />
                        name: "email",
                        type: "email",
                        label: "Email",
                        value: email,
                        required: true,
                    },
                ],
            },
        ],

        // Optional: business context for project-specific pages
        businessContext: {
            projectId: "your-project-id",
        },
    });

    return (
        <form>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </form>
    );
}
```

That's it! The AI assistant now:

- Knows about your form fields
- Can help users fill them in conversationally
- Understands the page purpose
- Has access to business context

## Common Patterns

### Pattern 1: Form Page

```typescript
forms: [
  {
    id: "form-id",
    name: "Descriptive Form Name",
    fields: fields.map((field) => ({
      id: field.domId, // Must match DOM
      name: field.name,
      type: field.type,
      label: field.label,
      value: field.value,
      required: field.required,
      helpText: field.helpText,
    })),
  },
];
```

### Pattern 2: Dashboard Page

```typescript
{
    pageId: "dashboard",
    pageName: "Analytics Dashboard",
    pageType: "dashboard",
    description: "View funnel performance metrics",

    businessContext: {
        projectId: currentProjectId,
    },

    helpTopics: [
        "Understanding conversion rates",
        "Tracking revenue",
        "Interpreting watch rates",
    ],
}
```

### Pattern 3: Editor Page

```typescript
{
    pageId: "offer-editor",
    pageName: "Offer Editor",
    pageType: "editor",
    description: "Create and edit offer details",

    actions: [
        {
            id: "save_draft",
            label: "Save Draft",
            description: "Save current changes as draft",
            handler: async () => { /* save logic */ },
        },
        {
            id: "publish",
            label: "Publish Offer",
            description: "Publish offer to live funnel",
            handler: async () => { /* publish logic */ },
        },
    ],
}
```

## Testing Your Integration

### 1. Open the Page

Navigate to your page in the browser.

### 2. Open AI Assistant

Click the sparkle button in bottom-right corner.

### 3. Start Chat

Click "Chat with Genie AI"

### 4. Test Context Awareness

Ask: "What can you help me with on this page?"

The AI should describe the page, list available forms and fields, and offer to help fill
them in.

### 5. Test Form Filling

Say: "Help me fill in this form"

The AI should ask questions about each field and fill them in as you respond.

### 6. Test Business Context (if projectId provided)

Ask: "What's the status of this project?"

The AI should know project details, analytics, offers, etc.

## Troubleshooting

### AI Can't Fill Fields

**Problem:** AI says it filled a field but nothing changes.

**Solution:** Verify field IDs match:

```typescript
// Context
fields: [{ id: "name" }]

// JSX
<input id="name" />  // ✅ IDs match

<input id="userName" />  // ❌ IDs don't match
```

### AI Doesn't Know Business Context

**Problem:** AI says "I don't have access to that information"

**Solution:** Add business context:

```typescript
businessContext: {
    projectId: yourProjectId,  // Get from URL params or props
}
```

### Widget Not Showing

**Problem:** No sparkle button appears.

**Solution:**

1. Check that `<ContextAwareHelpWidget />` is in your layout
2. Verify it's a client component (`"use client"` at top)
3. Check browser console for errors

### AI Responses Are Generic

**Problem:** AI gives generic answers, not specific to your page.

**Solution:** Improve page description and help topics:

```typescript
description: "Create a new funnel project by providing name, target audience, and business niche",

helpTopics: [
    "How to choose a funnel name",
    "Defining your target audience",
    "What is business niche",
],

commonQuestions: [
    "Can I change these details later?",
    "What happens after I create the funnel?",
],
```

## Advanced: Custom Actions

Allow AI to trigger page-specific actions:

```typescript
actions: [
  {
    id: "generate_description",
    label: "Generate Description",
    description: "Use AI to generate a description based on name and niche",
    handler: async (params?: { name?: string; niche?: string }) => {
      const description = await generateDescription(params);
      setDescription(description);
    },
    parameters: [
      {
        name: "name",
        type: "string",
        required: false,
        description: "The funnel name to base description on",
      },
      {
        name: "niche",
        type: "string",
        required: false,
        description: "The business niche for context",
      },
    ],
  },
];
```

Then users can say: "Generate a description for me based on my funnel name and niche"

The AI will execute:
`[ACTION:generate_description:name:Marketing Mastery:niche:Digital Marketing]`

## Next Steps

1. **Start Simple** - Add to 2-3 key pages first
2. **Gather Feedback** - See how users interact with it
3. **Add Actions** - Add custom actions for common tasks
4. **Expand Coverage** - Add to more pages as you see value
5. **Monitor Usage** - Track which features users find most helpful

## Full Example

See `components/examples/create-funnel-with-context.tsx` for a complete working example
with:

- Form registration
- Business context
- Custom actions
- Help topics
- All best practices

## Support

For questions or issues:

1. Check `docs/AI_ASSISTANT_CONTEXT_AWARE_SYSTEM.md` for architecture details
2. Review the example in `components/examples/create-funnel-with-context.tsx`
3. Look at existing implementations in the codebase
4. Test in development first, then deploy to staging
