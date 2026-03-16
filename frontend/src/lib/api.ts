import axios from "axios";
import { BACKEND_URL } from "../config";
import { getToken, removeToken } from "./auth";

/**
 * Pre-configured Axios instance with auth headers and 401 handling.
 * On 401 responses, clears the expired token and redirects to signin.
 */
const api = axios.create({
    baseURL: BACKEND_URL,
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRedirecting = false;

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !isRedirecting) {
            isRedirecting = true;
            removeToken();
            window.location.href = "/signin";
        }
        return Promise.reject(error);
    }
);

export default api;
