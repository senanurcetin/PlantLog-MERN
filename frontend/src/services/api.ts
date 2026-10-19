import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Create Axios Instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach JWT Token to headers
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        const path = String(config.url || '');
        // Public login/registration must not accidentally carry a former session.
        const publicAuth = /^\/auth\/(?:login|register)(?:\?|$)/.test(path);
        if (token && !publicAuth) config.headers.set('Authorization', `Bearer ${token}`);
        else config.headers.delete('Authorization');
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle global errors like 401 Unauthorized
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // An earlier 401 must not log out a different/newer session.
        // Only a request sent with the currently active bearer can expire it.
        const requestUrl = String(error.config?.url || '');
        const isPublicAuth = /^\/auth\/(?:login|register)(?:\?|$)/.test(requestUrl);
        const authorization = error.config?.headers?.get?.('Authorization') ??
            error.config?.headers?.Authorization;
        const activeToken = useAuthStore.getState().token;
        if (error.response?.status === 401 && !isPublicAuth && activeToken &&
            authorization === `Bearer ${activeToken}`) {
            useAuthStore.getState().logout();
            // ProtectedRoute redirects; avoid a hard reload and stale-page flash.
        }
        return Promise.reject(error);
    }
);

export default api;
