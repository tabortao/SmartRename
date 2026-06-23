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

  // Global shortcut and cross-window language sync listener
  useEffect(() => {
    const unlistenShortcutChanged = listen<{ shortcut: string }>(
      "shortcut-changed",
      async (event) => {
        const newShortcut = event.payload.shortcut;
        if (newShortcut) {
          await registerShortcut(newShortcut, async () => {
            await toggleWindow("main");
          });
        }
      }
    );

    const unlistenLanguageChanged = listen<{ language: string }>(
      "language-changed",
      (event) => {
        i18n.changeLanguage(event.payload.language);
      }
    );

    const unlistenNewFiles = listen<string[]>("new-files", (event) => {
      // When entering via right-click context menu, replace existing files
      // This ensures a clean state for each new operation
      if (event.payload.length > 0) {
        replaceFiles(event.payload);
      }
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
      unlistenNewFiles.then((fn) => fn());
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

  // Init global shortcut
  useEffect(() => {
    const initShortcut = async () => {
      const savedShortcut = localStorage.getItem(SHORTCUT_KEY);
      if (savedShortcut) {
        await registerShortcut(savedShortcut, async () => {
          await toggleWindow("main");
        });
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-primary border-dashed rounded-lg pointer-events-none">
          <span className="text-primary text-lg font-semibold drop-shadow">
            {t("rename.dropFilesHere")}
          </span>
        </div>
      )}

      <TemplateSelector
        templates={templates}
        selected={selectedTemplate}
        onSelect={selectTemplate}
        onNew={handleNewTemplate}
        onEdit={handleEditTemplate}
        onDelete={handleDeleteTemplate}
      />

      <div className="border-border border-t" />

      <FileList items={previewResults} />

      {selectedTemplate && (
        <>
          <div className="border-border border-t" />
          <DynamicForm
            variables={templateVars}
            varValues={varValues}
            counterStart={counterStart}
            onVarChange={updateVarValue}
            onCounterChange={updateCounterStart}
          />
        </>
      )}

      <RenameControls
        fileCount={files.length}
        canApply={!!selectedTemplate && files.length > 0}
        onApply={handleApplyRename}
        onReset={handleReset}
        onClearFiles={handleClearFiles}
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