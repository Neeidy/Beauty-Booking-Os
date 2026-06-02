"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/dictionary";

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

function getJobStatusLabel(status: string, js: Dictionary["admin"]["rebooking"]["jobStatus"]): string {
  if (status === "completed" || status === "sent") return js.sent;
  if (status === "skipped") return js.skipped;
  if (status === "opted-out") return js.optedOut;
  return js.scheduled;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function RebookingView() {
  const { dict, locale } = useI18n();
  const t = dict.admin.rebooking;
  const dateLocale = locale === "de" ? "de-AT" : "en-GB";
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
      setError(t.loadError);
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
        t.runResult
          .replace("{processed}", String(s?.processed ?? 0))
          .replace("{skippedConsent}", String(s?.skippedConsent ?? 0))
          .replace("{skippedDuplicate}", String(s?.skippedDuplicate ?? 0))
      );
      await fetchJobs();
    } catch {
      setRunResult(t.runFailed);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div className="rb-stats">
            <div className="rb-stat">
              <div className="rb-stat-num">{jobs.length}</div>
              <div className="rb-stat-lbl">{t.statActive}</div>
            </div>
            <div className="rb-stat">
              <div className="rb-stat-num">{sentCount}</div>
              <div className="rb-stat-lbl">{t.statSent}</div>
            </div>
            <div className="rb-stat">
              <div className="rb-stat-num">{skippedCount}</div>
              <div className="rb-stat-lbl">{t.statSkipped}</div>
            </div>
          </div>
          <button
            className="rb-run-btn"
            onClick={handleRunNow}
            disabled={isRunning}
          >
            {isRunning ? t.running : t.runNow}
          </button>
        </div>

        {runResult && (
          <div className="rb-result">{runResult}</div>
        )}
      </div>

      <div className="adm-toolbar adm-toolbar-bordered">
        <div className="adm-search">
          <input type="search" placeholder={t.searchPlaceholder} readOnly />
        </div>
        <button className="adm-filter-chip active">{t.filterAll.replace("{count}", String(jobs.length))}</button>
        <button className="adm-filter-chip">{t.filterScheduled.replace("{count}", String(scheduledCount))}</button>
        <button className="adm-filter-chip">{t.filterSent.replace("{count}", String(sentCount))}</button>
        <button className="adm-filter-chip">{t.filterSkipped.replace("{count}", String(skippedCount))}</button>
      </div>

      <div className="adm-body adm-body-flush">
        {isLoading ? (
          <div className="loading-text">{t.loading}</div>
        ) : error ? (
          <div className="empty">
            <div className="empty-ico">⚠</div>
            <h4>{t.loadErrorTitle}</h4>
            <p>{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">📅</div>
            <h4>{t.emptyTitle}</h4>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <table className="clients-table rb-table">
            <thead>
              <tr>
                <th>{t.colCustomer}</th>
                <th>{t.colScheduled}</th>
                <th>{t.colBooking}</th>
                <th>{t.colStatus}</th>
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
                      {new Intl.DateTimeFormat(dateLocale, {
                        day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Vienna",
                      }).format(new Date(job.scheduledAt))}
                    </strong>
                    {job.executedAt && (
                      <div className="rb-executed">
                        {t.executedPrefix} {new Intl.DateTimeFormat(dateLocale, {
                          day: "2-digit", month: "2-digit", timeZone: "Europe/Vienna",
                        }).format(new Date(job.executedAt))}
                      </div>
                    )}
                  </td>
                  <td className="rb-booking-id">
                    …{job.bookingId.slice(-6)}
                  </td>
                  <td>
                    <span className={`rb-job-status ${getJobStatusClass(job.status)}`}>
                      {getJobStatusLabel(job.status, t.jobStatus)}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm">{t.preview}</button>
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
