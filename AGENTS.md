# password-manager — Step-by-Step Development Plan

**Source:** [PRD.md](./PRD.md)  
**Version:** 1.0  
**Date:** June 14, 2026

This document breaks the PRD into ordered, implementable steps. Complete each step in sequence unless noted. Check off items as you go.

---

## How to use this plan

1. Work through **Phase 1** entirely before starting Phase 2.
2. Each step lists **tasks**, **files**, **acceptance criteria**, and **PRD references**.
3. Run the app (`npm run tauri dev`) after every step to verify nothing is broken.
4. Do not skip security steps (Steps 3–5); they underpin everything else.

---

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Rust toolchain installed (`rustup`)
- [ ] Platform dependencies for Tauri ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))
- [ ] Repo cloned and terminal open at project root

---

## Phase 1 — Foundation (MVP)

### Step 1: Scaffold the Tauri + React project

**Goal:** Empty desktop app launches with React frontend.

**Tasks**
- [ ] Run `npm create tauri-app@latest` (or equivalent) with React + TypeScript + Vite
- [ ] Confirm project name / app identifier (e.g. `com.securevault.app`)
- [ ] Set minimum window size to 900×600 in `tauri.conf.json`
- [ ] Install Tailwind CSS and configure for Vite
- [ ] Install React Router
- [ ] Add Inter font (or system-ui stack) in global CSS
- [ ] Define CSS variables for PRD palette:
  - Background `#FAFAFA`
  - Text `#1A1A1A`
  - Accent `#6366F1`

**Files to create / edit**
```
package.json
vite.config.ts
tailwind.config.js
src/index.css
src/App.tsx
src-tauri/tauri.conf.json
src-tauri/Cargo.toml
```

**Acceptance criteria**
- [ ] `npm run tauri dev` opens a window
- [ ] Tailwind utility classes render correctly
- [ ] Window respects minimum size

**PRD refs:** §9.1, §10.2, §10.4, Appendix B

---

### Step 2: App routing and layout shell

**Goal:** Navigate between placeholder pages with shared layout.

**Tasks**
- [ ] Install React Router
- [ ] Create route structure:
  - `/` → redirect based on vault state (placeholder for now)
  - `/register` → Register page
  - `/login` → Login page
  - `/vault` → Vault page (protected placeholder)
- [ ] Create `AuthLayout` — centered card, max-width ~400px
- [ ] Create `VaultLayout` — full-height shell with header slot
- [ ] Add placeholder content to each page

**Files to create**
```
src/pages/Register.tsx
src/pages/Login.tsx
src/pages/Vault.tsx
src/layouts/AuthLayout.tsx
src/layouts/VaultLayout.tsx
src/App.tsx          (routes)
```

**Acceptance criteria**
- [ ] Can navigate manually to `/register`, `/login`, `/vault`
- [ ] Auth pages use centered card layout
- [ ] Vault page uses full-width layout

**PRD refs:** §10.3, US-01–US-03 (structure only)

---

### Step 3: Rust crypto module

**Goal:** Reusable encryption primitives; no UI yet.

**Tasks**
- [ ] Add crates to `src-tauri/Cargo.toml`:
  - `argon2`, `aes-gcm`, `serde`, `serde_json`, `rand`, `base64`, `uuid`, `chrono`
- [ ] Create `crypto.rs` with:
  - `derive_key(password, salt) -> [u8; 32]` using Argon2id
  - `encrypt(key, plaintext) -> (nonce, ciphertext)`
  - `decrypt(key, nonce, ciphertext) -> Result<Vec<u8>>`
- [ ] Write unit tests:
  - Encrypt → decrypt roundtrip
  - Wrong key fails decryption
  - Same plaintext produces different ciphertext (random nonce)

**Files to create**
```
src-tauri/src/crypto.rs
src-tauri/src/lib.rs   (mod crypto)
```

**Acceptance criteria**
- [ ] `cargo test` passes in `src-tauri`
- [ ] No custom crypto algorithms — only audited crates
- [ ] Keys and passwords never logged

**PRD refs:** §7.1, §7.3, Appendix A

---

### Step 4: Vault file format and persistence

**Goal:** Read/write encrypted `vault.enc` on disk.

**Tasks**
- [ ] Define Rust types:
  - `EncryptedVaultFile` (version, salt, nonce, ciphertext, timestamps)
  - `VaultPayload` (entries array)
  - `Credential` (id, title, username, password, url, notes, created_at, updated_at)
