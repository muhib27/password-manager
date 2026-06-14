import { useState } from "react";
import type { Entry } from "../lib/ipc";
import { PasswordGenerator } from "./PasswordGenerator";

type EntryFormProps = {
  initial?: Entry | null;
  onSubmit: (entry: Entry) => void;
  onCancel: () => void;
};

const emptyEntry = (): Entry => ({
  id: crypto.randomUUID(),
  title: "",
  username: "",
  password: "",
  url: "",
  notes: "",
});

export function EntryForm({ initial, onSubmit, onCancel }: EntryFormProps) {
  const [entry, setEntry] = useState<Entry>(() => initial ?? emptyEntry());

  const update = (field: keyof Entry, value: string) => {
    setEntry((current) => ({ ...current, [field]: value }));
  };

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 p-6 dark:border-slate-700"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(entry);
      }}
    >
      <h3 className="text-lg font-semibold">
        {initial ? "Edit entry" : "New entry"}
      </h3>
      {(
        [
          ["title", "Title"],
          ["username", "Username"],
          ["password", "Password"],
          ["url", "URL"],
        ] as const
      ).map(([field, label]) => (
        <label key={field} className="block space-y-1 text-sm">
          <span>{label}</span>
          <input
            value={entry[field]}
            onChange={(event) => update(field, event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
      ))}
      <label className="block space-y-1 text-sm">
        <span>Notes</span>
        <textarea
          value={entry.notes}
          onChange={(event) => update("notes", event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
        />
      </label>
      <PasswordGenerator onUse={(password) => update("password", password)} />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Save
        </button>
      </div>
    </form>
  );
}
