export const dynamic = "force-dynamic";

import StaffManagementView from "./StaffManagementView";

export default function AdminStaffPage() {
  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Team</span>
          <h2>Team</h2>
        </div>
      </header>
      <div className="adm-body">
        <StaffManagementView />
      </div>
    </>
  );
}
