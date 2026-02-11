import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, AuthUser, AuthTokens } from '@/types/auth';

interface AuthActions {
  setAuth: (user: AuthUser, tokens: AuthTokens) => void;
  clearAuth: () => void;
  updateTokens: (tokens: AuthTokens) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (user, tokens) =>
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      clearAuth: () =>
        set({
          ...initialState,
          isLoading: false,
        }),

      updateTokens: (tokens) =>
        set((state) => ({
          tokens: { ...state.tokens, ...tokens },
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      hasRole: (role: string) => {
        const state = get();
        return state.user?.roles?.includes(role) ?? false;
      },

      isAdmin: () => {
        const state = get();
        return state.user?.roles?.includes('admin') ?? false;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
