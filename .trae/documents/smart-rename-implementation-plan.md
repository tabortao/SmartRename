# SmartRename 实现计划

## 概述

基于 [智能文件重命名工具开发计划书](../docs/Reference/智能文件重命名工具开发计划书.md)，将当前 `tauri-app-template` 项目改造为完整的 SmartRename 桌面应用。核心功能包括：上下文菜单集成、模板引擎、实时预览、模板管理。

---

## 一、当前状态分析

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| 项目名称 | `tauri-app-template` / `com.template.tauri-app` | `smart-rename` / `com.smartrename.app` |
| 主页面 | Greet demo（问候表单 + Logo 展示） | SmartRename 主界面（文件列表 + 动态表单 + 预览） |
| 设置页 | 外观（主题/语言）+ 快捷键 | 外观 + 快捷键 + **模板管理** |
| 后端命令 | `greet`, `update_tray_menu` | 新增重命名相关命令（预览、应用、模板 CRUD、上下文菜单） |
| Rust 模块 | `lib.rs`, `plugins/system_tray.rs` | 新增 `rename/` 模块（模板引擎、文件重命名、上下文菜单） |
| 系统集成 | 无 | Windows 右键菜单注册 |
| 基础能力 | 系统托盘、全局快捷键、i18n、主题 | 全部保留，基础上扩展 |

**现有基础设施可直接复用**：多窗口架构、系统托盘、全局快捷键、i18n（中/英）、主题系统、shadcn/ui 组件库。

---

## 二、实施步骤

### 步骤 1：项目重命名 — 将模板项目改为 SmartRename

**目标**：更新所有配置文件中的项目名称、标识符和窗口标题。

**修改文件**：

