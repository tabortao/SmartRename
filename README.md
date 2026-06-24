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

- **Template Engine** — Powerful naming formula with variables: `{Date}`, `{Time}`, `{Ext}`, `{ParentDir}`, `{OriginalName}`, `{Input:xxx}`, `{Counter}`
- **Batch Rename** — Select multiple files via right-click context menu or drag-and-drop, rename them all at once
- **Real-time Preview** — Live preview of rename results with conflict detection before applying
- **Built-in Templates** — Ready-to-use templates designed for document organization:
  - `Date_Topic` — `20260315_QuarterlyReport.docx`
  - `Date_Topic_Version` — `20260315_QuarterlyReport_V2.1.docx`
  - `Date_Topic-Note` — `20260315_QuarterlyReport-Marketing.docx`
  - `Date_Topic-Note_Version` — `20260315_QuarterlyReport-Marketing_V2.1.docx`
  - `Number_Name` — `01_MeetingNotes.docx`
- **Custom Templates** — Create, edit, and delete your own naming formulas
- **Context Menu Integration** — Right-click any file in Windows Explorer and select "Smart Rename"
- **Drag & Drop** — Drag files directly into the window for quick renaming
- **Internationalization** — Full English and Chinese (中文) support
- **Dark Mode** — Light/dark theme with system preference detection
- **System Tray** — Minimize to system tray with quick access
- **Global Shortcuts** — Configurable hotkey to show/hide the main window

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

### Quick Start

1. Right-click a file (or multiple files) in Windows Explorer, select **Smart Rename**
2. Choose a template from the dropdown
3. Fill in the input fields (e.g., topic, note, version)
4. Review the preview results
5. Click **Rename** to apply

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
2. Click **New Template**
3. Enter a name and formula (e.g., `{Date:YYYYMMDD}_{Input:topic}.{Ext}`)
4. Click **Save**

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