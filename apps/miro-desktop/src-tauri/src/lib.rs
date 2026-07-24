mod api_process;
mod commands;
mod error;
mod keychain;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            vault::init_vault(app.handle())?;
            api_process::spawn_api_process(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::desktop_info,
            commands::vault_list_sessions,
            commands::vault_create_session,
            commands::vault_delete_session,
            commands::vault_rename_session,
            commands::vault_pin_session,
            commands::vault_save_message,
            commands::vault_load_messages,
            commands::vault_get_session_instructions,
            commands::vault_set_session_instructions,
            commands::vault_truncate_messages_after,
            commands::vault_export_backup,
            commands::vault_import_backup,
            commands::vault_list_gallery,
            commands::vault_save_gallery_asset,
            commands::vault_delete_gallery_asset,
            commands::vault_clear_project_membership,
            commands::keychain_set_secret,
            commands::keychain_get_secret,
            commands::keychain_delete_secret,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            api_process::handle_run_event(app_handle, &event);
        });
}
