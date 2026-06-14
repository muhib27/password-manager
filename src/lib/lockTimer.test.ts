import { describe, expect, it, vi } from "vitest";
import { autoLockMs, createLockTimer } from "./lockTimer";

describe("createLockTimer", () => {
  it("calls onLock after inactivity", () => {
    vi.useFakeTimers();
    const onLock = vi.fn();
    const timer = createLockTimer(onLock);
    timer.start();
    vi.advanceTimersByTime(autoLockMs);
    expect(onLock).toHaveBeenCalledTimes(1);
    timer.destroy();
    vi.useRealTimers();
  });
});
