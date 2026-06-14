import type { StrengthLabel } from "../lib/ipc";

const labels: Record<StrengthLabel, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
  excellent: "Excellent",
};

const colors: Record<StrengthLabel, string> = {
  weak: "bg-red-500",
  fair: "bg-amber-500",
  strong: "bg-emerald-500",
  excellent: "bg-sky-500",
};

type StrengthMeterProps = {
  label: StrengthLabel | null;
};

export function StrengthMeter({ label }: StrengthMeterProps) {
  if (!label) {
    return null;
  }

  const width =
    label === "weak"
      ? "25%"
      : label === "fair"
        ? "50%"
        : label === "strong"
          ? "75%"
          : "100%";

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-2 rounded-full transition-all ${colors[label]}`}
          style={{ width }}
        />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Strength: {labels[label]}
      </p>
    </div>
  );
}
