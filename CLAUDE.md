# SmartRename

## Project Overview

Smart file rename tool with customizable templates, batch processing, and Windows context menu integration. Built with Tauri v2 + React 19 + TypeScript + shadcn/ui.

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: Tauri v2 (Rust)
- **Build**: pnpm + Vite + Cargo

## Module Index

| Module | Path | Tech Stack | Responsibility |
|--------|------|------------|----------------|
| Frontend | `src/` | TypeScript/React | UI, components, styles, i18n |
| Backend | `src-tauri/` | Rust | Template engine, file rename, context menu, system tray |
| Documentation | `docs/` | Markdown | Project guides and references |

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- Rust >= 1.70

### Commands

```bash
pnpm install        # Install dependencies
pnpm tauri dev      # Start dev server
pnpm tauri build    # Build for production
pnpm format         # Format code
```

## Coding Standards

### TypeScript/React

- TypeScript strict mode
- Function components with Hooks
- Path alias: `@/` maps to `src/`
- Format with Prettier
- **Comments and logs MUST be in English only**
- Keep code clean and minimal

### Rust

- Follow Rust naming conventions
- Use `#[tauri::command]` macro for Tauri commands
- **Comments and logs MUST be in English only**

### Styling

- Tailwind CSS v4
- shadcn/ui component system
- CSS variables for theming (light/dark mode)

### Code Quality Rules

1. **Language**: All comments, console logs, and error messages MUST be in English
2. **Cleanliness**: Remove unnecessary code, avoid redundant implementations
3. **Simplicity**: Follow KISS principle - keep implementations straightforward

## Key Conventions

1. **Add Components**: `pnpm dlx shadcn@latest add <component>`
2. **Path Alias**: Use `@/` prefix, e.g., `import { Button } from "@/components/ui/button"`
3. **Tauri Commands**: Define in `src-tauri/src/lib.rs`, call with `invoke()`

### Example: Tauri Command

```typescript
// Frontend
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { arg1: value });
```

```rust
// Backend (src-tauri/src/lib.rs)
#[tauri::command]
fn command_name(arg1: &str) -> String {
    format!("Result: {}", arg1)
}
```

---

## Frontend Module (src)

### Responsibilities

UI rendering, interaction, and styling.

### Entry Points

- **Entry**: `src/main.tsx`
- **Page Selector**: `src/main.tsx` lazily selects a page component based on `window.location.pathname`
- **Pages**: `src/pages/home.tsx`, `src/pages/about.tsx`, `src/pages/settings.tsx`
- **Build Tool**: Vite (`vite.config.ts`)

### Key Dependencies

- react@19.1.0, react-dom@19.1.0
- @tauri-apps/api@2, @tauri-apps/plugin-opener@2
- tailwindcss@4.2.1, shadcn/ui components
- lucide-react@0.577.0 (icons)
- i18next, react-i18next (internationalization)

### Configuration

- `tsconfig.json` - TypeScript config (strict mode)
- `vite.config.ts` - Vite build config
- `components.json` - shadcn/ui config
- `src/i18n/index.ts` - i18n configuration

### Internationalization

The project uses i18next for multi-language support:

```typescript
// Usage in components
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t("app.title")}</h1>
      <button onClick={() => i18n.changeLanguage("zh")}>
        Switch Language
      </button>
    </div>
  );
}
```

**Supported Languages**: English (en), Chinese (zh)

**Translation Files**: `src/i18n/locales/{en,zh}.json`

See [I18N Documentation](./docs/I18N.md) for detailed usage.

### Toast Notifications

The project uses sonner (via shadcn/ui) for toast notifications:

```typescript
import { toast } from "sonner";

toast.success("Operation completed!");
toast.error("Something went wrong!");
toast.info("Information message");
toast.warning("Warning message");
```

**Setup Requirements**:
1. Add `<Toaster />` component to your page/app root
2. Import from `@/components/ui/sonner`

**Features**:
- Auto-adapts to light/dark theme
- Supports i18n with variable interpolation
- Auto-dismisses after duration (default: 4s)
- Customizable icons and styling

---

## Backend Module (src-tauri)

### Responsibilities

Template engine, file batch renaming, Windows context menu integration, system tray, global shortcuts.

### Entry Points

- **Entry**: `src-tauri/src/main.rs`
- **App Logic**: `src-tauri/src/lib.rs`
- **Rename Module**: `src-tauri/src/rename/` (template engine, file utils, commands, context menu)
- **Build Config**: `Cargo.toml`

### Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `parse_cli_args` | - | `Vec<String>` | Parse file paths from CLI args |
| `parse_template` | `pattern: String` | `Vec<TemplateVariable>` | Parse template pattern into variables |
| `preview_rename` | `files, pattern, varValues, counterStart` | `Vec<PreviewItem>` | Preview rename results |
| `apply_rename` | `files, pattern, varValues, counterStart` | `Vec<RenameResult>` | Execute file rename |
| `get_templates` | - | `Vec<TemplateConfig>` | Get all templates |
| `save_template` | `template: TemplateConfig` | `Result<(), String>` | Save/update template |
| `delete_template` | `id: String` | `Result<(), String>` | Delete template |
| `install_context_menu` | - | `Result<(), String>` | Install Windows context menu |
| `uninstall_context_menu` | - | `Result<(), String>` | Uninstall Windows context menu |
| `is_context_menu_installed` | - | `bool` | Check context menu status |

### Key Dependencies

- tauri@2 - Tauri framework
- tauri-plugin-opener@2 - Open external links
- tauri-plugin-global-shortcut@2 - Global shortcuts
- tauri-plugin-single-instance@2 - Single instance
- serde@1, serde_json@1 - Serialization
- regex@1 - Template parsing
- chrono@0.4 - Date/time formatting
- uuid@1 - Template ID generation
- winreg@0.52 - Windows registry (context menu)

### Configuration

- `tauri.conf.json` - Tauri app config
- `capabilities/default.json` - Permissions config

**Key Settings**:
- Product: `smart-rename`
- Identifier: `com.smartrename.app`
- Window: 800x600
- Dev Port: 1420

---

## Documentation (docs)

### Available Guides

- **AUTO_UPDATE.md** - Tauri auto-update configuration and GitHub Actions setup
- **I18N.md** - Internationalization guide (English)
- **I18N.zh-CN.md** - 国际化指南（中文）
- **GLOBAL_SHORTCUT.md** - Global shortcut documentation
- **TAURI_TEMPLATE_PITFALLS.zh-CN.md** - Tauri template troubleshooting

### Adding Documentation

When adding new features, create corresponding documentation:

1. Create English version: `docs/FEATURE.md`
2. Create Chinese version: `docs/FEATURE.zh-CN.md`
3. Update README.md and README.zh-CN.md if needed