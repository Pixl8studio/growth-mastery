# Issue #47 - Offer Pricing Extraction Fix - Testing Guide

## Summary of Changes

Fixed the Funnel Builder Step 2 offer pricing issue where the AI always generated $997
offers regardless of the actual prices on scraped enrollment pages.

## Changes Made

### 1. Enhanced Price Extraction (`lib/intake/processors.ts`)

- Added `ExtractedPrice` interface to structure pricing data
- Created `extractPricingFromHtml()` function that:
  - Uses regex patterns to detect prices with various formats ($X, USD X, etc.)
  - Searches in price-specific HTML elements (class="price", data-price, etc.)
  - Extracts surrounding context for each price
  - Assigns confidence levels (high/medium/low)
  - Deduplicates and sorts prices by confidence and amount

- Updated `extractTextFromUrl()` to:
  - Return both text and pricing data via `UrlExtractionResult`
  - Maintain backward compatibility (returns string if no prices found)

### 2. Updated Scrape API (`app/api/intake/scrape/route.ts`)

- Handles both string and structured result from `extractTextFromUrl()`
- Stores extracted pricing in `vapi_transcripts.extracted_data.pricing` field
- Includes pricing in cache
- Logs detected prices for debugging
- Returns pricing data in API response

### 3. Enhanced AI Prompt (`lib/ai/prompts.ts`)

- Removed hardcoded `"price": 997` example that was biasing the AI
- Adds extracted pricing to prompt when available
- Provides explicit guidance to use detected prices
- Handles multiple price scenarios (instructs AI to choose primary offer price)
- Includes fallback guidance when no prices detected

## Testing Instructions

### Test Scenario 1: Single Price Page

1. Go to Funnel Builder Step 1 (Intake)
2. Select "Scrape URL" option
3. Enter a URL with a single clear price (e.g., a landing page with one offer)
4. Proceed to Step 2 (Define Offer)
5. Generate offer
6. **Expected Result**: AI should use the detected price from the page

### Test Scenario 2: Multiple Prices (Joe's Case)

1. Go to Funnel Builder Step 1 (Intake)
2. Select "Scrape URL" option
3. Enter Joe's enrollment page URL (the one with 2 prices)
4. Check logs/network tab - should see extracted prices with context
5. Proceed to Step 2 (Define Offer)
6. Generate offer
7. **Expected Result**:
   - AI should detect both prices
   - AI should choose the primary/main offer price (not default to $997)
   - Logs should show which prices were detected and selected

### Test Scenario 3: No Pricing Data

1. Go to Funnel Builder Step 1 (Intake)
2. Scrape a URL without any prices (e.g., a blog post)
3. Proceed to Step 2 (Define Offer)
4. Generate offer
5. **Expected Result**: AI should analyze content and determine appropriate price

### Test Scenario 4: Price Pattern Variations

Test with pages that have different price formats:

- $1,234.56
- USD 1234
- 1234 USD
- "Investment: $997"
- "Price: 2497"

**Expected Result**: All formats should be detected correctly

## Verification Points

### In Browser Network Tab

When scraping a URL:

```json
{
  "success": true,
  "pricing": [
    {
      "amount": 1997,
      "currency": "USD",
      "context": "...surrounding text...",
      "confidence": "high"
    }
  ]
}
```

### In Server Logs

Look for:

```
Extracted pricing from HTML { priceCount: 2, prices: [1997, 997] }
Extracted text and pricing from URL { url: '...', priceCount: 2 }
URL scraped and processed successfully { priceCount: 2, prices: [1997, 997] }
```

### In Database (vapi_transcripts table)

- `extracted_data` field should contain: `{ "pricing": [...] }`
- `metadata.price_count` should show number of prices detected

## Manual Testing with Joe's Page

Since we don't have the exact URL in the issue, request from the issue reporter:

1. The specific URL of Joe's enrollment page
2. What the two prices are on the page
3. Which price should be the primary offer price

Then test with:

```
URL: [Joe's enrollment page URL]
Expected prices: [e.g., $997 and $1997]
Expected AI selection: [e.g., $1997 as the main offer]
```

## Rollback Plan

If issues arise, revert these commits and the system will return to text-only extraction
without pricing detection.

## Related Files

- `lib/intake/processors.ts` - Price extraction logic
- `app/api/intake/scrape/route.ts` - API integration
- `lib/ai/prompts.ts` - AI prompt with pricing context
