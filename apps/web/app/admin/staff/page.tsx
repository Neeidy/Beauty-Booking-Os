export const dynamic = "force-dynamic";

import StaffManagementView from "./StaffManagementView";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function AdminStaffPage() {
  const dict = getDictionary(await getLocale());
  const t = dict.admin.staff.header;

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">{t.breadcrumb}</span>
          <h2>{t.title}</h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">{t.exportAvailability}</button>
        </div>
      </header>
      <StaffManagementView />
    </>
  );
}
