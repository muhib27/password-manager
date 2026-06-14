use crate::error::VaultError;
use crate::model::{PasswordClasses, StrengthLabel};
use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Nonce};
use rand::RngCore;
use zeroize::{Zeroize, Zeroizing};

pub const SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 12;
pub const KEY_LEN: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Argon2Params {
    pub m_cost: u32,
    pub t_cost: u32,
    pub p_cost: u32,
}

impl Default for Argon2Params {
    fn default() -> Self {
        Self {
            m_cost: 65536,
            t_cost: 3,
            p_cost: 1,
        }
    }
}

pub fn generate_salt() -> [u8; SALT_LEN] {
    let mut salt = [0u8; SALT_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    salt
}

pub fn generate_nonce() -> [u8; NONCE_LEN] {
    let mut nonce = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce);
    nonce
}

pub fn derive_key(
    password: &str,
    salt: &[u8],
    params: &Argon2Params,
) -> Result<Zeroizing<[u8; KEY_LEN]>, VaultError> {
    let argon_params = Params::new(params.m_cost, params.t_cost, params.p_cost, Some(KEY_LEN))
        .map_err(|err| VaultError::Crypto(err.to_string()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, argon_params);

    let mut key = Zeroizing::new([0u8; KEY_LEN]);
    argon2
        .hash_password_into(password.as_bytes(), salt, key.as_mut())
        .map_err(|err| VaultError::Crypto(err.to_string()))?;

    Ok(key)
}

pub fn encrypt(
    key: &[u8],
    nonce: &[u8; NONCE_LEN],
    plaintext: &[u8],
) -> Result<Vec<u8>, VaultError> {
    if key.len() != KEY_LEN {
        return Err(VaultError::Crypto("invalid key length".to_string()));
    }
    let cipher =
        ChaCha20Poly1305::new_from_slice(key).map_err(|err| VaultError::Crypto(err.to_string()))?;
    let nonce = Nonce::from_slice(nonce);
    cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| VaultError::Corrupted)
}

pub fn decrypt(
    key: &[u8],
    nonce: &[u8; NONCE_LEN],
    ciphertext: &[u8],
) -> Result<Zeroizing<Vec<u8>>, VaultError> {
    if key.len() != KEY_LEN {
        return Err(VaultError::Crypto("invalid key length".to_string()));
    }
    let cipher =
        ChaCha20Poly1305::new_from_slice(key).map_err(|err| VaultError::Crypto(err.to_string()))?;
    let nonce = Nonce::from_slice(nonce);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| VaultError::WrongPassword)?;

    Ok(Zeroizing::new(plaintext))
}

pub fn generate_password(length: u8, classes: &PasswordClasses) -> Result<String, VaultError> {
    if length == 0 {
        return Err(VaultError::InvalidGeneratorOptions);
    }

    let mut pools: Vec<&[u8]> = Vec::new();
    if classes.lowercase {
        pools.push(b"abcdefghijklmnopqrstuvwxyz");
    }
    if classes.uppercase {
        pools.push(b"ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if classes.digits {
        pools.push(b"0123456789");
    }
    if classes.symbols {
        pools.push(b"!@#$%^&*()-_=+[]{}|;:,.<>?");
    }

    if pools.is_empty() {
        return Err(VaultError::InvalidGeneratorOptions);
    }

    let mut rng = rand::thread_rng();
    let mut password = Vec::with_capacity(length as usize);
    let mut all_chars: Vec<u8> = pools.iter().flat_map(|pool| pool.iter().copied()).collect();

    for pool in &pools {
        let idx = (rng.next_u32() as usize) % pool.len();
        password.push(pool[idx]);
    }

    while password.len() < length as usize {
        let idx = (rng.next_u32() as usize) % all_chars.len();
        password.push(all_chars[idx]);
    }

    for i in (1..password.len()).rev() {
        let j = (rng.next_u32() as usize) % (i + 1);
        password.swap(i, j);
    }

    all_chars.zeroize();
    String::from_utf8(password).map_err(|err| VaultError::Crypto(err.to_string()))
}

pub fn evaluate_strength(password: &str) -> StrengthLabel {
    let len = password.chars().count();
    let mut score = 0i32;

    if len >= 8 {
        score += 1;
    }
    if len >= 12 {
        score += 1;
    }
    if len >= 16 {
        score += 1;
    }
    if password.chars().any(|c| c.is_ascii_lowercase()) {
        score += 1;
    }
    if password.chars().any(|c| c.is_ascii_uppercase()) {
        score += 1;
    }
    if password.chars().any(|c| c.is_ascii_digit()) {
        score += 1;
    }
    if password.chars().any(|c| !c.is_ascii_alphanumeric()) {
        score += 1;
    }

    match score {
        0..=2 => StrengthLabel::Weak,
        3..=4 => StrengthLabel::Fair,
        5..=6 => StrengthLabel::Strong,
        _ => StrengthLabel::Excellent,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_encrypt_decrypt() {
        let salt = generate_salt();
        let nonce = generate_nonce();
        let params = Argon2Params::default();
        let key = derive_key("correct horse battery staple", &salt, &params).unwrap();
        let plaintext = b"secret payload";
        let ciphertext = encrypt(key.as_ref(), &nonce, plaintext).unwrap();
        let decrypted = decrypt(key.as_ref(), &nonce, &ciphertext).unwrap();
        assert_eq!(&decrypted[..], plaintext);
    }

    #[test]
    fn wrong_password_fails_decrypt() {
        let salt = generate_salt();
        let nonce = generate_nonce();
        let params = Argon2Params::default();
        let key = derive_key("password one", &salt, &params).unwrap();
        let wrong_key = derive_key("password two", &salt, &params).unwrap();
        let ciphertext = encrypt(key.as_ref(), &nonce, b"payload").unwrap();
        assert!(matches!(
            decrypt(wrong_key.as_ref(), &nonce, &ciphertext),
            Err(VaultError::WrongPassword)
        ));
    }

    #[test]
    fn tampered_ciphertext_fails_decrypt() {
        let salt = generate_salt();
        let nonce = generate_nonce();
        let params = Argon2Params::default();
        let key = derive_key("password", &salt, &params).unwrap();
        let mut ciphertext = encrypt(key.as_ref(), &nonce, b"payload").unwrap();
        if let Some(byte) = ciphertext.last_mut() {
            *byte ^= 0xFF;
        }
        assert!(matches!(
            decrypt(key.as_ref(), &nonce, &ciphertext),
            Err(VaultError::WrongPassword)
        ));
    }

    #[test]
    fn password_generator_respects_classes() {
        let password = generate_password(
            20,
            &PasswordClasses {
                uppercase: true,
                lowercase: true,
                digits: true,
                symbols: false,
            },
        )
        .unwrap();
        assert_eq!(password.len(), 20);
        assert!(password.chars().any(|c| c.is_ascii_uppercase()));
        assert!(password.chars().any(|c| c.is_ascii_lowercase()));
        assert!(password.chars().any(|c| c.is_ascii_digit()));
    }
}