- [ ] Create `vault.rs` with:
  - `vault_path()` → app data directory + `vault.enc`
  - `vault_exists() -> bool`
  - `create_vault(password) -> Result<()>` — empty entries, write file
  - `unlock_vault(password) -> Result<VaultPayload>`
  - `save_vault(payload) -> Result<()>` — re-encrypt and write (needs in-memory session key)
- [ ] Store decrypted payload + derived key in `AppState` (mutex-protected)

**Files to create**
```
src-tauri/src/vault.rs
src-tauri/src/models.rs
src-tauri/src/state.rs
```

**Acceptance criteria**
- [ ] `vault.enc` created in OS app data dir after `create_vault`
- [ ] File on disk contains no plaintext passwords (inspect manually)
- [ ] Wrong password returns error on unlock
- [ ] Correct password returns empty entries array for new vault

**PRD refs:** §7.2, §8, §6.4

---

### Step 5: Tauri IPC commands (auth + vault CRUD)

**Goal:** Frontend can call Rust for all vault operations.

**Tasks**
- [ ] Register Tauri commands in `lib.rs` / `commands.rs`:

| Command | Implementation |
|---------|----------------|
| `vault_exists` | Call `vault::vault_exists()` |
| `register` | Validate no vault; `create_vault`; set session state |
| `login` | `unlock_vault`; set session state |
| `logout` | Clear session state (zeroize key best-effort) |
| `list_entries` | Return entries from session (error if locked) |
| `create_entry` | Add entry with UUID + timestamps; persist |
| `update_entry` | Update by id; persist |
| `delete_entry` | Remove by id; persist |

- [ ] Return typed errors to frontend (e.g. `VaultLocked`, `VaultExists`, `InvalidPassword`, `NotFound`)
- [ ] Serialize `Credential` for IPC (serde)

**Files to create**
```
src-tauri/src/commands.rs
src-tauri/src/error.rs
src-tauri/src/lib.rs   (register commands + manage state)
```

**Acceptance criteria**
- [ ] All commands callable from a temporary test button or `curl`/dev console
- [ ] CRUD persists across app restart after login
- [ ] Commands fail gracefully when vault is locked

**PRD refs:** §9.3, US-04, US-07, US-09

---

### Step 6: Frontend API layer

**Goal:** Typed TypeScript wrappers for every Tauri command.

**Tasks**
- [ ] Create `src/lib/tauri.ts` with `invoke` wrappers:
  - `vaultExists()`, `register(password)`, `login(password)`, `logout()`
  - `listEntries()`, `createEntry(input)`, `updateEntry(entry)`, `deleteEntry(id)`
- [ ] Define TypeScript types matching Rust `Credential` model
- [ ] Create `AuthContext` (or Zustand store):
  - `isAuthenticated`, `login`, `logout`, `register`
- [ ] Add route guard: redirect to `/login` if not authenticated

**Files to create**
```
src/lib/tauri.ts
src/types/credential.ts
src/context/AuthContext.tsx
src/components/ProtectedRoute.tsx
```

**Acceptance criteria**
- [ ] TypeScript types match backend responses
- [ ] Unauthenticated users cannot reach `/vault`
- [ ] Auth state clears on logout

**PRD refs:** §9.1, §9.3, US-03

---

### Step 7: Registration page

**Goal:** New users can create a vault.

**Tasks**
- [ ] Build form: master password, confirm password
- [ ] Client-side validation:
  - Min 12 characters
  - Passwords match
- [ ] Password strength indicator (weak / fair / strong)
- [ ] On mount: call `vaultExists()` — redirect to `/login` if vault exists
- [ ] On submit: call `register()` → navigate to `/vault`
- [ ] Show error if vault already exists
- [ ] Warning copy: master password cannot be recovered

**Files to edit**
```
src/pages/Register.tsx
src/components/PasswordInput.tsx
src/components/PasswordStrength.tsx
src/components/ui/Button.tsx
src/components/ui/Input.tsx
```

**Acceptance criteria**
- [ ] Registration creates vault and lands on vault page
- [ ] Second registration attempt blocked
- [ ] Validation errors shown inline

**PRD refs:** §6.1, US-01

---

### Step 8: Login page

**Goal:** Returning users unlock the vault.

**Tasks**
- [ ] Build form: master password field
- [ ] Add show/hide password toggle
- [ ] On mount: call `vaultExists()` — redirect to `/register` if no vault
- [ ] On submit: call `login()` → navigate to `/vault`
- [ ] On failure: show "Incorrect master password" (generic message)
- [ ] Footer link to registration (only if no vault — or hide when vault exists)

**Files to edit**
```
src/pages/Login.tsx
src/pages/Register.tsx   (cross-links)
```

