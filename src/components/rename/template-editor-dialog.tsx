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
import type { TemplateConfig } from "@/hooks/use-rename";

interface TemplateEditorDialogProps {
  open: boolean;
  template: TemplateConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

const VAR_HELP = [
  { var: "{Date}", desc: "Current date (default: YYYYMMDD)" },
  { var: "{Date:YYYY-MM-DD}", desc: "Date with custom format" },
  { var: "{Time}", desc: "Current time (default: HHMMSS)" },
  { var: "{Time:HH-mm}", desc: "Time with custom format" },
  { var: "{Ext}", desc: "File extension" },
  { var: "{ParentDir}", desc: "Parent directory name" },
  { var: "{OriginalName}", desc: "Original filename" },
  { var: "{Input:topic}", desc: 'User input (label: "topic")' },
  { var: "{Counter}", desc: "Auto-increment counter (1, 2, 3...)" },
  { var: "{Counter:001}", desc: "Padded counter (001, 002...)" },
];

export function TemplateEditorDialog({
  open,
  template,
  onClose,
  onSaved,
}: TemplateEditorDialogProps) {
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
          <DialogTitle>{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly Report"
            />
          </div>
          <div className="space-y-2">
            <Label>Pattern</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. {Date:YYYYMMDD}_{Input:topic}.{Ext}"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Available Variables (click to insert)</Label>
            <div className="flex flex-wrap gap-1.5">
              {VAR_HELP.map((v) => (
                <button
                  key={v.var}
                  type="button"
                  onClick={() => insertVar(v.var)}
                  className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs hover:bg-muted transition-colors"
                  title={v.desc}
                >
                  {v.var}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !pattern.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}