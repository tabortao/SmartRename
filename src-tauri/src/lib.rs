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
    let all_args: Vec<String> = std::env::args().collect();
    let is_direct = all_args.iter().any(|a| a == "--direct");
    let initial_files: Vec<String> = all_args
        .iter()
        .skip(1) // Skip executable path
        .filter(|a| *a != "--direct")
        .filter(|a| std::path::Path::new(a).exists())
        .cloned()
        .collect();
    let direct_files = initial_files.clone();

    let builder = tauri::Builder::default()
        .manage(InitialFiles(Mutex::new(initial_files.clone())))
        .setup(move |app| {
            // Handle --direct flag: rename and exit without opening UI
            if is_direct && !direct_files.is_empty() {
                println!("[SmartRename] Direct rename mode: {} files", direct_files.len());
                let handle = app.handle().clone();
                tauri::async_runtime::block_on(async move {
                    match rename::commands::perform_direct_rename(&handle, direct_files).await {
                        Ok(msg) => println!("[SmartRename] {}", msg),
                        Err(e) => eprintln!("[SmartRename] Direct rename failed: {}", e),
                    }
                });
                std::process::exit(0);
            }

            // Show main window when launched with file arguments (e.g. right-click context menu)
            let has_files = !app.state::<InitialFiles>().0.lock().unwrap().is_empty();
            println!("[SmartRename] Setup: initial_files = {:?}", initial_files);
            if has_files {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            println!("[SmartRename] Single instance callback: args = {:?}", args);

            // Check for --direct flag in single-instance callback
            let is_direct = args.iter().any(|a| a == "--direct");
            if is_direct {
                let file_paths: Vec<String> = args
                    .iter()
                    .skip(1) // Skip executable path
                    .filter(|a| *a != "--direct")
                    .filter(|a| std::path::Path::new(a).exists())
                    .cloned()
                    .collect();
                println!("[SmartRename] Single instance direct rename: {:?}", file_paths);
                if !file_paths.is_empty() {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        match rename::commands::perform_direct_rename(&handle, file_paths).await {
                            Ok(msg) => {
                                println!("[SmartRename] {}", msg);
                                let _ = handle.emit("direct-rename-success", msg);
                            }
                            Err(e) => {
                                eprintln!("[SmartRename] Direct rename failed: {}", e);
                                let _ = handle.emit("direct-rename-error", e);
                            }
                        }
                    });
                }
                return;
            }

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
                println!("[SmartRename] Single instance: filtered file_paths = {:?}", file_paths);
                if !file_paths.is_empty() {
                    let _ = app.emit("new-files", file_paths);
                    println!("[SmartRename] Single instance: emitted 'new-files' event");
                } else {
                    println!("[SmartRename] Single instance: no valid file paths found");
                }
            } else {
                println!("[SmartRename] Single instance: no args provided");
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
            rename::commands::detect_item_type,
            rename::commands::has_input_variable,
            rename::commands::has_required_input,
            rename::ai::ai_preview_rename,
            rename::ai::ai_rename,
            rename::ai::test_ai_connection,
        ]);

    // Updater disabled: requires signed package keys & endpoints.
    // Re-enable by restoring plugins.updater in tauri.conf.json and uncommenting below.
    // #[cfg(not(debug_assertions))]
    // let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}