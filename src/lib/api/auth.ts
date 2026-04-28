import client from "./client";
import type { TokenResponse, User } from "@/types";

export const authApi = {
  login: (username: string, password: string) =>
    client.post<TokenResponse>("/auth/login", { username, password }),

  logout: () => client.post("/auth/logout"),

  refresh: (refreshToken: string) =>
    client.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken }),

  me: () => client.get<User>("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.put("/auth/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};
