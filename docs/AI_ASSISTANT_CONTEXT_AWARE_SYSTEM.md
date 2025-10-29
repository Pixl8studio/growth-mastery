# Context-Aware AI Assistant System - Complete Implementation

## Overview

We've transformed the basic help widget into a comprehensive, context-aware AI assistant
that:

1. **Understands the current page** - Knows what forms, fields, and actions are
   available
2. **Knows your business** - Accesses funnel data, analytics, and business context
3. **Fills forms conversationally** - Chats with users and populates fields as they
   provide information
4. **Answers questions** - Explains processes and guides through workflows
5. **Executes actions** - Navigates, generates content, and completes tasks

## Architecture

### 1. Page Context System (`lib/ai-assistant/page-context.ts`)

A Zustand store that allows pages to register their context:

```typescript
interface PageContext {
  pageId: string;
  pageName: string;
  pageType: string; // 'form', 'dashboard', 'editor', 'list', etc.
  description: string;

  currentData?: Record<string, any>;
  step?: number;
  totalSteps?: number;

  forms?: Array<{
    id: string;
    name: string;
    fields: FormField[];
  }>;

  actions?: PageAction[];
  businessContext?: { projectId?: string; [key: string]: any };
  helpTopics?: string[];
  commonQuestions?: string[];
}
```

**Key Features:**

- Global store accessible by AI assistant
- Tracks forms, fields, and their current values
- Registers available actions the AI can trigger
- Provides help topics and common questions

### 2. Business Context Aggregator (`lib/ai-assistant/business-context.ts`)

Loads comprehensive user business data:

```typescript
interface BusinessContext {
  user: { id: string; email: string; fullName?: string };
  currentProject?: {
    id: string;
    name: string;
    description?: string;
    targetAudience?: string;
    businessNiche?: string;
    status: string;
    currentStep: number;
  };
  projects: Array<{ id: string; name: string; status: string }>;
  offers: Array<{ id: string; name: string; price?: number; description?: string }>;
  analytics?: {
    totalContacts: number;
    totalRevenue: number;
    conversionRate: number;
  };
}
```

**Functions:**

- `loadBusinessContext(projectId?)` - Loads user's business data from database
- `formatBusinessContextForPrompt(context)` - Formats context for AI assistant prompt

### 3. Action Executor (`lib/ai-assistant/action-executor.ts`)

Allows AI to trigger page actions:

```typescript
// Execute an action registered by the page
await executePageAction("create_funnel", { autoNavigate: true });

// Fill a form field
await fillFormField("create-funnel-form", "name", "My Awesome Funnel");

// Fill multiple fields at once
await fillMultipleFields("create-funnel-form", [
  { fieldId: "name", value: "My Funnel" },
  { fieldId: "description", value: "A great funnel" },
]);
```

**Features:**

- Executes actions defined by pages
- Fills form fields programmatically
- Dispatches proper DOM events (input, change)
- Parses AI response for action intents

**Action Intent Format:**

- `[FILL:formId:fieldId:value]` - Fill a form field
- `[ACTION:actionId:param1:param2]` - Execute an action

### 4. Enhanced Assistant API (`app/api/support/chat/message/route.ts`)

Sends comprehensive context with every message:

```typescript
// Build comprehensive context for assistant
let contextInstructions = `User is currently on: ${contextPage}`;

// Add page context
if (pageContext) {
  contextInstructions += `\n\n=== PAGE CONTEXT ===\n${pageContext}`;
}

// Add business context
if (businessContext) {
  contextInstructions += `\n\n${businessContext}`;
}

contextInstructions += `\n\n=== INSTRUCTIONS ===
You are Genie AI, a helpful assistant for the Genie funnel builder platform.

CAPABILITIES:
1. Answer questions about the current page and process
2. Help users fill in forms by asking for information conversationally
3. Provide guidance on funnel building steps
4. Access user's business data to provide personalized help
5. Suggest actions and next steps

FORM FILLING:
When helping users fill in forms, ask for information naturally in conversation.
As they provide information, suggest which fields to fill.
Use this format to indicate field fills: [FILL:formId:fieldId:value]

ACTIONS:
You can trigger actions using: [ACTION:actionId:param1:param2]
Available actions are listed in the page context above.

Be conversational, helpful, and proactive.`;
```

