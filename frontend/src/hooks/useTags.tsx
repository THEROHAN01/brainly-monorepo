import { useEffect, useState, useCallback } from "react";
import { BACKEND_URL } from "../config";
import axios from "axios";
import type { Tag } from "../types/tag";

export function useTags() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTags = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            setError("No authentication token found");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${BACKEND_URL}/api/v1/tags`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setTags(response.data.tags || []);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || "Failed to fetch tags");
            } else {
                setError("Failed to fetch tags");
            }
            setTags([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const createTag = async (name: string): Promise<Tag | null> => {
        const token = localStorage.getItem("token");
        try {
            const response = await axios.post(
                `${BACKEND_URL}/api/v1/tags`,
                { name },
                { headers: { "Authorization": `Bearer ${token}` } }
            );
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
        const token = localStorage.getItem("token");
        await axios.delete(`${BACKEND_URL}/api/v1/tags/${tagId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        setTags(prev => prev.filter(t => t._id !== tagId));
    };

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    return { tags, loading, error, refetch: fetchTags, createTag, deleteTag };
}
