import type { Entry } from "../lib/ipc";

export function filterEntries(entries: Entry[], query: string): Entry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return entries;
  }
  return entries.filter((entry) =>
    [entry.title, entry.username, entry.url, entry.notes].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}
