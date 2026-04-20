export const dynamic = "force-dynamic";

import SettingsView from "./SettingsView";

export default function SettingsPage() {
  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">System</span>
          <h2>Einstellungen</h2>
        </div>
      </header>
      <div className="adm-body">
        <SettingsView />
      </div>
    </>
  );
}
