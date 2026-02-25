/**
 * Shared types for AI modules.
 * Each module (summarizer, search, tagger, RAG) uses these interfaces.
 */

export interface Summary {
    text: string;
    style: "brief" | "detailed" | "bullet-points";
    modelUsed: string;
}

export interface SearchResult {
    contentId: string;
    title: string;
    link: string;
    type: string;
    relevance: number;
    snippet: string;
}

export interface TagSuggestion {
    tag: string;
    confidence: number;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatSource {
    contentId: string;
    title: string;
    link: string;
    relevance: number;
}

export interface ChatResponse {
    text: string;
    sources: ChatSource[];
}
