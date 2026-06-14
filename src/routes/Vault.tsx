import { useEffect, useMemo, useRef, useState } from "react";
import { EntryDetail } from "../components/EntryDetail";
import { EntryForm } from "../components/EntryForm";
import { EntryList } from "../components/EntryList";
import { Shell } from "../components/Shell";
import { api, type Entry } from "../lib/ipc";
import { createLockTimer } from "../lib/lockTimer";
import { bindShortcuts } from "../lib/shortcuts";

type VaultProps = {
  initialEntries: Entry[];
  onLock: () => void;
};

type Mode = "view" | "create" | "edit";

export function Vault({ initialEntries, onLock }: VaultProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEntries[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("view");
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  );

  useEffect(() => {
    const timer = createLockTimer(() => {
      void api.lock().finally(onLock);
    });
    timer.start();
    return () => timer.destroy();
  }, [onLock]);

  useEffect(() => {
    return bindShortcuts({
      search: () => searchRef.current?.focus(),
      newEntry: () => setMode("create"),
      lock: () => {
        void api.lock().finally(onLock);
      },
      escape: () => setMode("view"),
    });
  }, [onLock]);

  const persist = async (nextEntries: Entry[]) => {
    await api.saveEntries(nextEntries);
    setEntries(nextEntries);
  };

  const handleSave = async (entry: Entry) => {
    const exists = entries.some((current) => current.id === entry.id);
    const nextEntries = exists
      ? entries.map((current) => (current.id === entry.id ? entry : current))
      : [...entries, entry];
    await persist(nextEntries);
    setSelectedId(entry.id);
    setMode("view");
  };

  const handleDelete = async () => {
    if (!selected) {
      return;
    }
    const nextEntries = entries.filter((entry) => entry.id !== selected.id);
    await persist(nextEntries);
    setSelectedId(nextEntries[0]?.id ?? null);
    setMode("view");
  };

  return (
    <Shell
      title="Your entries"
      onLock={() => {
        void api.lock().finally(onLock);
      }}
    >
      <div className="grid h-[calc(100vh-89px)] grid-cols-[320px_1fr]">
        <div className="flex h-full flex-col">
          <EntryList
            entries={entries}
            query={query}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setMode("view");
            }}
            onQueryChange={setQuery}
            searchRef={searchRef}
          />
          <div className="border-r border-t border-slate-200 p-4 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMode("create")}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
            >
              New entry
            </button>
          </div>
        </div>
        <div className="overflow-y-auto">
          {mode === "view" ? (
            <EntryDetail
              key={selected?.id ?? "empty"}
              entry={selected}
              onEdit={() => setMode("edit")}
              onDelete={() => void handleDelete()}
            />
          ) : (
            <div className="p-6">
              <EntryForm
                key={mode === "edit" ? (selected?.id ?? "edit") : "create"}
                initial={mode === "edit" ? selected : null}
                onSubmit={(entry) => void handleSave(entry)}
                onCancel={() => setMode("view")}
              />
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
