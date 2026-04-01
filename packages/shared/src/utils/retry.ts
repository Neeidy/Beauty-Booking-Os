interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(attempt: number, base: number, max: number): number {
  // Exponential backoff with jitter
  const exponential = base * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.2 * exponential;
  return Math.min(exponential + jitter, max);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === opts.maxAttempts) break;
      opts.onRetry?.(attempt, lastError);
      await delay(computeDelay(attempt, opts.baseDelayMs, opts.maxDelayMs));
    }
  }

  throw lastError;
}
