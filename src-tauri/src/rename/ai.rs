use std::collections::HashMap;

use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::commands::{load_config, save_config};
use super::file_utils;
use super::template::PreviewItem;

/// AI configuration stored in config.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub provider: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub file_prompt: String,
    pub folder_prompt: String,
    pub context_menu_enabled: bool,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            provider: "deepseek".to_string(),
            api_url: "https://api.deepseek.com".to_string(),
            api_key: String::new(),
            model: "deepseek-v4-flash".to_string(),
            file_prompt: "你是一位文件整理大师，擅长为文件起简洁、规范、易检索的名字。\n\n当前日期：{DATE}\n\n命名格式：{DATE} 描述内容_v版本号.扩展名\n示例：{DATE} 会议纪要_v1.docx\n\n命名规则：\n1. 文件名前必须加上当前日期（YYYYMMDD格式），日期后加一个空格\n2. 保留原文件扩展名不变\n3. 文件名末尾加版本号，格式为 _v1、_v2 等，默认从 v1 开始\n4. 文件名使用中文或英文，与原文件名语言保持一致\n5. 用清晰的关键词概括文件内容，便于日后搜索\n6. 去除原文件名中无意义的数字、日期等冗余信息\n\n只返回符合格式的新文件名（含扩展名），不要解释，不要分析文件内容。"
                .to_string(),
            folder_prompt: "你是一位文件整理大师，擅长为文件夹起简洁、规范、易分类的名字。\n\n当前日期：{DATE}\n\n命名格式：{DATE} 分类描述\n示例：{DATE} 项目资料\n\n命名规则：\n1. 文件夹名前必须加上当前日期（YYYYMMDD格式），日期后加一个空格\n2. 文件夹名使用中文或英文，与原文件夹名语言保持一致\n3. 使用概括性强的分类词汇，便于层级管理\n4. 去除原文件夹名中无意义的数字、日期等冗余信息\n5. 避免使用括号等特殊字符\n\n只返回符合格式的新文件夹名，不要解释，不要分析文件夹内容。"
                .to_string(),
            context_menu_enabled: false,
        }
    }
}

/// Load AI config from config.json
pub fn load_ai_config() -> Result<AiConfig, String> {
    let config = load_config()?;
    let provider = config
        .get("ai_provider")
        .cloned()
        .unwrap_or_else(|| AiConfig::default().provider);
    let api_url = config
        .get("ai_api_url")
        .cloned()
        .unwrap_or_else(|| AiConfig::default().api_url);
    let api_key = config
        .get("ai_api_key")
        .cloned()
        .unwrap_or_else(|| AiConfig::default().api_key);
    let model = config
        .get("ai_model")
        .cloned()
        .unwrap_or_else(|| AiConfig::default().model);
    let file_prompt = config
        .get("ai_file_prompt")
        .cloned()
        .unwrap_or_else(|| AiConfig::default().file_prompt);
    let folder_prompt = config
        .get("ai_folder_prompt")
        .cloned()
        .unwrap_or_else(|| AiConfig::default().folder_prompt);
    let context_menu_enabled = config
        .get("ai_context_menu_enabled")
        .map(|v| v == "true")
        .unwrap_or(false);

    Ok(AiConfig {
        provider,
        api_url,
        api_key,
        model,
        file_prompt,
        folder_prompt,
        context_menu_enabled,
    })
}

/// Save AI config to config.json
#[allow(dead_code)]
pub fn save_ai_config(cfg: &AiConfig) -> Result<(), String> {
    let mut config = load_config()?;
    config.insert("ai_provider".to_string(), cfg.provider.clone());
    config.insert("ai_api_url".to_string(), cfg.api_url.clone());
    config.insert("ai_api_key".to_string(), cfg.api_key.clone());
    config.insert("ai_model".to_string(), cfg.model.clone());
    config.insert("ai_file_prompt".to_string(), cfg.file_prompt.clone());
    config.insert("ai_folder_prompt".to_string(), cfg.folder_prompt.clone());
    config.insert(
        "ai_context_menu_enabled".to_string(),
        cfg.context_menu_enabled.to_string(),
    );
    save_config(&config)
}

/// OpenAI-compatible chat completion request
#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    thinking: Option<ThinkingConfig>,
}

#[derive(Debug, Serialize)]
struct ThinkingConfig {
    #[serde(rename = "type")]
    thinking_type: String,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

/// OpenAI-compatible chat completion response
#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessageContent,
}

#[derive(Debug, Deserialize)]
struct ChatMessageContent {
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    reasoning_content: Option<String>,
}

