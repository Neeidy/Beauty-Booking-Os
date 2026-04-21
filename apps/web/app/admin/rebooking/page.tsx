export const dynamic = "force-dynamic";

import RebookingView from "./RebookingView";

export default function AdminRebookingPage() {
  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Automatisches Rebooking</span>
          <h2>Rebooking-Erinnerungen</h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">Einstellungen</button>
        </div>
      </header>
      <RebookingView />
    </>
  );
}
