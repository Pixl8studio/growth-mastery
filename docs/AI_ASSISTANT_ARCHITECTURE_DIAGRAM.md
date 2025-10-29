# Context-Aware AI Assistant - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         USER'S BROWSER                              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │                    User's Page Component                    │   │
│  │                                                             │   │
│  │  ┌───────────────────────────────────────────────────┐    │   │
│  │  │  usePageContextRegistration({                     │    │   │
│  │  │    pageId: "create-funnel",                       │    │   │
│  │  │    forms: [...],                                  │    │   │
│  │  │    actions: [...],                                │    │   │
│  │  │    businessContext: { projectId }                 │    │   │
│  │  │  })                                               │    │   │
│  │  └───────────────────────────────────────────────────┘    │   │
│  │                           │                                │   │
│  │                           │ Registers                      │   │
│  │                           ↓                                │   │
│  │  ┌───────────────────────────────────────────────────┐    │   │
│  │  │                                                    │    │   │
│  │  │        Zustand Page Context Store                 │    │   │
│  │  │                                                    │    │   │
│  │  │  - Current page metadata                          │    │   │
│  │  │  - Form fields and values                         │    │   │
│  │  │  - Available actions                              │    │   │
│  │  │  - Business context (projectId)                   │    │   │
│  │  │                                                    │    │   │
│  │  └───────────────────────────────────────────────────┘    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │              Context-Aware Help Widget                      │   │
│  │                                                             │   │
│  │  1. User clicks sparkle button                             │   │
│  │  2. Widget loads:                                          │   │
│  │     - Page context from Zustand                            │   │
│  │     - Business context from API                            │   │
│  │  3. Shows personalized welcome                             │   │
│  │  4. User sends message                                     │   │
│  │                                                             │   │
│  └──────────────────────┬──────────────────────────────────────   │
│                         │                                          │
│                         │ Sends message + context                 │
│                         ↓                                          │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          │ HTTPS
                          │
┌─────────────────────────┼──────────────────────────────────────────┐
│                         ↓                                          │
│                   BACKEND API                                      │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │     POST /api/ai-assistant/context                         │   │
│  │                                                             │   │
│  │  Loads business context:                                   │   │
│  │  ┌──────────────────────────────────────────┐             │   │
│  │  │ - User profile                           │             │   │
│  │  │ - Current project details                │             │   │
│  │  │ - All projects summary                   │             │   │
│  │  │ - Offers for project                     │             │   │
│  │  │ - Analytics (contacts, revenue)          │             │   │
│  │  └──────────────────────────────────────────┘             │   │
│  │                                                             │   │
│  │  Formats context for AI prompt                             │   │
│  │                                                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │     POST /api/support/chat/message                         │   │
│  │                                                             │   │
│  │  1. Receives:                                              │   │
│  │     - User message                                         │   │
│  │     - Page context                                         │   │
│  │     - Business context                                     │   │
│  │                                                             │   │
│  │  2. Builds comprehensive prompt:                           │   │
│  │     ┌────────────────────────────────────────┐            │   │
│  │     │ === PAGE CONTEXT ===                   │            │   │
│  │     │ Page: Create New Funnel                │            │   │
│  │     │ Type: form                              │            │   │
│  │     │ Forms: [...]                            │            │   │
│  │     │ Actions: [...]                          │            │   │
│  │     │                                         │            │   │
│  │     │ === BUSINESS CONTEXT ===                │            │   │
│  │     │ User: john@example.com                  │            │   │
│  │     │ Current Project: Marketing Mastery      │            │   │
│  │     │ Offers: [...],                          │            │   │
│  │     │ Analytics: [...]                        │            │   │
│  │     │                                         │            │   │
│  │     │ === INSTRUCTIONS ===                    │            │   │
│  │     │ You are Genie AI...                     │            │   │
│  │     │ [Detailed capabilities and format]      │            │   │
│  │     └────────────────────────────────────────┘            │   │
│  │                                                             │   │
│  │  3. Sends to OpenAI Assistants API                         │   │
│  │                                                             │   │
│  └──────────────────────┬──────────────────────────────────────   │
│                         │                                          │
│                         │ OpenAI API                               │
│                         ↓                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │              OpenAI Assistants API                          │   │
│  │                                                             │   │
│  │  - Processes message with full context                     │   │
│  │  - Generates intelligent response                          │   │
│  │  - Includes action intents:                                │   │
│  │    [FILL:form-id:field-id:value]                          │   │
│  │    [ACTION:action-id:params]                              │   │
│  │                                                             │   │
│  └──────────────────────┬──────────────────────────────────────   │
│                         │                                          │
│                         │ Response                                 │
│                         ↓                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │     POST /api/support/chat/message (continued)             │   │
│  │                                                             │   │
│  │  4. Returns AI response to frontend                        │   │
│  │                                                             │   │
│  └──────────────────────┬──────────────────────────────────────   │
│                         │                                          │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          │ Response with action intents
                          ↓
