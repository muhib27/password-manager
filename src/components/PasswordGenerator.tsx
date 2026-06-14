import { useState } from "react";
import { api, type PasswordClasses } from "../lib/ipc";

type PasswordGeneratorProps = {
  onUse: (password: string) => void;
};

export function PasswordGenerator({ onUse }: PasswordGeneratorProps) {
  const [length, setLength] = useState(16);
  const [classes, setClasses] = useState<PasswordClasses>({
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
  });
  const [generated, setGenerated] = useState("");
  const [error, setError] = useState("");

  const toggleClass = (key: keyof PasswordClasses) => {
    setClasses((current) => ({ ...current, [key]: !current[key] }));
  };

  const generate = async () => {
    setError("");
    try {
      const password = await api.generatePassword(length, classes);
      setGenerated(password);
    } catch {
      setError("Choose at least one character class.");
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Password generator</h3>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
          onClick={() => void generate()}
        >
          Generate
        </button>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        Length
        <input
          type="range"
          min={8}
          max={64}
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
        />
        <span>{length}</span>
      </label>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ["uppercase", "Uppercase"],
            ["lowercase", "Lowercase"],
            ["digits", "Digits"],
            ["symbols", "Symbols"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={classes[key]}
              onChange={() => toggleClass(key)}
            />
            {label}
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {generated ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
            {generated}
          </code>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            onClick={() => onUse(generated)}
          >
            Use
          </button>
        </div>
      ) : null}
    </div>
  );
}
