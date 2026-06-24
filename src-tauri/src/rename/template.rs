use chrono::Local;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::file_utils;

/// Template configuration stored in JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateConfig {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub name_zh: String,
    #[serde(default)]
    pub name_en: String,
    pub pattern: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Variable type extracted from template pattern
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum VarType {
    Date,
    Time,
    Ext,
    ParentDir,
    Input,
    Counter,
    OriginalName,
}

/// A single variable parsed from a template pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariable {
    #[serde(rename = "varType")]
    pub var_type: VarType,
    pub format: Option<String>,
    pub label: Option<String>,
}

/// Preview result for a single file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewItem {
    pub original: String,
    pub preview: String,
    pub conflict: bool,
    pub valid: bool,
}

/// Result of applying a rename
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameResult {
    pub original: String,
    pub renamed: Option<String>,
    pub success: bool,
    pub error: Option<String>,
}

/// Parse a template pattern string into a list of TemplateVariable
pub fn parse_template(pattern: &str) -> Vec<TemplateVariable> {
    let re = Regex::new(r"\{([A-Za-z]+)(?::([^}]+))?\}").unwrap();
    let mut vars = Vec::new();

    for cap in re.captures_iter(pattern) {
        let var_name = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        let arg = cap.get(2).map(|m| m.as_str().to_string());

        let (var_type, label) = match var_name {
            "Date" => (VarType::Date, None),
            "Time" => (VarType::Time, None),
            "Ext" => (VarType::Ext, None),
            "ParentDir" => (VarType::ParentDir, None),
            "Counter" => (VarType::Counter, None),
            "OriginalName" => (VarType::OriginalName, None),
            other if other.starts_with("Input") => {
                let label = arg.clone();
                (VarType::Input, label)
            }
            _ => continue, // Skip unknown variables
        };

        let format = match &var_type {
            VarType::Date | VarType::Time | VarType::Counter => arg,
            VarType::Input => None,
            _ => arg,
        };

        vars.push(TemplateVariable {
            var_type,
            format,
            label,
        });
    }

    vars
}

/// Convert user-friendly date/time format to chrono format specifiers
/// e.g. "YYYYMMDD" → "%Y%m%d", "YYYY-MM-DD HH:mm" → "%Y-%m-%d %H:%M"
fn convert_date_format(user_format: &str) -> String {
    user_format
        .replace("YYYY", "%Y")
        .replace("MM", "%m")
        .replace("DD", "%d")
        .replace("HH", "%H")
        .replace("mm", "%M")
        .replace("SS", "%S")
}

/// Render a single filename from a template, variable values, and counter
pub fn render_filename(
    template: &str,
    vars: &HashMap<String, String>,
    counter: u32,
    file_path: &str,
) -> String {
    let now = Local::now();
    let ext = file_utils::get_extension(file_path);
    let original_name = file_utils::get_original_name(file_path);
    let parent_dir = file_utils::get_parent_dir_name(file_path);

    let re = Regex::new(r"\{([A-Za-z]+)(?::([^}]+))?\}").unwrap();

    re.replace_all(template, |caps: &regex::Captures| {
        let var_name = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let arg = caps.get(2).map(|m| m.as_str());

        match var_name {
            "Date" => {
                let fmt = arg.unwrap_or("%Y%m%d");
                let chrono_fmt = convert_date_format(fmt);
                now.format(&chrono_fmt).to_string()
            }
            "Time" => {
                let fmt = arg.unwrap_or("%H%M%S");
                let chrono_fmt = convert_date_format(fmt);
                now.format(&chrono_fmt).to_string()
            }
            "Ext" => ext.to_string(),
            "ParentDir" => parent_dir.to_string(),
            "OriginalName" => original_name.to_string(),
            "Counter" => {
                let fmt = arg.unwrap_or("1");
                format_counter(counter, fmt)
            }
            other if other.starts_with("Input") => {
                let key = arg.unwrap_or("value");
                vars.get(key).cloned().unwrap_or_default()
            }
            _ => caps.get(0).unwrap().as_str().to_string(),
        }
    })
    .to_string()
}

/// Format a counter value according to a format string
fn format_counter(counter: u32, format: &str) -> String {
    if format == "1" {
        counter.to_string()
    } else {
        let digits = format.len();
        format!("{:0width$}", counter, width = digits)
    }
}

