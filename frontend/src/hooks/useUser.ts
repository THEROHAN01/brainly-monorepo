import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { removeToken } from "../lib/auth";

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
        try {
            setLoading(true);
            const response = await api.get("/api/v1/me");
            setUser(response.data.user);
        } catch {
            // 401 is handled by the api interceptor (redirects to signin)
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
