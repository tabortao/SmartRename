import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Trash2 } from "lucide-react";
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
        <Button onClick={onApply} disabled={!canApply} size="sm">
          <Play className="mr-1.5 h-4 w-4" />
          {t("rename.rename")}
        </Button>
        <Button variant="outline" onClick={onReset} size="sm">
          <RotateCcw className="mr-1.5 h-4 w-4" />
          {t("rename.reset")}
        </Button>
        {onClearFiles && (
          <Button
            variant="outline"
            onClick={onClearFiles}
            disabled={!hasFiles}
            size="sm"
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("rename.clearFiles")}
          </Button>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {t("rename.fileCount", { count: fileCount })}
      </span>
    </div>
  );
}