┌─────────────────────────┼──────────────────────────────────────────┐
│                         ↓                                          │
│                   USER'S BROWSER                                   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │         Action Executor (action-executor.ts)               │   │
│  │                                                             │   │
│  │  1. Parses AI response for action intents                  │   │
│  │     [FILL:create-funnel-form:name:Marketing Mastery]       │   │
│  │                                                             │   │
│  │  2. For each intent:                                       │   │
│  │                                                             │   │
│  │     If FILL:                                               │   │
│  │     ┌────────────────────────────────────┐                │   │
│  │     │ - Find DOM element by ID           │                │   │
│  │     │ - Set value                         │                │   │
│  │     │ - Dispatch input event              │                │   │
│  │     │ - Dispatch change event             │                │   │
│  │     │ - Update Zustand context            │                │   │
│  │     └────────────────────────────────────┘                │   │
│  │                                                             │   │
│  │     If ACTION:                                             │   │
│  │     ┌────────────────────────────────────┐                │   │
│  │     │ - Find action in page context      │                │   │
│  │     │ - Execute handler function          │                │   │
│  │     │ - Pass parameters                   │                │   │
│  │     └────────────────────────────────────┘                │   │
│  │                                                             │   │
│  │  3. Removes action commands from display                   │   │
│  │  4. Shows clean response to user                           │   │
│  │                                                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │              Form Fields Updated!                           │   │
│  │                                                             │   │
│  │  <input id="name" value="Marketing Mastery" />            │   │
│  │  <input id="description" value="..." />                    │   │
│  │                                                             │   │
│  │  User sees fields filled in automatically                  │   │
│  │                                                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Context Registration (Page Load)

```
User Opens Page
    ↓
Component calls usePageContextRegistration()
    ↓
Context stored in Zustand
    ↓
Available to AI Assistant
```

### 2. User Interaction (Chat Message)

```
User sends message
    ↓
Widget loads:
  - Page context from Zustand
  - Business context from API
    ↓
Sends to backend with both contexts
    ↓
Backend builds comprehensive prompt
    ↓
Sends to OpenAI
    ↓
OpenAI generates response with action intents
    ↓
Backend returns response
    ↓
Frontend parses action intents
    ↓
Executes actions:
  - Fill form fields
  - Execute page actions
    ↓
Shows clean response to user
    ↓
Form fields updated, user sees changes
```

### 3. Business Context Loading

