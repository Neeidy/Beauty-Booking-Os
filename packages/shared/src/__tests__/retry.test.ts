import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../utils/retry.js";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after maxAttempts failures", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10 })
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls onRetry callback with attempt number and error", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it("wraps non-Error rejections in Error", async () => {
    const fn = vi.fn().mockRejectedValue("string error");
    await expect(
      withRetry(fn, { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 10 })
    ).rejects.toThrow();
  });
});
