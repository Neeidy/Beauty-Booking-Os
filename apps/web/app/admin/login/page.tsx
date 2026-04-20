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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg-surface)",
      padding: "16px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{
              width: "14px", height: "14px",
              transform: "rotate(45deg)",
              background: "var(--color-accent)",
              borderRadius: "3px",
              display: "inline-block",
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 700, fontSize: "18px", color: "var(--color-text)" }}>
              {process.env["NEXT_PUBLIC_SALON_NAME"] ?? "Beauty Booking OS"}
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>Admin Panel</p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevated)",
          padding: "40px",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-row">
              <label htmlFor="password" className="form-label">Passwort</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                className="form-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                placeholder="Admin-Passwort eingeben"
              />
            </div>

            {error && (
              <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Wird angemeldet…" : "Anmelden"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "var(--color-text-faint)" }}>
          Beauty Booking OS · Admin
        </p>
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
