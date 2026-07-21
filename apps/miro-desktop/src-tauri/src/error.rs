use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("vault: {0}")]
    Vault(String),
    #[error("keychain: {0}")]
    Keychain(String),
    #[error("crypto: {0}")]
    Crypto(String),
    #[error("database: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("tauri: {0}")]
    Tauri(#[from] tauri::Error),
}

impl Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
