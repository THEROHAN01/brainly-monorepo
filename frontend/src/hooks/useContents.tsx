import { useEffect, useState, useCallback } from "react";
import { BACKEND_URL } from "../config";
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
}

export function useContents() {
    const [contents, setContents] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContents = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            setLoading(false);
            setError("No authentication token found");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${BACKEND_URL}/api/v1/content`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            setContents(response.data.content || []);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || "Failed to fetch contents");
            } else {
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