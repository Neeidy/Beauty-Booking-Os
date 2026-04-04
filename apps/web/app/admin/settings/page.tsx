import AdminHeader from "../../../components/admin/AdminHeader";
import clientConfig from "../../../../clients/demo-salon/client.config.json";

export default function SettingsPage() {
  return (
    <>
      <AdminHeader title="Einstellungen" />
      <main className="p-6">
        <div className="rounded-sm border p-6 max-w-2xl" style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-secondary)" }}>
            Salon-Konfiguration
          </h2>
          <pre className="text-xs overflow-auto rounded-sm p-4" style={{ backgroundColor: "#f8f8f6", color: "var(--color-primary)" }}>
            {JSON.stringify(clientConfig, null, 2)}
          </pre>
        </div>
      </main>
    </>
  );
}
