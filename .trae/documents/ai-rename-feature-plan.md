# AI Smart Rename Feature Plan

## Summary

Add AI-powered smart renaming to SmartRename. Users can configure OpenAI-compatible AI providers (DeepSeek, custom), set AI prompts for files and folders, and trigger AI rename from the main UI or right-click context menu.

## Proposed Changes

### 1. Rust Backend: AI Module (`src-tauri/src/rename/ai.rs`)
- New file with `ai_rename` and `ai_preview_rename` commands
- OpenAI-compatible chat completions API call via `reqwest`
- AI config loading from `config.json`

### 2. Rust Backend: Config Keys
New keys in `config.json`: `ai_provider`, `ai_api_url`, `ai_api_key`, `ai_model`, `ai_file_prompt`, `ai_folder_prompt`, `ai_context_menu_enabled`

### 3. Rust Backend: Context Menu AI Integration
Modify `perform_direct_rename` in `commands.rs` to check `ai_context_menu_enabled` and route to AI rename

### 4. Rust Backend: Module & Command Registration
Add `pub mod ai;` to `mod.rs`, register new commands in `lib.rs`

### 5. Frontend: AI Settings Page
Add "AI" section to settings sidebar with provider selection, API key, model, prompts, context menu toggle

### 6. Frontend: Smart Rename Button
Add button to `RenameControls` and `home.tsx`, call AI preview then apply

### 7. i18n Translation Keys
Add all AI-related keys to `en.json` and `zh.json`

### 8. Dependencies
Add `reqwest` to `Cargo.toml`

## Assumptions & Decisions
1. AI API calls in Rust backend (supports both UI and context menu)
2. OpenAI-compatible `/v1/chat/completions` endpoint
3. Reusing existing `config.json` key-value store
4. Preview first, then apply pattern
5. Config flag `ai_context_menu_enabled` for context menu routing
6. Sequential AI calls per file in batch operations

## Verification
1. `cargo build --release` compiles
2. AI Settings UI renders and saves
3. Smart Rename button works in UI
4. Context menu AI rename works
5. i18n switches correctly
6. Config persists across restarts
7. Error handling for invalid API key