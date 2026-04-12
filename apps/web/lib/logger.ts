import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB rotation

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateIfNeeded() {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > MAX_SIZE_BYTES) {
      fs.renameSync(LOG_FILE, LOG_FILE + ".1");
    }
  } catch {}
}

export function writeLog(entry: Record<string, unknown>) {
  if (typeof window !== "undefined") return; // client-side guard
  try {
    ensureLogDir();
    rotateIfNeeded();
    const line = JSON.stringify({ ...entry, ts: new Date().toISOString() }) + "\n";
    fs.appendFileSync(LOG_FILE, line);
  } catch {} // never crash the app for logging
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