| 文件 | 改动 |
|------|------|
| [package.json](file:///d:/Code/Rust/SmartRename/package.json#L2) | `name`: `"tauri-app-template"` → `"smart-rename"` |
| [src-tauri/Cargo.toml](file:///d:/Code/Rust/SmartRename/src-tauri/Cargo.toml#L2-L3) | `name`: `"tauri-app-template"` → `"smart-rename"`, `description`: `"A Tauri App"` → `"Smart file rename tool"` |
| [src-tauri/Cargo.toml](file:///d:/Code/Rust/SmartRename/src-tauri/Cargo.toml#L14) | lib name: `"tauri_app_template_lib"` → `"smart_rename_lib"` |
| [src-tauri/tauri.conf.json](file:///d:/Code/Rust/SmartRename/src-tauri/tauri.conf.json#L3-L6) | `productName`: `"smart-rename"`, `mainBinaryName`: `"smart-rename"`, `identifier`: `"com.smartrename.app"`, 窗口 title: `"SmartRename"` |
| [src-tauri/src/main.rs](file:///d:/Code/Rust/SmartRename/src-tauri/src/main.rs) | `tauri_app_template_lib::run()` → `smart_rename_lib::run()` |
| [src/i18n/locales/en.json](file:///d:/Code/Rust/SmartRename/src/i18n/locales/en.json) | `"Tauri App Template"` → `"SmartRename"` (app.title, about.appName) |
| [src/i18n/locales/zh.json](file:///d:/Code/Rust/SmartRename/src/i18n/locales/zh.json) | `"Tauri 应用模板"` → `"SmartRename"` (app.title, about.appName) |

---

### 步骤 2：Rust 后端 — 模板引擎与文件重命名模块

**新建文件**：

#### 2.1 `src-tauri/src/rename/mod.rs` — 模块入口

声明子模块：`template`, `commands`, `file_utils`, `context_menu`。

#### 2.2 `src-tauri/src/rename/file_utils.rs` — 文件工具函数

提供纯函数：
- `get_extension(filename: &str) -> &str` — 提取扩展名（不含点）
- `get_parent_dir_name(path: &str) -> &str` — 提取父目录名
- `get_original_name(path: &str) -> &str` — 提取不含扩展名的文件名
- `is_valid_filename(name: &str) -> bool` — 检查非法字符（`<>:"/\|?*`）

#### 2.3 `src-tauri/src/rename/template.rs` — 模板引擎

**数据结构**（`serde` 序列化）：

```rust
struct TemplateConfig {
    id: String,        // UUID
    name: String,      // 模板名称，如 "周报规范"
    pattern: String,   // 模板字符串，如 "{Date:YYYYMMDD}_{Input:主题}.{Ext}"
    created_at: String,
    updated_at: String,
}

struct TemplateVariable {
    var_type: VarType, // Date, Time, Ext, ParentDir, Input, Counter, OriginalName
    format: Option<String>, // 如 "YYYYMMDD" 或 "001"
    label: Option<String>,  // Input 类型变量的标签，如 "主题"
}

enum VarType {
    Date, Time, Ext, ParentDir, Input, Counter, OriginalName,
}
```

**核心函数**：
- `parse_template(pattern: &str) -> Vec<TemplateVariable>` — 正则解析 `{...}` 模式，提取变量类型和参数
- `render_filename(template: &str, vars: &HashMap<String, String>, counter: u32) -> String` — 将模板 + 变量值渲染为最终文件名
- `preview_rename(files: &[FileInfo], template: &str, var_values: &HashMap<String, String>, counter_start: u32) -> Vec<PreviewResult>` — 批量预览重命名结果
- 冲突检测：同名文件标记 `conflict: true`

**新增 Cargo 依赖**：
- `regex` — 模板解析
- `chrono` — 日期/时间格式化
- `uuid` — 模板 ID 生成

#### 2.4 `src-tauri/src/rename/commands.rs` — Tauri 命令

定义以下 `#[tauri::command]`：

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `parse_cli_args` | - | `Vec<String>` | 解析命令行参数中的文件路径列表 |
| `preview_rename` | `files: Vec<String>`, `pattern: String`, `var_values: HashMap<String, String>`, `counter_start: u32` | `Vec<PreviewItem>` | 预览重命名结果 |
| `apply_rename` | `files: Vec<String>`, `pattern: String`, `var_values: HashMap<String, String>`, `counter_start: u32` | `Vec<RenameResult>` | 执行实际重命名 |
| `get_templates` | - | `Vec<TemplateConfig>` | 获取所有模板配置 |
| `save_template` | `template: TemplateConfig` | `Result<(), String>` | 保存/更新模板 |
| `delete_template` | `id: String` | `Result<(), String>` | 删除模板 |
| `install_context_menu` | - | `Result<(), String>` | 安装 Windows 右键菜单 |
| `uninstall_context_menu` | - | `Result<(), String>` | 卸载 Windows 右键菜单 |
| `is_context_menu_installed` | - | `bool` | 检查右键菜单是否已安装 |

模板存储：`{app_data_dir}/templates.json`（通过 `tauri::api::path::app_data_dir` 获取路径）。

#### 2.5 `src-tauri/src/rename/context_menu.rs` — Windows 右键菜单集成

- `install() -> Result<(), String>` — 写入注册表 `HKEY_CURRENT_USER\Software\Classes\*\shell\SmartRename`，设置 command 为当前 exe 路径 + `"%1"`
- `uninstall() -> Result<(), String>` — 删除注册表项
- `is_installed() -> bool` — 检查注册表项是否存在

**注意**：仅 Windows 实现，macOS 留待后续。

#### 2.6 修改 `src-tauri/src/lib.rs`

- 新增 `mod rename;`
- 注册所有新命令到 `invoke_handler`
- 应用启动时检查 CLI args，若有文件路径则通过 Tauri event 发送给前端

```rust
// 新增模块
mod rename;

// 注册命令
.invoke_handler(tauri::generate_handler![
    greet,
    update_tray_menu,
    rename::commands::parse_cli_args,
    rename::commands::preview_rename,
    rename::commands::apply_rename,
    rename::commands::get_templates,
    rename::commands::save_template,
    rename::commands::delete_template,
    rename::commands::install_context_menu,
    rename::commands::uninstall_context_menu,
    rename::commands::is_context_menu_installed,
])
```

#### 2.7 修改 `src-tauri/src/main.rs`

导入名更新为 `smart_rename_lib`。

---

### 步骤 3：前端 — SmartRename 主界面

**修改文件**：

#### 3.1 重写 `src/pages/home.tsx` — 主界面

用 SmartRename 功能替换 greet demo。新布局：

```
┌──────────────────────────────────────────────┐
│  [Title Bar: SmartRename]      [⚙] [🌐] [🌓] │
├──────────────────────────────────────────────┤
│  模板: [下拉选择模板 ▼]  [编辑] [新建] [删除] │
│                                              │
│  ┌─ 文件列表 ───────────────────────────────┐ │
│  │  原文件名          →  预览文件名          │ │
│  │  report.txt        →  20260622_周报.txt  │ │
│  │  photo.jpg         →  20260622_照片.jpg  │ │
│  │  ...                                     │ │
│  └──────────────────────────────────────────┘ │
│                                              │
│  动态表单（根据模板变量自动生成）:            │
│  主题: [________________]                    │
│  作者: [________________]                    │
│  版本: [________________]                    │
│  起始序号: [___]                             │
│                                              │
│  [重命名]  [重置]     已选 3 个文件          │
└──────────────────────────────────────────────┘
```

**状态管理**（使用 React hooks）：
- `files: FileInfo[]` — 从 CLI args 加载的文件列表
- `selectedTemplate: TemplateConfig | null` — 当前模板
- `templates: TemplateConfig[]` — 所有模板
- `varValues: Record<string, string>` — 动态变量值
- `counterStart: number` — 起始序号
- `previewResults: PreviewItem[]` — 预览结果

**交互流程**：
1. 组件挂载时调用 `parse_cli_args` 获取文件列表
2. 调用 `get_templates` 加载模板列表
3. 选择模板 → 解析模板变量 → 动态渲染输入框
4. 输入变量值 → 实时调用 `preview_rename` → 更新预览列表
5. 点击"重命名" → 调用 `apply_rename` → 显示结果 toast

#### 3.2 新建 `src/components/rename/` — 重命名相关组件

| 组件文件 | 功能 |
|---------|------|
| `file-list.tsx` | 文件列表表格，显示原文件名 → 预览文件名，支持滚动。冲突的文件名用红色高亮。 |
| `dynamic-form.tsx` | 根据 `TemplateVariable[]` 动态渲染输入控件：`Input` 类型→文本输入框，`Counter`→数字输入框，内置变量（Date/Time/Ext/ParentDir）→只读显示 |
| `template-selector.tsx` | 模板下拉选择器 + 新建/编辑/删除按钮 |
| `template-editor-dialog.tsx` | 模板编辑对话框（名称 + 模板字符串），支持变量插入提示 |
| `rename-controls.tsx` | 底部操作栏：重命名按钮 + 重置按钮 + 文件计数 |

#### 3.3 新建 `src/hooks/use-rename.ts` — 重命名状态管理 Hook

封装核心状态和逻辑：
- 文件列表加载
- 模板切换与解析
- 变量值变更 + 预览更新
- 重命名执行

---

### 步骤 4：前端 — 设置页模板管理

**修改文件**：

#### 4.1 `src/pages/settings.tsx` — 添加模板管理面板

在设置页左侧导航新增 "Templates" 标签页，内容包含：

- 模板列表（表格形式：名称、模式、操作按钮）
- 新建/编辑模板对话框
- 上下文菜单安装/卸载按钮

**导航项新增**：
```typescript
{ id: "templates", label: t("settings.templates.title"), icon: FileText }
```

#### 4.2 `src/i18n/locales/en.json` — 新增翻译键

```json
{
  "rename": {
    "title": "Smart Rename",
    "template": "Template",
    "selectTemplate": "Select a template...",
    "noTemplate": "No template selected",
    "newTemplate": "New Template",
    "editTemplate": "Edit Template",
    "deleteTemplate": "Delete Template",
    "templateName": "Template Name",
    "templatePattern": "Pattern",
    "originalName": "Original Name",
    "previewName": "Preview Name",
    "counterStart": "Start Counter",
    "apply": "Rename",
    "reset": "Reset",
    "filesSelected": "{{count}} file(s) selected",
    "renameSuccess": "Successfully renamed {{count}} file(s)!",
    "renameFailed": "Failed to rename: {{error}}",
    "conflictWarning": "Name conflict detected!",
    "invalidChars": "Filename contains invalid characters!",
    "contextMenu": "Context Menu",
    "installContextMenu": "Install Context Menu",
    "uninstallContextMenu": "Uninstall Context Menu",
    "contextMenuInstalled": "Context menu installed",
    "contextMenuUninstalled": "Context menu uninstalled",
    "variables": "Available Variables",
    "varDate": "Date (format: YYYYMMDD)",
    "varTime": "Time (format: HHmmss)",
    "varExt": "File extension",
    "varParentDir": "Parent directory name",
    "varInput": "User input: label",
    "varCounter": "Auto-increment counter",
    "varOriginalName": "Original filename"
  }
}
```

#### 4.3 `src/i18n/locales/zh.json` — 新增中文字段

对应英文键的中文翻译。

---

### 步骤 5：更新现有页面关于信息

**修改文件**：

#### 5.1 `src/pages/about.tsx`

更新描述文字为 SmartRename 相关（从模板改为文件重命名工具）。

---

### 步骤 6：更新文档

**修改文件**：

#### 6.1 `docs/ChangeLog.md`

添加 `[0.3.0] - 2026-06-22` 条目，记录 SmartRename 功能实现。

#### 6.2 `CLAUDE.md`（根目录）

更新项目概述为 SmartRename 描述。

---

### 步骤 7：构建验证

运行 `pnpm tauri build` 确认无编译错误，生成可用的 Windows 安装包。

---

## 三、架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 模板存储 | JSON 文件（`app_data_dir/templates.json`） | 简单、无需额外依赖、适合少量模板数据 |
| 模板解析 | `regex` crate | Rust 标准正则，性能好，无需引入模板引擎 |
| 日期格式化 | `chrono` crate | Rust 生态标准日期库 |
| 前台传参 | Tauri command + event | 标准 Tauri 通信模式，类型安全 |
| 上下文菜单 | 仅 Windows 注册表 | 用户环境为 Windows，macOS 后续扩展 |
| 预览方式 | 实时 trigger（防抖 300ms） | 避免频繁调用 Rust 后端 |
| 冲突检测 | Rust 端 `preview_rename` 返回 conflict 标记 | 在数据层统一处理，前端只负责展示 |

---

## 四、验证步骤

1. `pnpm tauri dev` 启动开发模式，确认主界面显示 SmartRename 内容
2. 通过命令行传入文件路径测试：`cargo run -- "C:\test\file1.txt" "C:\test\file2.jpg"`
3. 创建模板、编辑模板、删除模板
4. 输入变量值，验证实时预览更新
5. 执行重命名，验证文件系统实际变更
6. 安装/卸载上下文菜单，验证注册表读写
7. `pnpm tauri build` 构建验证