/// Call OpenAI-compatible API to get a suggested name for a single file/folder
async fn call_ai_api(
    api_url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    original_name: &str,
) -> Result<String, String> {
    let url = format!("{}/chat/completions", api_url.trim_end_matches('/'));

    let today = chrono::Local::now().format("%Y%m%d").to_string();
    let system_prompt = system_prompt.replace("{DATE}", &today);

    let request = ChatRequest {
        model: model.to_string(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: format!("请根据命名规则重命名，只返回新文件名：{}", original_name),
            },
        ],
        temperature: Some(0.3),
        max_tokens: Some(100),
        thinking: Some(ThinkingConfig {
            thinking_type: "disabled".to_string(),
        }),
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("AI API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("AI API error ({}): {}", status, body));
    }

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    eprintln!("[AI] Raw response: {}", &response_text[..response_text.len().min(500)]);

    let chat_response: ChatResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse AI response: {} — raw: {}", e, &response_text[..response_text.len().min(200)]))?;

    let suggested_name = chat_response
        .choices
        .first()
        .and_then(|c| c.message.content.as_deref())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if suggested_name.is_empty() {
        return Err("AI returned empty response".to_string());
    }

    Ok(suggested_name)
}

/// Detect whether the given paths are files, folders, or mixed
fn detect_item_type(paths: &[String]) -> String {
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

    if has_folder {
        "folder".to_string()
    } else {
        "file".to_string()
    }
}

/// Resolve filename conflict by appending _ + random 4-digit number
fn resolve_conflict_path(path: &std::path::Path) -> std::path::PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }

    let mut rng = rand::thread_rng();
    let parent = path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let ext = path.extension().map(|e| e.to_string_lossy().to_string());

    for _ in 0..100 {
        let suffix: u16 = rng.gen_range(1000..9999);
        let new_name = if let Some(ref ext) = ext {
            format!("{}_{}.{}", stem, suffix, ext)
        } else {
            format!("{}_{}", stem, suffix)
        };
        let new_path = parent.join(&new_name);
        if !new_path.exists() {
            return new_path;
        }
    }

    // Fallback: use timestamp-based suffix
    let fallback = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    if let Some(ref ext) = ext {
        parent.join(format!("{}_{}.{}", stem, fallback, ext))
    } else {
        parent.join(format!("{}_{}", stem, fallback))
    }
}

/// Preview AI rename results (without actually renaming)
#[tauri::command]
pub async fn ai_preview_rename(files: Vec<String>) -> Result<Vec<PreviewItem>, String> {
    let cfg = load_ai_config()?;

    if cfg.api_key.is_empty() {
        return Err("AI API key is not configured. Please set it in Settings.".to_string());
    }

    let item_type = detect_item_type(&files);
    if item_type == "mixed" {
        return Err("Mixed files and folders are not supported for AI rename".to_string());
    }

    let system_prompt = if item_type == "folder" {
        &cfg.folder_prompt
    } else {
        &cfg.file_prompt
    };

    let mut results = Vec::new();
    let mut preview_set: HashMap<String, usize> = HashMap::new();

    // First pass: get AI suggestions
    for file_path in &files {
        let original = file_utils::get_original_name(file_path);
        let ext = file_utils::get_extension(file_path);
        let display_original = if ext.is_empty() {
            original.to_string()
        } else {
            format!("{}.{}", original, ext)
        };

        let suggested = call_ai_api(
            &cfg.api_url,
            &cfg.api_key,
            &cfg.model,
            system_prompt,
            &display_original,
        )
        .await
        .unwrap_or_else(|e| {
            eprintln!("AI rename error for {}: {}", file_path, e);
            display_original.clone()
        });

        let valid = file_utils::is_valid_filename(&suggested);

        results.push(PreviewItem {
            original: display_original,
            preview: suggested.clone(),
            conflict: false,
            valid,
        });

        *preview_set.entry(suggested).or_insert(0) += 1;
    }

    // Second pass: mark batch conflicts
    for item in &mut results {
        if preview_set.get(&item.preview).copied().unwrap_or(0) > 1 {
            item.conflict = true;
        }
    }

    Ok(results)
}

/// Apply AI rename (preview + rename)
#[tauri::command]
pub async fn ai_rename(files: Vec<String>) -> Result<Vec<super::template::RenameResult>, String> {
    let previews = ai_preview_rename_internal(&files).await?;

    let mut results = Vec::new();

    for (i, file_path) in files.iter().enumerate() {
        let preview = &previews[i];

        if preview.conflict {
            results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: None,
                success: false,
                error: Some("Name conflict detected".to_string()),
            });
            continue;
        }

        if !preview.valid {
            results.push(super::template::RenameResult {
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
        let new_path = resolve_conflict_path(&parent.join(&preview.preview));
        let new_name = new_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if *file_path == new_path.to_string_lossy().to_string() {
            results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: Some(new_name),
                success: true,
                error: None,
            });
            continue;
        }

        match std::fs::rename(file_path, &new_path) {
            Ok(()) => results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: Some(new_name),
                success: true,
                error: None,
            }),
            Err(e) => results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: None,
                success: false,
                error: Some(e.to_string()),
            }),
        }
    }

    Ok(results)
}

