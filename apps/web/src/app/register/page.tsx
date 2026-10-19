"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { AuthShell, Field, SubmitButton } from "@/components/auth-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/auth/register", { method: "POST", json: form });
      router.push("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="You get your own workspace the moment you sign up."
      footer={<>Already registered? <Link href="/login" className="font-medium text-indigo-600 hover:underline">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" autoComplete="name" required minLength={2} value={form.name} onChange={set("name")} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" value={form.password} onChange={set("password")} />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
