<div align="center">

# SmartRename

[English](./README.md) | 简体中文

[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

智能文件重命名工具，支持自定义模板公式、批量处理和 Windows 右键菜单集成。

</div>

## 功能特性

- **模板引擎** — 强大的命名公式，支持变量：`{Date}`、`{Time}`、`{Ext}`、`{ParentDir}`、`{OriginalName}`、`{Input:xxx}`、`{Counter}`
- **批量重命名** — 通过右键菜单或拖拽选取多个文件，一键批量重命名
- **实时预览** — 应用前实时预览重命名结果，自动检测文件名冲突
- **内置模板** — 开箱即用的资料整理模板：
  - `日期_主题` — `20260315_季度总结报告.docx`
  - `日期_主题_版本` — `20260315_季度总结报告_V2.1.docx`
  - `日期_主题-备注` — `20260315_季度总结报告-市场部.docx`
  - `日期_主题-备注_版本` — `20260315_季度总结报告-市场部_V2.1.docx`
  - `序号_名称` — `01_会议纪要.docx`
- **自定义模板** — 创建、编辑、删除自己的命名公式
- **右键菜单集成** — 在 Windows 资源管理器中右键任意文件，选择「Smart Rename」
- **拖拽支持** — 直接将文件拖入窗口即可快速重命名
- **国际化** — 完整的中英文界面支持
- **暗色模式** — 亮色/暗色主题，支持跟随系统
- **系统托盘** — 最小化到系统托盘，快速访问
- **全局快捷键** — 可配置的快捷键显示/隐藏主窗口

## 技术栈

- **桌面框架**: [Tauri v2](https://tauri.app/)
- **前端**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vite.dev/)
- **UI 组件**: [shadcn/ui](https://ui.shadcn.com/)
- **样式方案**: [Tailwind CSS v4](https://tailwindcss.com/)
- **代码格式化**: [Prettier](https://prettier.io/)

## 开始使用

### 环境要求

- Node.js >= 18
- pnpm >= 9
- Rust >= 1.70

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm tauri dev
```

### 构建发布

```bash
pnpm tauri build
```

## 使用指南

### 快速上手

1. 在 Windows 资源管理器中右键选中一个或多个文件，点击 **Smart Rename**
2. 从下拉菜单选择一个模板
3. 填写输入字段（如主题、备注、版本号）
4. 查看预览结果
5. 点击 **重命名** 应用

### 模板公式语法

| 变量 | 说明 | 示例输出 |
|------|------|----------|
| `{Date}` | 当前日期（默认格式：YYYYMMDD） | `20260315` |
| `{Date:YYYY-MM-DD}` | 自定义格式日期 | `2026-03-15` |
| `{Time}` | 当前时间（默认格式：HHMMSS） | `143025` |
| `{Time:HH-mm}` | 自定义格式时间 | `14-30` |
| `{Ext}` | 文件扩展名 | `.docx` |
| `{ParentDir}` | 父目录名称 | `Reports` |
| `{OriginalName}` | 原文件名（不含扩展名） | `draft` |
| `{Input:主题}` | 用户输入字段 | `季度总结报告` |
| `{Counter}` | 自动递增计数器（1, 2, 3...） | `1` |
| `{Counter:001}` | 填充计数器（001, 002...） | `001` |
| `{Counter:01}` | 数字计数器（01, 02...） | `01` |
| `v{Counter:01}` | 版本计数器（v01, v02...） | `v01` |

### 创建自定义模板

1. 打开 **设置** → **模板管理**
2. 点击 **新建模板**
3. 输入模板名称和公式（如 `{Date:YYYYMMDD}_{Input:主题}.{Ext}`）
4. 点击 **保存**

## 项目结构

```
.
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── rename/         # 重命名相关组件
│   │   └── ui/             # shadcn/ui 组件
│   ├── hooks/              # React Hooks（use-rename）
│   ├── i18n/               # 国际化
│   │   ├── index.ts        # i18n 配置
│   │   └── locales/        # 翻译文件（en, zh）
│   ├── lib/                # 工具函数
│   ├── pages/              # 页面组件
│   │   ├── home.tsx        # 主窗口（重命名页面）
│   │   ├── about.tsx       # 关于页面
│   │   └── settings.tsx    # 设置页面
│   └── main.tsx            # 前端入口
├── src-tauri/              # Tauri/Rust 后端
│   ├── src/
│   │   ├── lib.rs          # 应用入口、托管状态、插件配置
│   │   ├── main.rs         # 二进制入口
│   │   ├── plugins/        # 系统托盘插件
│   │   └── rename/         # 重命名引擎
│   │       ├── commands.rs # Tauri 命令
│   │       ├── context_menu.rs # Windows 右键菜单
│   │       ├── file_utils.rs   # 文件路径工具
│   │       └── template.rs     # 模板解析与渲染
│   └── tauri.conf.json     # Tauri 配置
├── docs/                   # 文档
│   ├── ChangeLog.md        # 更新日志
│   ├── I18N.md             # 国际化指南
│   └── GLOBAL_SHORTCUT.md  # 全局快捷键指南
└── package.json
```

## 推荐 IDE

- [VS Code](https://code.visualstudio.com/)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT