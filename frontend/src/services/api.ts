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
        if (token) config.headers.Authorization = `Bearer ${token}`;
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
        // Incorrect credentials are a form error, not an expired authenticated session.
        const requestUrl = String(error.config?.url || '');
        const isLoginRequest = requestUrl.includes('/auth/login');
        if (error.response?.status === 401 && !isLoginRequest) {
            useAuthStore.getState().logout();
            if (window.location.pathname !== '/login') window.location.assign('/login');
        }
        return Promise.reject(error);
    }
);

export default api;
