# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-06-22

### Added

- Smart file rename functionality with customizable naming templates
- Template engine with variable support: `{Date}`, `{Time}`, `{Ext}`, `{ParentDir}`, `{OriginalName}`, `{Input:xxx}`, `{Counter}`
- Real-time preview of rename results with conflict detection
- Dynamic form auto-generated from template variables
- Template manager in settings page (create, edit, delete templates)
- Windows context menu integration ("Smart Rename" right-click option)
- Install/uninstall context menu from settings page
- Rust backend modules: `rename/` (template engine, file utils, commands, context menu)
- New Tauri commands: `parse_cli_args`, `parse_template`, `preview_rename`, `apply_rename`, `get_templates`, `save_template`, `delete_template`, `install_context_menu`, `uninstall_context_menu`, `is_context_menu_installed`
- New frontend components: `FileList`, `DynamicForm`, `TemplateSelector`, `TemplateEditorDialog`, `RenameControls`
- `useRename` hook for rename state management
- Label shadcn/ui component
- New Cargo dependencies: `regex`, `chrono`, `uuid`, `winreg`
- Built-in default templates: Date-Topic, Date-Topic-Version, Counter-Prefix
- `save_app_config` / `load_app_config` Tauri commands for persistent key-value config storage
- Last selected template persistence: auto-saves template ID to `config.json` (exe directory), auto-restores on next launch
- Template migration: missing system default templates are auto-added to existing `templates.json` on startup

### Fixed

- Context menu file loading: capture `std::env::args()` BEFORE `tauri::Builder::run()` to avoid Tauri arg consumption
- Last template auto-select: `load_app_config` failure no longer blocks entire init (separated from `Promise.all`)
- `replaceFiles` now auto-restores last template from config instead of resetting to null
- Chinese/English language switching: removed `LanguageDetector` plugin, replaced with manual `localStorage`-based language management
- Stale event listener dependencies in `home.tsx` (`addFiles` replaced with `replaceFiles`)
- Template selector and file list column headers now use i18n translations

### Changed

- Clear files button: removed confirmation dialog, now clears immediately
- Renamed project from `tauri-app-template` to `smart-rename` across all config files
- Updated app identifier from `com.template.tauri-app` to `com.smartrename.app`
- Replaced greet demo on home page with SmartRename main UI
- Updated settings page with Templates management section
- Updated about page description to reflect SmartRename functionality
- Updated CLAUDE.md with SmartRename project documentation

## [0.2.2] - 2026-06-22

### Added

- `docs/TAURI_TEMPLATE_PITFALLS.md` — troubleshooting guide covering the three issues encountered right after scaffolding the project from the official Tauri v2 template

### Changed

- Disabled Tauri update artifact signing requirement for local builds by setting `bundle.createUpdaterArtifacts` to `false` in `src-tauri/tauri.conf.json`
- Removed `plugins.updater` block from `tauri.conf.json` (placeholder values caused runtime panic)
- Commented out `tauri_plugin_updater` registration in `src-tauri/src/lib.rs` release build path

### Fixed

- Fixed `pnpm tauri build` failing with "A public key has been found, but no private key" error
- Fixed built app crashing on launch with `PluginInitialization("updater", "Error deserializing 'plugins.updater'...")`
- Resolved pnpm `[ERR_PNPM_IGNORED_BUILDS] esbuild@0.27.4` postinstall block via `pnpm approve-builds`

## [0.2.1] - 2026-06-21

### Added

- Initial SmartRename Tauri template project setup
- React 19 + Vite + Tailwind CSS v4 + shadcn/ui frontend
- Rust backend with Tauri v2

<!--

## Template

## [version] - YYYY-MM-DD

### Added

- for new features.

### Changed

- for changes in existing functionality.

### Deprecated

- for soon-to-be removed features.

### Removed

- for now removed features.

### Fixed

- for any bug fixes.

### Security

- in case of vulnerabilities.

-->
