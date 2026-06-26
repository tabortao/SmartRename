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
import { Moon, Sun, Monitor, Palette, Keyboard, FileText, Folder, File } from "lucide-react";
import { registerShortcut, unregisterShortcut } from "@/lib/shortcut";
import { toggleWindow } from "@/lib/window";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useTranslation } from "react-i18next";
import type { TemplateConfig } from "@/hooks/use-rename";
import { getTemplateDisplayName } from "@/hooks/use-rename";

const SHORTCUT_KEY = "global-shortcut-show-main";

type SettingSection = "appearance" | "shortcut" | "templates";
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
  }, []);

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

  const fileTemplates = templates.filter((t) => t.pattern.includes("{Ext}"));
  const folderTemplates = templates.filter((t) => !t.pattern.includes("{Ext}"));
  const currentTemplates = templateTab === "file" ? fileTemplates : folderTemplates;

  const menuItems = [
    { id: "appearance" as SettingSection, label: t("settings.appearance.title"), icon: Palette },
    { id: "shortcut" as SettingSection, label: t("settings.shortcut.title"), icon: Keyboard },
    { id: "templates" as SettingSection, label: t("settings.templates.title"), icon: FileText },
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