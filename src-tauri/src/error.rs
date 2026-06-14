use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("wrong password")]
    WrongPassword,
    #[error("vault file is corrupted")]
    Corrupted,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("crypto error: {0}")]
    Crypto(String),
    #[error("vault is locked")]
    Locked,
    #[error("vault already exists")]
    AlreadyExists,
    #[error("vault does not exist")]
    NotFound,
    #[error("invalid password generator options")]
    InvalidGeneratorOptions,
}

#[derive(Debug, Serialize)]
pub struct ErrorPayload {
    pub kind: String,
    pub message: String,
}

impl VaultError {
    pub fn to_payload(&self) -> ErrorPayload {
        let kind = match self {
            Self::WrongPassword => "WrongPassword",
            Self::Corrupted => "Corrupted",
            Self::Io(_) => "Io",
            Self::Crypto(_) => "Crypto",
            Self::Locked => "Locked",
            Self::AlreadyExists => "AlreadyExists",
            Self::NotFound => "NotFound",
            Self::InvalidGeneratorOptions => "InvalidGeneratorOptions",
        };

        ErrorPayload {
            kind: kind.to_string(),
            message: self.to_string(),
        }
    }
}

impl Serialize for VaultError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.to_payload().serialize(serializer)
    }
}
