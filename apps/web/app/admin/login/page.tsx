"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/dashboard";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Hard navigation ensures the new cookie is sent with the next request
      window.location.href = next;
    } else {
      setError("Falsches Passwort. Bitte versuchen Sie es erneut.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-background)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>
            {process.env["NEXT_PUBLIC_SALON_NAME"] ?? "Beauty Booking OS"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-sm border p-8 space-y-4" style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "var(--color-primary)" }}>
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full border rounded-sm px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
              placeholder="Admin-Passwort eingeben"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-background)" }}
          >
            {loading ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
