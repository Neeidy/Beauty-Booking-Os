"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // Set light mode explicitly on mount so data-theme is always present
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  return (
    <button
      className="theme-toggle"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
