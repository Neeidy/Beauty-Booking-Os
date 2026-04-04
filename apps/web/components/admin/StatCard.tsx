interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}

export default function StatCard({ label, value, sub, accent, warn }: StatCardProps) {
  return (
    <div
      className="rounded-sm border p-5"
      style={{
        borderColor: warn ? "#fca5a5" : accent ? "var(--color-secondary)" : "var(--color-accent)",
        backgroundColor: warn ? "#fef2f2" : "#fff",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: warn ? "#dc2626" : "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="text-3xl font-semibold" style={{ color: warn ? "#dc2626" : "var(--color-primary)" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{sub}</p>}
    </div>
  );
}
