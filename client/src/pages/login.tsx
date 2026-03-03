import { useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister } from "@/hooks/use-auth";

type Mode = "login" | "register";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();
  const register = useRegister();

  const busy = login.isPending || register.isPending;
  const title = useMemo(() => (mode === "login" ? "Sign in" : "Create account"), [mode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "register") {
        await register.mutateAsync({ email, password });
      }
      await login.mutateAsync({ email, password });
      setLocation("/");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Use your email and password to access your datasets."
              : "Create an account to keep your datasets private."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
            </div>

            {error ? <div className="text-sm text-destructive">{error}</div> : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>

            <div className="text-sm text-muted-foreground text-center">
              {mode === "login" ? (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4"
                    onClick={() => setMode("register")}
                    disabled={busy}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4"
                    onClick={() => setMode("login")}
                    disabled={busy}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
