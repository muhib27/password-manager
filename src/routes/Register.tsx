import { useEffect, useState } from "react";
import { StrengthMeter } from "../components/StrengthMeter";
import { Shell } from "../components/Shell";
import { api, type StrengthLabel } from "../lib/ipc";

type RegisterProps = {
  onCreated: () => void;
};

export function Register({ onCreated }: RegisterProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [strength, setStrength] = useState<StrengthLabel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!password) {
      return;
    }
    void api.evaluateStrength(password).then(setStrength);
  }, [password]);

  const strengthLabel = password ? strength : null;

  const canSubmit = password.length > 0 && password === confirm && !loading;

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await api.createVault(password, hint.trim() ? hint.trim() : null);
      setPassword("");
      setConfirm("");
      onCreated();
    } catch {
      setError("Could not create the vault. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Create your vault">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-10">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Choose a master password. It is never written to disk.
        </p>
        <label className="space-y-1 text-sm">
          <span>Master password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
        <StrengthMeter label={strengthLabel} />
        <label className="space-y-1 text-sm">
          <span>Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Optional hint</span>
          <input
            value={hint}
            onChange={(event) => setHint(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void submit()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          Create vault
        </button>
      </div>
    </Shell>
  );
}
