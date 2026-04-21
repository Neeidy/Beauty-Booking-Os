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

function getJobStatusClass(status: string): string {
  if (status === "completed" || status === "sent") return "sent";
  if (status === "skipped") return "skipped";
  if (status === "opted-out") return "opted-out";
  return "scheduled";
}

function getJobStatusLabel(status: string): string {
  if (status === "completed" || status === "sent") return "✓ Versendet";
  if (status === "skipped") return "✗ Übersprungen";
  if (status === "opted-out") return "⊘ Abgemeldet";
  return "⏳ Geplant";
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
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

  useEffect(() => { fetchJobs(); }, []);

  const scheduledCount = jobs.filter((j) => j.status === "scheduled" || j.status === "pending").length;
  const sentCount = jobs.filter((j) => j.status === "completed" || j.status === "sent").length;
  const skippedCount = jobs.filter((j) => j.status === "skipped").length;

  return (
    <>
      <div className="adm-body">
        <div className="rb-stats">
          <div className="rb-stat">
            <div className="rb-stat-num">{jobs.length}</div>
            <div className="rb-stat-lbl">Aktive Erinnerungen</div>
          </div>
          <div className="rb-stat">
            <div className="rb-stat-num">{sentCount}</div>
            <div className="rb-stat-lbl">Versendet</div>
          </div>
          <div className="rb-stat">
            <div className="rb-stat-num">{skippedCount}</div>
            <div className="rb-stat-lbl">Übersprungen</div>
          </div>
        </div>

        {runResult && (
          <div style={{
            margin: "12px 0",
            padding: "8px 12px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            color: "var(--color-text-muted)",
            background: "var(--color-bg-card)",
          }}>
            {runResult}
          </div>
        )}
      </div>

      <div className="adm-toolbar" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="adm-search">
          <input type="search" placeholder="Kunde, Leistung..." readOnly />
        </div>
        <button className="adm-filter-chip active">Alle ({jobs.length})</button>
        <button className="adm-filter-chip">⏳ Geplant ({scheduledCount})</button>
        <button className="adm-filter-chip">✓ Versendet ({sentCount})</button>
        <button className="adm-filter-chip">✗ Übersprungen ({skippedCount})</button>
      </div>

      <div className="adm-body" style={{ paddingTop: "0" }}>
        {isLoading ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Wird geladen…</div>
        ) : error ? (
          <div className="empty">
            <div className="empty-ico">⚠</div>
            <h4>Fehler beim Laden</h4>
            <p>{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">📅</div>
            <h4>Keine Erinnerungen</h4>
            <p>Noch keine Rebooking-Erinnerungen geplant.</p>
          </div>
        ) : (
          <table className="clients-table rb-table">
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Geplant für</th>
                <th>Booking</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className="client-name-cell">
                      <div className="client-avatar">{getInitials(job.customerName)}</div>
                      <div className="client-name-wrap">
                        <span className="client-name">{job.customerName ?? "—"}</span>
                        <span className="client-email">{job.customerContact ?? "—"}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>
                      {new Intl.DateTimeFormat("de-AT", {
                        day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Vienna",
                      }).format(new Date(job.scheduledAt))}
                    </strong>
                    {job.executedAt && (
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        Ausgeführt: {new Intl.DateTimeFormat("de-AT", {
                          day: "2-digit", month: "2-digit", timeZone: "Europe/Vienna",
                        }).format(new Date(job.executedAt))}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                    …{job.bookingId.slice(-6)}
                  </td>
                  <td>
                    <span className={`rb-job-status ${getJobStatusClass(job.status)}`}>
                      {getJobStatusLabel(job.status)}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm">Vorschau</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
