mod plugins;
mod rename;

use std::sync::Mutex;
use tauri::Manager;
use tauri::Emitter;

/// Stores initial CLI file paths for later retrieval by parse_cli_args
struct InitialFiles(Mutex<Vec<String>>);

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn update_tray_menu(app: tauri::AppHandle, show_text: String, quit_text: String) -> Result<(), String> {
    plugins::system_tray::update_tray_menu(&app, &show_text, &quit_text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Capture CLI args BEFORE Tauri runtime consumes them
    let initial_files: Vec<String> = std::env::args()
        .skip(1)
        .filter(|arg| std::path::Path::new(arg).exists())
        .collect();

    let builder = tauri::Builder::default()
        .manage(InitialFiles(Mutex::new(initial_files)))
        .setup(|_app| {
            // All initialization is done via managed state (InitialFiles) and plugins
            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // When attempting to start a second instance, focus the existing main window
            // and forward the new file paths to the frontend
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
                let _ = window.show();
            }
            // Forward new args to frontend via event
            if args.len() > 1 {
                let file_paths: Vec<String> = args
                    .iter()
                    .skip(1) // Skip executable path
                    .filter(|arg| std::path::Path::new(arg).exists())
                    .cloned()
                    .collect();
                if !file_paths.is_empty() {
                    let _ = app.emit("new-files", file_paths);
                }
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(plugins::system_tray::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            update_tray_menu,
            rename::commands::parse_cli_args,
            rename::commands::parse_template,
            rename::commands::preview_rename,
            rename::commands::apply_rename,
            rename::commands::get_templates,
            rename::commands::save_template,
            rename::commands::delete_template,
            rename::commands::install_context_menu,
            rename::commands::uninstall_context_menu,
            rename::commands::is_context_menu_installed,
            rename::commands::save_app_config,
            rename::commands::load_app_config,
        ]);

    // Updater disabled: requires signed package keys & endpoints.
    // Re-enable by restoring plugins.updater in tauri.conf.json and uncommenting below.
    // #[cfg(not(debug_assertions))]
    // let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}