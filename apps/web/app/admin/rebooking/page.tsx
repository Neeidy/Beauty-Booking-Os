export const dynamic = "force-dynamic";

import RebookingView from "./RebookingView";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function AdminRebookingPage() {
  const dict = getDictionary(await getLocale());
  const t = dict.admin.rebooking;

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">{t.breadcrumb}</span>
          <h2>{t.title}</h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">{t.settings}</button>
        </div>
      </header>
      <RebookingView />
    </>
  );
}
