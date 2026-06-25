# Windows Context Menu Troubleshooting Guide

This document summarizes lessons learned from debugging the right-click context menu integration, to prevent similar issues in the future.

## Key Lesson: `%*` vs `%1` in Registry Commands

### The Problem

Using `"%*"` in the registry command **does NOT work** for Windows shell context menu entries. The `%*` variable expands to an **empty string**, resulting in the application receiving `""` as the argument instead of the file path.

### Root Cause

In Windows registry shell commands:
- `%1` — The selected file/folder path (passed by Windows Explorer)
- `%*` — All command-line arguments (but for shell commands, this does **NOT** include `%1`)
- `%V` — File/folder path (alternative to `%1`, also works for folder background)

The `%*` variable works in **batch scripts** (`.bat`/`.cmd`), but in **registry shell commands**, Windows only passes the file path via `%1` (or `%V`). `%*` is empty because no additional arguments are passed beyond `%1`.

### The Fix

Always use `%1` for file/folder context menu commands:

```rust
// WRONG - %* expands to empty string in shell commands
let command = format!("\"{}\" \"%*\"", exe_path);

// CORRECT - %1 is the file/folder path passed by Windows Explorer
let command = format!("\"{}\" \"%1\"", exe_path);
```

## Registry Paths

The context menu registers under `HKEY_CURRENT_USER` (no admin required):

| Target | Shell Path | Command Path |
|--------|-----------|--------------|
| Files | `Software\Classes\*\shell\SmartRename` | `...\command` |
| Folders | `Software\Classes\Directory\shell\SmartRename` | `...\command` |
| Folder Background | `Software\Classes\Directory\Background\shell\SmartRename` | `...\command` |

## Common Pitfalls

### 1. Registry Not Updated After Code Changes

**Symptom**: Right-click still triggers old behavior after modifying `context_menu.rs`.

**Cause**: The registry entries still point to the old command. Changing the Rust code does NOT automatically update the registry.

**Fix**: Always **uninstall then reinstall** the context menu in Settings → Templates after modifying `context_menu.rs`.

### 2. Single Instance Plugin Argument Forwarding

**Symptom**: Files don't appear in the rename area when right-clicking while the app is already running.

**Cause**: The `tauri-plugin-single-instance` plugin intercepts the second launch. The callback must:
1. Show the main window
2. Filter args (skip exe path, verify paths exist)
3. Emit a `new-files` event to the frontend

**Key Code** (`src-tauri/src/lib.rs`):
```rust
.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
        let _ = window.unminimize();
        let _ = window.show();
    }
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
```

### 3. Frontend Event Listener Race Conditions

**Symptom**: `new-files` event is emitted but not received by the frontend.

**Cause**: The event listener was in a `useEffect` with `i18n` in the dependency array. If `i18n` reference changes, the listener is unregistered and re-registered, potentially missing events.

**Fix**: Separate the `new-files` listener into its own `useEffect` with minimal dependencies:

```typescript
useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    const setupListener = async () => {
        const unlisten = await listen<string[]>("new-files", (event) => {
            if (event.payload.length > 0) {
                replaceFiles(event.payload);
            }
        });
        unlistenFn = unlisten;
    };
    setupListener();
    return () => { if (unlistenFn) unlistenFn(); };
}, [replaceFiles]); // Only depend on stable replaceFiles callback
```

### 4. Window Close Behavior

The system tray plugin prevents the window from being destroyed on close — it hides instead. This ensures event listeners remain active when the app is in the system tray.

**Key Code** (`src-tauri/src/plugins/system_tray.rs`):
```rust
.on_window_ready(move |window| {
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            let _ = window_clone.hide();
            api.prevent_close();
        }
    });
})
```

## Debugging Steps

1. **Check Rust console output**: Look for `[SmartRename]` prefixed logs
   - `Setup: initial_files = [...]` — CLI args captured at startup
   - `Single instance callback: args = [...]` — Args from second launch
   - `Single instance: filtered file_paths = [...]` — After filtering
   - `parse_cli_args: returning N files: [...]` — Files returned to frontend

2. **Check browser DevTools console** (F12): Look for `[SmartRename]` prefixed logs
   - `Received 'new-files' event: [...]` — Event received by frontend
   - `files changed: N files` — State update triggered
   - `replaceFiles called with: [...]` — File replacement executed

3. **Verify registry entries**: Run `regedit` and check:
   - `HKEY_CURRENT_USER\Software\Classes\*\shell\SmartRename\command`
   - The default value should be: `"C:\path\to\smart-rename.exe" "%1"`

4. **Reinstall context menu**: If registry is stale, uninstall and reinstall in Settings → Templates
