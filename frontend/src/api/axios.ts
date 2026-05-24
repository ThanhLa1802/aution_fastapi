import axios from 'axios';
import { refreshAccessToken } from './auth';
import { useAuthStore } from '../stores/authStore';
// Không có circular dependency:
//   axios.ts → authStore.ts (một chiều)
//   authStore.ts KHÔNG import axios.ts

// Dùng '/api/v1' → Vite proxy → http://localhost:8001 (tránh CORS)
export const apiClient = axios.create({
    baseURL: '/api/v1',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
});

// Request interceptor: tự động gắn accessToken vào header
// .getState() là Zustand API cho phép đọc store ngoài React component
apiClient.interceptors.request.use((config) => {
    const token: string | null = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor: 401 → refresh token → retry
// isRefreshing + failedQueue: tránh nhiều request cùng lúc đều gọi refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: Error) => void }> = [];

const processQueue = (error: Error | null, token: string | null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const storedRefresh = localStorage.getItem('refreshToken');
                if (!storedRefresh) throw new Error('No refresh token');

                const newAccess = await refreshAccessToken(storedRefresh);
                useAuthStore.getState().setAuth(useAuthStore.getState().user!, newAccess);

                processQueue(null, newAccess);
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return apiClient(originalRequest);
            } catch (err) {
                processQueue(err as Error, null);
                useAuthStore.getState().clearAuth();
                window.location.href = '/login';
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        const message: string =
            error.response?.data?.detail ?? error.message ?? 'Lỗi không xác định';
        return Promise.reject(new Error(message));
    },
);