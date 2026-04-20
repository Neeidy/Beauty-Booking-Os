"use client";

import { useEffect, useState } from "react";

export default function CalendarTimeIndicator() {
  const [topPx, setTopPx] = useState<number | null>(null);

  useEffect(() => {
    function calc() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h < 8 || h >= 21) {
        setTopPx(null);
        return;
      }
      setTopPx(((h - 8) * 60 + m) * (96 / 60));
    }
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);

  if (topPx === null) return null;

  return (
    <div className="cal-now-line" style={{ top: `${topPx}px` }} />
  );
}
