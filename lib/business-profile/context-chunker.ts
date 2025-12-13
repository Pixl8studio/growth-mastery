/**
 * Context Chunker Utility
 * Handles large text inputs (50k+ characters) by intelligently chunking them
 * for processing and then merging the results.
 *
 * Features:
 * - Intelligent chunking at sentence/paragraph boundaries
 * - Overlap between chunks to maintain context
 * - Parallel processing support
 * - Result merging with deduplication
 * - Progress callback support
 */

import { logger } from "@/lib/logger";

// Configuration constants
const DEFAULT_CHUNK_SIZE = 12000; // Characters per chunk (safe for most LLM context windows)
const DEFAULT_OVERLAP = 500; // Character overlap between chunks for context continuity
const MAX_CHUNK_SIZE = 20000; // Maximum allowed chunk size
const MIN_CHUNK_SIZE = 1000; // Minimum chunk size before processing
const LARGE_CONTEXT_THRESHOLD = 15000; // Characters above which chunking is needed

export interface ChunkConfig {
    /** Target size for each chunk in characters */
    chunkSize?: number;
    /** Overlap between chunks for context continuity */
    overlap?: number;
    /** Maximum chunks to create (limits for cost control) */
    maxChunks?: number;
    /** Preserve paragraph boundaries when possible */
    preserveParagraphs?: boolean;
    /** Preserve sentence boundaries when possible */
    preserveSentences?: boolean;
}

export interface TextChunk {
    /** The chunk text content */
    content: string;
    /** Index of this chunk (0-based) */
    index: number;
    /** Total number of chunks */
    totalChunks: number;
    /** Start position in original text */
    startPosition: number;
    /** End position in original text */
    endPosition: number;
    /** Whether this is the first chunk */
    isFirst: boolean;
    /** Whether this is the last chunk */
    isLast: boolean;
}

export interface ChunkingResult {
    /** Array of text chunks */
    chunks: TextChunk[];
    /** Original text length */
    originalLength: number;
    /** Whether chunking was needed */
    wasChunked: boolean;
    /** Summary statistics */
    stats: {
        totalChunks: number;
        averageChunkSize: number;
        smallestChunk: number;
        largestChunk: number;
    };
}

export interface MergeConfig {
    /** Strategy for merging results */
    strategy?: "concatenate" | "deduplicate" | "smart";
    /** Separator between merged results */
    separator?: string;
    /** Custom merge function for complex data structures */
    customMerge?: <T>(results: T[]) => T;
}

/**
 * Check if text needs to be chunked based on length
 */
export function needsChunking(
    text: string,
    threshold: number = LARGE_CONTEXT_THRESHOLD
): boolean {
    return text.length > threshold;
}

/**
 * Split text into intelligent chunks that preserve context
 */
export function chunkText(text: string, config: ChunkConfig = {}): ChunkingResult {
    const {
        chunkSize = DEFAULT_CHUNK_SIZE,
        overlap = DEFAULT_OVERLAP,
        maxChunks = 10,
        preserveParagraphs = true,
        preserveSentences = true,
    } = config;

    // Validate config
    const effectiveChunkSize = Math.min(Math.max(chunkSize, MIN_CHUNK_SIZE), MAX_CHUNK_SIZE);
    const effectiveOverlap = Math.min(overlap, Math.floor(effectiveChunkSize / 4));

    // If text is small enough, return as single chunk
    if (text.length <= effectiveChunkSize) {
        return {
            chunks: [
                {
                    content: text,
                    index: 0,
                    totalChunks: 1,
                    startPosition: 0,
                    endPosition: text.length,
                    isFirst: true,
                    isLast: true,
                },
            ],
            originalLength: text.length,
            wasChunked: false,
            stats: {
                totalChunks: 1,
                averageChunkSize: text.length,
                smallestChunk: text.length,
                largestChunk: text.length,
            },
        };
    }

    const chunks: TextChunk[] = [];
    let position = 0;

    while (position < text.length && chunks.length < maxChunks) {
        let endPosition = Math.min(position + effectiveChunkSize, text.length);

        // If not at the end, try to find a good break point
        if (endPosition < text.length) {
            endPosition = findBreakPoint(
                text,
                position,
                endPosition,
                preserveParagraphs,
                preserveSentences
            );
        }

        const chunkContent = text.slice(position, endPosition);

        chunks.push({
            content: chunkContent,
            index: chunks.length,
            totalChunks: 0, // Will be updated after all chunks are created
            startPosition: position,
            endPosition: endPosition,
            isFirst: chunks.length === 0,
            isLast: false, // Will be updated after all chunks are created
        });

        // Move position forward, accounting for overlap
        position = endPosition - effectiveOverlap;

        // Prevent infinite loop if overlap is too large
        if (position <= chunks[chunks.length - 1].startPosition) {
            position = endPosition;
        }
    }

    // Handle case where we hit maxChunks but haven't processed all text
    if (position < text.length && chunks.length >= maxChunks) {
        // Append remaining text to last chunk
        const lastChunk = chunks[chunks.length - 1];
        lastChunk.content = text.slice(lastChunk.startPosition);
        lastChunk.endPosition = text.length;

        logger.warn(
            {
                originalLength: text.length,
                maxChunks,
                remainingChars: text.length - position,
            },
            "Context exceeded max chunks, appending remainder to last chunk"
        );
    }

    // Update chunk metadata
    const totalChunks = chunks.length;
    chunks.forEach((chunk, index) => {
        chunk.totalChunks = totalChunks;
        chunk.isLast = index === totalChunks - 1;
    });

    // Calculate stats
    const chunkSizes = chunks.map((c) => c.content.length);
    const stats = {
        totalChunks,
        averageChunkSize: Math.round(chunkSizes.reduce((a, b) => a + b, 0) / totalChunks),
        smallestChunk: Math.min(...chunkSizes),
        largestChunk: Math.max(...chunkSizes),
    };

    logger.info(
        {
            originalLength: text.length,
            totalChunks,
            averageChunkSize: stats.averageChunkSize,
        },
        "Text chunked successfully"
    );

    return {
        chunks,
        originalLength: text.length,
        wasChunked: true,
        stats,
    };
}

