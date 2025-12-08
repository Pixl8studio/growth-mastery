# Conversational AI Editor - Technical Specification Document

Based on the screenshot, here is a detailed breakdown of the conversational AI-powered
visual editor interface for your development team.

## 1. Overall Layout Architecture

The interface follows a split-pane design:

- **Left Panel** (~35% width): AI Chat/Conversation Interface
- **Right Panel** (~65% width): Live Visual Preview of the content being edited

## 2. Header/Toolbar Components

### Top Navigation Bar

- **Project Title** (top-left): "Training - Launch Your Profitable Webinar In A Day"
  with dropdown indicator for project switching
- **Status Indicator**: "Previewing last saved version" subtitle text

### Center Toolbar Icons

- History/version control button
- Device preview toggle (desktop/mobile)
- "Preview" button (currently active/highlighted with green icon)
- Chart/analytics icon
- Code view toggle (`</>`)
- Undo button
- Add/plus button

### Right Toolbar

- AI/Copilot icon with command input (`/`)
- Expand/fullscreen toggle
- Refresh button
- Share button (with user avatar)
- Publish button (green, primary CTA)

## 3. Left Panel - AI Conversation Interface

### Chat Message Thread

- **User Messages**: Displayed in gray/light background bubbles, right-aligned or
  distinct styling
- **AI Responses**: Include:
  - **Thinking/Processing Indicator**: "Thought for 15s" with lightbulb icon - shows AI
    reasoning time
  - **Response Text**: Natural language explanation of what the AI did
  - **Edit Summary**: "2 edits made" with "Show all" link to expand

### AI Action Cards

After processing, the AI provides:

- **Summary of Changes**: "Updated all messaging to reflect the training recording
  instead of the live event - removed time-specific language, 'limited spots,' and
  changed CTAs to 'Watch Now' and 'Get Instant Access.'"
- **Expandable Action Items**: Collapsible cards showing:
  - "Update recording messaging" with chevron for expansion
  - "Preview Latest" link
  - "Code" button (`</>`) to view underlying code changes
  - Bookmark/save icon

### Feedback Controls

- Thumbs up/down buttons for AI response quality
- Copy button
- More options menu (`...`)

### Quick Action Suggestion Chips

Below the conversation:

- "Add urgency element"
- "Add attendee testimonials"

These are contextual suggestions the AI offers for next steps.

### Chat Input Area

- **Text Input Field**: "Ask Lovable..." placeholder (branded AI name)
- **Left side controls**:
  - `+` button (attach files/images)
  - "Visual edits" toggle with sparkle icon
- **Right side controls**:
  - "Chat" mode toggle
  - Voice input button (microphone/speaker icon)
  - Send button (circular, orange/yellow gradient)

## 4. Right Panel - Live Visual Preview

### Real-time Rendered Output

Displays the actual webpage/landing page being edited:

**Hero Section:**

- Large headline: "Launch a Profitable Webinar in a Day" (with gradient text effect on
  "Webinar in a Day")
- Subheadline paragraph with value proposition
- Primary CTA Button: "Watch the Training" (green button with down arrow)
- Supporting text: "Full Training Recording Available Now"
- Visual Elements: Gradient background effects, scroll indicator arrow

### Interactive Preview

- Changes made via AI conversation reflect immediately in this preview
- WYSIWYG representation of the final output

## 5. Key Features to Implement

### AI Conversation Engine

- **Natural Language Understanding**: Parse user requests about content changes
- **Context Awareness**: Understand attached screenshots and current page state
- **Thinking/Reasoning Display**: Show processing time and reasoning transparency
- **Multi-edit Capabilities**: Make multiple changes from single instruction
- **Change Summarization**: Clearly explain what was modified

### Edit Tracking System

- **Edit Counter**: Track number of changes per interaction
- **Expandable Edit Details**: Show/hide individual changes
- **Code Diff View**: Toggle to see actual code modifications
- **Version Preview**: "Preview Latest" functionality

### Suggestion System

- **Contextual Quick Actions**: AI-generated suggestion chips based on content
- **One-click Application**: Apply suggestions instantly

### Input Modes

- **Text Chat**: Standard conversational input
- **Visual Edits Mode**: Direct on-canvas manipulation
- **Voice Input**: Speech-to-text capability
- **Image/File Attachments**: Reference screenshots in conversation

## 6. Interaction Flow

1. User types request or uploads reference image
2. AI shows "Thinking for Xs" indicator
3. AI responds with explanation of changes
4. Edit summary card appears with change count
5. Preview updates in real-time on right panel
6. User can expand to see details, view code, or provide feedback
7. Quick action chips offer next logical steps

## Summary

This is a sophisticated AI-first content editor that abstracts away direct editing in
favor of conversational interactions, while maintaining transparency through edit
tracking and code access.
