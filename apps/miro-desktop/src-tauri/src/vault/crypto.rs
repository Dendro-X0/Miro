use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Nonce};
use rand::RngCore;

use crate::error::CommandError;

pub struct VaultCipher {
    cipher: ChaCha20Poly1305,
}

impl VaultCipher {
    pub fn new(master_key: &[u8; 32]) -> Self {
        Self {
            cipher: ChaCha20Poly1305::new(master_key.into()),
        }
    }

    pub fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, CommandError> {
        let mut nonce_bytes = [0_u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|err| CommandError::Crypto(err.to_string()))?;
        let mut payload = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
        payload.extend_from_slice(&nonce_bytes);
        payload.extend_from_slice(&ciphertext);
        Ok(payload)
    }

    pub fn decrypt(&self, payload: &[u8]) -> Result<String, CommandError> {
        if payload.len() <= 12 {
            return Err(CommandError::Crypto("ciphertext too short".into()));
        }
        let (nonce_bytes, ciphertext) = payload.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|err| CommandError::Crypto(err.to_string()))?;
        String::from_utf8(plaintext).map_err(|err| CommandError::Crypto(err.to_string()))
    }
}
