export const dynamic = "force-dynamic";

import RebookingView from "./RebookingView";

export default function AdminRebookingPage() {
  return (
    <div>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Automatisierung</span>
          <h2>Rebooking</h2>
        </div>
      </header>
      <div className="adm-body">
        <RebookingView />
      </div>
    </div>
  );
}
