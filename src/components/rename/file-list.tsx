import { cn } from "@/lib/utils";
import { File, ArrowRight, AlertTriangle, AlertCircle } from "lucide-react";
import type { PreviewItem } from "@/hooks/use-rename";
import { useTranslation } from "react-i18next";

interface FileListProps {
  items: PreviewItem[];
  className?: string;
}

export function FileList({ items, className }: FileListProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <File className="h-12 w-12 opacity-30" />
          <p className="text-sm">{t("rename.noFiles")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden", className)}>
      <div className="border-border flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
        <File className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{t("rename.originalName")}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{t("rename.previewName")}</span>
      </div>
      <div className="flex-1 overflow-auto">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 border-b border-border/50 px-3 py-2 text-sm transition-colors",
              item.conflict && "bg-red-500/10",
              !item.valid && "bg-yellow-500/10"
            )}
          >
            <span className="flex-1 truncate text-muted-foreground">{item.original}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            <span
              className={cn(
                "flex-1 truncate",
                item.conflict && "font-medium text-red-500",
                !item.valid && "font-medium text-yellow-500"
              )}
            >
              {item.preview}
            </span>
            {item.conflict && (
              <span className="ml-1 flex shrink-0 items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {t("rename.conflict")}
              </span>
            )}
            {!item.valid && (
              <span className="ml-1 flex shrink-0 items-center gap-1 rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-600">
                <AlertCircle className="h-3 w-3" />
                {t("rename.invalid")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}