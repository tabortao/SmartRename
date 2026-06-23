use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

use super::context_menu;
use super::template::{self, PreviewItem, RenameResult, TemplateConfig, TemplateVariable};
use crate::InitialFiles;

/// Get config file path in exe directory
fn get_config_path() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    exe_dir.join("config.json")
}

/// Load config JSON, returns empty map if file doesn't exist
fn load_config() -> Result<HashMap<String, String>, String> {
    let path = get_config_path();
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

/// Save config JSON
fn save_config(config: &HashMap<String, String>) -> Result<(), String> {
    let path = get_config_path();
    let content = serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write config: {}", e))
}

/// Save a config key-value pair
#[tauri::command]
pub fn save_app_config(_app: AppHandle, key: String, value: String) -> Result<(), String> {
    let mut config = load_config()?;
    config.insert(key, value);
    save_config(&config)
}

/// Load a config value by key
#[tauri::command]
pub fn load_app_config(_app: AppHandle, key: String) -> Result<Option<String>, String> {
    let config = load_config()?;
    Ok(config.get(&key).cloned())
}

/// Parse a template pattern into variables
#[tauri::command]
pub fn parse_template(pattern: String) -> Vec<TemplateVariable> {
    template::parse_template(&pattern)
}

/// Get templates file path in app data directory
fn get_templates_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    Ok(data_dir.join("templates.json"))
}

/// System default templates — always seeded on first run or migrated
fn get_default_templates() -> Vec<TemplateConfig> {
    vec![
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "{Date:YYYYMMDD}-{Input:topic}.{Ext}".to_string(),
            pattern: "{Date:YYYYMMDD}-{Input:topic}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "{Date:YYYYMMDD}-{Input:topic}-V{Counter:1}.{Ext}".to_string(),
            pattern: "{Date:YYYYMMDD}-{Input:topic}-V{Counter:1}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "{Counter:01}-{Input:name}.{Ext}".to_string(),
            pattern: "{Counter:01}-{Input:name}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "{Input:name}-{Date:YYYYMMDD}.{Ext}".to_string(),
            pattern: "{Input:name}-{Date:YYYYMMDD}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
    ]
}

/// Load templates from JSON file
fn load_templates(app: &AppHandle) -> Result<Vec<TemplateConfig>, String> {
    let path = get_templates_path(app)?;
    if !path.exists() {
        // Create default templates on first run
        let default_templates = get_default_templates();
        save_templates(app, &default_templates)?;
        return Ok(default_templates);
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read templates: {}", e))?;
    let mut templates: Vec<TemplateConfig> =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse templates: {}", e))?;

    // Migrate: add missing system default templates
    let defaults = get_default_templates();
    let mut changed = false;
    for default in &defaults {
        if !templates.iter().any(|t| t.name == default.name) {
            templates.push(default.clone());
            changed = true;
        }
    }
    if changed {
        save_templates(app, &templates)?;
    }

    Ok(templates)
}

/// Save templates to JSON file
fn save_templates(app: &AppHandle, templates: &[TemplateConfig]) -> Result<(), String> {
    let path = get_templates_path(app)?;
    let content =
        serde_json::to_string_pretty(templates).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write templates: {}", e))
}

/// Parse CLI arguments and return file paths
#[tauri::command]
pub fn parse_cli_args(app: AppHandle) -> Vec<String> {
    let state = app.state::<InitialFiles>();
    let result = state.0.lock().unwrap().clone();
    result
}

/// Preview rename results for a list of files
#[tauri::command]
pub fn preview_rename(
    files: Vec<String>,
    pattern: String,
    var_values: HashMap<String, String>,
    counter_start: u32,
) -> Vec<PreviewItem> {
    template::preview_rename(&files, &pattern, &var_values, counter_start)
}

/// Apply rename to files
#[tauri::command]
pub fn apply_rename(
    files: Vec<String>,
    pattern: String,
    var_values: HashMap<String, String>,
    counter_start: u32,
) -> Vec<RenameResult> {
    let previews = template::preview_rename(&files, &pattern, &var_values, counter_start);
    let mut results = Vec::new();

    for (i, file_path) in files.iter().enumerate() {
        let preview = &previews[i];

        if preview.conflict {
            results.push(RenameResult {
                original: preview.original.clone(),
                renamed: None,
                success: false,
                error: Some("Name conflict detected".to_string()),
            });
            continue;
        }

        if !preview.valid {
            results.push(RenameResult {
                original: preview.original.clone(),
                renamed: None,
                success: false,
                error: Some("Invalid filename characters".to_string()),
            });
            continue;
        }

        let parent = std::path::Path::new(file_path)
            .parent()
            .unwrap_or_else(|| std::path::Path::new("."));
        let new_path = parent.join(&preview.preview);

        // Skip if same name
        if *file_path == new_path.to_string_lossy().to_string() {
            results.push(RenameResult {
                original: preview.original.clone(),
                renamed: Some(preview.preview.clone()),
                success: true,
                error: None,
            });
            continue;
        }

        match std::fs::rename(file_path, &new_path) {
            Ok(()) => results.push(RenameResult {
                original: preview.original.clone(),
                renamed: Some(preview.preview.clone()),
                success: true,
                error: None,
            }),
            Err(e) => results.push(RenameResult {
                original: preview.original.clone(),
                renamed: None,
                success: false,
                error: Some(e.to_string()),
            }),
        }
    }

    results
}

/// Get all templates
#[tauri::command]
pub fn get_templates(app: AppHandle) -> Result<Vec<TemplateConfig>, String> {
    load_templates(&app)
}

/// Save or update a template
#[tauri::command]
pub fn save_template(app: AppHandle, template: TemplateConfig) -> Result<(), String> {
    let mut templates = load_templates(&app)?;

    if let Some(pos) = templates.iter().position(|t| t.id == template.id) {
        templates[pos] = template;
    } else {
        templates.push(template);
    }

    save_templates(&app, &templates)
}

/// Delete a template by ID
#[tauri::command]
pub fn delete_template(app: AppHandle, id: String) -> Result<(), String> {
    let mut templates = load_templates(&app)?;
    templates.retain(|t| t.id != id);
    save_templates(&app, &templates)
}

/// Install Windows context menu
#[tauri::command]
pub fn install_context_menu() -> Result<(), String> {
    context_menu::install()
}

/// Uninstall Windows context menu
#[tauri::command]
pub fn uninstall_context_menu() -> Result<(), String> {
    context_menu::uninstall()
}

/// Check if context menu is installed
#[tauri::command]
pub fn is_context_menu_installed() -> bool {
    context_menu::is_installed()
}