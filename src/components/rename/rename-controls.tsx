import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Trash2, Files } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RenameControlsProps {
  fileCount: number;
  canApply: boolean;
  onApply: () => void;
  onReset: () => void;
  onClearFiles?: () => void;
}

export function RenameControls({
  fileCount,
  canApply,
  onApply,
  onReset,
  onClearFiles,
}: RenameControlsProps) {
  const { t } = useTranslation();
  const hasFiles = fileCount > 0;

  return (
    <div className="border-border flex items-center justify-between border-t px-4 py-3">
      <div className="flex items-center gap-2">
        <Button
          onClick={onApply}
          disabled={!canApply}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
        >
          <Play className="h-4 w-4" />
          {t("rename.rename")}
        </Button>
        <Button variant="outline" onClick={onReset} size="sm" className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          {t("rename.reset")}
        </Button>
        {onClearFiles && (
          <Button
            variant="outline"
            onClick={onClearFiles}
            disabled={!hasFiles}
            size="sm"
            className="text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            {t("rename.clearFiles")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Files className="h-4 w-4" />
        <span>{t("rename.fileCount", { count: fileCount })}</span>
      </div>
    </div>
  );
}