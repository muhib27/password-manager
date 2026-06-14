mod commands;
mod crypto;
mod error;
mod model;
mod vault_io;

use commands::AppState;
use parking_lot::Mutex;
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            session: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_exists,
            commands::create_vault,
            commands::unlock,
            commands::lock,
            commands::save_entries,
            commands::generate_password_command,
            commands::evaluate_strength_command,
            commands::is_locked,
        ])
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                let state = window.state::<AppState>();
                let mut session = state.session.lock();
                *session = None;
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
