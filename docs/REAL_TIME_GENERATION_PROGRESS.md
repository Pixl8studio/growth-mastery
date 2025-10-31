# Real-Time Auto-Generation Progress Tracking

This document describes the implementation of real-time progress tracking for the
"Regenerate All Content" feature in the intake step.

## Overview

The auto-generation progress tracking system provides users with real-time feedback as
each step of the funnel generation process completes. Users can see which steps are
currently being generated, which have completed, and which have failed - all while being
able to navigate to completed steps or browse other pages.

## Features

### 1. Real-Time Progress Updates

- **Polling-based updates** every 2.5 seconds while generation is active
- **Visual feedback** for each step's status (pending, in-progress, completed, failed)
- **Progress bar** showing overall completion percentage
- **Step-by-step breakdown** with individual status indicators

### 2. User Navigation

- **Click-to-navigate** on completed steps to view generated content
- **Background processing** continues even if user navigates away
- **Persistent tracking** across all funnel builder pages

### 3. Visual Components

- **Main progress card** on intake step with detailed step information
- **Global floating tracker** that appears on all other steps during generation
- **Status indicators**: animated spinner (in-progress), checkmark (completed), X
  (failed), circle (pending)

## Architecture

### Backend Components

#### 1. Generation Status API (`app/api/generate/generation-status/route.ts`)

- **Endpoint**: `GET /api/generate/generation-status?projectId={id}`
- **Purpose**: Returns current generation status from database
- **Response**:
  ```typescript
  {
    isGenerating: boolean,
    currentStep: number | null,
    completedSteps: number[],
    failedSteps: Array<{ step: number; error: string }>,
    progress: Array<{
      step: number,
      stepName: string,
      status: "pending" | "in_progress" | "completed" | "failed",
      error?: string,
      completedAt?: string
    }>,
    startedAt: string | null
  }
  ```

#### 2. Enhanced Auto-Generation Orchestrator (`lib/generators/auto-generation-orchestrator.ts`)

- **Modified `updateGenerationStatus`**: Now merges updates with existing status
- **Progress updates**: After each step starts and completes
- **Database persistence**: Stores progress in `funnel_projects.auto_generation_status`
  JSONB field
- **Status tracking**:
  - Sets `current_step` when step starts
  - Updates `progress` array with step status
  - Marks `completedAt` timestamp when step finishes
  - Records errors in `generation_errors` array

### Frontend Components

#### 1. AutoGenerationProgress (`components/funnel/auto-generation-progress.tsx`)

- **Location**: Displayed on intake step (step 1)
- **Features**:
  - Large progress card with step-by-step breakdown
  - Progress bar showing completion percentage
  - Click-to-navigate on completed steps
  - Current step highlighting
  - Background processing notice
- **Props**:
  ```typescript
  {
    projectId: string,
    progress: GenerationProgressItem[],
    isGenerating: boolean,
    currentStep: number | null,
    onClose?: () => void
  }
  ```

#### 2. GenerationProgressTracker (`components/layout/generation-progress-tracker.tsx`)

- **Location**: Fixed bottom-right corner on all funnel builder pages (except step 1)
- **Features**:
  - Collapsible floating widget
  - Mini progress bar
  - Expandable detailed view
  - Auto-hides 5 seconds after completion
  - Independent polling (every 3 seconds)
- **Auto-dismiss**: Hides automatically when:
  - User clicks the X button
  - Generation completes (after 5 second delay)
  - User navigates to intake page

#### 3. Enhanced Step 1 Page (`app/funnel-builder/[projectId]/step/1/page.tsx`)

- **Polling mechanism**: Starts when generation begins, stops when complete
- **State management**:
  - `isGenerating`: Tracks if generation is active
  - `generationProgress`: Array of step progress items
  - `currentGeneratingStep`: Currently generating step number
  - `pollingIntervalRef`: Reference to polling interval for cleanup
- **Lifecycle**:
  1. Check status on mount
  2. Start polling when generation initiated
  3. Update UI as progress changes
  4. Stop polling and refresh on completion
  5. Clean up interval on unmount

## Data Flow

