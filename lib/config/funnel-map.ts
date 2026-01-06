/**
 * Funnel Map Configuration
 * Centralized settings for the Visual Funnel Co-Creation Experience
 *
 * Single source of truth for conversation limits, AI parameters, and rate limits.
 * These values are referenced by API routes, database functions, and client validation.
 */

// ============================================
// CONVERSATION HISTORY LIMITS
// ============================================

/**
 * Maximum messages the API accepts in a single request
 * This is the hard limit for the request payload size
 */
export const MAX_CONVERSATION_MESSAGES_API = 100;

/**
 * Maximum messages stored in database per node
 * Matches the PostgreSQL function limit in merge_funnel_node_conversation
 */
export const MAX_CONVERSATION_MESSAGES_DB = 100;

/**
 * Maximum messages sent to AI for context (sliding window)
 * Keeps AI responses focused and cost-effective
 *
 * Rationale: Full history preserved for UX, but AI only needs recent context
 * to understand the conversation flow and provide relevant suggestions.
 */
export const MAX_CONVERSATION_MESSAGES_AI = 20;

// ============================================
// AI PARAMETERS
// ============================================

/** Maximum tokens for AI chat response */
export const AI_CHAT_MAX_TOKENS = 2000;

/** Maximum tokens for AI draft generation per node */
export const AI_DRAFT_MAX_TOKENS = 2000;

/** Temperature for chat responses (higher = more creative) */
export const AI_CHAT_TEMPERATURE = 0.7;

/** Temperature for draft generation (lower = more consistent) */
export const AI_DRAFT_TEMPERATURE = 0.7;

// ============================================
// INPUT VALIDATION
// ============================================

/** Maximum message length in characters */
export const MAX_MESSAGE_LENGTH = 2000;

// ============================================
// RATE LIMITS (informational - actual limits in lib/middleware/rate-limit.ts)
// ============================================

/**
 * Rate limit for funnel chat: 150 requests per hour
 * Rationale: Users refining 7-9 nodes need ~16-21 messages per node
 */
export const RATE_LIMIT_CHAT_PER_HOUR = 150;

/**
 * Rate limit for draft generation: 10 requests per hour
 * This is expensive (7-9 parallel AI calls per request)
 */
export const RATE_LIMIT_DRAFTS_PER_HOUR = 10;
