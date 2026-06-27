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
pub fn load_config() -> Result<HashMap<String, String>, String> {
    let path = get_config_path();
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

/// Save config JSON
pub fn save_config(config: &HashMap<String, String>) -> Result<(), String> {
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
/// Designed as a document organizer's toolkit for efficient file naming
fn get_default_templates() -> Vec<TemplateConfig> {
    vec![
        // 1. 日期 主题 / Date Topic
        // Example: 20260624 季度总结报告.docx
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "日期 主题".to_string(),
            name_zh: "日期 主题".to_string(),
            name_en: "Date Topic".to_string(),
            pattern: "{Date:YYYYMMDD} {Input:主题}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // 2. 日期 主题_版本 / Date Topic_Version
        // Example: 20260624 季度总结报告_v2.1.docx
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "日期 主题_版本".to_string(),
            name_zh: "日期 主题_版本".to_string(),
            name_en: "Date Topic_Version".to_string(),
            pattern: "{Date:YYYYMMDD} {Input:主题}_v{Input:版本号}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // 3. 日期 主题-备注 / Date Topic-Note
        // Example: 20260624 季度总结报告-市场部.docx
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "日期 主题-备注".to_string(),
            name_zh: "日期 主题-备注".to_string(),
            name_en: "Date Topic-Note".to_string(),
            pattern: "{Date:YYYYMMDD} {Input:主题}-{Input:备注}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // 4. 日期 主题-备注_版本 / Date Topic-Note_Version
        // Example: 20260624 季度总结报告-市场部_v2.1.docx
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "日期 主题-备注_版本".to_string(),
            name_zh: "日期 主题-备注_版本".to_string(),
            name_en: "Date Topic-Note_Version".to_string(),
            pattern: "{Date:YYYYMMDD} {Input:主题}-{Input:备注}_v{Input:版本号}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // 5. 序号_名称 / Number_Name
        // Example: 01_会议纪要.docx
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "序号_名称".to_string(),
            name_zh: "序号_名称".to_string(),
            name_en: "Number_Name".to_string(),
            pattern: "{Counter:01}_{Input:名称}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // 6. 日期 原文件名_版本 / Date OriginalName_Version
        // Example: 20260624 draft_v1.0.docx
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "日期 原文件名_版本".to_string(),
            name_zh: "日期 原文件名_版本".to_string(),
            name_en: "Date OriginalName_Version".to_string(),
            pattern: "{Date:YYYYMMDD} {OriginalName}_v{Input:版本号}.{Ext}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // ===== Folder templates (no {Ext}) =====
        // 7. 日期 原文件夹名 / Date OriginalFolderName
        // Example: 20260624 项目资料
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "日期 原文件夹名".to_string(),
            name_zh: "日期 原文件夹名".to_string(),
            name_en: "Date OriginalFolderName".to_string(),
            pattern: "{Date:YYYYMMDD} {OriginalName}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // 8. 项目_文件夹 / Project_Folder
        // Example: 市场部_季度报告
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "项目_文件夹".to_string(),
            name_zh: "项目_文件夹".to_string(),
            name_en: "Project_Folder".to_string(),
            pattern: "{Input:项目名}_{OriginalName}".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            updated_at: chrono::Local::now().to_rfc3339(),
        },
        // 9. 序号_文件夹 / Number_Folder
        // Example: 01_会议资料
        TemplateConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: "序号_文件夹".to_string(),
            name_zh: "序号_文件夹".to_string(),
            name_en: "Number_Folder".to_string(),
            pattern: "{Counter:01}_{OriginalName}".to_string(),
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

    // Cleanup: remove old templates with raw formula names (e.g. "{Date:YYYYMMDD}-{Input:topic}.{Ext}")
    let before = templates.len();
    templates.retain(|t| !t.name.starts_with('{') || !t.name.contains(":}"));
    let mut changed = before != templates.len();

    // Migrate: add missing system default templates, rename old-named ones
    let defaults = get_default_templates();
    // Map of old template names to new names (updated in v0.3.4: 日期_ → 日期 )
    let name_renames: Vec<(&str, &str)> = vec![
        ("日期_主题", "日期 主题"),
        ("日期_主题_版本", "日期 主题_版本"),
        ("日期_主题-备注", "日期 主题-备注"),
        ("日期_主题-备注_版本", "日期 主题-备注_版本"),
        ("日期_原文件名_版本", "日期 原文件名_版本"),
        ("日期_原文件夹名", "日期 原文件夹名"),
    ];
    for (old_name, new_name) in &name_renames {
        // Rename existing template with old name to new name
        if let Some(t) = templates.iter_mut().find(|t| t.name == *old_name || t.name_zh == *old_name) {
            if t.name == *old_name {
                t.name = new_name.to_string();
            }
            if t.name_zh == *old_name {
                t.name_zh = new_name.to_string();
            }
            // Also update English name: replace first underscore after "Date" with space
            t.name_en = t.name_en.replacen("Date_", "Date ", 1);
            t.name_en = t.name_en.replacen("Date ", "Date ", 1); // no-op if already done
            // Update pattern: replace first {Date:YYYYMMDD}_ with {Date:YYYYMMDD} 
            t.pattern = t.pattern.replacen("{Date:YYYYMMDD}_", "{Date:YYYYMMDD} ", 1);
            t.updated_at = chrono::Local::now().to_rfc3339();
            changed = true;
        }
    }
    // Also update English name for folder template
    if let Some(t) = templates.iter_mut().find(|t| t.name_en == "Date_OriginalFolderName") {
        t.name_en = "Date OriginalFolderName".to_string();
        t.updated_at = chrono::Local::now().to_rfc3339();
        changed = true;
    }
    // Remove duplicates that may have been created by previous migrations
    // (keep the first occurrence, which is the renamed original template)
    let mut seen_names = std::collections::HashSet::new();
    let before_dedup = templates.len();
    templates.retain(|t| seen_names.insert(t.name.clone()));
    if templates.len() != before_dedup {
        changed = true;
    }
    for default in &defaults {
        if !templates.iter().any(|t| t.name == default.name) {
            templates.push(default.clone());
            changed = true;
        }
    }
    // Also update existing templates that have old patterns (V→v, YYYYMMDD→YYYYMMDD)
    for t in &mut templates {
        let mut updated = false;
        if t.pattern.contains("_V{") {
            t.pattern = t.pattern.replace("_V{", "_v{");
            updated = true;
        }
        if updated {
            t.updated_at = chrono::Local::now().to_rfc3339();
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
    println!("[SmartRename] parse_cli_args: returning {} files: {:?}", result.len(), result);
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

/// Internal rename logic (shared by apply_rename command and direct_rename)
fn apply_rename_internal(
    files: &[String],
    pattern: &str,
    var_values: &HashMap<String, String>,
    counter_start: u32,
) -> Vec<RenameResult> {
    let previews = template::preview_rename(files, pattern, var_values, counter_start);
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

/// Apply rename to files
#[tauri::command]
pub fn apply_rename(
    files: Vec<String>,
    pattern: String,
    var_values: HashMap<String, String>,
    counter_start: u32,
) -> Vec<RenameResult> {
    apply_rename_internal(&files, &pattern, &var_values, counter_start)
}

/// Perform direct rename from context menu without opening UI
/// Returns a status message string
pub async fn perform_direct_rename(app: &AppHandle, paths: Vec<String>) -> Result<String, String> {
    if paths.is_empty() {
        return Err("No files provided".to_string());
    }

    // Check if AI context menu rename is enabled
    let config = load_config()?;
    let ai_enabled = config
        .get("ai_context_menu_enabled")
        .map(|v| v == "true")
        .unwrap_or(false);
    if ai_enabled {
        return super::ai::perform_direct_ai_rename(app, paths).await;
    }

    // Detect item type
    let item_type = detect_item_type_internal(&paths);
    if item_type == "mixed" {
        return Err("Mixed files and folders are not supported for direct rename".to_string());
    }

    // Load default template config
    let config_key = if item_type == "folder" { "lastFolderTemplateId" } else { "lastFileTemplateId" };
    let config = load_config()?;
    let template_id = config.get(config_key)
        .or_else(|| config.get("lastTemplateId"))
        .ok_or_else(|| "No default template configured. Please set a default template in Settings.".to_string())?;

    // Load template
    let templates = load_templates(app)?;
    let template = templates.iter().find(|t| t.id == *template_id)
        .ok_or_else(|| "Default template not found. Please check your template settings.".to_string())?;

    // Check type compatibility
    if item_type == "folder" && template.pattern.contains("{Ext}") {
        return Err("Cannot use a file template for folders".to_string());
    }
    if item_type == "file" && !template.pattern.contains("{Ext}") {
        return Err("Cannot use a folder template for files".to_string());
    }

    // Build default var values (e.g. version = "1")
    let mut var_values = HashMap::new();
    var_values.insert("版本号".to_string(), "1".to_string());

    // Apply rename
    let results = apply_rename_internal(&paths, &template.pattern, &var_values, 1);

    let success = results.iter().filter(|r| r.success).count();
    let failed = results.iter().filter(|r| !r.success).count();

    if failed > 0 {
        let errors: Vec<String> = results.iter()
            .filter(|r| !r.success)
            .map(|r| format!("{}: {}", r.original, r.error.as_deref().unwrap_or("unknown")))
            .collect();
        Err(format!("Renamed {} items, {} failed: {}", success, failed, errors.join("; ")))
    } else {
        let item_label = if item_type == "folder" { "folders" } else { "files" };
        Ok(format!("Successfully renamed {} {}", success, item_label))
    }
}

/// Internal item type detection (no logging)
fn detect_item_type_internal(paths: &[String]) -> String {
    use super::file_utils;
    let mut has_file = false;
    let mut has_folder = false;

    for path in paths {
        if file_utils::is_directory(path) {
            has_folder = true;
        } else {
            has_file = true;
        }
        if has_file && has_folder {
            return "mixed".to_string();
        }
    }

    if has_folder { "folder".to_string() } else { "file".to_string() }
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

/// Detect whether the given paths are files, folders, or mixed
/// Returns "file", "folder", or "mixed"
#[tauri::command]
pub fn detect_item_type(paths: Vec<String>) -> String {
    use super::file_utils;
    println!("[SmartRename] detect_item_type: paths = {:?}", paths);
    let mut has_file = false;
    let mut has_folder = false;

    for path in &paths {
        if file_utils::is_directory(path) {
            has_folder = true;
        } else {
            has_file = true;
        }
        if has_file && has_folder {
            let result = "mixed".to_string();
            println!("[SmartRename] detect_item_type: result = {}", result);
            return result;
        }
    }

    let result = if has_folder {
        "folder".to_string()
    } else {
        "file".to_string()
    };
    println!("[SmartRename] detect_item_type: result = {}", result);
    result
}

/// Check if a template pattern has Input variables (requires user input)
#[tauri::command]
pub fn has_input_variable(pattern: String) -> bool {
    template::has_input_variable(&pattern)
}

/// Check if a template has Input variables without default values
/// Templates where all Input vars have defaults (e.g. 版本号=1) can use shortcuts
#[tauri::command]
pub fn has_required_input(pattern: String) -> bool {
    template::has_required_input(&pattern)
}