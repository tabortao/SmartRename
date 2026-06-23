use std::path::Path;

/// Extract extension from filename (without the dot)
pub fn get_extension(filename: &str) -> &str {
    Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
}

/// Extract parent directory name from a full path
pub fn get_parent_dir_name(path: &str) -> &str {
    Path::new(path)
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("")
}

/// Extract original filename without extension
pub fn get_original_name(path: &str) -> &str {
    Path::new(path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
}

/// Check if filename contains invalid characters (< > : " / \ | ? *)
pub fn is_valid_filename(name: &str) -> bool {
    if name.is_empty() {
        return false;
    }
    let invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    !name.chars().any(|c| invalid_chars.contains(&c))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_extension_with_ext() {
        assert_eq!(get_extension("report.txt"), "txt");
        assert_eq!(get_extension("photo.jpg"), "jpg");
    }

    #[test]
    fn test_get_extension_no_ext() {
        assert_eq!(get_extension("Makefile"), "");
        assert_eq!(get_extension("noext"), "");
    }

    #[test]
    fn test_get_extension_multiple_dots() {
        assert_eq!(get_extension("archive.tar.gz"), "gz");
    }

    #[test]
    fn test_get_parent_dir_name() {
        assert_eq!(get_parent_dir_name(r"C:\myfolder\data.csv"), "myfolder");
        assert_eq!(get_parent_dir_name(r"C:\test\sub\file.txt"), "sub");
    }

    #[test]
    fn test_get_original_name() {
        assert_eq!(get_original_name(r"C:\test\report.txt"), "report");
        assert_eq!(get_original_name(r"C:\test\photo.jpg"), "photo");
    }

    #[test]
    fn test_is_valid_filename() {
        assert!(is_valid_filename("valid_name.txt"));
        assert!(is_valid_filename("my-file_2024.txt"));
        assert!(!is_valid_filename("bad:name.txt"));
        assert!(!is_valid_filename("bad<name>.txt"));
        assert!(!is_valid_filename("bad/name.txt"));
        assert!(!is_valid_filename(""));
    }
}