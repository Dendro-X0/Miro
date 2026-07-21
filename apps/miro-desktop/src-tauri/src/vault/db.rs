use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use super::crypto::VaultCipher;
use crate::error::CommandError;
use crate::keychain;

pub struct VaultState {
    conn: Mutex<Connection>,
    cipher: VaultCipher,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSessionSummary {
    pub id: String,
    pub title: String,
    pub pinned: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultGalleryAsset {
    pub id: String,
    pub prompt: String,
    pub mime: String,
    pub data_url: String,
    pub created_at: i64,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultMessageRecord {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, CommandError> {
    let data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&data_dir)?;
    Ok(data_dir.join("vault.db"))
}

fn init_schema(conn: &Connection) -> Result<(), CommandError> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          pinned INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content_encrypted BLOB NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS gallery_assets (
          id TEXT PRIMARY KEY NOT NULL,
          prompt_encrypted BLOB NOT NULL,
          mime TEXT NOT NULL,
          data_encrypted BLOB NOT NULL,
          session_id TEXT,
          created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_assets(created_at DESC);
        ",
    )?;
    migrate_schema(conn)?;
    Ok(())
}

fn migrate_schema(conn: &Connection) -> Result<(), CommandError> {
    let mut stmt = conn.prepare("PRAGMA table_info(sessions)")?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !columns.iter().any(|name| name == "instructions_encrypted") {
        conn.execute("ALTER TABLE sessions ADD COLUMN instructions_encrypted BLOB", [])?;
    }
    Ok(())
}

pub fn vault_is_ready(app: &AppHandle) -> bool {
    app.try_state::<VaultState>().is_some()
}

pub fn init_vault(app: &AppHandle) -> Result<(), CommandError> {
    if app.try_state::<VaultState>().is_some() {
        return Ok(());
    }

    let master_key = keychain::get_or_create_master_key()?;
    let cipher = VaultCipher::new(&master_key);
    let conn = Connection::open(db_path(app)?)?;
    init_schema(&conn)?;
    app.manage(VaultState {
        conn: Mutex::new(conn),
        cipher,
    });
    Ok(())
}

fn vault_state(app: &AppHandle) -> Result<tauri::State<'_, VaultState>, CommandError> {
    app.try_state::<VaultState>()
        .ok_or_else(|| CommandError::Vault("vault is not initialized".into()))
}

pub fn list_sessions(app: &AppHandle) -> Result<Vec<VaultSessionSummary>, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, title, pinned, created_at, updated_at FROM sessions ORDER BY pinned DESC, updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(VaultSessionSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            pinned: row.get::<_, i64>(2)? != 0,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(CommandError::from)
}

pub fn create_session(app: &AppHandle, title: String) -> Result<VaultSessionSummary, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let now = chrono_now();
    let id = uuid::Uuid::new_v4().to_string();
    let trimmed = title.trim();
    let session_title = if trimmed.is_empty() {
        "New chat".to_string()
    } else {
        trimmed.to_string()
    };
    conn.execute(
        "INSERT INTO sessions (id, title, pinned, created_at, updated_at) VALUES (?1, ?2, 0, ?3, ?3)",
        params![id, session_title, now],
    )?;
    Ok(VaultSessionSummary {
        id,
        title: session_title,
        pinned: false,
        created_at: now,
        updated_at: now,
    })
}

pub fn delete_session(app: &AppHandle, session_id: String) -> Result<(), CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    conn.execute("DELETE FROM messages WHERE session_id = ?1", params![session_id])?;
    conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])?;
    Ok(())
}

pub fn rename_session(app: &AppHandle, session_id: String, title: String) -> Result<VaultSessionSummary, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let now = chrono_now();
    let trimmed = title.trim();
    let session_title = if trimmed.is_empty() {
        "Untitled chat".to_string()
    } else {
        trimmed.to_string()
    };
    conn.execute(
        "UPDATE sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![session_title, now, session_id],
    )?;
    fetch_session(&conn, &session_id)
}

pub fn pin_session(app: &AppHandle, session_id: String, pinned: bool) -> Result<VaultSessionSummary, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let now = chrono_now();
    conn.execute(
        "UPDATE sessions SET pinned = ?1, updated_at = ?2 WHERE id = ?3",
        params![if pinned { 1 } else { 0 }, now, session_id],
    )?;
    fetch_session(&conn, &session_id)
}

