import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

// Drop legacy localStorage credentials on first load. Version-bound server
// tokens issued by older builds are also rejected during verification.
if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem('auth-storage'); } catch { /* storage blocked */ }
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
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem('auth-storage');
                }
            },
        }),
        {
            name: 'auth-storage',
            // Tab-scoped persistence prevents bearer reuse by unrelated browser
            // sessions. Still JavaScript-readable: not an HttpOnly cookie.
            storage: createJSONStorage(() => sessionStorage),
            partialize: ({ user, token, isAuthenticated }) => ({
                user, token, isAuthenticated,
            }),
        }
    )
);
