"use client";
import { create } from "zustand";
import type { Shift } from "@/types";
import { shiftsApi } from "@/lib/api/shifts";

interface ShiftState {
  activeShift: Shift | null;
  isLoaded: boolean;
  isLoading: boolean;
  loadActiveShift: () => Promise<void>;
  setActiveShift: (shift: Shift | null) => void;
  reset: () => void;
}

let loadingPromise: Promise<void> | null = null;

export const useShiftStore = create<ShiftState>((set, get) => ({
  activeShift: null,
  isLoaded: false,
  isLoading: false,

  loadActiveShift: async () => {
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      set({ isLoading: true });
      try {
        const { data } = await shiftsApi.getActive();
        set({ activeShift: data ?? null, isLoaded: true });
      } catch {
        set({ activeShift: null, isLoaded: true });
      } finally {
        set({ isLoading: false });
        loadingPromise = null;
      }
    })();
    return loadingPromise;
  },

  setActiveShift: (shift) => set({ activeShift: shift, isLoaded: true }),

  reset: () => set({ activeShift: null, isLoaded: false, isLoading: false }),
}));
