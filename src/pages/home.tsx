import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import { WindowFrame } from "@/components/window-frame";
import { MainTitleBar } from "@/components/main-title-bar";
import { UpdaterDialog } from "@/components/updater-dialog";
import { FileList } from "@/components/rename/file-list";
import { DynamicForm } from "@/components/rename/dynamic-form";
import { TemplateSelector } from "@/components/rename/template-selector";
import { TemplateEditorDialog } from "@/components/rename/template-editor-dialog";
import { RenameControls } from "@/components/rename/rename-controls";
import { registerShortcut } from "@/lib/shortcut";
import { toggleWindow } from "@/lib/window";
import { useRename, type TemplateConfig } from "@/hooks/use-rename";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const SHORTCUT_KEY = "global-shortcut-show-main";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const {
    files,
    itemType,
    templates,
    selectedTemplate,
    varValues,
    counterStart,
    previewResults,
    isLoading,
    selectTemplate,
    updateVarValue,
    updateCounterStart,
    applyRename,
    reset,
    clearFiles,
    replaceFiles,
    reloadTemplates,
  } = useRename();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateConfig | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse template variables for dynamic form
  const [templateVars, setTemplateVars] = useState<import("@/hooks/use-rename").TemplateVariable[]>([]);

  useEffect(() => {
    if (selectedTemplate) {
      invoke<import("@/hooks/use-rename").TemplateVariable[]>("parse_template", {
        pattern: selectedTemplate.pattern,
      })
        .then(setTemplateVars)
        .catch(console.error);
    } else {
      setTemplateVars([]);
    }
  }, [selectedTemplate]);

  // Diagnostic: log when files change
  useEffect(() => {
    console.log("[SmartRename] files changed:", files.length, "files");
  }, [files]);

  // Listen for new files from single-instance callback (right-click context menu)
  // Separated into its own useEffect to avoid listener re-registration issues
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      const unlisten = await listen<string[]>("new-files", (event) => {
        console.log("[SmartRename] Received 'new-files' event:", event.payload);
        if (event.payload.length > 0) {
          console.log("[SmartRename] Calling replaceFiles with", event.payload.length, "files");
          replaceFiles(event.payload);
        }
      });
      unlistenFn = unlisten;
      console.log("[SmartRename] 'new-files' listener registered");
    };

    setupListener();

    return () => {
      if (unlistenFn) {
        unlistenFn();
        console.log("[SmartRename] 'new-files' listener unregistered");
      }
    };
  }, [replaceFiles]);

  // Global shortcut and cross-window event listeners
  useEffect(() => {
    const unlistenShortcutChanged = listen<{ shortcut: string }>(
      "shortcut-changed",
      async (event) => {
        const newShortcut = event.payload.shortcut;
        if (newShortcut) {
          const result = await registerShortcut(newShortcut, async () => {
            await toggleWindow("main");
          });
          if (!result.success) {
            console.warn("Show main shortcut conflict:", result.error);
          }
        }
      }
    );

    const unlistenLanguageChanged = listen<{ language: string }>(
      "language-changed",
      (event) => {
        i18n.changeLanguage(event.payload.language);
      }
    );

    // Listen for direct rename results from context menu (single-instance callback)
    const unlistenDirectRenameSuccess = listen<string>("direct-rename-success", (event) => {
      toast.success(event.payload);
    });
    const unlistenDirectRenameError = listen<string>("direct-rename-error", (event) => {
      toast.error(event.payload);
    });

    // Drag-drop event listeners (Tauri built-in)
    const unlistenFileDrop = listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      if (event.payload.paths.length > 0) {
        replaceFiles(event.payload.paths);
      }
      setIsDragOver(false);
    });
    const unlistenFileDropHover = listen<{ paths: string[] }>("tauri://drag-drop-hover", (event) => {
      setIsDragOver(event.payload.paths.length > 0);
    });
    const unlistenFileDropLeave = listen<void>("tauri://drag-drop-leave", () => {
      setIsDragOver(false);
    });

    return () => {
      unlistenShortcutChanged.then((fn) => fn());
      unlistenLanguageChanged.then((fn) => fn());
      unlistenDirectRenameSuccess.then((fn) => fn());
      unlistenDirectRenameError.then((fn) => fn());
      unlistenFileDrop.then((fn) => fn());
      unlistenFileDropHover.then((fn) => fn());
      unlistenFileDropLeave.then((fn) => fn());
    };
  }, [i18n, replaceFiles]);

  // Init tray menu (depends on language)
  useEffect(() => {
    const initTrayMenu = async () => {
      try {
        await invoke("update_tray_menu", {
          showText: t("tray.show"),
          quitText: t("tray.quit"),
        });
      } catch (error) {
        console.error("Failed to initialize tray menu:", error);
      }
    };
    initTrayMenu();
  }, [t]);

  // Init main window shortcut
  useEffect(() => {
    const initShortcut = async () => {
      const savedShortcut = localStorage.getItem(SHORTCUT_KEY);
      if (savedShortcut) {
        const result = await registerShortcut(savedShortcut, async () => {
          await toggleWindow("main");
        });
        if (!result.success) {
          console.warn("Show main shortcut conflict on init:", result.error);
        }
      }
    };
    initShortcut();
  }, []);

  // Template CRUD handlers
  const handleNewTemplate = useCallback(() => {
    setEditingTemplate(null);
    setEditorOpen(true);
  }, []);

  const handleEditTemplate = useCallback((template: TemplateConfig) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  }, []);

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_template", { id });
        await reloadTemplates();
        if (selectedTemplate?.id === id) {
          selectTemplate(null);
        }
        toast.success("Template deleted");
      } catch (error) {
        toast.error("Failed to delete template");
      }
    },
    [selectedTemplate, selectTemplate, reloadTemplates]
  );

  const handleApplyRename = useCallback(async () => {
    const results = await applyRename();
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast.success(t("rename.successRenamed", { count: successCount }));
    } else {
      toast.warning(t("rename.partialRename", { success: successCount, failed: failCount }));
    }
  }, [applyRename, t]);

  const handleReset = useCallback(() => {
    reset();
    toast.info(t("rename.resetComplete"));
  }, [reset, t]);

  const handleClearFiles = useCallback(() => {
    if (files.length === 0) return;
    clearFiles();
  }, [files.length, clearFiles]);

  const getDragOverlayText = () => {
    if (itemType === "folder") return t("rename.dropItemsHere");
    return t("rename.dropFilesHere");
  };

  if (isLoading) {
    return (
      <WindowFrame
        titleBar={<MainTitleBar />}
        contentClassName="flex flex-1 items-center justify-center"
      >
        <div className="text-muted-foreground">Loading...</div>
      </WindowFrame>
    );
  }

  return (
    <WindowFrame
      titleBar={<MainTitleBar />}
      contentClassName="flex flex-1 flex-col overflow-hidden relative"
    >
      <Toaster />
      <UpdaterDialog />

      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-500/10 border-2 border-emerald-500 border-dashed rounded-lg pointer-events-none backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <span className="text-emerald-600 text-lg font-semibold drop-shadow">
              {getDragOverlayText()}
            </span>
          </div>
        </div>
      )}

      {itemType === "mixed" && files.length > 0 && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-sm text-yellow-600 text-center">
          {t("rename.mixedItemsWarning")}
        </div>
      )}

      <TemplateSelector
        templates={templates}
        selected={selectedTemplate}
        onSelect={selectTemplate}
        onNew={handleNewTemplate}
        onEdit={handleEditTemplate}
        onDelete={handleDeleteTemplate}
        itemType={itemType}
      />

      <div className="border-border border-t" />

      <FileList items={previewResults} itemType={itemType} />

      {selectedTemplate && (
        <>
          <div className="border-border border-t" />
          <DynamicForm
            variables={templateVars}
            varValues={varValues}
            counterStart={counterStart}
            onVarChange={updateVarValue}
            onCounterChange={updateCounterStart}
            itemType={itemType}
          />
        </>
      )}

      <RenameControls
        fileCount={files.length}
        canApply={!!selectedTemplate && files.length > 0}
        onApply={handleApplyRename}
        onReset={handleReset}
        onClearFiles={handleClearFiles}
        itemType={itemType}
      />

      <TemplateEditorDialog
        open={editorOpen}
        template={editingTemplate}
        onClose={() => setEditorOpen(false)}
        onSaved={reloadTemplates}
      />
    </WindowFrame>
  );
}