use crate::crypto::{
    self, decrypt, derive_key, encrypt, evaluate_strength, generate_nonce, generate_password,
    generate_salt, Argon2Params,
};
use crate::error::VaultError;
use crate::model::{Entry, PasswordClasses, StrengthLabel, VaultPayload};
use crate::vault_io::{self, VaultFile, VERSION};
use parking_lot::Mutex;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use zeroize::Zeroizing;

pub struct AppState {
    pub session: Mutex<Option<SessionState>>,
}

pub struct SessionState {
    key: Zeroizing<[u8; crypto::KEY_LEN]>,
    argon2_params: Argon2Params,
    salt: [u8; crypto::SALT_LEN],
    nonce: [u8; crypto::NONCE_LEN],
    hint: Option<String>,
    entries: Vec<Entry>,
}

fn vault_path(app: &AppHandle) -> Result<PathBuf, VaultError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| VaultError::Io(std::io::Error::other(err.to_string())))?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("vault.bin"))
}

fn encrypt_payload(
    key: &[u8],
    hint: &Option<String>,
    entries: &[Entry],
) -> Result<(Vec<u8>, [u8; crypto::NONCE_LEN]), VaultError> {
    let payload = VaultPayload {
        hint: hint.clone(),
        entries: entries.to_vec(),
    };
    let plaintext =
        serde_json::to_vec(&payload).map_err(|err| VaultError::Crypto(err.to_string()))?;
    let nonce = generate_nonce();
    let ciphertext = encrypt(key, &nonce, &plaintext)?;
    Ok((ciphertext, nonce))
}

fn decrypt_payload(
    key: &[u8],
    nonce: &[u8; crypto::NONCE_LEN],
    ciphertext: &[u8],
) -> Result<VaultPayload, VaultError> {
    let plaintext = decrypt(key, nonce, ciphertext)?;
    serde_json::from_slice(plaintext.as_ref()).map_err(|_| VaultError::Corrupted)
}

#[tauri::command]
pub fn vault_exists(app: AppHandle) -> Result<bool, VaultError> {
    Ok(vault_path(&app)?.exists())
}

#[tauri::command]
pub fn create_vault(
    app: AppHandle,
    state: State<'_, AppState>,
    master_password: String,
    hint: Option<String>,
) -> Result<(), VaultError> {
    let path = vault_path(&app)?;
    if path.exists() {
        return Err(VaultError::AlreadyExists);
    }

    let salt = generate_salt();
    let params = Argon2Params::default();
    let key = derive_key(&master_password, &salt, &params)?;
    let (ciphertext, nonce) = encrypt_payload(key.as_ref(), &hint, &[])?;

    let vault = VaultFile {
        version: VERSION,
        argon2_params: params,
        salt,
        nonce,
        ciphertext,
    };
    vault_io::save_vault(&path, &vault)?;

    let mut session = state.session.lock();
    *session = Some(SessionState {
        key,
        argon2_params: vault.argon2_params,
        salt: vault.salt,
        nonce: vault.nonce,
        hint,
        entries: Vec::new(),
    });

    Ok(())
}

#[tauri::command]
pub fn unlock(
    app: AppHandle,
    state: State<'_, AppState>,
    master_password: String,
) -> Result<Vec<Entry>, VaultError> {
    let path = vault_path(&app)?;
    if !path.exists() {
        return Err(VaultError::NotFound);
    }

    let vault = vault_io::load_vault(&path)?;
    let key = derive_key(&master_password, &vault.salt, &vault.argon2_params)?;
    let payload = decrypt_payload(key.as_ref(), &vault.nonce, &vault.ciphertext)?;

    let mut session = state.session.lock();
    *session = Some(SessionState {
        key,
        argon2_params: vault.argon2_params,
        salt: vault.salt,
        nonce: vault.nonce,
        hint: payload.hint.clone(),
        entries: payload.entries.clone(),
    });

    Ok(payload.entries)
}

#[tauri::command]
pub fn lock(state: State<'_, AppState>) -> Result<(), VaultError> {
    let mut session = state.session.lock();
    *session = None;
    Ok(())
}

#[tauri::command]
pub fn save_entries(
    app: AppHandle,
    state: State<'_, AppState>,
    entries: Vec<Entry>,
) -> Result<(), VaultError> {
    let path = vault_path(&app)?;
    let mut session = state.session.lock();
    let session = session.as_mut().ok_or(VaultError::Locked)?;

    let (ciphertext, nonce) = encrypt_payload(session.key.as_ref(), &session.hint, &entries)?;

    let vault = VaultFile {
        version: VERSION,
        argon2_params: session.argon2_params,
        salt: session.salt,
        nonce,
        ciphertext,
    };
    vault_io::save_vault(&path, &vault)?;

    session.nonce = vault.nonce;
    session.entries = entries;
    Ok(())
}

#[tauri::command]
pub fn generate_password_command(
    length: u8,
    classes: PasswordClasses,
) -> Result<String, VaultError> {
    generate_password(length, &classes)
}

#[tauri::command]
pub fn evaluate_strength_command(password: String) -> StrengthLabel {
    evaluate_strength(&password)
}

#[tauri::command]
pub fn is_locked(state: State<'_, AppState>) -> bool {
    state.session.lock().is_none()
}
