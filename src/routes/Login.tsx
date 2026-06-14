import { useState } from "react";
import { Shell } from "../components/Shell";
import { api } from "../lib/ipc";
import type { Entry } from "../lib/ipc";

type LoginProps = {
  onUnlocked: (entries: Entry[]) => void;
};

export function Login({ onUnlocked }: LoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const entries = await api.unlock(password);
      setPassword("");
      onUnlocked(entries);
    } catch {
      setError("Could not unlock the vault.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Unlock your vault">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-10">
        <label className="space-y-1 text-sm">
          <span>Master password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && password && !loading) {
                void submit();
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={!password || loading}
          onClick={() => void submit()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          Unlock
        </button>
      </div>
    </Shell>
  );
}
