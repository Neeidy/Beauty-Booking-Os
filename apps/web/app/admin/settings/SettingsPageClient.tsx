"use client";

import { useState } from "react";
import SettingsView from "./SettingsView";

export default function SettingsPageClient() {
  const [saveCount, setSaveCount] = useState(0);
  const [discardCount, setDiscardCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setSaveCount((c) => c + 1);
    // small delay to let child finish
    setTimeout(() => setIsSaving(false), 1500);
  }

  function handleDiscard() {
    setDiscardCount((c) => c + 1);
  }

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Studio-Einstellungen</span>
          <h2>Einstellungen</h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleDiscard}>
            Verwerfen
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Wird gespeichert..." : "Änderungen speichern"}
          </button>
        </div>
      </header>
      <SettingsView triggerSave={saveCount} triggerDiscard={discardCount} />
    </>
  );
}
