export const dynamic = "force-dynamic";

import StaffManagementView from "./StaffManagementView";

export default function AdminStaffPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "900px" }}>
      <h1 style={{
        color: "var(--color-text)",
        fontSize: "1.5rem",
        fontWeight: 600,
        marginBottom: "2rem",
      }}>
        Team
      </h1>
      <StaffManagementView />
    </main>
  );
}
