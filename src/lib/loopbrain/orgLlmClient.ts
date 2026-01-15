import { generateAIResponse } from "@/lib/ai/providers";

/**
 * Minimal Org-only LLM call.
 *
 * Uses the existing Loopbrain AI provider infrastructure.
 */
export async function runOrgQuestionLLM(params: {
  system: string;
  user: string;
}): Promise<{
  answer: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}> {
  const { system, user } = params;

  // Use the standard Loopbrain model (or fallback to gpt-4o-mini for efficiency)
  const model = process.env.LOOPBRAIN_MODEL || "gpt-4o-mini";

  try {
    // Use the user prompt as the main prompt, and pass system as systemPrompt
    // The generateAIResponse function handles system/user separation properly
    const response = await generateAIResponse(user, model, {
      systemPrompt: system,
      temperature: 0.2, // Lower temperature for more grounded, factual answers
      maxTokens: 1000, // Keep answers concise
    });

    return {
      answer: response.content.trim() || "Loopbrain could not generate an answer.",
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    console.error("[orgLlmClient] LLM call failed", error);
    throw new Error(
      `Org LLM call failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

