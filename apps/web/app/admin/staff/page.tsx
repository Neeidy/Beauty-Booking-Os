export const dynamic = "force-dynamic";

import { getActiveStaff, type StaffMember } from "@/lib/load-staff-config";

// Server Component — no "use client"
// getActiveStaff() never throws (has its own try/catch).
export default function AdminStaffPage() {
  const staff: StaffMember[] = getActiveStaff();

  return (
    <main style={{ padding: "2rem", maxWidth: "900px" }}>
      <h1
        style={{
          color: "var(--color-text)",
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "2rem",
        }}
      >
        Team
      </h1>

      {staff.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Keine aktiven Teammitglieder konfiguriert.
        </p>
      )}

      {staff.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {staff.map((member) => (
            <div
              key={member.id}
              style={{
                border: "1px solid var(--color-accent)",
                borderRadius: "10px",
                padding: "1.25rem 1.25rem 1rem",
                background: "var(--color-background)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {/* Avatar — initials */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--color-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--color-background)",
                  flexShrink: 0,
                  marginBottom: "0.25rem",
                }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--color-text)",
                  fontSize: "15px",
                  lineHeight: 1.3,
                }}
              >
                {member.name}
              </div>

              {/* Title */}
              <div
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "13px",
                  lineHeight: 1.4,
                }}
              >
                {member.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
