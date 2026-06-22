# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
