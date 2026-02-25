/**
 * Provider-agnostic LLM client.
 *
 * Wraps Vercel AI SDK so you can swap between OpenAI, Anthropic, or any
 * other supported provider by changing a single environment variable.
 *
 * Usage:
 *   import { getDefaultModel, getModel } from './llm-client';
 *   const model = getDefaultModel();         // uses LLM_PROVIDER env var
 *   const model = getModel('anthropic');      // explicit provider
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type LLMProvider = "openai" | "anthropic";

const openaiProvider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropicProvider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function getModel(provider: LLMProvider = "openai", modelId?: string): LanguageModel {
    switch (provider) {
        case "openai":
            return openaiProvider(modelId ?? "gpt-4o-mini");
        case "anthropic":
            return anthropicProvider(modelId ?? "claude-sonnet-4-6-20250514");
        default:
            throw new Error(`Unknown LLM provider: ${provider}`);
    }
}

export function getDefaultModel(): LanguageModel {
    const provider = (process.env.LLM_PROVIDER as LLMProvider) ?? "openai";
    return getModel(provider);
}