**Acceptance criteria**
- [ ] Correct password unlocks vault
- [ ] Wrong password shows error, no data leaked
- [ ] App entry route sends user to login or register correctly

**PRD refs:** §6.2, US-02

---

### Step 9: Vault page — list and empty state

**Goal:** Display saved credentials after login.

**Tasks**
- [ ] Header: app name, logout button
- [ ] Fetch entries on mount via `listEntries()`
- [ ] Render credential cards: title, username, truncated URL
- [ ] Empty state: message + "Add your first password" CTA
- [ ] Logout button calls `logout()` → redirect to `/login`
- [ ] Loading and error states

**Files to create**
```
src/pages/Vault.tsx
src/components/CredentialCard.tsx
src/components/VaultHeader.tsx
src/components/EmptyState.tsx
```

**Acceptance criteria**
- [ ] Entries from backend display in list
- [ ] Empty vault shows empty state
- [ ] Logout locks vault and returns to login

**PRD refs:** §6.3, §10.3, US-03, US-05 (list only)

---

### Step 10: Add credential flow

**Goal:** Users can save a new password entry.

**Tasks**
- [ ] "Add entry" opens modal or slide-over panel
- [ ] Form fields: title (required), username, password (required), URL, notes
- [ ] Password field masked by default with reveal toggle
- [ ] Submit calls `createEntry()` → refresh list → close modal
- [ ] Cancel dismisses without saving
- [ ] Basic field validation (title + password required)

**Files to create**
```
src/components/EntryForm.tsx
src/components/EntryModal.tsx
```

**Acceptance criteria**
- [ ] New entry appears in list immediately after save
- [ ] Entry persists after logout/login
- [ ] Password hidden by default

**PRD refs:** §6.3, US-04, US-10

---

### Step 11: View and delete credential

**Goal:** Users can inspect and remove entries.

**Tasks**
- [ ] Clicking a card opens detail view (modal or side panel)
- [ ] Show all fields; password masked with reveal toggle
- [ ] Delete button with confirmation dialog ("Delete this entry?")
- [ ] Delete calls `deleteEntry(id)` → refresh list → close detail

**Files to create**
```
src/components/EntryDetail.tsx
src/components/ConfirmDialog.tsx
```

**Acceptance criteria**
- [ ] Detail shows correct entry data
- [ ] Delete removes entry from list and disk
- [ ] Cancel on confirm dialog keeps entry

**PRD refs:** §6.3, US-07

---

### Step 12: Phase 1 checkpoint

**Goal:** Verify MVP is complete before polish.

**Manual test checklist**
- [ ] Fresh install → register → add entry → logout → login → entry still there
- [ ] Wrong login password rejected
- [ ] `vault.enc` on disk is not human-readable
- [ ] App builds: `npm run tauri build`
- [ ] Minimum window size enforced
- [ ] UI matches minimalist direction (spacing, palette, typography)

**PRD refs:** §11, §12 Phase 1

---

## Phase 2 — Polish

### Step 13: Edit credential

**Goal:** Users can update existing entries.

**Tasks**
- [ ] Add "Edit" action on entry detail
- [ ] Reuse `EntryForm` in edit mode (pre-filled fields)
- [ ] Submit calls `updateEntry()` with updated `updated_at`
- [ ] List and detail reflect changes immediately

**Acceptance criteria**
- [ ] Edited fields persist after re-login
- [ ] `updated_at` changes on save

**PRD refs:** US-07

---

### Step 14: Search/filter entries

**Goal:** Find credentials quickly in a growing list.

**Tasks**
- [ ] Add search input to vault header
- [ ] Filter client-side by title, username, URL (case-insensitive)
- [ ] Show "No results" when filter matches nothing
- [ ] Clear search restores full list

**Files to edit**
```
src/components/VaultHeader.tsx
src/pages/Vault.tsx
```

**Acceptance criteria**
- [ ] Search filters in real time as user types
- [ ] Partial matches work

**PRD refs:** §6.3, US-05

---

### Step 15: Password generator

**Goal:** Generate strong passwords when creating/editing entries.

**Tasks**
- [ ] Add Rust command `generate_password(length: u8) -> String`
  - Charset: upper, lower, digits, symbols
  - Length clamped 12–64
  - Use `rand` crate
- [ ] Add TypeScript wrapper `generatePassword(length)`
- [ ] "Generate" button on password field in `EntryForm`
- [ ] Optional: length slider (default 16)

**Files to edit**
```
src-tauri/src/commands.rs
src/lib/tauri.ts
src/components/EntryForm.tsx
```

