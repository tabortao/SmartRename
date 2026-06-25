# Template Shortcuts & Folder Rename Support Plan

## Summary

Two features: (1) assign global keyboard shortcuts to templates for one-press rename of loaded items; (2) support folder renaming via right-click, drag-drop, and folder-specific templates.

## Status: Source Code COMPLETE — Build & Verification PENDING

All source code changes have been implemented. The remaining work is:
1. **Build** the application (`cargo test` → `pnpm tsc --noEmit` → `pnpm tauri build`)
2. **Reinstall context menu** (old registry entries without folder support may still be active)
3. **Update ChangeLog**

---

## Implementation Check: All Code Changes Verified

### Rust Backend ✅

| File | Change | Status |
|------|--------|--------|
| `src-tauri/src/rename/file_utils.rs:L28-L33` | `is_directory()` function | ✅ Done |
| `src-tauri/src/rename/template.rs:L62-L67` | `has_input_variable()` function | ✅ Done |
| `src-tauri/src/rename/commands.rs:L362-L392` | `detect_item_type` + `has_input_variable` commands | ✅ Done |
| `src-tauri/src/rename/commands.rs:L70-L173` | 9 default templates (6 file + 3 folder) | ✅ Done |
| `src-tauri/src/rename/context_menu.rs:L4-L12` | 3 registry paths (File, Directory, Directory\Background) | ✅ Done |
| `src-tauri/src/lib.rs:L60-L77` | All commands registered in invoke_handler | ✅ Done |

### Frontend ✅

| File | Change | Status |
|------|--------|--------|
| `src/hooks/use-rename.ts:L41-L75` | `ItemType` type, `itemType` state, `detectItemType`, refs | ✅ Done |
| `src/pages/home.tsx:L66-L133` | Template shortcut registration/unregistration | ✅ Done |
| `src/pages/settings.tsx:L38-L206` | Template shortcut settings UI + conflict handling | ✅ Done |
| `src/components/rename/file-list.tsx:L6-L38` | `itemType` prop, folder/file column headers | ✅ Done |
| `src/components/rename/dynamic-form.tsx:L13-L66` | `itemType` prop, hide `{Ext}` for folders | ✅ Done |
| `src/components/rename/rename-controls.tsx:L6-L34` | `itemType` prop, folder count label | ✅ Done |
| `src/components/rename/template-selector.tsx:L33-L59` | Folder template icon badge | ✅ Done |
| `src/components/shortcut-input.tsx` | Shortcut input component | ✅ Done |
| `src/lib/shortcut.ts` | `registerShortcut`, `unregisterShortcut`, `unregisterAllShortcut` | ✅ Done |

### i18n ✅

| File | Keys Added | Status |
|------|------------|--------|
| `src/i18n/locales/zh.json` | `folderCount`, `itemCount`, `originalFolderName`, `previewFolderName`, `dropItemsHere`, `mixedItemsWarning`, `folderNoExtWarning`, `shortcutNotAvailable` | ✅ Done |
| `src/i18n/locales/en.json` | Same keys in English | ✅ Done |

---

## Root Cause: Why Features Don't Work Yet

### Issue 1: Right-click folder doesn't show "Smart Rename"

The code in `context_menu.rs` correctly registers 3 registry paths:
```
HKCU\Software\Classes\*\shell\SmartRename              → files
HKCU\Software\Classes\Directory\shell\SmartRename       → folders  
HKCU\Software\Classes\Directory\Background\shell\SmartRename → folder background
```

**Root cause**: The user's registry still has the OLD context menu entries (only `*` path, no `Directory` paths). The application needs to be rebuilt AND the context menu must be reinstalled:
1. Build the new version
2. Open Settings → Templates → "卸载右键菜单" (Uninstall)
3. Then click "安装右键菜单" (Install Context Menu)

### Issue 2: Settings shortcuts don't appear

The settings page code at `settings.tsx:L157-L206` has the complete template shortcut UI. The `ShortcutInput` component exists at `src/components/shortcut-input.tsx`.

**Root cause**: The application was never rebuilt with the new code. The user is running the old binary.

---

## Remaining Steps

### Step 1: Build Verification

```bash
# 1. Run Rust tests
cargo test

# 2. TypeScript type check
pnpm tsc --noEmit

# 3. Full build
pnpm tauri build
```

### Step 2: Context Menu Reinstall

After building, the user must:
1. Launch the new version
2. Go to Settings → Templates
3. Click "卸载右键菜单" to remove old registry entries
4. Click "安装右键菜单" to install new entries with folder support

### Step 3: Update ChangeLog

Add entries for v0.3.2 to `docs/ChangeLog.md`.

---

## Verification Checklist

### Manual Tests

1. [ ] Right-click a **folder** → "Smart Rename" appears in context menu
2. [ ] Right-click a **file** → "Smart Rename" appears in context menu
3. [ ] Select folder via right-click → folder loads in app → folder templates visible
4. [ ] Drag folder into app → folder loads → rename with folder template works
5. [ ] Settings → Templates → ShortcutInput visible for each template
6. [ ] Templates with Input variables show "含输入变量，不可设快捷键" (N/A)
7. [ ] Assign Ctrl+Shift+1 to "日期_主题" template → select files → press shortcut → files renamed
8. [ ] Assign shortcut to two templates → conflict warning shown
9. [ ] Press shortcut with mixed files+folders → warning toast

### Rust Unit Tests

- [ ] `cargo test` passes all tests
- [ ] `has_input_variable` tests pass
- [ ] Existing template tests pass

### TypeScript Check

- [ ] `pnpm tsc --noEmit` passes with no errors

---

## Assumptions & Decisions

1. **Shortcut scope**: Template shortcuts only work when the app has items loaded. Registered on load, unregistered on clear.
2. **Mixed items**: Shortcuts show warning instead of renaming when mixed files+folders selected.
3. **Folder naming**: `{Ext}` returns empty string for folders (already handled by `get_extension`).
4. **Context menu**: Three registry paths. Must reinstall to pick up new paths.
5. **Template shortcuts disabled for Input templates**: Checked via `has_input_variable`. UI shows "N/A".
6. **Shortcut storage**: Stored in `config.json` via `save_app_config`/`load_app_config` with key `shortcut_template_{template_id}`.
7. **Shortcut conflicts**: Checked against other template shortcuts and main window shortcut.
8. **Folder templates**: Templates without `{Ext}` are folder-suitable. Shown with folder icon badge.