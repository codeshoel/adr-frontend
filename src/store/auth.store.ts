"use client";
import { create } from "zustand";
import type { User } from "@/types";
import { authApi } from "@/lib/api/auth";
import { setAccessToken } from "@/lib/api/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Becomes `true` once we've checked for an existing session (success or failure). */
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

let loadingPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(username, password);
      setAccessToken(data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isInitialized: true, isLoading: false });
      return data.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setAccessToken(null);
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false, isInitialized: true });
    // Reset shift cache so the next user who logs in doesn't inherit prior state
    try {
      const { useShiftStore } = await import("@/store/shift.store");
      useShiftStore.getState().reset();
    } catch {
      // ignore
    }
  },

  loadUser: async () => {
    // Dedupe parallel calls — multiple layouts may call loadUser() simultaneously on mount
    if (loadingPromise) return loadingPromise;
    if (get().isInitialized) return;

    loadingPromise = (async () => {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        set({ isInitialized: true });
        return;
      }
      try {
        const { data } = await authApi.refresh(refreshToken);
        setAccessToken(data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        set({ user: data.user, isAuthenticated: true, isInitialized: true });
      } catch {
        setAccessToken(null);
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false, isInitialized: true });
      } finally {
        loadingPromise = null;
      }
    })();

    return loadingPromise;
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, isInitialized: true }),
}));
