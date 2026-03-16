import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import axios from "axios";
import type { Tag } from "../types/tag";

export function useTags() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTags = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get("/api/v1/tags");
            setTags(response.data.tags || []);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status !== 401) {
                setError(err.response?.data?.message || "Failed to fetch tags");
            } else if (!axios.isAxiosError(err)) {
                setError("Failed to fetch tags");
            }
            setTags([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const createTag = async (name: string): Promise<Tag | null> => {
        try {
            const response = await api.post("/api/v1/tags", { name });
            const newTag = response.data.tag;
            setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
            return newTag;
        } catch (err) {
            // If tag already exists, return the existing tag from error response
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                return err.response.data.tag;
            }
            throw err;
        }
    };

    const deleteTag = async (tagId: string): Promise<void> => {
        await api.delete(`/api/v1/tags/${tagId}`);
        setTags(prev => prev.filter(t => t._id !== tagId));
    };

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    return { tags, loading, error, refetch: fetchTags, createTag, deleteTag };
}
