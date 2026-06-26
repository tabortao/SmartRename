<div align="center">

# SmartRename

English | [简体中文](./README.zh-CN.md)

[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

A smart file rename tool with customizable templates, batch processing, and Windows context menu integration.

</div>

## Features

### Template-Powered Renaming

- **Powerful Template Engine** — Flexible naming formula with variables: `{Date}`, `{Time}`, `{Ext}`, `{ParentDir}`, `{OriginalName}`, `{Input:xxx}`, `{Counter}`
- **File / Folder Template Separation** — Templates are categorized by type: file templates include `{Ext}`, folder templates exclude it. Set independent default templates for files and folders
- **Built-in Templates** — Ready-to-use templates for document organization:
  - `Date_Topic` — `20260315_QuarterlyReport.docx`
  - `Date_Topic_Version` — `20260315_QuarterlyReport_V2.1.docx`
  - `Date_Topic-Note` — `20260315_QuarterlyReport-Marketing.docx`
  - `Date_Topic-Note_Version` — `20260315_QuarterlyReport-Marketing_V2.1.docx`
  - `Number_Name` — `01_MeetingNotes.docx`
- **Custom Templates** — Create, edit, and delete your own naming formulas

### Batch Processing

- **Batch Rename** — Select multiple files or folders and rename them all at once
- **Real-time Preview** — Live preview of rename results with conflict detection before applying
- **Mixed Type Detection** — Automatic detection of files vs folders; warns when using a file template on folders or vice versa
- **Drag & Drop** — Drag files or folders directly into the window for quick renaming

### Context Menu & Shortcuts

- **Windows Context Menu** — Right-click any file or folder in Windows Explorer (including folder background), select **Smart Rename**, and the app opens with those items loaded
- **One-Click Rename Shortcut** — Select files/folders in Explorer, press a configurable global shortcut, and they are automatically renamed using the default template for that type
- **Show Main Window Shortcut** — Configurable hotkey to instantly bring the app to the foreground or hide it
- **System Tray** — Minimize to system tray; app stays running with shortcuts active even when the window is hidden

### Other

- **Internationalization** — Full English and Chinese (中文) support
- **Dark Mode** — Light/dark theme with system preference detection

## Tech Stack

- **Desktop Framework**: [Tauri v2](https://tauri.app/)
- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Code Formatting**: [Prettier](https://prettier.io/)

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- Rust >= 1.70

### Install Dependencies

```bash
pnpm install
```

### Development Mode

```bash
pnpm tauri dev
```

### Build for Production

```bash
pnpm tauri build
```

## Usage

### Quick Start (via Context Menu)

1. In Settings → Templates, click **Install Context Menu** once to register with Windows Explorer
2. Right-click any file or folder in Windows Explorer, select **Smart Rename**
3. Choose a template from the dropdown (the app auto-selects the default template for files/folders)
4. Fill in any input fields (e.g., topic, note, version)
5. Review the live preview
6. Click **Rename** to apply

### One-Click Rename Shortcut

1. In Settings → Shortcuts, set a **One-Click Rename** shortcut (e.g., `Alt+R`)
2. Set your default file template and default folder template in Settings → Templates
3. Select files or folders in Windows Explorer
4. Press the shortcut — files are renamed instantly using the default template for that type

### Template Formula Syntax

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{Date}` | Current date (default: YYYYMMDD) | `20260315` |
| `{Date:YYYY-MM-DD}` | Date with custom format | `2026-03-15` |
| `{Time}` | Current time (default: HHMMSS) | `143025` |
| `{Time:HH-mm}` | Time with custom format | `14-30` |
| `{Ext}` | File extension | `.docx` |
| `{ParentDir}` | Parent directory name | `Reports` |
| `{OriginalName}` | Original filename (without extension) | `draft` |
| `{Input:topic}` | User input field | `QuarterlyReport` |
| `{Counter}` | Auto-increment counter (1, 2, 3...) | `1` |
| `{Counter:001}` | Padded counter (001, 002...) | `001` |
| `{Counter:01}` | Number counter (01, 02...) | `01` |
| `v{Counter:01}` | Version counter (v01, v02...) | `v01` |

### Creating Custom Templates

1. Open **Settings** → **Templates**
2. Switch to **File Templates** or **Folder Templates** tab
3. Click **New Template**
4. Enter a name and formula (e.g., `{Date:YYYYMMDD}_{Input:topic}.{Ext}` for files, `{Date:YYYYMMDD}_{Input:topic}` for folders)
5. Click **Save**

### Setting Default Templates

1. Open **Settings** → **Templates**
2. Use the **File Template** dropdown to choose your default for files
3. Use the **Folder Template** dropdown to choose your default for folders
4. These templates are used automatically when you right-click items or press the one-click rename shortcut

## Project Structure

```
.
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── rename/         # Rename-related components
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # React hooks (use-rename)
│   ├── i18n/               # Internationalization
│   │   ├── index.ts        # i18n configuration
│   │   └── locales/        # Translation files (en, zh)
│   ├── lib/                # Utility functions
│   ├── pages/              # Page components
│   │   ├── home.tsx        # Main rename page
│   │   ├── about.tsx       # About page
│   │   └── settings.tsx    # Settings page
│   └── main.tsx            # Frontend entry
├── src-tauri/              # Tauri/Rust backend
│   ├── src/
│   │   ├── lib.rs          # App entry, managed state, plugin setup
│   │   ├── main.rs         # Binary entry
│   │   ├── plugins/        # System tray plugin
│   │   └── rename/         # Rename engine
│   │       ├── commands.rs # Tauri commands
│   │       ├── context_menu.rs # Windows context menu
│   │       ├── file_utils.rs   # File path utilities
│   │       └── template.rs     # Template parser & renderer
│   └── tauri.conf.json     # Tauri configuration
├── docs/                   # Documentation
│   ├── ChangeLog.md        # Changelog
│   ├── CONTEXT_MENU_TROUBLESHOOTING.md # Context menu guide
│   ├── I18N.md             # i18n guide
│   └── GLOBAL_SHORTCUT.md  # Global shortcut guide
└── package.json
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT
