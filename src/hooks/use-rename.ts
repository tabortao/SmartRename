import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface TemplateConfig {
  id: string;
  name: string;
  name_zh?: string;
  name_en?: string;
  pattern: string;
  created_at: string;
  updated_at: string;
}

/** Get the display name of a template based on the current locale */
export function getTemplateDisplayName(template: TemplateConfig, locale: string): string {
  if (locale === "zh" && template.name_zh) return template.name_zh;
  if (locale === "en" && template.name_en) return template.name_en;
  return template.name_zh || template.name_en || template.name;
}

export interface TemplateVariable {
  varType: { type: string };
  format: string | null;
  label: string | null;
}

export interface PreviewItem {
  original: string;
  preview: string;
  conflict: boolean;
  valid: boolean;
}

export interface RenameResult {
  original: string;
  renamed: string | null;
  success: boolean;
  error: string | null;
}

export type ItemType = "file" | "folder" | "mixed" | null;

export function useRename() {
  const [files, setFiles] = useState<string[]>([]);
  const [itemType, setItemType] = useState<ItemType>(null);
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [counterStart, setCounterStart] = useState(1);
  const [previewResults, setPreviewResults] = useState<PreviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Refs for stable shortcut callback access
  const applyRenameRef = useRef<() => Promise<RenameResult[]>>(async () => []);
  const selectTemplateRef = useRef<(template: TemplateConfig | null) => void>(() => {});
  const filesRef = useRef<string[]>([]);
  const templatesRef = useRef<TemplateConfig[]>([]);
  const itemTypeRef = useRef<ItemType>(null);
  const pendingAutoSelectRef = useRef(false);

  // Load files from CLI args and templates on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [fileList, templateList] = await Promise.all([
          invoke<string[]>("parse_cli_args"),
          invoke<TemplateConfig[]>("get_templates"),
        ]);
        setFiles(fileList);
        setTemplates(templateList);
        if (fileList.length > 0) {
          pendingAutoSelectRef.current = true;
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
      } finally {
        setIsLoading(false);
        initializedRef.current = true;
      }
    };
    init();
  }, []);

  // Auto-select default template when files change (handles init, right-click, drag-drop)
  useEffect(() => {
    if (files.length === 0 || !initializedRef.current) return;

    const autoSelect = async () => {
      // Detect item type
      let detectedType: ItemType = null;
      try {
        const type = await invoke<string>("detect_item_type", { paths: files });
        detectedType = type as ItemType;
        console.log("Detected item type:", detectedType);
      } catch (error) {
        console.error("Failed to detect item type:", error);
      }
      setItemType(detectedType);

      // Load default template based on item type
      try {
        const configKey = detectedType === "folder" ? "lastFolderTemplateId" : "lastFileTemplateId";
        let defaultTemplateId: string | null = null;
        try {
          defaultTemplateId = await invoke<string | null>("load_app_config", { key: configKey });
        } catch { /* ignore */ }
        // Fallback to lastTemplateId
        if (!defaultTemplateId) {
          try {
            defaultTemplateId = await invoke<string | null>("load_app_config", { key: "lastTemplateId" });
          } catch { /* ignore */ }
        }

        if (defaultTemplateId) {
          const template = templatesRef.current.find((t) => t.id === defaultTemplateId);
          if (template) {
            selectTemplate(template);
            return;
          }
        }

        // Fallback to type-specific defaults
        if (detectedType === "file") {
          const defaultTemplate = templatesRef.current.find(
            (t) => t.name === "日期_原文件名_版本" || t.name_zh === "日期_原文件名_版本"
          );
          if (defaultTemplate) {
            selectTemplate(defaultTemplate);
            return;
          }
        } else if (detectedType === "folder") {
          const defaultTemplate = templatesRef.current.find(
            (t) => t.name === "日期_原文件夹名" || t.name_zh === "日期_原文件夹名"
          );
          if (defaultTemplate) {
            selectTemplate(defaultTemplate);
            return;
          }
        }

        setVarValues({});
        setSelectedTemplate(null);
      } catch (error) {
        console.error("Failed to auto-select template:", error);
      }
    };

    autoSelect();
  }, [files]);

  // Persist selected template ID to config
  useEffect(() => {
    if (!initializedRef.current) return;
    if (selectedTemplate) {
      invoke("save_app_config", { key: "lastTemplateId", value: selectedTemplate.id }).catch(
        console.error
      );
      const typeKey = itemType === "folder" ? "lastFolderTemplateId" : "lastFileTemplateId";
      if (itemType) {
        invoke("save_app_config", { key: typeKey, value: selectedTemplate.id }).catch(
          console.error
        );
      }
    }
  }, [selectedTemplate, itemType]);

  // Refresh preview when variables change (debounced)
  const refreshPreview = useCallback(
    (pattern: string, values: Record<string, string>, counter: number, fileList: string[]) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(async () => {
        if (!pattern || fileList.length === 0) {
          setPreviewResults([]);
          return;
        }
        try {
          const results = await invoke<PreviewItem[]>("preview_rename", {
            files: fileList,
            pattern,
            varValues: values,
            counterStart: counter,
          });
          setPreviewResults(results);
        } catch (error) {
          console.error("Preview failed:", error);
        }
      }, 300);
    },
    []
  );

  // Select a template
  const selectTemplate = useCallback(
    (template: TemplateConfig | null) => {
      setSelectedTemplate(template);
      if (template) {
        const defaults: Record<string, string> = {};
        if (template.pattern.includes("{Input:版本号}")) {
          defaults["版本号"] = "1";
        }
        setVarValues(defaults);
        refreshPreview(template.pattern, defaults, counterStart, files);
      } else {
        setVarValues({});
        setPreviewResults([]);
      }
    },
    [files, counterStart, refreshPreview]
  );

  // Update variable values
  const updateVarValue = useCallback(
    (key: string, value: string) => {
      setVarValues((prev) => {
        const next = { ...prev, [key]: value };
        if (selectedTemplate) {
          refreshPreview(selectedTemplate.pattern, next, counterStart, files);
        }
        return next;
      });
    },
    [selectedTemplate, counterStart, files, refreshPreview]
  );

  // Update counter start
  const updateCounterStart = useCallback(
    (value: number) => {
      setCounterStart(value);
      if (selectedTemplate) {
        refreshPreview(selectedTemplate.pattern, varValues, value, files);
      }
    },
    [selectedTemplate, varValues, files, refreshPreview]
  );

  // Apply rename
  const applyRename = useCallback(async (): Promise<RenameResult[]> => {
    if (!selectedTemplate || files.length === 0) {
      return [];
    }
    try {
      const results = await invoke<RenameResult[]>("apply_rename", {
        files,
        pattern: selectedTemplate.pattern,
        varValues,
        counterStart,
      });
      return results;
    } catch (error) {
      console.error("Rename failed:", error);
      return [];
    }
  }, [selectedTemplate, files, varValues, counterStart]);

  // Reset all inputs
  const reset = useCallback(() => {
    setVarValues({});
    setCounterStart(1);
    if (selectedTemplate) {
      refreshPreview(selectedTemplate.pattern, {}, 1, files);
    }
  }, [selectedTemplate, files, refreshPreview]);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
    setPreviewResults([]);
    setVarValues({});
    setCounterStart(1);
    setItemType(null);
  }, []);

  // Reload templates
  const reloadTemplates = useCallback(async () => {
    try {
      const templateList = await invoke<TemplateConfig[]>("get_templates");
      setTemplates(templateList);
    } catch (error) {
      console.error("Failed to reload templates:", error);
    }
  }, []);

  // Add new files (e.g. from context menu while app is already running)
  const addFiles = useCallback(
    (newFiles: string[]) => {
      setFiles((prev) => {
        const existing = new Set(prev);
        const unique = newFiles.filter((f) => !existing.has(f));
        return [...prev, ...unique];
      });
    },
    []
  );

  // Replace files (used when entering via right-click context menu or drag-drop)
  const replaceFiles = useCallback((newFiles: string[]) => {
    console.log("replaceFiles called with:", newFiles);
    setFiles(newFiles);
    setCounterStart(1);
    setPreviewResults([]);
    setVarValues({});
    setSelectedTemplate(null);
  }, []);

  // Keep refs in sync with state for shortcut callbacks
  applyRenameRef.current = applyRename;
  selectTemplateRef.current = selectTemplate;
  filesRef.current = files;
  templatesRef.current = templates;
  itemTypeRef.current = itemType;

  return {
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
    addFiles,
    // Refs for stable shortcut access
    applyRenameRef,
    selectTemplateRef,
    filesRef,
    templatesRef,
    itemTypeRef,
  };
}