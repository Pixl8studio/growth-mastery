# Beta User Onboarding Issues - December 11, 2024

Issues identified from the beta user onboarding call transcript. Each issue below is ready to be created in GitHub.

---

## Issue 1: Forgot Password Link Returns "Page Not Found" Error

**Labels:** `bug`, `authentication`, `priority-high`

### Description

When users click the "Forgot Password" link on the login page, they are taken to a broken page that displays "this page cannot be found" instead of a password reset form.

### User Report

During the onboarding call, John Beaudry reported:
> "Forgot Password took me to a 'this page cannot be found'"

Joe acknowledged this is blocking users from recovering their accounts and committed to fixing it by end of day.

### Expected Behavior

Clicking "Forgot Password" should take users to a working password reset page where they can enter their email address and receive a reset link.

### Actual Behavior

Users see a 404 error page with "this page cannot be found" message.

### Impact

**High** - This completely blocks users who have forgotten their password from accessing their accounts.

### Acceptance Criteria

- [ ] Forgot password link navigates to a working password reset page
- [ ] Users can enter their email and receive a password reset email
- [ ] Reset email is branded as Growth Mastery (not Supabase)
- [ ] Password reset flow completes successfully

---

## Issue 2: Verification Emails Display "Supabase" Branding Instead of Growth Mastery

**Labels:** `bug`, `branding`, `email`, `priority-medium`

### Description

When new users create an account and receive a verification email, the email comes from "Supabase" with Supabase branding rather than Growth Mastery branding. This creates a confusing and unprofessional user experience.

### User Report

During onboarding, Keegan Anatole reported:
> "Is it creating an account? It wants me to verify the email... I got an email from Supabase."

Nathan Camp joked: "Sounds like a rap band" - highlighting how confusing this is for users who have no context about what Supabase is.

Joe acknowledged: "We're working on branding that. The Supabase is our contact management platform."

### Expected Behavior

All transactional emails (verification, password reset, etc.) should:
- Come from a Growth Mastery email address (e.g., noreply@growthmastery.ai)
- Display Growth Mastery logo and branding
- Use Growth Mastery color scheme and design language

### Actual Behavior

Emails display Supabase branding, which is confusing for users who don't know what Supabase is.

### Acceptance Criteria

- [ ] Verification emails display Growth Mastery branding
- [ ] Sender name shows "Growth Mastery" not "Supabase"
- [ ] Email templates match the Growth Mastery design system
- [ ] All transactional emails are consistent in branding

---

## Issue 3: Website Domain Still Shows "Vercel" Instead of Custom Domain

**Labels:** `bug`, `deployment`, `branding`, `priority-medium`

### Description

The website URL or metadata is still displaying "Vercel" branding somewhere on the site, likely in the page metadata, favicon, or deployment configuration. This creates an unprofessional appearance and confusion about what platform users are on.

### User Report

Matthew Miceli reported:
> "The domain on the website still says Vercel."

Joe acknowledged: "Got it. I'll fix that."

### Expected Behavior

All domain references, metadata, and branding should show "Growth Mastery" or "growthmastery.ai" with no references to the underlying hosting platform (Vercel).

### Actual Behavior

Some aspect of the website still displays "Vercel" branding or domain information.

### Investigation Needed

- Check page metadata (title, description)
- Check favicon and site manifest
- Check any exposed headers or footer text
- Verify custom domain is properly configured

### Acceptance Criteria

- [ ] No "Vercel" branding visible anywhere on the site
- [ ] Custom domain (growthmastery.ai) displays correctly
- [ ] Page titles and metadata reference Growth Mastery
- [ ] Favicon shows Growth Mastery logo

---

## Issue 4: "[object Object]" Display Bug in Generated Business Profile Content

**Labels:** `bug`, `ai-generation`, `priority-high`

### Description

