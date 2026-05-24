import axios from 'axios';
import type { User } from '../types';

// Dùng '/django' prefix → Vite proxy → http://localhost:8000 (tránh CORS)
const djangoClient = axios.create({
    baseURL: '/django',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
});

export interface AuthTokens {
    access: string;  // save in memory Zustand store
    refresh: string; // save in localStorage
}

export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
}


// POST /api/auth/login/ — Django get { username, password }
export const login = async (username: string, password: string): Promise<AuthTokens> => {
    const { data } = await djangoClient.post<AuthTokens>('/api/auth/login/', { username, password });
    return data;
};

// POST /api/auth/register/
export const registerUser = async (payload: RegisterPayload): Promise<AuthTokens> => {
    const { data } = await djangoClient.post<AuthTokens>('/api/auth/register/', payload);
    return data;
};

// POST /api/auth/token/refresh/ — đổi refreshToken lấy accessToken mới
export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
    const { data } = await djangoClient.post<{ access: string }>(
        '/api/auth/token/refresh/', { refresh: refreshToken }
    );
    return data.access;
};

// GET /api/auth/me/ — lấy thông tin user (cần accessToken)
export const fetchMe = async (accessToken: string): Promise<User> => {
    const { data } = await djangoClient.get<User>('/api/auth/me/', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
};

