/**
 * Supabase Edge Function for Talk Track Generation
 *
 * Generates talk track in background without Vercel serverless timeout constraints.
 * Processes slides in chunks, updates progress, and saves final result to database.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface Slide {
    slideNumber: number;
    title: string;
    description: string;
    section: string;
}

interface TalkTrackSlide {
    slideNumber: number;
    script: string;
    duration: number;
    notes: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { jobId } = await req.json();

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log(`[Talk Track] Starting generation for job ${jobId}`);

        // Fetch job details with deck structure
        const { data: job, error: jobError } = await supabase
            .from("talk_track_jobs")
            .select("*, deck_structures(*)")
            .eq("id", jobId)
            .single();

        if (jobError || !job) {
            throw new Error(`Job not found: ${jobId}`);
        }

        // Update status to processing
        await supabase
            .from("talk_track_jobs")
            .update({
                status: "processing",
                started_at: new Date().toISOString(),
            })
            .eq("id", jobId);

        // Get deck structure slides
        const deckStructure = job.deck_structures;
        const slides = deckStructure.slides as Slide[];

        console.log(`[Talk Track] Processing ${slides.length} slides for job ${jobId}`);

        // Split into chunks of 10 slides
        const chunksPerBatch = 10;
        const chunks: Slide[][] = [];
        for (let i = 0; i < slides.length; i += chunksPerBatch) {
            chunks.push(slides.slice(i, i + chunksPerBatch));
        }

        await supabase
            .from("talk_track_jobs")
            .update({ total_chunks: chunks.length })
            .eq("id", jobId);

        const allTalkTrackSlides: TalkTrackSlide[] = [];

        // Generate each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const progress = Math.round(((i + 1) / chunks.length) * 100);

            console.log(
                `[Talk Track] Generating chunk ${i + 1}/${chunks.length} for job ${jobId}`
            );

            // Generate talk track for chunk using OpenAI
            const chunkResult = await generateTalkTrackChunk(chunk, openaiKey);
            allTalkTrackSlides.push(...chunkResult);

            // Update progress
            await supabase
                .from("talk_track_jobs")
                .update({
                    current_chunk: i + 1,
                    progress,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", jobId);

            // Small delay to avoid rate limits
            if (i < chunks.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        console.log(
            `[Talk Track] Generation complete, saving to database for job ${jobId}`
        );

        // Format and save talk track
        const totalDuration = allTalkTrackSlides.reduce(
            (sum, s) => sum + s.duration,
            0
        );
        const content = formatTalkTrackContent(allTalkTrackSlides);

        const { data: savedTalkTrack, error: saveError } = await supabase
            .from("talk_tracks")
            .insert({
                funnel_project_id: job.funnel_project_id,
                deck_structure_id: job.deck_structure_id,
                user_id: job.user_id,
                content,
                slide_timings: {
                    totalDuration: Math.round(totalDuration),
                    slides: allTalkTrackSlides.map((s) => ({
                        slideNumber: s.slideNumber,
                        duration: s.duration,
                    })),
                },
                total_duration: Math.round(totalDuration),
            })
            .select()
            .single();

        if (saveError || !savedTalkTrack) {
            throw new Error(`Failed to save talk track: ${saveError?.message}`);
        }

        // Mark job complete
        await supabase
            .from("talk_track_jobs")
            .update({
                status: "completed",
                progress: 100,
                talk_track_id: savedTalkTrack.id,
                completed_at: new Date().toISOString(),
            })
            .eq("id", jobId);

        console.log(`[Talk Track] Job ${jobId} completed successfully`);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("[Talk Track] Error:", error);

        // Try to get jobId from request to update job status
        try {
            const body = await req.clone().json();
            const jobId = body.jobId;

            if (jobId) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseKey);

                await supabase
                    .from("talk_track_jobs")
                    .update({
                        status: "failed",
                        error_message:
                            error instanceof Error ? error.message : "Unknown error",
                        completed_at: new Date().toISOString(),
                    })
                    .eq("id", jobId);

                console.log(`[Talk Track] Job ${jobId} marked as failed`);
            }
        } catch (updateError) {
            console.error("[Talk Track] Failed to update job status:", updateError);
        }

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});

/**
 * Generate talk track for a chunk of slides using OpenAI
 */
async function generateTalkTrackChunk(
    slides: Slide[],
    openaiKey: string
): Promise<TalkTrackSlide[]> {
    const slidesDescription = slides
        .map(
            (s) =>
                `Slide ${s.slideNumber}: ${s.title}\n${s.description}\nSection: ${s.section}`
        )
        .join("\n\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are a master presentation coach creating a video script for a pitch presentation.

Generate a natural, conversational script for slides. For EACH slide, provide:
- 2-4 compelling sentences that the presenter will say
- Natural transitions between slides
- Conversational language (use "you", be authentic)
- Estimated duration in seconds (15-30 seconds per slide)
- Delivery notes (tone, pacing, emphasis)

Return ONLY a JSON object with this exact structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "script": "2-4 sentences of what to say for this slide",
      "duration": 25,
      "notes": "Delivery notes (tone, pacing, emphasis)"
    }
  ]
}

Each script must be exactly 2-4 sentences, conversational, and compelling.`,
                },
                {
                    role: "user",
                    content: `Generate a talk track for these slides:

SLIDES:
${slidesDescription}

Return ONLY the JSON object. No markdown, no explanation.`,
                },
            ],
            max_tokens: 4000,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Invalid AI response format");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.slides as TalkTrackSlide[];
}

/**
 * Format talk track slides into readable text content
 */
function formatTalkTrackContent(slides: TalkTrackSlide[]): string {
    let content = "# Talk Track Script\n\n";
    content += `Total Duration: ${Math.round(slides.reduce((sum, s) => sum + s.duration, 0) / 60)} minutes\n\n`;
    content += "---\n\n";

    for (const slide of slides) {
        content += `## Slide ${slide.slideNumber}\n`;
        content += `**Duration**: ${slide.duration} seconds\n\n`;
        content += `**Script**:\n${slide.script}\n\n`;
        content += `**Delivery Notes**: ${slide.notes}\n\n`;
        content += "---\n\n";
    }

    return content;
}
