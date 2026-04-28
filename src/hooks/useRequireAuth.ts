"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types";

/**
 * Auth guard for protected routes.
 *
 * Behavior:
 *   - On mount, kicks off `loadUser()` if not yet initialized.
 *   - While initializing, returns { ready: false } — caller should render a
 *     loading state instead of redirecting.
 *   - Once initialized, redirects to /auth/login if unauthenticated OR if the
 *     user's role isn't in `allowedRoles`.
 *   - Returns { ready: true, user } when the user is authorized.
 */
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const router = useRouter();
  const { isAuthenticated, isInitialized, user, loadUser } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      loadUser();
    }
  }, [isInitialized, loadUser]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace("/auth/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isAuthenticated, user]);

  const authorized =
    isInitialized &&
    isAuthenticated &&
    !!user &&
    (!allowedRoles || allowedRoles.includes(user.role));

  return {
    ready: authorized,
    initializing: !isInitialized,
    user,
  };
}
