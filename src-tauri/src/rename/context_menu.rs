/// Windows context menu integration via registry
/// Adds "Smart Rename" to the right-click menu for all files (*)

#[cfg(target_os = "windows")]
const REG_PATH: &str = "Software\\Classes\\*\\shell\\SmartRename";
#[cfg(target_os = "windows")]
const REG_COMMAND_PATH: &str = "Software\\Classes\\*\\shell\\SmartRename\\command";

/// Install the context menu by writing to Windows registry
#[cfg(target_os = "windows")]
pub fn install() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    // Create the shell key
    let (shell_key, _) =
        hkcu.create_subkey(REG_PATH).map_err(|e| format!("Failed to create registry key: {}", e))?;
    shell_key
        .set_value("", &"Smart Rename")
        .map_err(|e| format!("Failed to set default value: {}", e))?;
    shell_key
        .set_value("Icon", &get_exe_path())
        .map_err(|e| format!("Failed to set icon: {}", e))?;

    // Create the command key
    let (cmd_key, _) = hkcu
        .create_subkey(REG_COMMAND_PATH)
        .map_err(|e| format!("Failed to create command registry key: {}", e))?;
    let command = format!("\"{}\" \"%1\"", get_exe_path());
    cmd_key
        .set_value("", &command)
        .map_err(|e| format!("Failed to set command value: {}", e))?;

    Ok(())
}

/// Uninstall the context menu by removing registry entries
#[cfg(target_os = "windows")]
pub fn uninstall() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    hkcu.delete_subkey_all(REG_COMMAND_PATH)
        .map_err(|e| format!("Failed to delete command key: {}", e))?;
    hkcu.delete_subkey_all(REG_PATH)
        .map_err(|e| format!("Failed to delete shell key: {}", e))?;

    Ok(())
}

/// Check if the context menu is installed
#[cfg(target_os = "windows")]
pub fn is_installed() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(REG_COMMAND_PATH).is_ok()
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