When the AI generates content for the business profile/intake section, some fields display "[object Object]" instead of the actual generated text. This is a JavaScript serialization bug where an object is being rendered as a string instead of its actual content.

### User Report

Joe noticed during the live demo:
> "Looks like this one, this is an example. Like this is a tiny little bug. I'll go back in and make sure that that object, object field is not broken."

### Expected Behavior

All generated fields should display readable text content that represents the AI's output.

### Actual Behavior

Some fields display "[object Object]" which indicates the system is trying to render a JavaScript object as a string.

### Technical Context

This typically happens when:
- A nested object is being passed to a text field
- JSON parsing/stringification is not handled correctly
- React is rendering an object instead of a string property

### Acceptance Criteria

- [ ] All generated content fields display readable text
- [ ] No "[object Object]" appears anywhere in the UI
- [ ] Proper error handling for malformed AI responses
- [ ] Add type checking to ensure text fields receive strings

---

## Issue 5: Add Per-Line Regeneration for AI-Generated Content

**Labels:** `enhancement`, `ai-generation`, `ux`, `priority-medium`

### Description

Currently, when users want to regenerate AI-generated content, they must regenerate the entire section at once. Users need the ability to regenerate individual fields/lines while keeping the ones they like.

### User Context

Joe described this planned feature:
> "What we're working on adding is a regenerate per line so that like, I like this one and this one, but I don't like this one, regenerate, regenerate, regenerate. So we're adding that in."

### Current Behavior

Users can only click a single "Regenerate" button that regenerates all content in a section at once.

### Requested Behavior

Each generated field should have its own regenerate button, allowing users to:
- Keep fields they're happy with
- Regenerate only the specific fields that need improvement
- Iterate quickly on individual pieces of content

### Acceptance Criteria

- [ ] Each AI-generated field has its own regenerate icon/button
- [ ] Clicking regenerate on one field doesn't affect other fields
- [ ] Visual indication when a field is being regenerated
- [ ] Maintains context from other fields when regenerating a single field
- [ ] Loading state shown during individual field regeneration

---

## Issue 6: Presentation Structure Generation Bug

**Labels:** `bug`, `presentation`, `ai-generation`, `priority-high`

### Description

There is a bug in the presentation structure generation feature that was noticed during the demo. Joe mentioned he had just pushed an update that caused issues with the presentation structure format.

### User Report

Joe stated during the call:
> "I just pushed a edit to the presentation structure because I was swapping with a new format. So okay, yeah, there's a little bug in the presentation structure."

And later:
> "Presentation materials, like I said, we're pushing an update to swap out an updated, improved version of deck structure. I anticipate that to be totally fixed and ready to go by by the time I go to bed tonight, honestly, if not by Monday."

### Expected Behavior

Users should be able to generate a complete presentation structure (webinar script outline) based on their business intake.

### Actual Behavior

The presentation structure feature has a bug preventing proper generation after a recent format change.

### Acceptance Criteria

- [ ] Presentation structure generates successfully from business context
- [ ] Generated structure follows the correct format/template
- [ ] All sections of the structure are populated
- [ ] Structure can be used as input for presentation generation (next step)

---

## Issue 7: Voice/Microphone Button Not Working in AI Page Editor

**Labels:** `bug`, `ai-editor`, `voice`, `priority-medium`

### Description

The AI page editor (for enrollment, watch, and registration pages) has a microphone button that should allow users to speak their edit requests instead of typing. This voice-to-text functionality is not currently working.

### User Report

Joe explained during the demo:
> "This is the button that I described, like this button doesn't fully work. I'm going to remove this button because it's not fully useful, but you can ask Growth Mastery anything that you want to change, and it'll start to adjust it."

And earlier:
> "Like some of the buttons inside of the editor don't fully work like the microphone button that allows you to talk to it and actually transcribe directly into your computer to describe prompts of how you want the page. It's awesome. That's functionality that I plan to hook in, you know, very soon over the next week."

