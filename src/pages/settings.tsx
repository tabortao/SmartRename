import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { TitleBar } from "@/components/title-bar";
import { WindowFrame } from "@/components/window-frame";
import { LanguageToggle } from "@/components/language-toggle";
import { ShortcutInput } from "@/components/shortcut-input";
import { TemplateEditorDialog } from "@/components/rename/template-editor-dialog";
import { Moon, Sun, Monitor, Palette, Keyboard, FileText, Folder, File, Sparkles, Wifi } from "lucide-react";
import { registerShortcut, unregisterShortcut } from "@/lib/shortcut";
import { toggleWindow } from "@/lib/window";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useTranslation } from "react-i18next";
import type { TemplateConfig } from "@/hooks/use-rename";
import { getTemplateDisplayName } from "@/hooks/use-rename";

const SHORTCUT_KEY = "global-shortcut-show-main";

type SettingSection = "appearance" | "shortcut" | "templates" | "ai";
type TemplateTab = "file" | "folder";

export default function SettingsPage() {
  const [shortcut, setShortcut] = useState<string>("");
  const [activeSection, setActiveSection] = useState<SettingSection>("appearance");
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Template management state
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateConfig | null>(null);
  const [contextMenuInstalled, setContextMenuInstalled] = useState(false);
  const [templateTab, setTemplateTab] = useState<TemplateTab>("file");

  // Default template state
  const [defaultFileTemplateId, setDefaultFileTemplateId] = useState<string>("");
  const [defaultFolderTemplateId, setDefaultFolderTemplateId] = useState<string>("");

  // AI settings state
  const [aiProvider, setAiProvider] = useState("deepseek");
  const [aiApiUrl, setAiApiUrl] = useState("https://api.deepseek.com");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("deepseek-v4-flash");
  const [aiFilePrompt, setAiFilePrompt] = useState(
    "你是一位文件整理大师，擅长为文件起简洁、规范、易检索的名字。\n\n当前日期：{DATE}\n\n命名格式：{DATE} 描述内容_v版本号.扩展名\n示例：{DATE} 会议纪要_v1.docx\n\n命名规则：\n1. 文件名前必须加上当前日期（YYYYMMDD格式），日期后加一个空格\n2. 保留原文件扩展名不变\n3. 文件名末尾加版本号，格式为 _v1、_v2 等，默认从 v1 开始\n4. 文件名使用中文或英文，与原文件名语言保持一致\n5. 用清晰的关键词概括文件内容，便于日后搜索\n6. 去除原文件名中无意义的数字、日期等冗余信息\n\n只返回符合格式的新文件名（含扩展名），不要解释，不要分析文件内容。"
  );
  const [aiFolderPrompt, setAiFolderPrompt] = useState(
    "你是一位文件整理大师，擅长为文件夹起简洁、规范、易分类的名字。\n\n当前日期：{DATE}\n\n命名格式：{DATE} 分类描述\n示例：{DATE} 项目资料\n\n命名规则：\n1. 文件夹名前必须加上当前日期（YYYYMMDD格式），日期后加一个空格\n2. 文件夹名使用中文或英文，与原文件夹名语言保持一致\n3. 使用概括性强的分类词汇，便于层级管理\n4. 去除原文件夹名中无意义的数字、日期等冗余信息\n5. 避免使用括号等特殊字符\n\n只返回符合格式的新文件夹名，不要解释，不要分析文件夹内容。"
  );
  const [aiContextMenuEnabled, setAiContextMenuEnabled] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const handleShowMainWindow = useCallback(async () => {
    await toggleWindow("main");
  }, []);

  useEffect(() => {
    const savedShortcut = localStorage.getItem(SHORTCUT_KEY);
    if (savedShortcut) {
      setShortcut(savedShortcut);
      registerShortcut(savedShortcut, handleShowMainWindow).then((result) => {
        if (!result.success) {
          console.warn("Show main shortcut conflict on init:", result.error);
        }
      });
    }
  }, [handleShowMainWindow]);

  // Load templates and config
  useEffect(() => {
    const loadAll = async () => {
      try {
        const list = await invoke<TemplateConfig[]>("get_templates");
        setTemplates(list);

        // Load default template IDs, fallback to hardcoded defaults
        try {
          const fileDef = await invoke<string | null>("load_app_config", { key: "lastFileTemplateId" });
          // Validate the ID exists in the current template list
          const fileTemplatesList = list.filter((t) => t.pattern.includes("{Ext}"));
          const fileExists = fileDef ? fileTemplatesList.some((t) => t.id === fileDef) : false;
          if (fileDef && fileExists) {
            setDefaultFileTemplateId(fileDef);
          } else {
            // Fallback to "日期 原文件名_版本" template
            const fileDefault = fileTemplatesList.find(
              (t) => t.name === "日期 原文件名_版本" || t.name_zh === "日期 原文件名_版本"
            );
            if (fileDefault) {
              setDefaultFileTemplateId(fileDefault.id);
              await invoke("save_app_config", { key: "lastFileTemplateId", value: fileDefault.id });
            }
          }
        } catch { /* ignore */ }
        try {
          const folderDef = await invoke<string | null>("load_app_config", { key: "lastFolderTemplateId" });
          // Validate the ID exists in the current template list
          const folderTemplatesList = list.filter((t) => !t.pattern.includes("{Ext}"));
          const folderExists = folderDef ? folderTemplatesList.some((t) => t.id === folderDef) : false;
          if (folderDef && folderExists) {
            setDefaultFolderTemplateId(folderDef);
          } else {
            // Fallback to "日期 原文件夹名" template
            const folderDefault = folderTemplatesList.find(
              (t) => t.name === "日期 原文件夹名" || t.name_zh === "日期 原文件夹名"
            );
            if (folderDefault) {
              setDefaultFolderTemplateId(folderDefault.id);
              await invoke("save_app_config", { key: "lastFolderTemplateId", value: folderDefault.id });
            }
          }
        } catch { /* ignore */ }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    const checkContextMenu = async () => {
      try {
        const installed = await invoke<boolean>("is_context_menu_installed");
        setContextMenuInstalled(installed);
      } catch (error) {
        console.error("Failed to check context menu:", error);
      }
    };
    loadAll();
    checkContextMenu();
    loadAiConfig();
  }, []);

  const loadAiConfig = async () => {
    try {
      const provider = await invoke<string | null>("load_app_config", { key: "ai_provider" });
      if (provider) setAiProvider(provider);
      const apiUrl = await invoke<string | null>("load_app_config", { key: "ai_api_url" });
      if (apiUrl) setAiApiUrl(apiUrl);
      const apiKey = await invoke<string | null>("load_app_config", { key: "ai_api_key" });
      if (apiKey) setAiApiKey(apiKey);
      const model = await invoke<string | null>("load_app_config", { key: "ai_model" });
      if (model) setAiModel(model);
      const filePrompt = await invoke<string | null>("load_app_config", { key: "ai_file_prompt" });
      if (filePrompt) setAiFilePrompt(filePrompt);
      const folderPrompt = await invoke<string | null>("load_app_config", { key: "ai_folder_prompt" });
      if (folderPrompt) setAiFolderPrompt(folderPrompt);
      const ctxMenu = await invoke<string | null>("load_app_config", { key: "ai_context_menu_enabled" });
      setAiContextMenuEnabled(ctxMenu === "true");
    } catch { /* ignore */ }
  };

  const reloadTemplates = useCallback(async () => {
    try {
      const list = await invoke<TemplateConfig[]>("get_templates");
      setTemplates(list);
    } catch (error) {
      console.error("Failed to reload templates:", error);
    }
  }, []);

  useEffect(() => {
    const unlistenLanguageChanged = listen<{ language: string }>("language-changed", (event) => {
      i18n.changeLanguage(event.payload.language);
    });
    return () => {
      unlistenLanguageChanged.then((fn) => fn());
    };
  }, [i18n]);

  const handleShortcutChange = async (newShortcut: string) => {
    const oldShortcut = shortcut;
    setShortcut(newShortcut);

    if (newShortcut) {
      localStorage.setItem(SHORTCUT_KEY, newShortcut);
      const result = await registerShortcut(newShortcut, handleShowMainWindow, oldShortcut);
      if (!result.success) {
        toast.error(t("settings.shortcut.conflict", { shortcut: newShortcut }));
        // Revert to old shortcut
        setShortcut(oldShortcut);
        if (oldShortcut) {
          localStorage.setItem(SHORTCUT_KEY, oldShortcut);
          await registerShortcut(oldShortcut, handleShowMainWindow);
        } else {
          localStorage.removeItem(SHORTCUT_KEY);
        }
        return;
      }
      await emit("shortcut-changed", { shortcut: newShortcut });
      toast.success(t("settings.shortcut.setSuccess", { shortcut: newShortcut }));
    } else {
      localStorage.removeItem(SHORTCUT_KEY);
      if (oldShortcut) {
        await unregisterShortcut(oldShortcut);
      }
      await emit("shortcut-changed", { shortcut: "" });
      toast.info(t("settings.shortcut.cleared"));
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEditTemplate = (template: TemplateConfig) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await invoke("delete_template", { id });
      await reloadTemplates();
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleToggleContextMenu = async () => {
    try {
      if (contextMenuInstalled) {
        await invoke("uninstall_context_menu");
        setContextMenuInstalled(false);
        toast.success("Context menu uninstalled");
      } else {
        await invoke("install_context_menu");
        setContextMenuInstalled(true);
        toast.success("Context menu installed");
      }
    } catch (error) {
      toast.error("Failed to toggle context menu");
    }
  };

  const handleDefaultTemplateChange = async (type: "file" | "folder", templateId: string) => {
    const key = type === "file" ? "lastFileTemplateId" : "lastFolderTemplateId";
    if (type === "file") {
      setDefaultFileTemplateId(templateId);
    } else {
      setDefaultFolderTemplateId(templateId);
    }
    try {
      await invoke("save_app_config", { key, value: templateId });
    } catch (error) {
      console.error("Failed to save default template:", error);
    }
  };

  const handleTestConnection = async () => {
    if (!aiApiKey.trim()) {
      toast.error(t("settings.ai.testError", { error: "API key is empty" }));
      return;
    }
    setTestLoading(true);
    try {
      await invoke<string>("test_ai_connection", {
        apiUrl: aiApiUrl,
        apiKey: aiApiKey,
        model: aiModel,
      });
      toast.success(t("settings.ai.testSuccess"));
    } catch (error) {
      const errMsg = typeof error === "string" ? error : String(error);
      toast.error(t("settings.ai.testError", { error: errMsg }));
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveAiConfig = async () => {
    try {
      await invoke("save_app_config", { key: "ai_provider", value: aiProvider });
      await invoke("save_app_config", { key: "ai_api_url", value: aiApiUrl });
      await invoke("save_app_config", { key: "ai_api_key", value: aiApiKey });
      await invoke("save_app_config", { key: "ai_model", value: aiModel });
      await invoke("save_app_config", { key: "ai_file_prompt", value: aiFilePrompt });
      await invoke("save_app_config", { key: "ai_folder_prompt", value: aiFolderPrompt });
      await invoke("save_app_config", { key: "ai_context_menu_enabled", value: aiContextMenuEnabled.toString() });
      toast.success(t("settings.ai.saveSuccess"));
    } catch (error) {
      toast.error(t("settings.ai.saveError"));
    }
  };

  const fileTemplates = templates.filter((t) => t.pattern.includes("{Ext}"));
  const folderTemplates = templates.filter((t) => !t.pattern.includes("{Ext}"));
  const currentTemplates = templateTab === "file" ? fileTemplates : folderTemplates;

  const menuItems = [
    { id: "appearance" as SettingSection, label: t("settings.appearance.title"), icon: Palette },
    { id: "shortcut" as SettingSection, label: t("settings.shortcut.title"), icon: Keyboard },
    { id: "templates" as SettingSection, label: t("settings.templates.title"), icon: FileText },
    { id: "ai" as SettingSection, label: t("settings.ai.title"), icon: Sparkles },
  ];

  return (
    <WindowFrame
      titleBar={<TitleBar title={t("settings.title")} showMaximize={false} />}
      contentClassName="flex flex-1 overflow-hidden"
    >
      <Toaster />
      <aside className="border-border flex w-40 flex-col border-r p-4">
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  activeSection === item.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl p-4">
          {activeSection === "appearance" && (
            <div className="space-y-4">
              <div>
                <h2 className="mb-1 text-lg font-semibold">{t("settings.appearance.title")}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("settings.appearance.description")}
                </p>
              </div>

              <div className="space-y-0">
                <div className="flex items-center justify-between py-2.5">
                  <label className="text-sm font-medium">{t("settings.appearance.theme")}</label>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="flex items-center gap-1.5"
                    >
                      <Sun className="h-3.5 w-3.5" />
                      {t("settings.appearance.light")}
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="flex items-center gap-1.5"
                    >
                      <Moon className="h-3.5 w-3.5" />
                      {t("settings.appearance.dark")}
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="flex items-center gap-1.5"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      {t("settings.appearance.system")}
                    </Button>
                  </div>
                </div>

                <div className="border-t" />

                <div className="flex items-center justify-between py-2.5">
                  <label className="text-sm font-medium">{t("settings.appearance.language")}</label>
                  <LanguageToggle />
                </div>
              </div>
            </div>
          )}

          {activeSection === "shortcut" && (
            <div className="space-y-4">
              <div>
                <h2 className="mb-1 text-lg font-semibold">{t("settings.shortcut.title")}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("settings.shortcut.description")}
                </p>
              </div>

              <div className="space-y-0">
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex-1">
                    <label className="text-sm font-medium">{t("settings.shortcut.showMain")}</label>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t("settings.shortcut.showMainDesc")}
                    </p>
                  </div>
                  <ShortcutInput value={shortcut} onChange={handleShortcutChange} />
                </div>

                <div className="border-t" />

              </div>
            </div>
          )}

          {activeSection === "templates" && (
            <div className="space-y-4">
              <div>
                <h2 className="mb-1 text-lg font-semibold">{t("settings.templates.title")}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("settings.templates.description")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Button onClick={handleNewTemplate} size="sm">
                    {t("settings.templates.newTemplate")}
                  </Button>
                  <Button
                    variant={contextMenuInstalled ? "destructive" : "outline"}
                    onClick={handleToggleContextMenu}
                    size="sm"
                  >
                    {contextMenuInstalled
                      ? t("settings.templates.uninstallContextMenu")
                      : t("settings.templates.installContextMenu")}
                  </Button>
                </div>

                {/* Default template settings */}
                <div className="border-border space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">{t("settings.templates.defaultTemplates")}</p>
                  <div className="flex items-center gap-2">
                    <File className="text-muted-foreground h-4 w-4 shrink-0" />
                    <label className="text-xs font-medium shrink-0">{t("settings.templates.file")}</label>
                    <select
                      className="border-border bg-background rounded-md border px-2 py-1 text-xs flex-1 min-w-0"
                      value={defaultFileTemplateId}
                      onChange={(e) => handleDefaultTemplateChange("file", e.target.value)}
                    >
                      <option value="">{t("settings.templates.none")}</option>
                      {fileTemplates.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {getTemplateDisplayName(tmpl, i18n.language)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Folder className="text-muted-foreground h-4 w-4 shrink-0" />
                    <label className="text-xs font-medium shrink-0">{t("settings.templates.folder")}</label>
                    <select
                      className="border-border bg-background rounded-md border px-2 py-1 text-xs flex-1 min-w-0"
                      value={defaultFolderTemplateId}
                      onChange={(e) => handleDefaultTemplateChange("folder", e.target.value)}
                    >
                      <option value="">{t("settings.templates.none")}</option>
                      {folderTemplates.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {getTemplateDisplayName(tmpl, i18n.language)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File/Folder tabs */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setTemplateTab("file")}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      templateTab === "file"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <File className="h-4 w-4" />
                    {t("settings.templates.fileTemplates")}
                    <span className="text-muted-foreground text-xs">({fileTemplates.length})</span>
                  </button>
                  <button
                    onClick={() => setTemplateTab("folder")}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      templateTab === "folder"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Folder className="h-4 w-4" />
                    {t("settings.templates.folderTemplates")}
                    <span className="text-muted-foreground text-xs">({folderTemplates.length})</span>
                  </button>
                </div>

                {currentTemplates.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    {t("settings.templates.noTemplates")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentTemplates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="border-border flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getTemplateDisplayName(tmpl, i18n.language)}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">{tmpl.pattern}</p>
                        </div>
                        <div className="ml-3 flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(tmpl)}
                          >
                            {t("settings.templates.edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                          >
                            {t("settings.templates.delete")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "ai" && (
            <div className="space-y-4">
              <div>
                <h2 className="mb-1 text-lg font-semibold">{t("settings.ai.title")}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("settings.ai.description")}
                </p>
              </div>

              <div className="space-y-3">
                {/* AI Provider */}
                <div className="flex items-center justify-between py-2">
                  <label className="text-sm font-medium">{t("settings.ai.provider")}</label>
                  <select
                    className="border-border bg-background rounded-md border px-2 py-1 text-sm w-32"
                    value={aiProvider}
                    onChange={(e) => {
                      setAiProvider(e.target.value);
                      if (e.target.value === "deepseek") {
                        setAiApiUrl("https://api.deepseek.com");
                        setAiModel("deepseek-v4-flash");
                      }
                    }}
                  >
                    <option value="deepseek">{t("settings.ai.providerDeepseek")}</option>
                    <option value="custom">{t("settings.ai.providerCustom")}</option>
                  </select>
                </div>

                <div className="border-t" />

                {/* API URL */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("settings.ai.apiUrl")}</label>
                  <input
                    type="text"
                    className="border-border bg-background w-full rounded-md border px-3 py-1.5 text-sm"
                    placeholder={t("settings.ai.apiUrlPlaceholder")}
                    value={aiApiUrl}
                    onChange={(e) => setAiApiUrl(e.target.value)}
                  />
                </div>

                {/* API Key */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("settings.ai.apiKey")}</label>
                  <input
                    type="password"
                    className="border-border bg-background w-full rounded-md border px-3 py-1.5 text-sm"
                    placeholder={t("settings.ai.apiKeyPlaceholder")}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                  />
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("settings.ai.model")}</label>
                  <input
                    type="text"
                    className="border-border bg-background w-full rounded-md border px-3 py-1.5 text-sm"
                    placeholder={t("settings.ai.modelPlaceholder")}
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                  />
                </div>

                <div className="border-t" />

                {/* File Naming Prompt */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("settings.ai.filePrompt")}</label>
                  <textarea
                    className="border-border bg-background w-full rounded-md border px-3 py-1.5 text-sm min-h-[80px] resize-y"
                    placeholder={t("settings.ai.filePromptPlaceholder")}
                    value={aiFilePrompt}
                    onChange={(e) => setAiFilePrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Folder Naming Prompt */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("settings.ai.folderPrompt")}</label>
                  <textarea
                    className="border-border bg-background w-full rounded-md border px-3 py-1.5 text-sm min-h-[80px] resize-y"
                    placeholder={t("settings.ai.folderPromptPlaceholder")}
                    value={aiFolderPrompt}
                    onChange={(e) => setAiFolderPrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="border-t" />

                {/* Context Menu AI Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium">{t("settings.ai.contextMenuAi")}</label>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t("settings.ai.contextMenuAiDesc")}
                    </p>
                  </div>
                  <button
                    onClick={() => setAiContextMenuEnabled(!aiContextMenuEnabled)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      aiContextMenuEnabled ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-600"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        aiContextMenuEnabled ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testLoading}
                    size="sm"
                    className="flex-1 gap-1.5"
                  >
                    <Wifi className="h-4 w-4" />
                    {testLoading ? t("settings.ai.testConnecting") : t("settings.ai.testConnection")}
                  </Button>
                  <Button onClick={handleSaveAiConfig} size="sm" className="flex-1">
                    {t("settings.ai.save")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TemplateEditorDialog
        open={editorOpen}
        template={editingTemplate}
        onClose={() => setEditorOpen(false)}
        onSaved={reloadTemplates}
      />
    </WindowFrame>
  );
}