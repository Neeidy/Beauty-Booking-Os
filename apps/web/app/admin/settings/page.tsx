import { join, resolve } from "path";
import AdminHeader from "../../../components/admin/AdminHeader";
import { loadSalonConfig } from "../../../../packages/config/src/loader.js";

const CLIENTS_DIR = resolve(process.cwd(), "..", "..", "clients");
const DEFAULT_SLUG = process.env["DEFAULT_CLIENT_SLUG"] ?? "demo-salon";

export default function SettingsPage() {
  let configData: object = {};
  try {
    const config = loadSalonConfig(CLIENTS_DIR, DEFAULT_SLUG);
    configData = config.client;
  } catch {
    configData = { error: `Could not load config for slug: ${DEFAULT_SLUG}` };
  }

  return (
    <>
      <AdminHeader title="Einstellungen" />
      <main className="p-6">
        <div className="rounded-sm border p-6 max-w-2xl" style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-secondary)" }}>
            Salon-Konfiguration ({DEFAULT_SLUG})
          </h2>
          <pre className="text-xs overflow-auto rounded-sm p-4" style={{ backgroundColor: "#f8f8f6", color: "var(--color-primary)" }}>
            {JSON.stringify(configData, null, 2)}
          </pre>
        </div>
      </main>
    </>
  );
}