### Expected Behavior

Users should be able to:
1. Click the microphone button in the AI editor
2. Speak their edit request
3. Have their speech transcribed into text
4. Submit the transcribed request to the AI editor

### Actual Behavior

The microphone button is visible but non-functional.

### Options

Either:
1. Implement the voice-to-text functionality, OR
2. Remove/hide the microphone button until the feature is ready

### Acceptance Criteria

- [ ] Microphone button either works or is hidden
- [ ] If implemented: voice input is accurately transcribed
- [ ] If implemented: transcribed text appears in the chat input
- [ ] If implemented: appropriate browser permission handling for microphone access

---

## Issue 8: Image Paste Not Working in AI Page Editor Chat

**Labels:** `enhancement`, `ai-editor`, `priority-medium`

### Description

The AI page editor chat does not currently support pasting images. Users should be able to paste images (screenshots, design references, etc.) into the chat to help communicate their desired changes to the AI.

### User Report

Joe mentioned this as a planned feature:
> "Like in Lovable, you can paste into it, into the chat, and it'll receive images. That's something that we're working on as fast as we can to get working."

### Current Behavior

Users can only type text instructions in the AI editor chat.

### Requested Behavior

Users should be able to:
- Paste images directly into the chat input
- Upload images via a file picker
- Have the AI reference these images when making edits

### Use Cases

- Paste a screenshot showing what part of the page to change
- Share design inspiration images
- Show examples of desired styling
- Point out specific bugs or layout issues visually

### Acceptance Criteria

- [ ] Users can paste images from clipboard into chat
- [ ] Users can upload images via file picker
- [ ] Images display as thumbnails in the chat
- [ ] AI acknowledges and references pasted images in responses
- [ ] Supported formats: PNG, JPG, GIF, WebP

---

## Issue 9: Remove Legacy "Generate Enrollment Page" Button

**Labels:** `cleanup`, `ui`, `priority-low`

### Description

There is an old/legacy "Generate Enrollment Page" button still visible in the funnel pages section that uses the old drag-and-drop builder approach. This should be removed since the new AI-powered editor is now the primary method for generating pages.

### User Report

Joe mentioned during the demo:
> "There's generate enrollment page here that you may see. We're working on removing that button on all the funnels. That's the legacy version. We had like a drag and drop click builder previously, but what we just built was an AI power editor."

### Expected Behavior

Only the new AI editor workflow should be visible and accessible to users.

### Actual Behavior

Both the legacy "Generate Enrollment Page" button and the new AI editor are visible, causing confusion about which to use.

### Acceptance Criteria

- [ ] Legacy "Generate Enrollment Page" button removed from enrollment page section
- [ ] Legacy buttons removed from watch page section
- [ ] Legacy buttons removed from registration page section
- [ ] Only AI editor workflow is accessible
- [ ] No dead-end UI paths remain

---

## Issue 10: Saved Business Intake Data Not Visible When Returning to Edit

**Labels:** `bug`, `data-persistence`, `ux`, `priority-high`

### Description

When users fill out the business intake forms and save their progress, the saved data is not displayed when they return to edit the section. The data is stored in the database but the UI does not show the previously entered information.

### User Report

John Beaudry encountered this issue:
> "None of what I put in is there. We're showing it."

Joe confirmed the data is saved but not displayed:
> "The system definitely remembers it, but we want to get that user interface visible to you."

### Expected Behavior

When users navigate back to a previously completed intake section:
- All previously saved data should be displayed in the form fields
- Users should see their existing responses
- Edits should update the existing data

### Actual Behavior

- Data is saved to the database correctly
- When returning to the section, fields appear empty
- Users cannot see or verify what they previously entered

### Impact

**High** - This makes it impossible for users to review or edit their intake information, and creates anxiety that their data may have been lost.

### Acceptance Criteria

