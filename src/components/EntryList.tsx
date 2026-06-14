import type { RefObject } from "react";
import type { Entry } from "../lib/ipc";
import { filterEntries } from "../lib/filterEntries";

type EntryListProps = {
  entries: Entry[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onQueryChange: (query: string) => void;
  searchRef?: RefObject<HTMLInputElement | null>;
};

export function EntryList({
  entries,
  query,
  selectedId,
  onSelect,
  onQueryChange,
  searchRef,
}: EntryListProps) {
  const filtered = filterEntries(entries, query);

  return (
    <div className="flex h-full flex-col border-r border-slate-200 dark:border-slate-700">
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search entries"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
        />
      </div>
      <ul className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="p-4 text-sm text-slate-500">No entries found.</li>
        ) : (
          filtered.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 ${
                  selectedId === entry.id
                    ? "bg-slate-100 dark:bg-slate-800"
                    : ""
                }`}
              >
                <p className="font-medium">{entry.title || "Untitled"}</p>
                <p className="truncate text-sm text-slate-500">
                  {entry.username || entry.url || "No details"}
                </p>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
