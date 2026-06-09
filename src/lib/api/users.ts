import client from "./client";
import type { User, UserRole } from "@/types";

export interface UserCreate {
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  password: string;
  aerodrome_id?: string | null;
  airline_id?: string | null;
  phone?: string | null;
}

export interface UserUpdate {
  full_name?: string;
  phone?: string | null;
  is_active?: boolean;
  aerodrome_id?: string | null;
  airline_id?: string | null;
}

export const usersApi = {
  list: (params?: { role?: UserRole; aerodrome_id?: string; is_active?: boolean; page?: number; page_size?: number }) =>
    client.get<User[]>("/users/", { params }),

  get: (id: string) => client.get<User>(`/users/${id}`),

  create: (data: UserCreate) => client.post<User>("/users/", data),

  update: (id: string, data: UserUpdate) => client.put<User>(`/users/${id}`, data),

  delete: (id: string) => client.delete(`/users/${id}`),

  resetPassword: (id: string, newPassword: string) =>
    client.post(`/users/${id}/reset-password`, { new_password: newPassword }),
};
