export const dynamic = "force-dynamic";

import RebookingView from "./RebookingView";

export default function AdminRebookingPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "1200px" }}>
      <h1
        style={{
          color: "var(--color-text)",
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "2rem",
        }}
      >
        Rebooking Hatırlatmaları
      </h1>
      <RebookingView />
    </main>
  );
}
