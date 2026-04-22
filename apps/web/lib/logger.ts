import { getDb, eventLogs } from "@beauty-booking/db";

export function writeLog(entry: Record<string, unknown>) {
  if (typeof window !== "undefined") return;
  const { type, method, path: p, status, durationMs, error, message, ...rest } = entry as Record<string, unknown>;
  void (async () => {
    try {
      const db = getDb();
      await db.insert(eventLogs).values({
        clientId: "00000000-0000-0000-0000-000000000000",
        eventType: (type as string) ?? "log",
        agentName: "logger",
        status: status != null ? String(status) : "info",
        tokenCount: 0,
        payload: { method, path: p, durationMs, error, message, ...rest, ts: new Date().toISOString() },
      });
    } catch {} // never crash the app for logging
  })();
}

export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  error?: string
) {
  writeLog({ type: "request", method, path, status, durationMs, ...(error ? { error } : {}) });
}

export function logError(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  writeLog({ type: "error", path, message });
}
