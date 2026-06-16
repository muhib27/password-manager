# PRD: `vault` — Desktop Password Manager (Tauri)

## Problem Statement

The user wants a simple, secure, local password manager they can run on their desktop. Today they rely on browser-built-in storage or cloud password managers, and they want something they own end-to-end: a single encrypted vault on disk, unlocked by a single master password, with no account, no server, and no sync. The UX must be beautiful and minimalist — not a web app in a window, but a focused tool that feels at home next to native apps.

## Solution

Ship a Tauri 2 desktop app called `vault` that:

- Stores all credentials in a single encrypted file in the OS app-data directory.
- Derives the encryption key from a master password using Argon2id with strong parameters.
- Encrypts the vault with ChaCha20-Poly1305 (AEAD), authenticated and tamper-detecting.
- Holds decrypted entries only in memory while unlocked; wipes the key and secrets on lock.
- Provides a minimalist three-page React UI (Register, Login, Vault) with light/dark theming, inline SVG icons, system font, and standard password-manager keyboard shortcuts.

Threat model: defend against a file-at-rest attacker who obtains the vault file. We do not attempt to defend against malware already running on the user's machine, keyloggers, or shoulder-surfing.

## User Stories

### Onboarding & authentication
1. As a first-time user, I want the app to detect that no vault exists, so that it shows me a registration flow instead of a broken login screen.
2. As a first-time user, I want to set a master password and optionally a hint, so that my vault is created and only I can unlock it.
3. As a first-time user, I want to see clear feedback on the strength of my chosen master password, so that I pick something strong.
4. As a first-time user, I want my hint (if provided) to be saved encrypted with the rest of the vault, so that even the hint is protected.
5. As a returning user, I want the app to detect that a vault exists, so that it shows me the login screen.
6. As a returning user, I want to unlock the vault by entering my master password, so that I can access my entries.
7. As a user, I want a failed unlock attempt to show a clear error and not leak whether the master password was wrong vs. the file was corrupted, so that I am not helped by the app if I am an attacker.
8. As a user, I want the app to remember nothing about me across sessions, so that there is no persistent session token to steal.

### Vault management
9. As an unlocked user, I want to see a list of all my entries, so that I can scan and find the one I need.
10. As an unlocked user, I want to search across title, username, URL, and notes with a substring match, so that I can find entries quickly.
11. As an unlocked user, I want to click an entry to see its details, so that I can view or edit it.
12. As an unlocked user, I want to add a new entry (title, username, password, URL, notes), so that I can store a new credential.
13. As an unlocked user, I want to edit an existing entry, so that I can update credentials when sites rotate passwords.
14. As an unlocked user, I want to delete an entry, so that I can remove credentials I no longer need.
15. As an unlocked user, I want to copy a username or password to the clipboard with one click, so that I can paste it into a login form.
16. As an unlocked user, I want the clipboard to auto-clear after ~20 seconds, so that a stolen clipboard contents expire.
17. As an unlocked user, I want to reveal a password inline, so that I can verify it is correct.
18. As an unlocked user, I want a revealed password to auto-hide after ~15 seconds, so that I don't forget to hide it.
19. As an unlocked user, I want a built-in password generator with length and character-class controls, so that I can create strong new passwords.
20. As an unlocked user, I want the password generator to use a CSPRNG, so that generated passwords are unpredictable.
21. As an unlocked user, I want the strength meter to evaluate my chosen password locally with no network calls, so that my passwords are not leaked.

### Session & security
22. As an unlocked user, I want the app to lock automatically after 15 minutes of inactivity, so that an idle session does not stay exposed.
23. As a user, I want the app to lock immediately when the window closes, so that closing the app is equivalent to locking.
24. As a user, I want a manual lock action (button and `Cmd/Ctrl+L`), so that I can lock on demand when stepping away.
25. As a user, I want the master password to never be written to disk by the app, so that the only way to recover the vault is to know the password.
26. As a user, I want the in-memory key and secrets to be zeroized when I lock, so that they are not left in RAM for a memory scraper to find later.
27. As a user, I want the vault file to be written atomically (temp + rename), so that a crash during save never corrupts my vault.
28. As a user, I want any tampering with the vault file to be detected and the unlock to fail, so that I am not silently served modified data.
29. As a user, I want the app to bundle a strict CSP and to expose no filesystem, shell, network, dialog, or clipboard capabilities to the webview, so that a compromised UI cannot escape its sandbox.
30. As a user, I want devtools disabled in release builds, so that production UI is not trivially inspectable.

