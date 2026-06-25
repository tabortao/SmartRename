/// Windows context menu integration via registry
/// Adds "Smart Rename" to the right-click menu for files, folders, and folder background

#[cfg(target_os = "windows")]
const REG_PATHS: &[(&str, &str)] = &[
    // Files
    ("Software\\Classes\\*\\shell\\SmartRename", "Software\\Classes\\*\\shell\\SmartRename\\command"),
    // Folders
    ("Software\\Classes\\Directory\\shell\\SmartRename", "Software\\Classes\\Directory\\shell\\SmartRename\\command"),
    // Folder background
    ("Software\\Classes\\Directory\\Background\\shell\\SmartRename", "Software\\Classes\\Directory\\Background\\shell\\SmartRename\\command"),
];

/// Install the context menu by writing to Windows registry
#[cfg(target_os = "windows")]
pub fn install() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let exe_path = get_exe_path();
    // Use %1 for file/folder right-click (Windows passes the selected path as %1)
    // For folder background, %V passes the current directory path
    // Using %1 covers both files and folders; folder background passes %V as %1
    let command = format!("\"{}\" \"%1\"", exe_path);

    for (shell_path, cmd_path) in REG_PATHS {
        let (shell_key, _) = hkcu
            .create_subkey(shell_path)
            .map_err(|e| format!("Failed to create registry key {}: {}", shell_path, e))?;
        shell_key
            .set_value("", &"Smart Rename")
            .map_err(|e| format!("Failed to set default value: {}", e))?;
        shell_key
            .set_value("Icon", &exe_path)
            .map_err(|e| format!("Failed to set icon: {}", e))?;

        let (cmd_key, _) = hkcu
            .create_subkey(cmd_path)
            .map_err(|e| format!("Failed to create command registry key {}: {}", cmd_path, e))?;
        cmd_key
            .set_value("", &command)
            .map_err(|e| format!("Failed to set command value: {}", e))?;
    }

    Ok(())
}

/// Uninstall the context menu by removing registry entries
#[cfg(target_os = "windows")]
pub fn uninstall() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    for (shell_path, cmd_path) in REG_PATHS {
        // Delete command subkey first, then shell key
        let _ = hkcu.delete_subkey_all(cmd_path);
        let _ = hkcu.delete_subkey_all(shell_path);
    }

    Ok(())
}

/// Check if the context menu is installed (checks the file path)
#[cfg(target_os = "windows")]
pub fn is_installed() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    // Check the first (file) path
    hkcu.open_subkey(REG_PATHS[0].1).is_ok()
}

/// Get the current executable path
#[cfg(target_os = "windows")]
fn get_exe_path() -> String {
    std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "smart-rename.exe".to_string())
}

// Non-Windows stubs
#[cfg(not(target_os = "windows"))]
pub fn install() -> Result<(), String> {
    Err("Context menu integration is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn uninstall() -> Result<(), String> {
    Err("Context menu integration is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn is_installed() -> bool {
    false
}