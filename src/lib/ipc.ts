import { invoke } from "@tauri-apps/api/core";

export type Entry = {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

export type PasswordClasses = {
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
};

export type StrengthLabel = "weak" | "fair" | "strong" | "excellent";

export const api = {
  vaultExists: () => invoke<boolean>("vault_exists"),
  createVault: (masterPassword: string, hint: string | null) =>
    invoke<void>("create_vault", { masterPassword, hint }),
  unlock: (masterPassword: string) =>
    invoke<Entry[]>("unlock", { masterPassword }),
  lock: () => invoke<void>("lock"),
  saveEntries: (entries: Entry[]) => invoke<void>("save_entries", { entries }),
  generatePassword: (length: number, classes: PasswordClasses) =>
    invoke<string>("generate_password_command", { length, classes }),
  evaluateStrength: (password: string) =>
    invoke<StrengthLabel>("evaluate_strength_command", { password }),
  isLocked: () => invoke<boolean>("is_locked"),
};