### UX & polish
31. As a user, I want a light and a dark theme that follow the OS preference, so that the app looks at home in either.
32. As a user, I want a system font and a neutral monochrome palette with one accent color, so that the UI feels minimalist and focused.
33. As a user, I want inline SVG icons for search, add, copy, reveal, edit, delete, lock, and key, so that the UI is scannable and consistent.
34. As a user, I want keyboard shortcuts: `/` or `Cmd/Ctrl+K` to focus search, `Cmd/Ctrl+N` for new entry, `Cmd/Ctrl+L` to lock, `Esc` to close modals, so that I can drive the app without the mouse.
35. As a user, I want a minimal native menu with File → Lock and File → Quit, so that platform conventions are respected.
36. As a user, I want the app to be a single window with sensible default size, so that it behaves like a focused desktop tool, not a multi-window app.

## Implementation Decisions

### Modules
- Rust crate `vault-core` (or single crate with modules): `crypto`, `vault_io`, `commands`, `model`, `error`.
- React app under `src/`: `routes/Register.tsx`, `routes/Login.tsx`, `routes/Vault.tsx`; components for `EntryList`, `EntryDetail`, `EntryForm`, `PasswordGenerator`, `StrengthMeter`; shared `clipboard`, `shortcuts`, `lockTimer` utilities.

### Architecture & trust boundary
- All crypto lives in Rust. The webview is untrusted from the app's point of view.
- Frontend talks to Rust exclusively through a small, typed set of Tauri commands. No filesystem, shell, network, dialog, or clipboard plugins are enabled.
- The frontend holds the decrypted entries only in React state after `unlock` returns. On lock, the frontend clears state and the screen flips to Login.
- Clipboard reads/writes use the web Clipboard API from the React layer; no Tauri clipboard plugin.

### Crypto choices
- KDF: Argon2id, 64 MiB memory, 3 iterations, 1 parallelism, 32-byte output key. Parameters stored in the file header so they can be tuned later.
- AEAD: ChaCha20-Poly1305, 24-byte random nonce per save.
- RNG: `rand`/`getrandom` (CSPRNG) for salt, nonce, UUIDs, and password generator.
- Memory: every secret-typed buffer is wrapped with `zeroize::Zeroizing` or implements `Zeroize` and is dropped on lock and on error paths.
- Password generator: CSPRNG-based selection over enabled character classes; no "must include one of each" weakening.

### File format
- Single file at the OS app-data directory (Linux `~/.local/share/vault/vault.bin`, macOS `~/Library/Application Support/vault/vault.bin`, Windows `%APPDATA%\vault\vault.bin`).
- Binary layout, little-endian, versioned:
  - Magic: 6 bytes `VAULT1`
  - Version: `u8` (= 1)
  - Argon2id params: `u32` memory KiB, `u32` iterations, `u32` parallelism, `u32` key length
  - Salt: 16 bytes
  - Nonce: 24 bytes
  - Ciphertext + 16-byte Poly1305 tag (length implicit as `file_len - header_len`)
- Plaintext inside the blob: `serde_json`-serialized `Vec<Entry>`, where `Entry` is `{ id: Uuid, title, username, password, url, notes }`.
- Atomic write: write to `vault.bin.tmp`, fsync, rename to `vault.bin`. Never read-then-rewrite the live file in place.

### Tauri commands (IPC surface)
- `vault_exists() -> bool`
- `create_vault(master_password, hint: Option<String>) -> Result<()>` — derives key, generates salt + nonce, writes initial empty vault.
- `unlock(master_password) -> Result<Vec<Entry>>` — verifies header, derives key, decrypts, returns entries. On success, Rust holds the key in a `Zeroizing` buffer for the session.
- `lock()` — zeroizes the key, drops the in-memory vault.
- `save_entries(entries: Vec<Entry>) -> Result<()>` — encrypts and atomically writes the file.
- `generate_password(length: u8, classes: PasswordClasses) -> String` — CSPRNG-based generator. Pure function, no state.
- `evaluate_strength(password: String) -> StrengthLabel` — local entropy estimate, qualitative label.
- `is_locked() -> bool` — drives auto-lock UI; not used as a security boundary.

The master password and derived key are never returned to the frontend.