```
User clicks "Regenerate All Content"
    ↓
Modal confirmation
    ↓
POST /api/generate/auto-generate-all
    ↓
Orchestrator starts generation
    ↓
Update DB: is_generating=true, started_at, initial progress
    ↓
For each step:
    - Update DB: current_step, progress[i].status = "in_progress"
    - Generate content
    - Update DB: progress[i].status = "completed", completedAt
    ↓
Frontend polls GET /api/generate/generation-status
    ↓
Update UI components
    ↓
User sees real-time progress
    ↓
On completion:
    - Update DB: is_generating=false, final progress
    - Stop polling
    - Show completion toast
    - Refresh step completion status
```

## Database Schema

The `funnel_projects.auto_generation_status` JSONB field stores:

```typescript
{
  is_generating: boolean,
  current_step: number | null,
  generated_steps: number[],  // Completed step numbers
  generation_errors: Array<{ step: number; error: string }>,
  progress: Array<{
    step: number,
    stepName: string,
    status: "pending" | "in_progress" | "completed" | "failed",
    error?: string,
    completedAt?: string
  }>,
  started_at: string,
  last_generated_at?: string,
  intake_id_used?: string,
  regeneration_count?: number
}
```

## Steps Generated

The auto-generation process creates content for:

1. **Step 2**: Offer
2. **Step 3**: Deck Structure
3. **Step 5**: Enrollment Pages
4. **Step 8**: Watch Pages
5. **Step 9**: Registration Pages
6. **Step 11**: AI Followup Sequence
7. **Marketing Profile** (step 0): Marketing profile initialization

## User Experience

### On Intake Page (Step 1)

1. User clicks "Generate All Content" or "Regenerate All Content"
2. Confirmation modal appears
3. On confirmation:
   - Modal closes
   - Toast notification: "Starting Generation..."
   - Large progress card appears showing all steps
4. As each step generates:
   - Step shows animated spinner
   - Progress bar advances
   - User can click completed steps to navigate
5. On completion:
   - Success toast appears
   - All steps show green checkmarks
   - User can close progress card

### On Other Pages

1. If generation is in progress when user navigates:
   - Floating tracker appears in bottom-right corner
   - Shows minimal progress info (collapsed by default)
2. User can:
   - Expand to see detailed progress
   - Dismiss the tracker
   - Continue working on other pages
3. On completion:
   - Tracker updates to show "Generation Complete"
   - Auto-dismisses after 5 seconds
   - Step completion status refreshes

## Benefits

### For Users

- **Transparency**: Know exactly what's happening at all times
- **Freedom**: Navigate to completed steps or other pages during generation
- **Confidence**: Visual confirmation that generation is progressing
- **Convenience**: Direct navigation to newly generated content

### For Developers

- **Debuggability**: Easy to see which steps succeed/fail
- **Monitoring**: Track generation performance and issues
- **Extensibility**: Easy to add more steps or change progress display
- **Type safety**: Strongly typed interfaces throughout

## Error Handling

- **Network errors**: Logged but don't stop polling
- **Generation failures**: Displayed in progress with error message
- **Partial failures**: Completed steps remain accessible
- **Recovery**: User can retry generation if needed

## Performance Considerations

- **Polling frequency**: 2.5-3 seconds balances responsiveness with server load
- **Cleanup**: Intervals cleared on unmount to prevent memory leaks
- **Ref usage**: `useRef` for interval prevents race conditions
- **Status merging**: Database updates merge with existing status to prevent data loss
- **Conditional rendering**: Components only render when needed

## Testing Checklist

- [ ] Generate all content on fresh project
- [ ] Regenerate content on existing project
- [ ] Navigate to other pages during generation
- [ ] Click on completed steps to navigate
- [ ] Verify progress updates in real-time
- [ ] Check global tracker on different pages
- [ ] Test collapse/expand of global tracker
- [ ] Verify auto-dismiss after completion
- [ ] Test error handling for failed steps
- [ ] Verify polling stops on unmount
- [ ] Check mobile responsiveness
- [ ] Test with slow network connection

## Future Enhancements

- **Server-Sent Events (SSE)**: Replace polling with push-based updates
- **Retry mechanism**: Allow retry of failed steps
- **Progress persistence**: Store in localStorage for page refreshes
- **Detailed logs**: Show generation logs for each step
- **Time estimates**: Display estimated time remaining
- **Notifications**: Browser notifications for completion
- **Analytics**: Track generation times and success rates
