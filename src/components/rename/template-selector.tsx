import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TemplateConfig } from "@/hooks/use-rename";
import { getTemplateDisplayName } from "@/hooks/use-rename";

interface TemplateSelectorProps {
  templates: TemplateConfig[];
  selected: TemplateConfig | null;
  onSelect: (template: TemplateConfig | null) => void;
  onNew: () => void;
  onEdit: (template: TemplateConfig) => void;
  onDelete: (id: string) => void;
}

export function TemplateSelector({
  templates,
  selected,
  onSelect,
  onNew,
  onEdit,
  onDelete,
}: TemplateSelectorProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-sm font-medium shrink-0">{t("template.label")}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between">
            <span className="truncate">
              {selected
                ? getTemplateDisplayName(selected, i18n.language)
                : t("template.selectPlaceholder")}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
          <DropdownMenuItem onClick={() => onSelect(null)}>
            <span className="text-muted-foreground">{t("template.none")}</span>
          </DropdownMenuItem>
          {templates.map((tpl) => (
            <DropdownMenuItem key={tpl.id} onClick={() => onSelect(tpl)}>
              {getTemplateDisplayName(tpl, i18n.language)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onNew} title={t("template.newTemplate")}>
          <Plus className="h-4 w-4" />
        </Button>
        {selected && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(selected)}
              title={t("template.editTemplate")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(selected.id)}
              title={t("template.deleteTemplate")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}