# Tauri 模板踩坑指南

本文档汇总了使用官方 Tauri v2 React + TypeScript 模板初始化项目后立即遇到的三个问题，
以及各自的根因和修复方案。

如果你刚生成了一个新的 Tauri 项目，按顺序检查下面三条，再往下开发会省很多时间。

---

## 问题一 —— pnpm 忽略 esbuild 的构建脚本

**现象**

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.27.4
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

**根因**

pnpm v9+ 会拦截从未在本机见过的包的生命周期脚本（`preinstall` / `install` / `postinstall`）。
esbuild 的 postinstall 需要下载平台原生二进制；跳过它 → Vite 无法正常打包前端 → 构建失败。

**修复**

```powershell
pnpm approve-builds
```

按提示用空格键选中 `esbuild`，确认即可。脚本会下载原生二进制。

备选方案（会影响所有项目，请谨慎使用）：

```ini
# .npmrc
enable-pre-post-scripts=true
```

---

## 问题二 —— 构建时报错：有公钥但没有私钥

**现象**

执行 `pnpm tauri build` 时：

```
Error A public key has been found, but no private key.
Make sure to set `TAURI_SIGNING_PRIVATE_KEY` environment variable.
```

**根因**

模板默认在 `src-tauri/tauri.conf.json` 里开启了 `bundle.createUpdaterArtifacts: true`，
这会让构建器额外生成签名更新包（`.msi.zip`、`.nsis.zip` 和签名文件）——签名就需要私钥。
但模板不会在本地生成私钥，它是给 GitHub Actions 留的：CI 里注入密钥、替换占位符。

**修复 —— 本地开发（最省事）**

在 `tauri.conf.json` 里关掉 updater 产物：

```jsonc
"bundle": {
  "active": true,
  "targets": "all",
  "createUpdaterArtifacts": false,  // 原来为 true
  ...
}
```

不需要私钥，正常的 `.msi` / `.exe` 安装包照常产出。

**修复 —— 真正需要自动更新时**

```powershell
pnpm tauri signer generate -w "$HOME\.tauri\myapp.key"
```

把私钥内容存为 GitHub Secret `TAURI_SIGNING_PRIVATE_KEY`，公钥存为
`TAURI_SIGNING_PUBLIC_KEY`，然后重新开启 `createUpdaterArtifacts`，并在 `plugins.updater` 里
填入真实的 GitHub Releases 地址。完整流程见 `AUTO_UPDATE.md` / `AUTO_UPDATE.zh-CN.md`。

---

## 问题三 —— 构建成功但双击 exe 闪退

**现象**

```
Application panicked: panicked at src\lib.rs:220:10:
PluginInitialization("updater", "Error deserializing 'plugins.updater' within your Tauri configuration:
relative URL without a base: \"__TAURI_UPDATER_ENDPOINT__\"")
```

构建本身没有报错，但安装完双击程序立刻闪退。

**根因（两处都要改）**

1. `tauri.conf.json` 里的 `plugins.updater` 块是模板占位符：

```jsonc
"plugins": {
  "updater": {
    "pubkey": "__TAURI_UPDATER_PUBKEY__",
    "endpoints": ["__TAURI_UPDATER_ENDPOINT__"],  // ← 不是合法 URL！
    "windows": { "installMode": "passive" }
  }
}
```

2. `src-tauri/src/lib.rs` 在 release 模式下无条件注册 updater：

```rust
#[cfg(not(debug_assertions))]
let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
```

release 启动时 Tauri 尝试把 `__TAURI_UPDATER_ENDPOINT__` 反序列化为 URL，结果发现它不是合法 URL，
反序列化失败 → `PluginInitialization` 错误 → `expect()` panic → 进程退出。

注意 `pnpm tauri dev`（debug 构建）受 `#[cfg(not(debug_assertions))]` 保护，所以不会触发。
只有 release 安装包才会崩。

**修复 —— 本地开发**

1. 从 `tauri.conf.json` 里整个删掉 `plugins.updater` 块。
2. 注释掉 `src-tauri/src/lib.rs` 里 release 模式下的注册：

```rust
// Updater disabled for local builds.
// #[cfg(not(debug_assertions))]
// let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
```

**修复 —— 启用自动更新**

把 `plugins.updater` 块改回真实值（`signer generate` 拿到的公钥、
`https://github.com/<owner>/<repo>/releases/latest/download/latest.json`），并在
`lib.rs` 里去掉注释。`createUpdaterArtifacts` 设回 `true`，每次发布在 GitHub Actions
里用私钥签名。

---

## 速查表

| # | 现象 | 阶段 | 最小修复 |
|---|------|------|---------|
| 1 | `[ERR_PNPM_IGNORED_BUILDS] esbuild` | `pnpm install` | `pnpm approve-builds` |
| 2 | `A public key has been found, but no private key` | `pnpm tauri build` | `createUpdaterArtifacts: false` |
| 3 | exe 闪退，报 `PluginInitialization("updater", ...)` | 运行 release 安装包 | 删 `plugins.updater` + 注释 Rust 注册 |

---

## 本次清理涉及的文件

从模板到可运行，本项目实际改动：

- `src-tauri/tauri.conf.json` — 删除 `plugins.updater`；`createUpdaterArtifacts` 改为 `false`
- `src-tauri/src/lib.rs` — 注释掉 release 下 `tauri_plugin_updater` 的注册
