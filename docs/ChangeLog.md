# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-06-23

### Added

- Bilingual template names: `name_zh` / `name_en` fields in TemplateConfig, auto-display based on UI language
- New template: 日期_原文件名_版本 (Date_OriginalName_Version) — `{Date:YYYYMMDD}_{OriginalName}_V{Input:版本号}.{Ext}`
- Version number defaults to "1" when template contains `{Input:版本号}`
- Multi-file right-click context menu support (changed `%1` to `%*` in registry command)
- New document organizer default templates with Chinese names: 日期_主题, 日期_主题_版本, 日期_主题-备注, 日期_主题-备注_版本, 序号_名称
- Template formula `{Date:YYYYMMDD}_{Input:主题}-{Input:备注}_V{Input:版本号}.{Ext}` for full document management (e.g. `20260315_季度总结报告-市场部_V2.1.docx`)
- Input label i18n mappings for Chinese labels (主题→Topic, 备注→Note, 版本号→Version, 核心信息→Core Info)
- Comprehensive README.md and README.zh-CN.md with usage guide, template syntax table, and project structure
- UI polish: colored rename button (emerald), variable type icons in dynamic form, file icons in list headers, improved drag-drop overlay

### Changed

- Template editor dialog now supports separate Chinese and English name fields
- Renamed "模板模式" → "模板公式" (zh) and "Pattern" → "Template Formula" (en) in template editor UI
- Default template names now use descriptive Chinese labels instead of raw formula strings
- All default template separators changed from `-` to `_` for consistency with document management conventions

### Fixed

- Default templates `{Num:1}` / `{Num:01}` changed to `{Counter:1}` / `{Counter:01}` — `Num` was not a recognized variable type in the template engine
- Right-click context menu now supports multiple file selection (registry command changed from `%1` to `%*`)

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