### 5. Context-Aware Help Widget (`components/support/context-aware-help-widget.tsx`)

Enhanced chat widget that:

1. Loads page context from Zustand store
2. Fetches business context for current project
3. Sends both contexts with every message
4. Parses AI responses for action intents
5. Executes actions automatically
6. Shows friendly, context-aware welcome message

**Features:**

- Knows what page user is on
- Aware of available forms and fields
- Can execute actions on behalf of user
- Shows project name and current step
- Provides contextual help based on page type

## Usage

### 1. Register Page Context

In your page component:

```typescript
import { usePageContextRegistration } from "@/hooks/use-page-context";
import { PageContext } from "@/lib/ai-assistant/page-context";

export default function MyPage() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Define page context
    const pageContext: PageContext = {
        pageId: "my-page",
        pageName: "My Page",
        pageType: "form",
        description: "Description of what this page does",

        forms: [
            {
                id: "my-form",
                name: "My Form",
                fields: [
                    {
                        id: "name",
                        name: "name",
                        type: "text",
                        label: "Name",
                        value: name,
                        required: true,
                        helpText: "Enter your name",
                    },
                    {
                        id: "description",
                        name: "description",
                        type: "textarea",
                        label: "Description",
                        value: description,
                        required: false,
                        helpText: "Enter a description",
                    },
                ],
            },
        ],

        actions: [
            {
                id: "save",
                label: "Save",
                description: "Save the form data",
                handler: async () => {
                    // Your save logic
                },
            },
        ],

        businessContext: {
            projectId: "project-123", // Current project ID
        },

        helpTopics: [
            "How to fill in this form",
            "What happens after submission",
        ],
    };

    // Register context
    usePageContextRegistration(pageContext);

    return (
        <form>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </form>
    );
}
```

### 2. Add Widget to Layout

In your layout file:

```typescript
import { ContextAwareHelpWidget } from "@/components/support/context-aware-help-widget";

export default function Layout({ children }) {
    return (
        <>
            {children}
            <ContextAwareHelpWidget />
        </>
    );
}
```

### 3. Field IDs Match DOM IDs

**CRITICAL**: Form field IDs in context must match DOM element IDs:

```typescript
// Context registration
fields: [
    {
        id: "name", // Must match DOM id
        // ...
    },
]

// JSX
<input id="name" value={name} onChange={(e) => setName(e.target.value)} />
```

This allows the action executor to find and fill the fields.

## Example User Interactions

### Scenario 1: Creating a Funnel

**User:** "Help me create a funnel for my digital marketing course"

**AI:** "I'd be happy to help! Let me ask you a few questions:

1. What would you like to name this funnel?
2. Who is your target audience?
3. What's your business niche?

Let's start with the funnel name - what sounds good to you?"

**User:** "Let's call it 'Marketing Mastery 2025'"

**AI:** "Great name! [FILL:create-funnel-form:name:Marketing Mastery 2025]

I've filled in the name. Now, who is this course designed for? Small business owners,
entrepreneurs, marketing professionals?"

**User:** "Small business owners who want to learn digital marketing"

**AI:** "Perfect! [FILL:create-funnel-form:targetAudience:Small business owners learning
digital marketing]

And what's your business niche?"

**User:** "Digital Marketing Education"

**AI:** "Excellent! [FILL:create-funnel-form:businessNiche:Digital Marketing Education]

Would you like to add a description, or should we create the funnel now?"

**User:** "Let's create it!"

**AI:** "Creating your funnel now! [ACTION:create_funnel:autoNavigate:true]"

### Scenario 2: Asking Questions

**User:** "What happens after I create this funnel?"

**AI:** "After creating your funnel, you'll go through 12 steps to build your complete
magnetic masterclass:

1. AI Intake Call - Tell us about your business
2. Define Offer - AI creates optimized offers
3. Create 55-slide presentation structure
4. Generate Gamma presentation ... and so on.

The AI helps you with each step, and by the end, you'll have a complete funnel with
registration page, pitch video, and enrollment page. Would you like to get started?"

### Scenario 3: Business Context Awareness

**User:** "How is my Marketing Mastery funnel performing?"

**AI:** "Looking at your Marketing Mastery 2025 funnel:

