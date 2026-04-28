"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { ROLE_ROUTES } from "@/lib/constants";
import { AuthLoading } from "@/components/shared/AuthLoading";

export default function Home() {
  const router = useRouter();
  const { user, loadUser, isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      loadUser();
    }
  }, [isInitialized, loadUser]);

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated && user) {
      router.replace(ROLE_ROUTES[user.role] ?? "/auth/login");
    } else {
      router.replace("/auth/login");
    }
  }, [isInitialized, isAuthenticated, user, router]);

  return <AuthLoading />;
}