fn fetch_session(conn: &Connection, session_id: &str) -> Result<VaultSessionSummary, CommandError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, pinned, created_at, updated_at FROM sessions WHERE id = ?1",
    )?;
    stmt.query_row(params![session_id], |row| {
        Ok(VaultSessionSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            pinned: row.get::<_, i64>(2)? != 0,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })
    .map_err(CommandError::from)
}

pub fn get_session_instructions(app: &AppHandle, session_id: String) -> Result<String, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let mut stmt = conn.prepare("SELECT instructions_encrypted FROM sessions WHERE id = ?1")?;
    let encrypted: Option<Vec<u8>> = stmt
        .query_row(params![session_id], |row| row.get(0))
        .optional()?;
    match encrypted {
        Some(payload) if !payload.is_empty() => state.cipher.decrypt(&payload),
        _ => Ok(String::new()),
    }
}

pub fn set_session_instructions(
    app: &AppHandle,
    session_id: String,
    instructions: String,
) -> Result<(), CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let now = chrono_now();
    let encrypted = if instructions.trim().is_empty() {
        None
    } else {
        Some(state.cipher.encrypt(instructions.trim())?)
    };
    conn.execute(
        "UPDATE sessions SET instructions_encrypted = ?1, updated_at = ?2 WHERE id = ?3",
        params![encrypted, now, session_id],
    )?;
    Ok(())
}

pub fn save_message(
    app: &AppHandle,
    session_id: String,
    role: String,
    content: String,
) -> Result<VaultMessageRecord, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let now = chrono_now();
    let id = uuid::Uuid::new_v4().to_string();
    let encrypted = state.cipher.encrypt(&content)?;
    conn.execute(
        "INSERT INTO messages (id, session_id, role, content_encrypted, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, session_id, role, encrypted, now],
    )?;
    conn.execute(
        "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
        params![now, session_id],
    )?;
    Ok(VaultMessageRecord {
        id,
        session_id,
        role,
        content,
        created_at: now,
    })
}

pub fn load_messages(app: &AppHandle, session_id: String) -> Result<Vec<VaultMessageRecord>, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, content_encrypted, created_at FROM messages WHERE session_id = ?1 ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![session_id], |row| {
        let encrypted: Vec<u8> = row.get(3)?;
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, encrypted, row.get::<_, i64>(4)?))
    })?;

    let mut messages = Vec::new();
    for row in rows {
        let (id, session_id, role, encrypted, created_at) = row?;
        let content = state.cipher.decrypt(&encrypted)?;
        messages.push(VaultMessageRecord {
            id,
            session_id,
            role,
            content,
            created_at,
        });
    }
    Ok(messages)
}

pub fn list_gallery_assets(app: &AppHandle) -> Result<Vec<VaultGalleryAsset>, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, prompt_encrypted, mime, data_encrypted, session_id, created_at FROM gallery_assets ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Vec<u8>>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Vec<u8>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, i64>(5)?,
        ))
    })?;

    let mut assets = Vec::new();
    for row in rows {
        let (id, prompt_encrypted, mime, data_encrypted, session_id, created_at) = row?;
        let prompt = state.cipher.decrypt(&prompt_encrypted)?;
        let data_url = state.cipher.decrypt(&data_encrypted)?;
        assets.push(VaultGalleryAsset {
            id,
            prompt,
            mime,
            data_url,
            created_at,
            session_id,
        });
    }
    Ok(assets)
}

pub fn save_gallery_asset(
    app: &AppHandle,
    prompt: String,
    mime: String,
    data_url: String,
    session_id: Option<String>,
) -> Result<VaultGalleryAsset, CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let now = chrono_now();
    let id = uuid::Uuid::new_v4().to_string();
    let prompt_encrypted = state.cipher.encrypt(&prompt)?;
    let data_encrypted = state.cipher.encrypt(&data_url)?;
    let mime_value = if mime.trim().is_empty() {
        "image/png".to_string()
    } else {
        mime
    };
    conn.execute(
        "INSERT INTO gallery_assets (id, prompt_encrypted, mime, data_encrypted, session_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            prompt_encrypted,
            mime_value.clone(),
            data_encrypted,
            session_id.clone(),
            now
        ],
    )?;
    Ok(VaultGalleryAsset {
        id,
        prompt,
        mime: mime_value,
        data_url,
        created_at: now,
        session_id,
    })
}