- **Contacts:** 156 total registrations
- **Revenue:** $4,850 generated
- **Conversion Rate:** 12.5% enrollment rate
- **Status:** Active, currently at step 8 (Watch Page)

Your watch rate is 68% and enrollment rate is above average! Would you like me to help
you optimize any part of the funnel?"

## Benefits

### For Users

1. **Natural Conversation** - Ask questions in plain English
2. **Form Filling Assistance** - AI asks questions and fills fields
3. **Process Guidance** - Explains what to do next
4. **Business Awareness** - AI knows your funnels and can discuss performance
5. **Contextual Help** - Different help based on current page

### For Developers

1. **Easy Integration** - Just register context with a hook
2. **Flexible Actions** - Define any action the AI can trigger
3. **Form Field Mapping** - Automatic form filling via DOM manipulation
4. **Comprehensive Context** - AI has full visibility into page state
5. **Extensible** - Easy to add new capabilities

## Architecture Decisions

### Why Zustand for Page Context?

- Lightweight state management
- Works across component boundaries
- Easy to access from anywhere
- Perfect for global assistant context

### Why Format Context as Text?

- LLMs work best with natural language
- Easier to debug (read the prompt)
- Flexible - easy to add new context
- Token-efficient compared to structured JSON

### Why Action Intents in Responses?

- Allows AI to trigger actions without complex function calling
- Easy to parse and execute
- Transparent - we can see what AI wants to do
- Works with any LLM that can format text

### Why DOM Manipulation for Form Fills?

- Works with any React form
- Triggers proper onChange events
- Doesn't require form refactoring
- Compatible with controlled components

## Future Enhancements

### 1. Proactive Assistance

Detect when user is stuck and offer help:

```typescript
// After 30 seconds on page with no interaction
if (noInteractionFor(30_000) && hasEmptyRequiredFields()) {
  showSuggestion("Would you like help filling in this form?");
}
```

### 2. Multi-Step Workflows

Guide users through complex workflows:

```typescript
actions: [
  {
    id: "guided_workflow",
    label: "Guide Through Workflow",
    description: "Step-by-step guidance through entire process",
    handler: async () => {
      // Multi-step guidance
    },
  },
];
```

### 3. Smart Defaults

Use business context to suggest values:

```typescript
// AI suggests target audience based on previous funnels
"Based on your other funnels, your target audience is usually 'Small business owners'. Should I use that here?";
```

### 4. Voice Integration

Allow voice commands:

```typescript
// Voice: "Create a new funnel called Marketing Mastery"
// AI understands and fills form
```

### 5. Analytics Integration

Provide insights based on data:

```typescript
"I notice your conversion rate dropped after you changed the headline. Would you like to revert it?";
```

## Testing

### Page Context Registration

```typescript
// Test that context is registered
const { context } = usePageContext.getState();
expect(context?.pageId).toBe("my-page");
expect(context?.forms?.[0].fields).toHaveLength(2);
```

### Form Filling

```typescript
// Test filling a field
await fillFormField("my-form", "name", "Test Value");
const input = document.getElementById("name") as HTMLInputElement;
expect(input.value).toBe("Test Value");
```

### Action Execution

```typescript
// Test action execution
const mockHandler = vi.fn();
const context = {
  actions: [{ id: "test", handler: mockHandler }],
};
usePageContext.getState().setContext(context);
await executePageAction("test");
expect(mockHandler).toHaveBeenCalled();
```

## Deployment Checklist

- [ ] Set `OPENAI_ASSISTANT_ID` environment variable
- [ ] Deploy database migrations (already exists)
- [ ] Add ContextAwareHelpWidget to main layout
- [ ] Register context on key pages (create funnel, funnel builder steps)
- [ ] Test form filling on at least 3 different pages
- [ ] Test business context loading
- [ ] Test action execution
- [ ] Monitor OpenAI API usage and costs
- [ ] Set up alerts for assistant errors

## Conclusion

The context-aware AI assistant system transforms the basic help widget into a powerful,
intelligent assistant that understands your business, can help fill in forms
conversationally, and guides users through complex workflows.

By registering page context with a simple hook, any page can become AI-assistant aware
and provide users with contextual, intelligent help that knows about their business and
can take actions on their behalf.

This is a foundation for even more advanced assistance features in the future, like
proactive suggestions, voice commands, and predictive analytics.
