import { useEffect, useState } from "react";
import { copyWithAutoClear } from "../lib/clipboard";
import type { Entry } from "../lib/ipc";

const REVEAL_MS = 15_000;

type EntryDetailProps = {
  entry: Entry | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function EntryDetail({ entry, onEdit, onDelete }: EntryDetailProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) {
      return;
    }
    const timer = setTimeout(() => setRevealed(false), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Select an entry to view details.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {entry.title || "Untitled"}
          </h2>
          <p className="text-sm text-slate-500">{entry.url || "No URL"}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-800 dark:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Username">
          <div className="flex items-center gap-2">
            <span>{entry.username || "—"}</span>
            {entry.username ? (
              <button
                type="button"
                className="text-sm text-slate-600 underline dark:text-slate-300"
                onClick={() => void copyWithAutoClear(entry.username)}
              >
                Copy
              </button>
            ) : null}
          </div>
        </Field>
        <Field label="Password">
          <div className="flex items-center gap-2">
            <code>{revealed ? entry.password : "••••••••"}</code>
            <button
              type="button"
              className="text-sm text-slate-600 underline dark:text-slate-300"
              onClick={() => setRevealed((current) => !current)}
            >
              {revealed ? "Hide" : "Reveal"}
            </button>
            <button
              type="button"
              className="text-sm text-slate-600 underline dark:text-slate-300"
              onClick={() => void copyWithAutoClear(entry.password)}
            >
              Copy
            </button>
          </div>
        </Field>
        <Field label="Notes">
          <p className="whitespace-pre-wrap">{entry.notes || "—"}</p>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <div>{children}</div>
    </div>
  );
}