/// Internal: preview without the tauri command wrapper (for use by perform_direct_ai_rename)
async fn ai_preview_rename_internal(files: &[String]) -> Result<Vec<PreviewItem>, String> {
    let cfg = load_ai_config()?;

    if cfg.api_key.is_empty() {
        return Err("AI API key is not configured. Please set it in Settings.".to_string());
    }

    let item_type = detect_item_type(files);
    let system_prompt = if item_type == "folder" {
        &cfg.folder_prompt
    } else {
        &cfg.file_prompt
    };

    let mut results = Vec::new();
    let mut preview_set: HashMap<String, usize> = HashMap::new();

    for file_path in files {
        let original = file_utils::get_original_name(file_path);
        let ext = file_utils::get_extension(file_path);
        let display_original = if ext.is_empty() {
            original.to_string()
        } else {
            format!("{}.{}", original, ext)
        };

        let suggested = call_ai_api(
            &cfg.api_url,
            &cfg.api_key,
            &cfg.model,
            system_prompt,
            &display_original,
        )
        .await
        .unwrap_or_else(|e| {
            eprintln!("AI rename error for {}: {}", file_path, e);
            display_original.clone()
        });

        let valid = file_utils::is_valid_filename(&suggested);

        results.push(PreviewItem {
            original: display_original,
            preview: suggested.clone(),
            conflict: false,
            valid,
        });

        *preview_set.entry(suggested).or_insert(0) += 1;
    }

    for item in &mut results {
        if preview_set.get(&item.preview).copied().unwrap_or(0) > 1 {
            item.conflict = true;
        }
    }

    Ok(results)
}

/// Perform direct AI rename from context menu (called by perform_direct_rename)
pub async fn perform_direct_ai_rename(
    _app: &AppHandle,
    paths: Vec<String>,
) -> Result<String, String> {
    if paths.is_empty() {
        return Err("No files provided".to_string());
    }

    let item_type = detect_item_type(&paths);
    if item_type == "mixed" {
        return Err("Mixed files and folders are not supported for AI rename".to_string());
    }

    let previews = ai_preview_rename_internal(&paths).await?;
    let mut results = Vec::new();

    for (i, file_path) in paths.iter().enumerate() {
        let preview = &previews[i];

        if preview.conflict {
            results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: None,
                success: false,
                error: Some("Name conflict detected".to_string()),
            });
            continue;
        }

        if !preview.valid {
            results.push(super::template::RenameResult {
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
        let new_path = resolve_conflict_path(&parent.join(&preview.preview));
        let new_name = new_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if *file_path == new_path.to_string_lossy().to_string() {
            results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: Some(new_name),
                success: true,
                error: None,
            });
            continue;
        }

        match std::fs::rename(file_path, &new_path) {
            Ok(()) => results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: Some(new_name),
                success: true,
                error: None,
            }),
            Err(e) => results.push(super::template::RenameResult {
                original: preview.original.clone(),
                renamed: None,
                success: false,
                error: Some(e.to_string()),
            }),
        }
    }

    let success = results.iter().filter(|r| r.success).count();
    let failed = results.iter().filter(|r| !r.success).count();

    if failed > 0 {
        let errors: Vec<String> = results
            .iter()
            .filter(|r| !r.success)
            .map(|r| {
                format!(
                    "{}: {}",
                    r.original,
                    r.error.as_deref().unwrap_or("unknown")
                )
            })
            .collect();
        Err(format!(
            "AI renamed {} items, {} failed: {}",
            success,
            failed,
            errors.join("; ")
        ))
    } else {
        let item_label = if item_type == "folder" {
            "folders"
        } else {
            "files"
        };
        Ok(format!(
            "AI successfully renamed {} {}",
            success, item_label
        ))
    }
}

/// Test AI API connection with current settings
#[tauri::command]
pub async fn test_ai_connection(
    api_url: String,
    api_key: String,
    model: String,
) -> Result<String, String> {
    if api_key.is_empty() {
        return Err("API key is empty".to_string());
    }

    let url = format!("{}/chat/completions", api_url.trim_end_matches('/'));

    let request = ChatRequest {
        model: model.clone(),
        messages: vec![ChatMessage {
            role: "user".to_string(),
            content: "Hello, respond with just 'OK'.".to_string(),
        }],
        temperature: None,
        max_tokens: Some(10),
        thinking: Some(ThinkingConfig {
            thinking_type: "disabled".to_string(),
        }),
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error ({}): {}", status, body));
    }

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    eprintln!("[AI] Test connection raw response: {}", &response_text[..response_text.len().min(300)]);

    let chat_response: ChatResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {} — raw: {}", e, &response_text[..response_text.len().min(200)]))?;

    let content = chat_response
        .choices
        .first()
        .and_then(|c| c.message.content.as_deref())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if content.is_empty() {
        return Err("AI returned empty response".to_string());
    }

    Ok(format!("Connection successful! Model: {}", model))
}