import { LockIcon } from "../icons/LockIcon";

type ShellProps = {
  title: string;
  children: React.ReactNode;
  onLock?: () => void;
};

export function Shell({ title, children, onLock }: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            vault
          </p>
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
        {onLock ? (
          <button
            type="button"
            onClick={onLock}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          >
            <LockIcon className="h-4 w-4" />
            Lock
          </button>
        ) : null}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
