use crate::crypto::{Argon2Params, NONCE_LEN, SALT_LEN};
use crate::error::VaultError;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

pub const MAGIC: &[u8; 6] = b"VAULT1";
pub const VERSION: u8 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VaultFile {
    pub version: u8,
    pub argon2_params: Argon2Params,
    pub salt: [u8; SALT_LEN],
    pub nonce: [u8; NONCE_LEN],
    pub ciphertext: Vec<u8>,
}

pub fn serialize_vault_file(vault: &VaultFile) -> Vec<u8> {
    let mut bytes = Vec::new();
    bytes.extend_from_slice(MAGIC);
    bytes.push(vault.version);
    bytes.extend_from_slice(&vault.argon2_params.m_cost.to_le_bytes());
    bytes.extend_from_slice(&vault.argon2_params.t_cost.to_le_bytes());
    bytes.extend_from_slice(&vault.argon2_params.p_cost.to_le_bytes());
    bytes.extend_from_slice(&vault.salt);
    bytes.extend_from_slice(&vault.nonce);
    bytes.extend_from_slice(&vault.ciphertext);
    bytes
}

pub fn parse_vault_file(bytes: &[u8]) -> Result<VaultFile, VaultError> {
    let min_len = MAGIC.len() + 1 + 12 + SALT_LEN + NONCE_LEN + 16;
    if bytes.len() < min_len {
        return Err(VaultError::Corrupted);
    }

    if &bytes[..MAGIC.len()] != MAGIC {
        return Err(VaultError::Corrupted);
    }

    let version = bytes[MAGIC.len()];
    if version != VERSION {
        return Err(VaultError::Corrupted);
    }

    let mut offset = MAGIC.len() + 1;
    let read_u32 = |bytes: &[u8], offset: &mut usize| -> Result<u32, VaultError> {
        if *offset + 4 > bytes.len() {
            return Err(VaultError::Corrupted);
        }
        let value = u32::from_le_bytes(bytes[*offset..*offset + 4].try_into().unwrap());
        *offset += 4;
        Ok(value)
    };

    let argon2_params = Argon2Params {
        m_cost: read_u32(bytes, &mut offset)?,
        t_cost: read_u32(bytes, &mut offset)?,
        p_cost: read_u32(bytes, &mut offset)?,
    };

    if offset + SALT_LEN + NONCE_LEN > bytes.len() {
        return Err(VaultError::Corrupted);
    }

    let mut salt = [0u8; SALT_LEN];
    salt.copy_from_slice(&bytes[offset..offset + SALT_LEN]);
    offset += SALT_LEN;

    let mut nonce = [0u8; NONCE_LEN];
    nonce.copy_from_slice(&bytes[offset..offset + NONCE_LEN]);
    offset += NONCE_LEN;

    let ciphertext = bytes[offset..].to_vec();
    if ciphertext.is_empty() {
        return Err(VaultError::Corrupted);
    }

    Ok(VaultFile {
        version,
        argon2_params,
        salt,
        nonce,
        ciphertext,
    })
}

pub fn save_vault(path: &Path, vault: &VaultFile) -> Result<(), VaultError> {
    let tmp_path = tmp_path_for(path);
    let bytes = serialize_vault_file(vault);

    {
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&tmp_path)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
    }

    if path.exists() {
        fs::rename(&tmp_path, path)?;
    } else if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
        fs::rename(&tmp_path, path)?;
    } else {
        fs::rename(&tmp_path, path)?;
    }

    Ok(())
}

pub fn load_vault(path: &Path) -> Result<VaultFile, VaultError> {
    let mut file = File::open(path)?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)?;
    parse_vault_file(&bytes)
}

fn tmp_path_for(path: &Path) -> PathBuf {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("vault.bin");
    path.with_file_name(format!("{file_name}.tmp"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::{decrypt, derive_key, encrypt, generate_nonce, generate_salt};
    use tempfile::tempdir;

    #[test]
    fn round_trip_file_format() {
        let salt = generate_salt();
        let nonce = generate_nonce();
        let params = Argon2Params::default();
        let key = derive_key("password", &salt, &params).unwrap();
        let ciphertext = encrypt(key.as_ref(), &nonce, b"payload").unwrap();
        let vault = VaultFile {
            version: VERSION,
            argon2_params: params,
            salt,
            nonce,
            ciphertext,
        };

        let bytes = serialize_vault_file(&vault);
        let parsed = parse_vault_file(&bytes).unwrap();
        assert_eq!(parsed, vault);
        let decrypted = decrypt(key.as_ref(), &parsed.nonce, &parsed.ciphertext).unwrap();
        assert_eq!(&decrypted[..], b"payload");
    }

    #[test]
    fn tampered_header_fails_parse() {
        let salt = generate_salt();
        let nonce = generate_nonce();
        let vault = VaultFile {
            version: VERSION,
            argon2_params: Argon2Params::default(),
            salt,
            nonce,
            ciphertext: vec![1, 2, 3, 4],
        };
        let mut bytes = serialize_vault_file(&vault);
        bytes[0] ^= 0xFF;
        assert!(matches!(
            parse_vault_file(&bytes),
            Err(VaultError::Corrupted)
        ));
    }

    #[test]
    fn atomic_write_keeps_old_file_on_failed_rename() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("vault.bin");
        let original = VaultFile {
            version: VERSION,
            argon2_params: Argon2Params::default(),
            salt: generate_salt(),
            nonce: generate_nonce(),
            ciphertext: vec![9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
        };
        save_vault(&path, &original).unwrap();

        let tmp_path = tmp_path_for(&path);
        std::fs::write(&tmp_path, b"partial write").unwrap();
        let _ = std::fs::remove_file(&path);

        let loaded = load_vault(&path);
        assert!(loaded.is_err());
        assert!(tmp_path.exists());
    }
}