**Acceptance criteria**
- [ ] Generated password meets length bounds
- [ ] Each click produces a new random password
- [ ] User can still type a password manually

**PRD refs:** §9.3, US-08

---

### Step 16: Copy to clipboard

**Goal:** One-click copy for username and password.

**Tasks**
- [ ] Add `tauri-plugin-clipboard-manager` to Tauri project
- [ ] Add Rust command `copy_to_clipboard(text)`
- [ ] Copy buttons on entry detail (username, password)
- [ ] Brief toast/snackbar: "Copied to clipboard"

**Files to create**
```
src/components/Toast.tsx
src/hooks/useToast.ts
```

**Acceptance criteria**
- [ ] Username and password copy correctly
- [ ] User gets visual feedback on copy

**PRD refs:** §9.3, US-06

---

### Step 17: UI refinement

**Goal:** Polished, cohesive minimalist experience.

**Tasks**
- [ ] Consistent button, input, card components
- [ ] Focus rings for keyboard navigation (WCAG)
- [ ] Transitions on modal open/close (150–200ms)
- [ ] Improved error states (inline + form-level)
- [ ] Loading spinners on async actions
- [ ] Wider layout: list + detail split on large windows
- [ ] App wordmark / logo in auth pages

**Acceptance criteria**
- [ ] All screens feel visually consistent
- [ ] Tab navigation works on forms
- [ ] No layout shift on common actions

**PRD refs:** §10.1, §10.2, §10.3, §10.4

---

### Step 18: Phase 2 checkpoint

**Manual test checklist**
- [ ] Search, edit, generate, copy all work together
- [ ] Registration → first entry in under 2 minutes
- [ ] Login → vault visible in under 3 seconds
- [ ] Cold start feels snappy on dev build

**PRD refs:** §11, §12 Phase 2

---

## Phase 3 — Nice-to-have (optional)

### Step 19: Dark mode

**Tasks**
- [ ] CSS variables for light/dark themes
- [ ] Toggle in vault header
- [ ] Persist preference in `config.json` (non-sensitive)

**PRD refs:** §10.2, §8

---

### Step 20: Clipboard auto-clear

**Tasks**
- [ ] After copy, schedule clipboard clear after 30 seconds
- [ ] Optional setting to enable/disable

**PRD refs:** §7.3

---

### Step 21: Encrypted backup export

**Tasks**
- [ ] Command to copy `vault.enc` to user-chosen path
- [ ] UI: Settings → Export backup

**PRD refs:** §12 Phase 3

---

### Step 22: Keyboard shortcuts

**Tasks**
- [ ] `Cmd/Ctrl+N` → open add entry modal
- [ ] `Cmd/Ctrl+F` → focus search
- [ ] `Escape` → close modal

**PRD refs:** §12 Phase 3

---

### Step 23: Auto-lock on idle (optional)

**Tasks**
- [ ] Track last activity timestamp in frontend
- [ ] After N minutes idle, call `logout()` automatically
- [ ] Configurable timeout in settings (default: 15 min)

**PRD refs:** §14 Open Question 3

---

## Definition of done (full v1)

- [ ] All Phase 1 and Phase 2 steps complete
- [ ] All user stories US-01 through US-10 satisfied
- [ ] No plaintext secrets on disk
- [ ] `npm run tauri build` succeeds
- [ ] Tested on macOS; ideally one additional OS
- [ ] README updated with build/run instructions

---

## Step dependency map

```
Step 1 (scaffold)
  └─► Step 2 (routing)
        └─► Step 6 (frontend API) ◄── Step 5 (IPC) ◄── Step 4 (vault) ◄── Step 3 (crypto)
              ├─► Step 7 (register)
              ├─► Step 8 (login)
              └─► Step 9 (vault list)
                    ├─► Step 10 (add)
                    └─► Step 11 (view/delete)
                          └─► Step 12 (checkpoint)
                                └─► Steps 13–18 (polish)
                                      └─► Steps 19–23 (optional)
```

---

## Quick reference: PRD user story → step

| Story | Step(s) |
|-------|---------|
| US-01 Registration | 7 |
| US-02 Login | 8 |
| US-03 Logout | 6, 9 |
| US-04 Add credential | 10 |
| US-05 Searchable list | 9, 14 |
| US-06 Copy to clipboard | 16 |
| US-07 Edit/delete | 11, 13 |
| US-08 Password generator | 15 |
| US-09 Encryption at rest | 3, 4, 5 |
| US-10 Masked passwords | 10, 11 |

---

*End of document*
