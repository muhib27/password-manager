const AUTO_LOCK_MS = 15 * 60 * 1000;

type LockCallback = () => void;

export function createLockTimer(onLock: LockCallback) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const reset = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(onLock, AUTO_LOCK_MS);
  };

  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const events: Array<keyof WindowEventMap> = [
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "focus",
  ];

  const start = () => {
    reset();
    for (const event of events) {
      window.addEventListener(event, reset, { passive: true });
    }
  };

  const destroy = () => {
    stop();
    for (const event of events) {
      window.removeEventListener(event, reset);
    }
  };

  return { start, reset, stop, destroy };
}

export const autoLockMs = AUTO_LOCK_MS;
