const CLIPBOARD_CLEAR_MS = 20_000;

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export async function copyWithAutoClear(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (clearTimer) {
    clearTimeout(clearTimer);
  }
  clearTimer = setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) {
        await navigator.clipboard.writeText("");
      }
    } catch {
      // Clipboard read may fail without permission; ignore.
    }
  }, CLIPBOARD_CLEAR_MS);
}

export const clipboardClearMs = CLIPBOARD_CLEAR_MS;
