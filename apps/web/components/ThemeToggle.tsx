"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light"
    );
  }, [dark]);

  return (
    <div className="floating-controls">
      <button
        className="theme-toggle"
        onClick={() => setDark((d) => !d)}
        aria-label={dark ? "Light mode" : "Dark mode"}
      >
        {dark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
