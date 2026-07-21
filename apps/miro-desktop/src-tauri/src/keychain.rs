use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::RngCore;

use crate::error::CommandError;

const SERVICE: &str = "com.miro.desktop";
const MASTER_ACCOUNT: &str = "vault-master-key";

fn encode_key(key: &[u8; 32]) -> String {
    BASE64.encode(key)
}

fn decode_key(encoded: &str) -> Result<[u8; 32], CommandError> {
    let bytes = BASE64
        .decode(encoded.trim())
        .map_err(|err| CommandError::Keychain(format!("invalid master key encoding: {err}")))?;
    let array: [u8; 32] = bytes
        .try_into()
        .map_err(|_| CommandError::Keychain("master key must be 32 bytes".into()))?;
    Ok(array)
}

fn random_key() -> [u8; 32] {
    let mut key = [0_u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    key
}

fn entry(account: &str) -> Result<keyring::Entry, CommandError> {
    keyring::Entry::new(SERVICE, account).map_err(|err| CommandError::Keychain(err.to_string()))
}

pub fn get_or_create_master_key() -> Result<[u8; 32], CommandError> {
    let store = entry(MASTER_ACCOUNT)?;
    match store.get_password() {
        Ok(existing) => decode_key(&existing),
        Err(keyring::Error::NoEntry) => {
            let key = random_key();
            store
                .set_password(&encode_key(&key))
                .map_err(|err| CommandError::Keychain(err.to_string()))?;
            Ok(key)
        }
        Err(err) => Err(CommandError::Keychain(err.to_string())),
    }
}

pub fn set_secret(account: &str, secret: &str) -> Result<(), CommandError> {
    entry(account)?
        .set_password(secret)
        .map_err(|err| CommandError::Keychain(err.to_string()))
}

pub fn get_secret(account: &str) -> Result<Option<String>, CommandError> {
    match entry(account)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(CommandError::Keychain(err.to_string())),
    }
}

pub fn delete_secret(account: &str) -> Result<(), CommandError> {
    match entry(account)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(CommandError::Keychain(err.to_string())),
    }
}
