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

let _openaiProvider: ReturnType<typeof createOpenAI> | null = null;
let _anthropicProvider: ReturnType<typeof createAnthropic> | null = null;

function getOpenAIProvider() {
    if (!_openaiProvider) {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
        _openaiProvider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openaiProvider;
}

function getAnthropicProvider() {
    if (!_anthropicProvider) {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
        _anthropicProvider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return _anthropicProvider;
}

export function getModel(provider: LLMProvider = "openai", modelId?: string): LanguageModel {
    switch (provider) {
        case "openai":
            return getOpenAIProvider()(modelId ?? "gpt-4o-mini");
        case "anthropic":
            return getAnthropicProvider()(modelId ?? "claude-sonnet-4-6-20250514");
        default:
            throw new Error(`Unknown LLM provider: ${provider}`);
    }
}

export function getDefaultModel(): LanguageModel {
    const provider = (process.env.LLM_PROVIDER as LLMProvider) ?? "openai";
    return getModel(provider);
}
