export const dynamic = "force-dynamic";

import SettingsView from "./SettingsView";

export default function SettingsPage() {
  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Studio-Einstellungen</span>
          <h2>Einstellungen</h2>
        </div>
      </header>
      <SettingsView />
    </>
  );
}
