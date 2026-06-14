type ShortcutHandler = () => void;

export function bindShortcuts(handlers: {
  search?: ShortcutHandler;
  newEntry?: ShortcutHandler;
  lock?: ShortcutHandler;
  escape?: ShortcutHandler;
}) {
  const onKeyDown = (event: KeyboardEvent) => {
    const mod = event.metaKey || event.ctrlKey;

    if (handlers.escape && event.key === "Escape") {
      handlers.escape();
      return;
    }

    if (handlers.lock && mod && event.key.toLowerCase() === "l") {
      event.preventDefault();
      handlers.lock();
      return;
    }

    if (handlers.newEntry && mod && event.key.toLowerCase() === "n") {
      event.preventDefault();
      handlers.newEntry();
      return;
    }

    if (
      handlers.search &&
      ((mod && event.key.toLowerCase() === "k") || event.key === "/")
    ) {
      event.preventDefault();
      handlers.search();
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
