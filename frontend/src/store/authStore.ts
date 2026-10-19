import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    /** Increments for each login, account switch or logout. */
    sessionEpoch: number;
    setCredentials: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            sessionEpoch: 0,
            setCredentials: (user, token) => set((state) => ({
                user, token, isAuthenticated: true,
                sessionEpoch: state.sessionEpoch + 1,
            })),
            logout: () => {
                set((state) => ({
                    user: null, token: null, isAuthenticated: false,
                    sessionEpoch: state.sessionEpoch + 1,
                }));
                // Persisted credentials must not remain after explicit sign-out.
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('auth-storage');
                }
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