/**
 * Find a good break point for chunking (paragraph or sentence boundary)
 */
function findBreakPoint(
    text: string,
    startPosition: number,
    targetEnd: number,
    preserveParagraphs: boolean,
    preserveSentences: boolean
): number {
    const searchStart = Math.max(startPosition, targetEnd - 500); // Look back up to 500 chars

    // First, try to find a paragraph break (double newline)
    if (preserveParagraphs) {
        const paragraphBreak = text.lastIndexOf("\n\n", targetEnd);
        if (paragraphBreak > searchStart) {
            return paragraphBreak + 2; // Include the newlines in the previous chunk
        }

        // Try single newline
        const lineBreak = text.lastIndexOf("\n", targetEnd);
        if (lineBreak > searchStart) {
            return lineBreak + 1;
        }
    }

    // Next, try to find a sentence boundary
    if (preserveSentences) {
        // Look for common sentence endings
        const sentenceEndings = [". ", "! ", "? ", ".\n", "!\n", "?\n"];

        let bestBreak = -1;
        for (const ending of sentenceEndings) {
            const pos = text.lastIndexOf(ending, targetEnd);
            if (pos > searchStart && pos > bestBreak) {
                bestBreak = pos + ending.length;
            }
        }

        if (bestBreak > searchStart) {
            return bestBreak;
        }
    }

    // Fall back to any whitespace
    const spaceBreak = text.lastIndexOf(" ", targetEnd);
    if (spaceBreak > searchStart) {
        return spaceBreak + 1;
    }

    // No good break found, use target end
    return targetEnd;
}

/**
 * Merge results from processing multiple chunks
 */
export function mergeChunkResults<T>(
    results: T[],
    config: MergeConfig = {}
): T | T[] {
    const { strategy = "smart", separator = "\n\n", customMerge } = config;

    if (results.length === 0) {
        throw new Error("No results to merge");
    }

    if (results.length === 1) {
        return results[0];
    }

    // If custom merge function is provided, use it
    if (customMerge) {
        return customMerge(results);
    }

    // For string results
    if (typeof results[0] === "string") {
        const stringResults = results as unknown as string[];

        switch (strategy) {
            case "concatenate":
                return stringResults.join(separator) as unknown as T;

            case "deduplicate":
                // Remove duplicate lines/paragraphs
                const allLines = stringResults.flatMap((r) => r.split("\n"));
                const uniqueLines = [...new Set(allLines)].filter((line) => line.trim());
                return uniqueLines.join("\n") as unknown as T;

            case "smart":
            default:
                // Smart merge: concatenate but remove duplicate content at boundaries
                return smartMergeStrings(stringResults, separator) as unknown as T;
        }
    }

    // For array results, flatten
    if (Array.isArray(results[0])) {
        const arrayResults = results as unknown as unknown[][];
        const flattened = arrayResults.flat();

        if (strategy === "deduplicate") {
            // Deduplicate by JSON string comparison
            const seen = new Set<string>();
            return flattened.filter((item) => {
                const key = JSON.stringify(item);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }) as unknown as T;
        }

        return flattened as unknown as T;
    }

    // For object results, merge objects
    if (typeof results[0] === "object" && results[0] !== null) {
        return mergeObjects(results as Record<string, unknown>[]) as unknown as T;
    }

    // Default: return array of results
    return results as unknown as T;
}

/**
 * Smart merge strings by removing overlapping content at boundaries
 */
