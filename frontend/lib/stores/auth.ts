"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@bannersin48/shared";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("bi48.token", token);
        }
        set({ user, token });
      },
      setUser: (user) => set({ user }),
      clear: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("bi48.token");
        }
        set({ user: null, token: null });
      },
    }),
    { name: "bi48.auth" },
  ),
);
