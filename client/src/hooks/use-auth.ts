import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authHeader, clearToken, setToken } from "@/lib/auth";

type User = { id: number; email: string };

export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["auth.me"],
    enabled,
    queryFn: async (): Promise<User> => {
      const res = await fetch("/api/auth/me", { headers: authHeader() });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to load session");
      const data = await res.json();
      return data.user as User;
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Login failed");
      setToken(data.token);
      await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
      return data.user as User;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Registration failed");
      return data.user as User;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", headers: authHeader() });
      } finally {
        clearToken();
        await queryClient.clear();
      }
    },
  });
}

