const TOKEN_KEY = "token";

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): { Authorization: string } | Record<string, never> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
