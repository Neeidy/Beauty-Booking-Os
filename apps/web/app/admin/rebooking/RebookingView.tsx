"use client";

import { useEffect, useState } from "react";

interface RebookingJob {
  id: string;
  bookingId: string;
  scheduledAt: string;
  executedAt: string | null;
  status: string;
  result: Record<string, unknown> | null;
  customerName: string | null;
  customerContact: string | null;
}

export default function RebookingView() {
  const [jobs, setJobs] = useState<RebookingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchJobs() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rebooking");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch {
      setError("Job listesi yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunNow() {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/admin/rebooking", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const s = data.summary;
      setRunResult(
        `${s?.processed ?? 0} planlandı · ` +
          `${s?.skippedConsent ?? 0} consent eksik · ` +
          `${s?.skippedDuplicate ?? 0} duplicate`
      );
      await fetchJobs();
    } catch {
      setRunResult("Çalıştırma başarısız.");
    } finally {
      setIsRunning(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleRunNow}
          disabled={isRunning}
          style={{
            background: "var(--color-primary)",
            color: "var(--color-background)",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "13px",
            cursor: isRunning ? "not-allowed" : "pointer",
            opacity: isRunning ? 0.6 : 1,
            minHeight: "36px",
          }}
        >
          {isRunning ? "Çalışıyor..." : "Şimdi Çalıştır"}
        </button>

        {runResult && (
          <span
            style={{
              fontSize: "13px",
              color: "var(--color-text-muted)",
              padding: "6px 10px",
              border: "1px solid var(--color-accent)",
              borderRadius: "6px",
            }}
          >
            {runResult}
          </span>
        )}
      </div>

      {isLoading && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Yükleniyor...
        </p>
      )}

      {error && !isLoading && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          ⚠ {error}
        </p>
      )}

      {!isLoading && !error && jobs.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Henüz rebooking hatırlatması yok.
        </p>
      )}

      {!isLoading && jobs.length > 0 && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: "1px solid var(--color-accent)",
                borderRadius: "8px",
                padding: "1rem",
                background: "var(--color-background)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: "0.5rem",
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--color-text)",
                    fontSize: "14px",
                  }}
                >
                  {job.customerName ?? "—"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {job.customerContact ?? "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--color-text)" }}>
                  {new Intl.DateTimeFormat("de-AT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "Europe/Vienna",
                  }).format(new Date(job.scheduledAt))}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Booking: ...{job.bookingId.slice(-6)}
                </div>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border:
                    job.status === "completed"
                      ? "1px solid var(--color-primary)"
                      : "1px solid var(--color-secondary)",
                  color:
                    job.status === "completed"
                      ? "var(--color-primary)"
                      : "var(--color-text)",
                }}
              >
                {job.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
