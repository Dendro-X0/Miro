use serde::Serialize;
use tauri::AppHandle;

use crate::error::CommandError;
use crate::keychain;
use crate::vault::{
    create_session, delete_gallery_asset, delete_session, export_backup, get_session_instructions,
    import_backup, list_gallery_assets, list_sessions, load_messages, pin_session, rename_session,
    save_gallery_asset, save_message, set_session_instructions, truncate_messages_after,
    VaultBackupPayload, VaultGalleryAsset, VaultMessageRecord, VaultSessionSummary,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopInfo {
    pub platform: String,
    pub vault_ready: bool,
}

#[tauri::command]
pub fn desktop_info(app: AppHandle) -> Result<DesktopInfo, CommandError> {
    Ok(DesktopInfo {
        platform: std::env::consts::OS.to_string(),
        vault_ready: crate::vault::vault_is_ready(&app),
    })
}

#[tauri::command]
pub fn vault_list_sessions(app: AppHandle) -> Result<Vec<VaultSessionSummary>, CommandError> {
    list_sessions(&app)
}

#[tauri::command]
pub fn vault_create_session(app: AppHandle, title: String) -> Result<VaultSessionSummary, CommandError> {
    create_session(&app, title)
}

#[tauri::command]
pub fn vault_delete_session(app: AppHandle, session_id: String) -> Result<(), CommandError> {
    delete_session(&app, session_id)
}

#[tauri::command]
pub fn vault_rename_session(
    app: AppHandle,
    session_id: String,
    title: String,
) -> Result<VaultSessionSummary, CommandError> {
    rename_session(&app, session_id, title)
}

#[tauri::command]
pub fn vault_pin_session(
    app: AppHandle,
    session_id: String,
    pinned: bool,
) -> Result<VaultSessionSummary, CommandError> {
    pin_session(&app, session_id, pinned)
}

#[tauri::command]
pub fn vault_save_message(
    app: AppHandle,
    session_id: String,
    role: String,
    content: String,
) -> Result<VaultMessageRecord, CommandError> {
    save_message(&app, session_id, role, content)
}

#[tauri::command]
pub fn vault_load_messages(
    app: AppHandle,
    session_id: String,
) -> Result<Vec<VaultMessageRecord>, CommandError> {
    load_messages(&app, session_id)
}

#[tauri::command]
pub fn vault_get_session_instructions(app: AppHandle, session_id: String) -> Result<String, CommandError> {
    get_session_instructions(&app, session_id)
}

#[tauri::command]
pub fn vault_set_session_instructions(
    app: AppHandle,
    session_id: String,
    instructions: String,
) -> Result<(), CommandError> {
    set_session_instructions(&app, session_id, instructions)
}

#[tauri::command]
pub fn vault_truncate_messages_after(
    app: AppHandle,
    session_id: String,
    message_id: String,
) -> Result<(), CommandError> {
    truncate_messages_after(&app, session_id, message_id)
}

#[tauri::command]
pub fn vault_export_backup(app: AppHandle) -> Result<VaultBackupPayload, CommandError> {
    export_backup(&app)
}

#[tauri::command]
pub fn vault_import_backup(app: AppHandle, payload: VaultBackupPayload) -> Result<(), CommandError> {
    import_backup(&app, payload)
}

#[tauri::command]
pub fn vault_list_gallery(app: AppHandle) -> Result<Vec<VaultGalleryAsset>, CommandError> {
    list_gallery_assets(&app)
}

#[tauri::command]
pub fn vault_save_gallery_asset(
    app: AppHandle,
    prompt: String,
    mime: String,
    data_url: String,
    session_id: Option<String>,
) -> Result<VaultGalleryAsset, CommandError> {
    save_gallery_asset(&app, prompt, mime, data_url, session_id)
}

#[tauri::command]
pub fn vault_delete_gallery_asset(app: AppHandle, asset_id: String) -> Result<(), CommandError> {
    delete_gallery_asset(&app, asset_id)
}

#[tauri::command]
pub fn keychain_set_secret(account: String, secret: String) -> Result<(), CommandError> {
    keychain::set_secret(&account, &secret)
}

#[tauri::command]
pub fn keychain_get_secret(account: String) -> Result<Option<String>, CommandError> {
    keychain::get_secret(&account)
}

#[tauri::command]
pub fn keychain_delete_secret(account: String) -> Result<(), CommandError> {
    keychain::delete_secret(&account)
}
