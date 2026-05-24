import { create } from 'zustand';
import type { User } from '../types';

// ─── Concept: Zustand Store ───────────────────────────────────────────────────
// create() nhận một function (set, get) → trả về hook useAuthStore
// state: dữ liệu
// actions: hàm thay đổi state (gọi set())
//
// Zustand khác useState:
//   • Sống ngoài component — không bị reset khi component unmount
//   • Dùng được ở bất kỳ component nào không cần props drilling
//   • Có thể gọi .getState() ngoài React (dùng trong axios interceptor)

interface AuthState {
    user: User | null;
    accessToken: string | null;   // memory only — không persist, mất khi F5
    isInitialized: boolean;       // true sau khi restoreSession() chạy xong

    setAuth: (user: User, accessToken: string) => void;
    clearAuth: () => void;
    setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    isInitialized: false,

    // Gọi sau khi login/register thành công
    setAuth: (user, accessToken) => set({ user, accessToken }),

    // Gọi khi logout
    clearAuth: () => {
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null });
    },

    setInitialized: () => set({ isInitialized: true }),
}));