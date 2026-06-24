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

export function useRename() {
  const [files, setFiles] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [counterStart, setCounterStart] = useState(1);
  const [previewResults, setPreviewResults] = useState<PreviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

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

        // Load last template ID separately (failure should not block init)
        let lastTemplateId: string | null = null;
        try {
          lastTemplateId = await invoke<string | null>("load_app_config", {
            key: "lastTemplateId",
          });
        } catch {
          // config.json may not exist yet, ignore
        }

        // Auto-select last used template, or default to "日期_原文件名_版本"
        if (lastTemplateId && templateList.length > 0) {
          const lastTemplate = templateList.find((t) => t.id === lastTemplateId);
          if (lastTemplate) {
            setSelectedTemplate(lastTemplate);
            refreshPreview(lastTemplate.pattern, {}, 1, fileList);
            return;
          }
        }
        // No last template — default to "日期_原文件名_版本" for first-time users
        if (templateList.length > 0) {
          const defaultTemplate = templateList.find(
            (t) => t.name === "日期_原文件名_版本" || t.name_zh === "日期_原文件名_版本"
          );
          if (defaultTemplate) {
            setSelectedTemplate(defaultTemplate);
            const defaults: Record<string, string> = {};
            if (defaultTemplate.pattern.includes("{Input:版本号}")) {
              defaults["版本号"] = "1";
            }
            refreshPreview(defaultTemplate.pattern, defaults, 1, fileList);
          }
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

  // Persist selected template ID to config
  useEffect(() => {
    if (!initializedRef.current) return;
    if (selectedTemplate) {
      invoke("save_app_config", { key: "lastTemplateId", value: selectedTemplate.id }).catch(
        console.error
      );
    }
  }, [selectedTemplate]);

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
        // Default version number to "1" if template has {Input:版本号}
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
        const updated = [...prev, ...unique];
        if (selectedTemplate) {
          refreshPreview(selectedTemplate.pattern, varValues, counterStart, updated);
        }
        return updated;
      });
    },
    [selectedTemplate, varValues, counterStart, refreshPreview]
  );

  // Replace files (used when entering via right-click context menu)
  const replaceFiles = useCallback(async (newFiles: string[]) => {
    setFiles(newFiles);
    setVarValues({});
    setCounterStart(1);
    setPreviewResults([]);

    // Try to auto-load last template from config
    try {
      const lastTemplateId = await invoke<string | null>("load_app_config", {
        key: "lastTemplateId",
      });
      if (lastTemplateId) {
        const templateList = await invoke<TemplateConfig[]>("get_templates");
        const lastTemplate = templateList.find((t) => t.id === lastTemplateId);
        if (lastTemplate) {
          setSelectedTemplate(lastTemplate);
          refreshPreview(lastTemplate.pattern, {}, 1, newFiles);
          return;
        }
      }
    } catch {
      // Ignore errors
    }
    setSelectedTemplate(null);
  }, [refreshPreview]);

  return {
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
    addFiles,
  };
}