pub fn delete_gallery_asset(app: &AppHandle, asset_id: String) -> Result<(), CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    conn.execute("DELETE FROM gallery_assets WHERE id = ?1", params![asset_id])?;
    Ok(())
}

pub fn truncate_messages_after(
    app: &AppHandle,
    session_id: String,
    message_id: String,
) -> Result<(), CommandError> {
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    let cutoff: i64 = conn
        .query_row(
            "SELECT created_at FROM messages WHERE id = ?1 AND session_id = ?2",
            params![message_id, session_id],
            |row| row.get(0),
        )
        .map_err(CommandError::from)?;
    conn.execute(
        "DELETE FROM messages WHERE session_id = ?1 AND created_at >= ?2",
        params![session_id, cutoff],
    )?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultBackupSession {
    pub id: String,
    pub title: String,
    pub pinned: bool,
    pub instructions: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultBackupMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultBackupGalleryAsset {
    pub id: String,
    pub prompt: String,
    pub mime: String,
    pub data_url: String,
    pub session_id: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultBackupPayload {
    pub version: u8,
    pub exported_at: i64,
    pub sessions: Vec<VaultBackupSession>,
    pub messages: Vec<VaultBackupMessage>,
    pub gallery: Vec<VaultBackupGalleryAsset>,
}

pub fn export_backup(app: &AppHandle) -> Result<VaultBackupPayload, CommandError> {
    let session_summaries = list_sessions(app)?;
    let gallery = list_gallery_assets(app)?;
    let mut messages = Vec::new();
    let mut backup_sessions = Vec::new();
    for session in session_summaries {
        let instructions = get_session_instructions(app, session.id.clone())?;
        messages.extend(load_messages(app, session.id.clone())?);
        backup_sessions.push(VaultBackupSession {
            id: session.id,
            title: session.title,
            pinned: session.pinned,
            instructions,
            created_at: session.created_at,
            updated_at: session.updated_at,
        });
    }
    Ok(VaultBackupPayload {
        version: 1,
        exported_at: chrono_now(),
        sessions: backup_sessions,
        messages: messages
            .into_iter()
            .map(|message| VaultBackupMessage {
                id: message.id,
                session_id: message.session_id,
                role: message.role,
                content: message.content,
                created_at: message.created_at,
            })
            .collect(),
        gallery: gallery
            .into_iter()
            .map(|asset| VaultBackupGalleryAsset {
                id: asset.id,
                prompt: asset.prompt,
                mime: asset.mime,
                data_url: asset.data_url,
                session_id: asset.session_id,
                created_at: asset.created_at,
            })
            .collect(),
    })
}

pub fn import_backup(app: &AppHandle, payload: VaultBackupPayload) -> Result<(), CommandError> {
    if payload.version != 1 {
        return Err(CommandError::Vault("unsupported backup version".into()));
    }
    let state = vault_state(app)?;
    let conn = state.conn.lock().map_err(|_| CommandError::Vault("vault lock poisoned".into()))?;
    conn.execute("DELETE FROM gallery_assets", [])?;
    conn.execute("DELETE FROM messages", [])?;
    conn.execute("DELETE FROM sessions", [])?;

    for session in payload.sessions {
        let instructions_encrypted = if session.instructions.trim().is_empty() {
            None
        } else {
            Some(state.cipher.encrypt(session.instructions.trim())?)
        };
        conn.execute(
            "INSERT INTO sessions (id, title, pinned, created_at, updated_at, instructions_encrypted) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                session.id,
                session.title,
                if session.pinned { 1 } else { 0 },
                session.created_at,
                session.updated_at,
                instructions_encrypted
            ],
        )?;
    }

    for message in payload.messages {
        let encrypted = state.cipher.encrypt(&message.content)?;
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content_encrypted, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![message.id, message.session_id, message.role, encrypted, message.created_at],
        )?;
    }

    for asset in payload.gallery {
        let prompt_encrypted = state.cipher.encrypt(&asset.prompt)?;
        let data_encrypted = state.cipher.encrypt(&asset.data_url)?;
        conn.execute(
            "INSERT INTO gallery_assets (id, prompt_encrypted, mime, data_encrypted, session_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                asset.id,
                prompt_encrypted,
                asset.mime,
                data_encrypted,
                asset.session_id,
                asset.created_at
            ],
        )?;
    }

    Ok(())
}

fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
