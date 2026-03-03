import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { getToken, clearToken } from "@/lib/auth";
import { useMe } from "@/hooks/use-auth";

type Props = {
  children: ReactNode;
};

export function RequireAuth({ children }: Props) {
  const [, setLocation] = useLocation();
  const token = getToken();
  const me = useMe(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  useEffect(() => {
    if (me.isError) {
      clearToken();
      setLocation("/login");
    }
  }, [me.isError, setLocation]);

  if (!token) return null;
  if (me.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
