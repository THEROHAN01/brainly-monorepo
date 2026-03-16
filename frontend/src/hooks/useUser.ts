import { useEffect, useState, useCallback } from "react";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { getToken, removeToken } from "../lib/auth";

export interface User {
    id: string;
    username: string;
    email?: string;
    profilePicture?: string;
    authProvider: "local" | "google";
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        const token = getToken();

        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`${BACKEND_URL}/api/v1/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            setUser(response.data.user);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        removeToken();
        setUser(null);
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return {
        user,
        loading,
        logout,
        refetch: fetchUser
    };
}