```
Widget requests business context
    ↓
API endpoint /api/ai-assistant/context
    ↓
Loads from database:
  - User profile
  - Projects
  - Current project details
  - Offers
  - Analytics
    ↓
Formats for AI prompt
    ↓
Returns to frontend
    ↓
Included in all subsequent messages
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      Application                            │
│                                                             │
│  ┌────────────┐    ┌─────────────┐    ┌────────────────┐  │
│  │            │    │             │    │                │  │
│  │   Pages    │───▶│   Zustand   │◀───│  Help Widget   │  │
│  │            │    │   Context   │    │                │  │
│  │            │    │    Store    │    │                │  │
│  └────────────┘    └─────────────┘    └────────────────┘  │
│       │                                        │            │
│       │ registers                              │ reads      │
│       │ context                                │ context    │
│       │                                        │            │
│       └────────────────────┬───────────────────┘            │
│                            │                                │
│                            │                                │
│                    ┌───────▼─────────┐                     │
│                    │                 │                      │
│                    │  Page Context   │                      │
│                    │                 │                      │
│                    │  - Forms        │                      │
│                    │  - Fields       │                      │
│                    │  - Actions      │                      │
│                    │  - Business ID  │                      │
│                    │                 │                      │
│                    └─────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Interactions

### Form Filling Sequence

```
1. User: "Help me create a funnel"
   ↓
2. AI: "What would you like to name it?"
   ↓
3. User: "Marketing Mastery"
   ↓
4. AI: [FILL:create-funnel-form:name:Marketing Mastery]
       "Great! I've filled in the name. What's your target audience?"
   ↓
5. Action Executor:
   - Finds input#name
   - Sets value to "Marketing Mastery"
   - Triggers onChange
   ↓
6. User sees field filled automatically
   ↓
7. User: "Small business owners"
   ↓
8. AI: [FILL:create-funnel-form:targetAudience:Small business owners]
       "Perfect! Would you like me to create the funnel now?"
   ↓
9. User: "Yes!"
   ↓
10. AI: [ACTION:create_funnel:autoNavigate:true]
        "Creating your funnel! ✅"
    ↓
11. Action Executor:
    - Executes create_funnel action
    - Navigates to funnel builder
```

### Business Context Query

```
1. User: "How many contacts do I have?"
   ↓
2. Widget sends message with business context:
   {
     user: { email: "john@example.com" },
     projects: [
       { name: "Marketing Mastery", id: "123" },
       { name: "Sales Training", id: "456" }
     ],
     analytics: {
       totalContacts: 448,
       totalRevenue: 16430
     }
   }
   ↓
3. AI has full context and responds:
   "You have 448 contacts across your 2 funnels:
    - Marketing Mastery: 156 contacts
    - Sales Training: 89 contacts
    Would you like details on a specific funnel?"
```

## Technology Stack

| Layer                | Technology            | Purpose                     |
| -------------------- | --------------------- | --------------------------- |
| **State Management** | Zustand               | Page context storage        |
| **UI Framework**     | React / Next.js       | Component rendering         |
| **Styling**          | Tailwind CSS          | Component styling           |
| **AI Integration**   | OpenAI Assistants API | Natural language processing |
| **Database**         | Supabase / PostgreSQL | Business data storage       |
| **Type Safety**      | TypeScript            | Type checking               |
| **Logging**          | Pino                  | Structured logging          |
| **Error Tracking**   | Sentry                | Error monitoring            |

## Security Considerations

1. **Authentication**
   - All API endpoints verify user authentication
   - Business context filtered by user ID

2. **Data Access**
   - Users can only access their own projects
   - Row-level security enforced in database

3. **Action Execution**
   - Actions can only execute what page defines
   - No arbitrary code execution

4. **Input Validation**
   - All user inputs validated
   - Form values sanitized before setting

## Performance Optimizations

1. **Context Loading**
   - Business context cached during chat session
   - Only loaded once per conversation

2. **Action Execution**
   - Actions execute asynchronously
   - UI shows progress indicators

3. **Message Parsing**
   - Action intents parsed client-side
   - No additional round-trips

4. **Database Queries**
   - Optimized queries with proper indexes
   - Limited result sets

## Monitoring and Observability

### Logged Events

- Context registration
- Business context loading
- AI messages sent and received
- Actions executed
- Form fields filled
- Errors and failures

### Metrics to Track

- Assistant usage rate
- Average session length
- Forms completed with AI help
- Action execution success rate
- Response times

This architecture provides a scalable, maintainable foundation for intelligent,
context-aware AI assistance throughout the application. 🚀
