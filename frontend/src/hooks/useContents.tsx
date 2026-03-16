import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import axios from "axios";
import type { Tag } from "../types/tag";

/**
 * Content item returned from the API.
 * Type is now a string to support any provider type (youtube, twitter, link, etc.)
 */
export interface Content {
    _id: string;
    title: string;
    link: string;
    type: string;  // Provider type: 'youtube', 'twitter', 'link', etc.
    contentId?: string;  // Extracted content ID for embed generation
    userId: string;
    tags: Tag[];
    createdAt?: string;
}

export function useContents() {
    const [contents, setContents] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get("/api/v1/content");
            setContents(response.data.content || []);
        } catch (err) {
            // 401 is handled by the api interceptor (redirects to signin)
            if (axios.isAxiosError(err) && err.response?.status !== 401) {
                setError(err.response?.data?.message || "Failed to fetch contents");
            } else if (!axios.isAxiosError(err)) {
                setError("Failed to fetch contents");
            }
            setContents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContents();
    }, [fetchContents]);

    return {
        contents,
        loading,
        error,
        refetch: fetchContents
    };
}