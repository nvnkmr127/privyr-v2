"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useState } from "react";
import { signupAction } from "@/lib/actions/auth";

const signupSchema = z.object({
  orgName: z.string().min(1, "Workspace name is required"),
  firstName: z.string().min(1, "Your name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "At least 6 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { orgName: "", firstName: "", email: "", password: "" },
  });

  const onSubmit = async (data: SignupValues) => {
    setError(null);
    try {
      await signupAction(data);
    } catch (e: any) {
      setError(e?.message ?? "Could not create your workspace");
      return;
    }
    // Sign in immediately so the new session carries the org.
    const result = await signIn("credentials", { redirect: false, email: data.email, password: data.password });
    if (result?.error) {
      router.push("/login");
    } else {
      router.push("/leads");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create your workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="orgName">Workspace name</Label>
              <Input id="orgName" placeholder="Acme Sales" {...form.register("orgName")} />
              {form.formState.errors.orgName && (
                <p className="text-sm text-red-500">{form.formState.errors.orgName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">Your name</Label>
              <Input id="firstName" placeholder="Jane Doe" {...form.register("firstName")} />
              {form.formState.errors.firstName && (
                <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="m@example.com" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating…" : "Create workspace"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Already have an account? <Link href="/login" className="text-blue-600 underline">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
