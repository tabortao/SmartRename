# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] - 2026-06-25

### Added

- Global rename shortcut: assign a single keyboard shortcut in Settings > Shortcuts to rename selected files/folders instantly with the default template
- File/folder template tabs in Settings > Templates: separate tabs for file templates (with `{Ext}`) and folder templates (without `{Ext}`)
- Per-type default template dropdowns: independently set default file template and default folder template
- Diagnostic logging in Rust backend (`parse_cli_args`, `detect_item_type`, single instance callback) and frontend (`new-files` event listener, file state changes) to help diagnose right-click context menu issues
- Troubleshooting guide: `docs/CONTEXT_MENU_TROUBLESHOOTING.md` documenting the `%*` vs `%1` issue and common pitfalls

### Changed

- Removed per-template shortcut settings from template management; replaced with a single global rename shortcut
- Rename shortcut auto-registers when files are loaded and auto-unregisters when files are cleared
- Default template layout: split into two rows (file template and folder template) for less crowded UI; labels simplified to "File Templates" / "Folder Templates" (removed "default" prefix)
- Separated `new-files` event listener into its own `useEffect` to prevent potential listener re-registration issues when `i18n` reference changes

### Fixed

- Right-click context menu files/folders not entering rename area: root cause was `%*` in registry command does not expand to the file path for Windows shell commands; changed to `%1` which Windows passes as the selected file/folder path
- Removed diagnostic toast notifications that were shown when files were received from context menu or CLI args
- Rename shortcut not re-registering after change in Settings: fixed empty callback in `rename-shortcut-changed` event handler by using version-based re-triggering

## [0.3.2] - 2026-06-24

### Added

- Template shortcuts: assign global keyboard shortcuts to templates for one-press rename of loaded files/folders
- Templates with Input variables that have defaults (e.g. 版本号=1) now support shortcut assignment
- `has_required_input` command: only blocks templates with Input variables lacking defaults from shortcuts
- Folder rename support: right-click, drag-drop, and context menu for folders
- Folder context menu: `Directory` and `Directory\Background` registry entries in addition to file `*` entry
- Folder-specific default templates: 日期_文件夹 (Date_Folder), 项目_文件夹 (Project_Folder), 序号_文件夹 (Number_Folder)
- Item type detection (`detect_item_type` command): distinguishes file, folder, and mixed selections
- `is_directory()` utility function in file_utils.rs
- UI adaptation for folder mode: folder icon in column headers, `{Ext}` hidden for folders, folder count labels
- Mixed item warning: when both files and folders are selected, shows warning and blocks shortcut rename
- Default template per type: separate `lastFileTemplateId` / `lastFolderTemplateId` config keys
- Settings page: dropdowns to set default templates for files and folders

### Fixed

- Right-click "Smart Rename" now shows the main window when launched with file/folder arguments
- `has_input_variable` check replaced with `has_required_input` for shortcut eligibility (templates with 版本号 default can now use shortcuts)
- Fixed `replaceFiles` duplicate `detectItemType` call causing right-click files not loading into rename area
- Fixed template shortcuts not working after being set in settings page (missing `template-shortcuts-changed` event)
- Added type mismatch guard: file-only templates blocked for folders, folder-only templates blocked for files when using shortcut

### Changed

- Total default templates increased from 6 to 9 (adding 3 folder-specific templates)
- Context menu now covers 3 registry paths: files (`*`), folders (`Directory`), and folder background (`Directory\Background`)

## [0.3.1] - 2026-06-23

### Added

- Bilingual template names: `name_zh` / `name_en` fields in TemplateConfig, auto-display based on UI language
- New template: 日期_原文件名_版本 (Date_OriginalName_Version) — `{Date:YYYYMMDD}_{OriginalName}_v{Input:版本号}.{Ext}`
- Version number defaults to "1" when template contains `{Input:版本号}`
- Multi-file right-click context menu support (changed `%1` to `%*` in registry command)
- New document organizer default templates with Chinese names: 日期_主题, 日期_主题_版本, 日期_主题-备注, 日期_主题-备注_版本, 序号_名称
- Template formula `{Date:YYYYMMDD}_{Input:主题}-{Input:备注}_v{Input:版本号}.{Ext}` for full document management (e.g. `20260624_季度总结报告-市场部_v2.1.docx`)
- Input label i18n mappings for Chinese labels (主题→Topic, 备注→Note, 版本号→Version, 核心信息→Core Info)
- Comprehensive README.md and README.zh-CN.md with usage guide, template syntax table, and project structure
- UI polish: colored rename button (emerald), variable type icons in dynamic form, file icons in list headers, improved drag-drop overlay
- Date/time format converter: user-friendly `YYYYMMDD`/`HHmmSS` → chrono `%Y%m%d`/`%H%M%S`
- First-time user default: auto-selects "日期_原文件名_版本" template on initial launch
- Migration: auto-removes old templates with raw formula names, auto-updates `_V` → `_v` in existing templates

### Changed

- Template editor dialog now supports separate Chinese and English name fields
- Renamed "模板模式" → "模板公式" (zh) and "Pattern" → "Template Formula" (en) in template editor UI
- Default template names now use descriptive Chinese labels instead of raw formula strings
- All default template separators changed from `-` to `_` for consistency with document management conventions
- Version prefix changed from `V` to lowercase `v` in all default templates (e.g. `v1.0`, `v2.1`)

### Fixed

- Default templates `{Num:1}` / `{Num:01}` changed to `{Counter:1}` / `{Counter:01}` — `Num` was not a recognized variable type in the template engine
- Right-click context menu now supports multiple file selection (registry command changed from `%1` to `%*`)
- Date format `YYYYMMDD` now renders actual date (e.g. `20260624`) instead of literal `YYYYMMDD` string

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
- File drag-drop support: listen for Tauri built-in `tauri://drag-drop` / `tauri://drag-drop-hover` / `tauri://drag-drop-leave` events with visual overlay
- Template editor i18n: English/Chinese for all labels, placeholders, and variable descriptions
- Version counter variables: `{Counter:01}` (01, 02...) and `v{Counter:01}` (v01, v02...) available in template editor

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