### Session behavior
- Auto-lock: 15-minute inactivity timer in the frontend (reset on pointer, key, focus, mutation events).
- Lock on window close: `WindowEvent::CloseRequested` triggers a `lock()` command and an immediate `event.prevent_default()` is not used — the app is allowed to close after locking.
- Lock on `Cmd/Ctrl+L` and on File → Lock.
- Clipboard auto-clear: set a 20s `setTimeout`, then write an empty string back if the clipboard still contains the value we put there.
- Reveal auto-hide: 15s timer started on reveal click; cleared on manual hide or navigation.

### UI & styling
- React + TypeScript + Vite + Tailwind.
- System font stack; no web font requests.
- Light/dark via `prefers-color-scheme` and a single `dark` class toggle.
- Inline SVG icon set (~10 icons), hand-rolled as React components.
- Routing: a single `useState` route or `react-router` with three routes; route is gated by `vault_exists` + `unlocked` state.
- Empty-state copy and microcopy are minimal and never include emojis.

### Security & sandboxing
- `tauri.conf.json`: zero capabilities beyond the default IPC, no `withGlobalTauri`, no plugins enabled in v1.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`.
- `app.windows[0]`: no `titleBarStyle: 'transparent'` trickery, no `visible: false` shortcuts. Devtools disabled in release.

### Dev tooling
- Frontend: Vite, ESLint (`typescript-eslint`), Prettier.
- Rust: `cargo fmt`, `cargo clippy --all-targets -- -D warnings`, `cargo test`.
- Root `package.json` scripts: `dev` (Vite), `tauri` (delegates to `@tauri-apps/cli`), `lint`, `format`, `test`.
- Project layout:
  - `src-tauri/` — Rust crate, `src/main.rs`, `src/lib.rs`, `Cargo.toml`, `tauri.conf.json`, `build.rs`, `icons/`.
  - `src/` — React app, `main.tsx`, `App.tsx`, `routes/`, `components/`, `lib/`, `index.html`.
  - Root: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `README.md`.

## Testing Decisions

A good test asserts external behavior, not internal implementation. For crypto, the seam is the file format: write a vault, read it back, check round-trip. For UI, the seam is the rendered component: feed it state, assert what it shows.

- Rust unit tests in `vault-core::crypto` (and I/O helpers):
  - Round-trip: create vault with password A, unlock with A, entries match.
  - Wrong password: unlock with B returns `Err`, does not panic, does not leak plaintext.
  - Tampered ciphertext: flip a byte in the ciphertext; unlock returns `Err(Authentication)`.
  - Tampered header: change the version byte or Argon2 params; unlock returns `Err`.
  - Atomic write: simulate a crash between write-tmp and rename; on next launch, the old file is intact.
  - `generate_password`: deterministic length, only characters from enabled classes, no `must include` bias.
  - Argon2 parameters round-trip: write with one set, read with the same set, succeed.
- Frontend component tests (Vitest + React Testing Library):
  - Login form: shows the error label on submit-with-wrong-password, clears it on next input.
  - Entry list: filters by substring across title/username/url/notes; renders the empty state when the vault is empty.
  - Strength meter: maps a known set of passwords to the expected qualitative label.
  - Auto-lock timer: fake timers advance 15 minutes without activity, the app routes back to Login and the in-memory entries are cleared.
- Manual E2E: register, add 3 entries, lock, unlock, edit, delete, copy-with-auto-clear, reveal-with-auto-hide, restart app, verify state.

## Out of Scope

- Cloud sync, multi-device, multi-user, sharing.
- Browser extension and form autofill.
- Two-factor authentication, passkeys/WebAuthn, hardware key wrapping (TPM/Secure Enclave).
- Import / export of any kind, including CSV or other password-manager formats.
- Tray icon, global shortcuts, multi-window, quick-pick popup.
- TOTP / one-time-password generation and storage.
- Attachments, file uploads, custom fields beyond the v1 schema.
- Live-system threat defense (anti-debug, anti-memory-scrap, mlock, constant-time everywhere).
- Custom themes, icon packs, plugin system.
- Mobile (iOS/Android) builds.

## Further Notes

- File format includes an explicit version byte from day one so future migrations (Argon2 parameter bumps, additional entry fields) can be handled in Rust without breaking existing vaults.
- The hint field, if provided, is encrypted with the rest of the vault. It is the user's choice whether to keep a hint at all, and the app surfaces a warning that the hint is stored alongside the vault file.
- The README should state the threat model in plain language: "If someone copies the vault file, they cannot read it without your master password. If someone has access to your computer while the app is unlocked, all bets are off."
- All decisions in this PRD are based on the pre-implementation design interview and were each answered with the recommended option unless noted.
