export const dynamic = "force-dynamic";

import StaffManagementView from "./StaffManagementView";

export default function AdminStaffPage() {
  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Mitarbeiter:innen</span>
          <h2>Team</h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">Verfügbarkeit exportieren</button>
        </div>
      </header>
      <StaffManagementView />
    </>
  );
}
