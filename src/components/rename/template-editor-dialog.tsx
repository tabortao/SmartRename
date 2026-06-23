import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import type { TemplateConfig } from "@/hooks/use-rename";

interface TemplateEditorDialogProps {
  open: boolean;
  template: TemplateConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

const VAR_HELP = [
  { var: "{Date}", descKey: "templateEditor.varDesc.date" },
  { var: "{Date:YYYY-MM-DD}", descKey: "templateEditor.varDesc.dateCustom" },
  { var: "{Time}", descKey: "templateEditor.varDesc.time" },
  { var: "{Time:HH-mm}", descKey: "templateEditor.varDesc.timeCustom" },
  { var: "{Ext}", descKey: "templateEditor.varDesc.ext" },
  { var: "{ParentDir}", descKey: "templateEditor.varDesc.parentDir" },
  { var: "{OriginalName}", descKey: "templateEditor.varDesc.originalName" },
  { var: "{Input:topic}", descKey: "templateEditor.varDesc.input" },
  { var: "{Counter}", descKey: "templateEditor.varDesc.counter" },
  { var: "{Counter:001}", descKey: "templateEditor.varDesc.counterPadded" },
  { var: "{Counter:01}", descKey: "templateEditor.varDesc.counterNum" },
  { var: "v{Counter:01}", descKey: "templateEditor.varDesc.counterVersion" },
];

export function TemplateEditorDialog({
  open,
  template,
  onClose,
  onSaved,
}: TemplateEditorDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setPattern(template.pattern);
    } else {
      setName("");
      setPattern("");
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!name.trim() || !pattern.trim()) return;

    const now = new Date().toISOString();
    const newTemplate: TemplateConfig = {
      id: template?.id || crypto.randomUUID(),
      name: name.trim(),
      pattern: pattern.trim(),
      created_at: template?.created_at || now,
      updated_at: now,
    };

    try {
      await invoke("save_template", { template: newTemplate });
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  const insertVar = (varText: string) => {
    setPattern((prev) => prev + varText);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? t("templateEditor.editTitle") : t("templateEditor.newTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("templateEditor.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("templateEditor.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("templateEditor.pattern")}</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={t("templateEditor.patternPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t("templateEditor.availableVars")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {VAR_HELP.map((v) => (
                <button
                  key={v.var}
                  type="button"
                  onClick={() => insertVar(v.var)}
                  className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs hover:bg-muted transition-colors"
                  title={t(v.descKey)}
                >
                  {v.var}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("templateEditor.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !pattern.trim()}>
            {t("templateEditor.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}