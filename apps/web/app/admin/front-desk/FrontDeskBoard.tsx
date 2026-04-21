"use client";

import { useState } from "react";
import LeadCard, { type FrontDeskLead } from "./LeadCard";

type Lane = "new" | "contacted" | "qualified" | "booked" | "lost";

interface FrontDeskColumns {
  new: FrontDeskLead[];
  contacted: FrontDeskLead[];
  qualified: FrontDeskLead[];
  booked: FrontDeskLead[];
  lost: FrontDeskLead[];
}

interface FrontDeskBoardProps {
  initialColumns: FrontDeskColumns;
}

const COLUMN_CONFIG: { key: Lane; title: string }[] = [
  { key: "new",       title: "Neu" },
  { key: "contacted", title: "Kontaktiert" },
  { key: "qualified", title: "Qualifiziert" },
  { key: "booked",    title: "Gebucht" },
  { key: "lost",      title: "Verloren / Spam" },
];

function statusToLane(status: string): Lane {
  if (status === "contacted") return "contacted";
  if (status === "qualified" || status === "booking_started") return "qualified";
  if (status === "booked") return "booked";
  if (status === "lost" || status === "spam") return "lost";
  return "new";
}

export default function FrontDeskBoard({ initialColumns }: FrontDeskBoardProps) {
  const [columns, setColumns] = useState<FrontDeskColumns>(initialColumns);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  async function onStatusChange(
    leadId: string,
    newStatus: string,
    fromLane: Lane
  ): Promise<void> {
    const lead = columns[fromLane].find((l) => l.id === leadId);
    if (!lead) return;

    const toLane = statusToLane(newStatus);

    setColumns((prev) => ({
      ...prev,
      [fromLane]: prev[fromLane].filter((l) => l.id !== leadId),
      [toLane]: [...prev[toLane], { ...lead, status: newStatus }],
    }));

    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": document.cookie
            .split("; ")
            .find((r) => r.startsWith("admin_secret="))
            ?.split("=")[1] ?? "",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("Lead status update failed:", err);
      setColumns((prev) => ({
        ...prev,
        [fromLane]: [...prev[fromLane], lead],
        [toLane]: prev[toLane].filter((l) => l.id !== leadId),
      }));
      setError("Status konnte nicht aktualisiert werden.");
      setTimeout(() => setError(null), 3000);
    }
  }

  const filterLead = (lead: FrontDeskLead): boolean => {
    if (sourceFilter === "all") return true;
    const src = lead.source ?? "";
    if (sourceFilter === "web" && (src === "web_form")) return true;
    if (sourceFilter === "google" && (src === "google" || src === "google_business")) return true;
    if (sourceFilter === "phone" && src === "phone") return true;
    if (sourceFilter === "instagram" && (src === "instagram" || src === "instagram_dm")) return true;
    return false;
  };

  return (
    <>
      <div className="adm-toolbar">
        <div className="adm-search">
          <input type="search" placeholder="Suche nach Name, Telefon oder Nachricht..." readOnly />
        </div>
        <button
          className={`adm-filter-chip${sourceFilter === "all" ? " active" : ""}`}
          onClick={() => setSourceFilter("all")}
        >
          Alle Quellen
        </button>
        <button
          className={`adm-filter-chip${sourceFilter === "web" ? " active" : ""}`}
          onClick={() => setSourceFilter("web")}
        >
          🌐 Web
        </button>
        <button
          className={`adm-filter-chip${sourceFilter === "google" ? " active" : ""}`}
          onClick={() => setSourceFilter("google")}
        >
          📱 Google
        </button>
        <button
          className={`adm-filter-chip${sourceFilter === "phone" ? " active" : ""}`}
          onClick={() => setSourceFilter("phone")}
        >
          ☎ Telefon
        </button>
        <button
          className={`adm-filter-chip${sourceFilter === "instagram" ? " active" : ""}`}
          onClick={() => setSourceFilter("instagram")}
        >
          📸 Instagram
        </button>
      </div>

      {error && (
        <div style={{
          background: "var(--color-error-soft)",
          color: "var(--color-error)",
          border: "1px solid var(--color-error)",
          borderRadius: "8px",
          padding: "10px 16px",
          fontSize: "13px",
          margin: "0 0 16px",
        }}>
          {error}
        </div>
      )}

      <div className="adm-body">
        <div className="kanban">
          {COLUMN_CONFIG.map(({ key, title }) => {
            const items = columns[key].filter(filterLead);
            return (
              <section key={key} className="kanban-col" data-lane={key}>
                <header className="kanban-col-head">
                  <span className="kanban-col-head-left">
                    <span className="kanban-col-dot" />
                    {title}
                  </span>
                  <span className="kanban-count">{items.length}</span>
                </header>
                <div className="kanban-list">
                  {items.length === 0 ? (
                    <p style={{
                      textAlign: "center",
                      padding: "24px 0",
                      fontSize: "13px",
                      color: "var(--color-text-faint)",
                    }}>
                      —
                    </p>
                  ) : (
                    items.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        lane={key}
                        onStatusChange={onStatusChange}
                      />
                    ))
                  )}
                </div>
                {key === "new" && (
                  <button className="kanban-col-new-btn">+ Lead hinzufügen</button>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
