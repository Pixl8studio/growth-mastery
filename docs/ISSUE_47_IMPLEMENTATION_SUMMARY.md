# Issue #47 Implementation Summary

## Problem

When scraping Joe's enrollment page (or any page with multiple prices), the AI always
defaulted to generating offers with $997 pricing, ignoring the actual prices on the
page.

## Root Cause Analysis

1. **Text-only extraction**: The scraping function only extracted plain text without
   identifying pricing elements
2. **Biased AI prompt**: The AI prompt contained a hardcoded example price of 997, which
   biased the AI toward that amount
3. **No structured data**: Pricing information wasn't being passed to the AI in a
   structured, actionable format

## Solution Implemented

### 1. Price Extraction Logic (`lib/intake/processors.ts`)

Added intelligent price detection:

- **Pattern matching**: Detects various price formats ($X, USD X, price: X, etc.)
- **HTML-aware**: Searches price-specific elements (class="price", data-price, etc.)
- **Context extraction**: Captures surrounding text to understand what each price is for
- **Confidence scoring**: Assigns high/medium/low confidence to detected prices
- **Smart deduplication**: Removes duplicate prices and sorts by confidence

```typescript
export interface ExtractedPrice {
  amount: number;
  currency: string;
  context: string;
  confidence: "high" | "medium" | "low";
}

export async function extractPricingFromHtml(html: string): Promise<ExtractedPrice[]>;
```

### 2. Enhanced URL Extraction (`lib/intake/processors.ts`)

Updated `extractTextFromUrl()` to:

- Extract pricing before removing HTML elements (better detection)
- Return structured data when prices are found:
  `{ text: string, pricing: ExtractedPrice[] }`
- Maintain backward compatibility (returns plain string if no prices found)

### 3. API Integration (`app/api/intake/scrape/route.ts`)

Updated scrape endpoint to:

- Handle both string and structured results from extraction
- Store pricing data in `vapi_transcripts.extracted_data.pricing`
- Cache pricing information for 24 hours
- Include pricing in API responses
- Add price count to metadata for analytics

### 4. AI Prompt Enhancement (`lib/ai/prompts.ts`)

Improved offer generation prompt:

- **Removed bias**: Eliminated hardcoded `"price": 997` example
- **Added pricing context**: Includes extracted prices with confidence and context
- **Multiple price handling**: Instructs AI to choose the primary offer price
- **Fallback guidance**: Provides clear instructions when no prices detected
- **Explicit instructions**: Tells AI to NOT ignore detected prices

## Technical Highlights

### Robust Price Detection

The system detects prices in multiple formats:

- `$1,234.56` - Standard US format
- `USD 1234` - Currency prefix
- `1234 USD` - Currency suffix
- `price: $997` - Contextual pricing
- Works with both comma-separated and plain numbers

### Intelligent Context Extraction

Each detected price includes surrounding text (up to 150 characters) to help the AI
understand:

- What the price is for (main offer vs bonus vs payment plan)
- Any qualifiers (one-time, monthly, lifetime access)
- The value proposition associated with that price

### Confidence Scoring

- **High confidence**: Price found in dedicated price elements
- **Medium confidence**: Price found in general content
- Sorted by confidence, so AI prioritizes the most reliable prices

## Testing Recommendations

See `ISSUE_47_TESTING.md` for comprehensive testing guide.

Key test scenarios:

1. ✅ Single price page - should detect and use that price
2. ✅ Multiple prices page (Joe's case) - should choose primary offer price
3. ✅ No prices page - should intelligently determine appropriate pricing
4. ✅ Various price formats - should handle all common formats

## Files Modified

- `lib/intake/processors.ts` - Core price extraction logic (+120 lines)
- `app/api/intake/scrape/route.ts` - API integration for pricing data
- `lib/ai/prompts.ts` - Enhanced AI prompt with pricing context
- `ISSUE_47_TESTING.md` - Comprehensive testing guide

## Branch

`fix/issue-47-offer-pricing-extraction`

## Next Steps

1. Review the implementation
2. Test with Joe's actual enrollment page URL
3. Verify pricing detection in browser network tab and server logs
4. Merge to development branch
5. Close issue #47

## Impact

- Eliminates AI bias toward $997 default price
- Accurately reflects actual offer pricing from source pages
- Handles edge cases (multiple prices, no prices, various formats)
- Improves offer generation accuracy for all users
- Maintains backward compatibility with existing intake flow
