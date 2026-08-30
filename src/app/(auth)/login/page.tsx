"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useEffect, useState } from "react";

// Dev-only convenience: skip typing seed creds during local verification. NODE_ENV is
// "production" in real builds, so this whole branch is dead code there — never a prod bypass.
const DEV = process.env.NODE_ENV === "development";
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL || "admin@acme.com";
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD || "password123";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginValues) => {
    setError(null);
    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/profile");
    }
  };

  const devLogin = async () => {
    setError(null);
    const result = await signIn("credentials", { redirect: false, email: DEV_EMAIL, password: DEV_PASSWORD });
    if (result?.error) setError("Dev auto-login failed — is the DB seeded (npm run db:seed)?");
    else router.push("/");
  };

  // Auto-run dev login when explicitly opted in via env, so the preview lands logged in.
  useEffect(() => {
    if (DEV && process.env.NEXT_PUBLIC_DEV_AUTOLOGIN === "1") devLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>

            {DEV && (
              <Button type="button" variant="outline" className="w-full" onClick={devLogin}>
                Sign in as demo admin (dev)
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