/// Preview rename results for a list of files
pub fn preview_rename(
    files: &[String],
    template: &str,
    var_values: &HashMap<String, String>,
    counter_start: u32,
) -> Vec<PreviewItem> {
    let mut results = Vec::new();
    let mut preview_set: HashMap<String, usize> = HashMap::new();

    // First pass: generate preview names
    for (i, file_path) in files.iter().enumerate() {
        let original = file_utils::get_original_name(file_path);
        let ext = file_utils::get_extension(file_path);
        let counter = counter_start + i as u32;

        let preview = render_filename(template, var_values, counter, file_path);
        let valid = file_utils::is_valid_filename(&preview);

        results.push(PreviewItem {
            original: if ext.is_empty() { original.to_string() } else { format!("{}.{}", original, ext) },
            preview: preview.clone(),
            conflict: false,
            valid,
        });

        *preview_set.entry(preview).or_insert(0) += 1;
    }

    // Second pass: mark conflicts
    for item in &mut results {
        if preview_set.get(&item.preview).copied().unwrap_or(0) > 1 {
            item.conflict = true;
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_template_with_date() {
        let vars = parse_template("{Date:YYYYMMDD}_{Input:topic}.{Ext}");
        assert_eq!(vars.len(), 3);
        assert_eq!(vars[0].var_type, VarType::Date);
        assert_eq!(vars[0].format, Some("YYYYMMDD".to_string()));
        assert_eq!(vars[1].var_type, VarType::Input);
        assert_eq!(vars[1].label, Some("topic".to_string()));
        assert_eq!(vars[2].var_type, VarType::Ext);
    }

    #[test]
    fn test_parse_template_with_counter() {
        let vars = parse_template("{Counter:001}_{OriginalName}.{Ext}");
        assert_eq!(vars.len(), 3);
        assert_eq!(vars[0].var_type, VarType::Counter);
        assert_eq!(vars[0].format, Some("001".to_string()));
        assert_eq!(vars[1].var_type, VarType::OriginalName);
        assert_eq!(vars[2].var_type, VarType::Ext);
    }

    #[test]
    fn test_parse_template_with_time() {
        let vars = parse_template("{Time:HH-mm-ss}_{Input:username}.{Ext}");
        assert_eq!(vars.len(), 3);
        assert_eq!(vars[0].var_type, VarType::Time);
        assert_eq!(vars[0].format, Some("HH-mm-ss".to_string()));
        assert_eq!(vars[1].var_type, VarType::Input);
        assert_eq!(vars[1].label, Some("username".to_string()));
        assert_eq!(vars[2].var_type, VarType::Ext);
    }

    #[test]
    fn test_parse_template_empty() {
        let vars = parse_template("no_variables_here.txt");
        assert_eq!(vars.len(), 0);
    }

    #[test]
    fn test_render_filename_with_input() {
        let mut vars = HashMap::new();
        vars.insert("topic".to_string(), "周报".to_string());
        let result = render_filename(
            "{Date:20260622}_{Input:topic}.{Ext}",
            &vars,
            1,
            r"C:\test\report.txt",
        );
        assert_eq!(result, "20260622_周报.txt");
    }

    #[test]
    fn test_render_filename_with_date_format() {
        let vars = HashMap::new();
        let result = render_filename(
            "{Date:YYYYMMDD}.{Ext}",
            &vars,
            1,
            r"C:\test\notes.txt",
        );
        // Should render today's date in YYYYMMDD format, not the literal "YYYYMMDD"
        let today = Local::now().format("%Y%m%d").to_string();
        assert_eq!(result, format!("{}.txt", today));
    }

    #[test]
    fn test_render_filename_with_time_format() {
        let vars = HashMap::new();
        let result = render_filename(
            "{Date:YYYY-MM-DD}_{Time:HH-mm-SS}.{Ext}",
            &vars,
            1,
            r"C:\test\log.txt",
        );
        // Should render actual date and time, not the literal format strings
        assert!(!result.contains("YYYY"));
        assert!(!result.contains("HH-mm-SS"));
        assert!(result.ends_with(".txt"));
    }

    #[test]
    fn test_render_filename_with_counter() {
        let vars = HashMap::new();
        let result = render_filename(
            "{Counter:001}_{OriginalName}.{Ext}",
            &vars,
            5,
            r"C:\test\photo.jpg",
        );
        assert_eq!(result, "005_photo.jpg");
    }

    #[test]
    fn test_render_filename_with_parent_dir() {
        let vars = HashMap::new();
        let result = render_filename(
            "{ParentDir}_{OriginalName}.{Ext}",
            &vars,
            1,
            r"C:\myfolder\data.csv",
        );
        assert_eq!(result, "myfolder_data.csv");
    }

    #[test]
    fn test_format_counter_padded() {
        assert_eq!(format_counter(1, "001"), "001");
        assert_eq!(format_counter(42, "001"), "042");
        assert_eq!(format_counter(100, "001"), "100");
        assert_eq!(format_counter(5, "0001"), "0005");
    }

    #[test]
    fn test_format_counter_plain() {
        assert_eq!(format_counter(1, "1"), "1");
        assert_eq!(format_counter(99, "1"), "99");
    }

    #[test]
    fn test_preview_rename_basic() {
        let files = vec![
            "C:\\test\\report.txt".to_string(),
            "C:\\test\\photo.jpg".to_string(),
        ];
        let mut vars = HashMap::new();
        vars.insert("topic".to_string(), "周报".to_string());
        let results = preview_rename(&files, "{Date:20260622}_{Input:topic}.{Ext}", &vars, 1);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].preview, "20260622_周报.txt");
        assert!(results[0].valid);
        assert!(!results[0].conflict);
        assert_eq!(results[1].preview, "20260622_周报.jpg");
        assert!(results[1].valid);
        assert!(!results[1].conflict);
    }

    #[test]
    fn test_preview_rename_conflict_detection() {
        let files = vec![
            "C:\\test\\a.txt".to_string(),
            "C:\\test\\b.txt".to_string(),
        ];
        let vars = HashMap::new();
        let results = preview_rename(&files, "{OriginalName}.{Ext}", &vars, 1);
        assert_eq!(results.len(), 2);
        // Both have different original names, so no conflict
        assert!(!results[0].conflict);
        assert!(!results[1].conflict);
    }

    #[test]
    fn test_preview_rename_counter_increment() {
        let files = vec![
            "C:\\test\\a.txt".to_string(),
            "C:\\test\\b.txt".to_string(),
            "C:\\test\\c.txt".to_string(),
        ];
        let vars = HashMap::new();
        let results = preview_rename(&files, "file_{Counter:001}.{Ext}", &vars, 1);
        assert_eq!(results[0].preview, "file_001.txt");
        assert_eq!(results[1].preview, "file_002.txt");
        assert_eq!(results[2].preview, "file_003.txt");
    }

    #[test]
    fn test_preview_rename_invalid_filename() {
        let files = vec!["C:\\test\\test.txt".to_string()];
        let mut vars = HashMap::new();
        vars.insert("topic".to_string(), "bad:name".to_string());
        let results = preview_rename(&files, "{Input:topic}.{Ext}", &vars, 1);
        assert_eq!(results.len(), 1);
        assert!(!results[0].valid);
    }

    #[test]
    fn test_actual_rename_roundtrip() {
        use std::fs;
        use std::io::Write;

        // Create a temp directory
        let tmp = std::env::temp_dir().join("smartrename_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();

        // Create test files
        let files = vec!["report.txt", "photo.jpg", "notes.docx"];
        for f in &files {
            let path = tmp.join(f);
            let mut file = fs::File::create(&path).unwrap();
            file.write_all(b"test content").unwrap();
        }

        // Verify files exist
        for f in &files {
            assert!(tmp.join(f).exists(), "File {} should exist", f);
        }

        // Rename via template
        let paths: Vec<String> = files.iter().map(|f| tmp.join(f).to_string_lossy().to_string()).collect();
        let mut vars = HashMap::new();
        vars.insert("topic".to_string(), "周报".to_string());

        let results = preview_rename(&paths, "{Date:20260622}_{Input:topic}.{Ext}", &vars, 1);
        assert_eq!(results.len(), 3);
        assert!(results[0].preview.starts_with("20260622_周报"));
        assert!(results[1].preview.starts_with("20260622_周报"));
        assert!(results[2].preview.starts_with("20260622_周报"));

        // Actually rename the first file
        let new_path = tmp.join(&results[0].preview);
        fs::rename(&paths[0], &new_path).unwrap();
        assert!(new_path.exists());
        assert!(!tmp.join("report.txt").exists());

        // Cleanup
        let _ = fs::remove_dir_all(&tmp);
    }
}