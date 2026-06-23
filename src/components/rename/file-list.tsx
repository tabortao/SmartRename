import { cn } from "@/lib/utils";
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
      <div className={cn("flex flex-1 items-center justify-center text-muted-foreground", className)}>
        <p>{t("rename.noFiles")}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden", className)}>
      <div className="border-border flex items-center border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        <span className="flex-1">{t("rename.originalName")}</span>
        <span className="mx-2 text-muted-foreground/50">&rarr;</span>
        <span className="flex-1">{t("rename.previewName")}</span>
      </div>
      <div className="flex-1 overflow-auto">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center border-b border-border/50 px-3 py-2 text-sm transition-colors",
              item.conflict && "bg-red-500/10",
              !item.valid && "bg-yellow-500/10"
            )}
          >
            <span className="flex-1 truncate text-muted-foreground">{item.original}</span>
            <span className="mx-2 shrink-0 text-muted-foreground/50">&rarr;</span>
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
              <span className="ml-2 shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-500">
                {t("rename.conflict")}
              </span>
            )}
            {!item.valid && (
              <span className="ml-2 shrink-0 rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-600">
                {t("rename.invalid")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}