function smartMergeStrings(strings: string[], separator: string): string {
    if (strings.length === 0) return "";
    if (strings.length === 1) return strings[0];

    let result = strings[0];

    for (let i = 1; i < strings.length; i++) {
        const current = strings[i];

        // Look for overlap at the boundary
        const overlapLength = findOverlap(result, current);

        if (overlapLength > 0) {
            // Remove overlapping portion from current string
            result += current.slice(overlapLength);
        } else {
            // No overlap, just concatenate
            result += separator + current;
        }
    }

    return result;
}

/**
 * Find the length of overlapping content between end of first string and start of second
 */
function findOverlap(first: string, second: string): number {
    const maxOverlap = Math.min(500, first.length, second.length); // Check up to 500 chars

    for (let len = maxOverlap; len > 20; len--) {
        const endOfFirst = first.slice(-len).trim();
        const startOfSecond = second.slice(0, len).trim();

        // Check if they're similar enough (allowing for minor differences)
        if (endOfFirst === startOfSecond) {
            return len;
        }
    }

    return 0;
}

/**
 * Merge multiple objects by combining their properties
 */
function mergeObjects(objects: Record<string, unknown>[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const obj of objects) {
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) continue;

            if (!(key in result)) {
                result[key] = value;
            } else {
                // Merge arrays
                if (Array.isArray(result[key]) && Array.isArray(value)) {
                    result[key] = [...(result[key] as unknown[]), ...value];
                }
                // Merge strings (concatenate)
                else if (typeof result[key] === "string" && typeof value === "string") {
                    result[key] = `${result[key]}\n\n${value}`;
                }
                // Merge nested objects
                else if (
                    typeof result[key] === "object" &&
                    typeof value === "object" &&
                    !Array.isArray(result[key]) &&
                    !Array.isArray(value)
                ) {
                    result[key] = mergeObjects([
                        result[key] as Record<string, unknown>,
                        value as Record<string, unknown>,
                    ]);
                }
                // Otherwise, keep the existing value (first wins)
            }
        }
    }

    return result;
}

/**
 * Process large context with a handler function, chunking if necessary
 * This is the main entry point for processing large inputs
 */
export async function processLargeContext<T>(
    context: string,
    handler: (chunk: TextChunk, chunkIndex: number, totalChunks: number) => Promise<T>,
    options: {
        chunkConfig?: ChunkConfig;
        mergeConfig?: MergeConfig;
        onProgress?: (progress: { current: number; total: number; chunk: TextChunk }) => void;
        parallel?: boolean;
        maxConcurrent?: number;
    } = {}
): Promise<T | T[]> {
    const {
        chunkConfig,
        mergeConfig,
        onProgress,
        parallel = false,
        maxConcurrent = 3,
    } = options;

    // Check if chunking is needed
    if (!needsChunking(context)) {
        const singleChunk: TextChunk = {
            content: context,
            index: 0,
            totalChunks: 1,
            startPosition: 0,
            endPosition: context.length,
            isFirst: true,
            isLast: true,
        };

        onProgress?.({ current: 1, total: 1, chunk: singleChunk });
        return handler(singleChunk, 0, 1);
    }

    // Chunk the context
    const { chunks, stats } = chunkText(context, chunkConfig);

    logger.info(
        {
            originalLength: context.length,
            totalChunks: stats.totalChunks,
            parallel,
        },
        "Processing large context in chunks"
    );

    let results: T[];

    if (parallel) {
        // Process chunks in parallel with concurrency limit
        results = await processParallel(chunks, handler, maxConcurrent, onProgress);
    } else {
        // Process chunks sequentially
        results = [];
        for (const chunk of chunks) {
            onProgress?.({ current: chunk.index + 1, total: chunks.length, chunk });
            const result = await handler(chunk, chunk.index, chunks.length);
            results.push(result);
        }
    }

    // Merge results
    return mergeChunkResults(results, mergeConfig);
}

/**
 * Process chunks in parallel with concurrency limit
 */
async function processParallel<T>(
    chunks: TextChunk[],
    handler: (chunk: TextChunk, index: number, total: number) => Promise<T>,
    maxConcurrent: number,
    onProgress?: (progress: { current: number; total: number; chunk: TextChunk }) => void
): Promise<T[]> {
    const results: T[] = new Array(chunks.length);
    let completed = 0;

    const processChunk = async (chunk: TextChunk) => {
        const result = await handler(chunk, chunk.index, chunk.totalChunks);
        results[chunk.index] = result;
        completed++;
        onProgress?.({ current: completed, total: chunks.length, chunk });
    };

    // Process in batches
    for (let i = 0; i < chunks.length; i += maxConcurrent) {
        const batch = chunks.slice(i, i + maxConcurrent);
        await Promise.all(batch.map(processChunk));
    }

    return results;
}

/**
 * Utility to estimate token count from character count
 * Rough approximation: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Check if context fits within a token limit
 */
export function fitsWithinTokenLimit(text: string, maxTokens: number): boolean {
    return estimateTokens(text) <= maxTokens;
}