- [ ] All saved data displays when returning to any intake section
- [ ] Data populates in the correct fields
- [ ] Both manually entered and AI-generated content is displayed
- [ ] Users can see the "I already have a trained GPT" path data if that was used
- [ ] Editing existing data works correctly

---

## Issue 11: Define Offer Generation Fails to Populate All Fields

**Labels:** `bug`, `ai-generation`, `offer`, `priority-high`

### Description

When using the "Generate Offer" feature to create offer details from the business intake, several important fields fail to populate. This includes critical fields like price, guarantee, and testimonials.

### User Report

During John's demo, Joe noticed:
> "If you scroll down, there's a couple fields that didn't fill out for what you made... Your price, your guarantee, your testimonials, all that."

Joe committed to fixing: "I'll make sure to get that fixed."

### Expected Behavior

The offer generation should populate all fields in the offer definition, including:
- Promise
- Person (target customer)
- Process
- Purpose
- Price
- Pathway (book a call vs direct purchase)
- Guarantee
- Testimonials/social proof elements
- All 7 P's of the framework

### Actual Behavior

Generation completes but leaves several fields empty or with errors, particularly:
- Price recommendations
- Guarantee structure
- Testimonials section

### Technical Context

This may be related to:
- AI response parsing issues
- Field mapping problems
- Timeout issues with longer generation
- Missing data from business intake context

### Acceptance Criteria

- [ ] All offer fields populate on generation
- [ ] Price is calculated based on offer type and market data
- [ ] Guarantee suggestions are relevant to offer type
- [ ] Testimonial prompts/placeholders are generated
- [ ] Error handling if specific fields fail (partial success allowed)

---

## Issue 12: Voice Call Integration for Business Intake Not Working

**Labels:** `enhancement`, `voice`, `intake`, `priority-medium`

### Description

The business intake section shows a "Voice Call" option as one of three ways to complete the intake (alongside "Build Together Step-by-Step" and "I Already Have a Trained GPT"). However, the voice call functionality is not yet operational.

### User Report

Joe explained during the call:
> "We're ironing out the functionality of that voice call integrated into this platform, but there's two options you can follow here."

The recent commit `5298a36 feat: Add 'Coming Soon' indicator to VAPI voice call option (#280)` indicates this is a known limitation.

### Expected Behavior

Users should be able to:
1. Click the voice call option
2. Have a voice conversation with an AI assistant
3. Have that conversation analyzed and converted into business intake responses
4. Complete the entire intake process verbally

### Current Behavior

The voice call option is either non-functional or shows a "Coming Soon" indicator (based on recent commits).

### Acceptance Criteria

- [ ] Voice call option clearly indicates current status
- [ ] If "Coming Soon": show expected availability date
- [ ] If functional: VAPI integration works end-to-end
- [ ] Voice responses are accurately transcribed
- [ ] AI extracts relevant business information from conversation
- [ ] Extracted data populates the intake forms correctly

---

# Summary

| # | Issue | Priority | Type |
|---|-------|----------|------|
| 1 | Forgot Password Link Broken | High | Bug |
| 2 | Supabase Branding in Emails | Medium | Bug |
| 3 | Vercel Domain Still Showing | Medium | Bug |
| 4 | [object Object] Display Bug | High | Bug |
| 5 | Per-Line Regeneration | Medium | Enhancement |
| 6 | Presentation Structure Bug | High | Bug |
| 7 | Voice Button in AI Editor | Medium | Bug |
| 8 | Image Paste in AI Editor | Medium | Enhancement |
| 9 | Remove Legacy Generate Button | Low | Cleanup |
| 10 | Saved Data Not Visible | High | Bug |
| 11 | Offer Fields Not Generating | High | Bug |
| 12 | Voice Call Integration | Medium | Enhancement |

**High Priority (fix first):** Issues 1, 4, 6, 10, 11
**Medium Priority:** Issues 2, 3, 5, 7, 8, 12
**Low Priority:** Issue 9
