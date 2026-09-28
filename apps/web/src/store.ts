import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './types';

interface AppState {
  token: string | null; user: User | null; onboardingDone: boolean; sessionMessage: string | null;
  setSession(token: string, user: User): void; clearSession(message?: string): void; completeOnboarding(): void;
}
type PersistedAppState = Pick<AppState, 'onboardingDone' | 'token'>;

export const useAppStore = create<AppState>()(persist<AppState, [], [], PersistedAppState>((set) => ({
  token: null, user: null, onboardingDone: false, sessionMessage: null,
  setSession: (token, user) => set({ token, user, sessionMessage: null }), clearSession: (message) => set({ token: null, user: null, sessionMessage: message ?? null }),
  completeOnboarding: () => set({ onboardingDone: true }),
}), {
  name: 'pulse-city-session',
  version: 4,
  partialize: ({ onboardingDone, token }) => ({ onboardingDone, token }),
  migrate: (persisted) => {
    const legacy = (persisted ?? {}) as Partial<AppState>;
    return {
      onboardingDone: Boolean(legacy.onboardingDone),
      token: null,
    };
  },
}));
