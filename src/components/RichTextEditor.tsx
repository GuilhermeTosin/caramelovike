import { useEffect, useRef } from "react";
import { Bold, Eraser, Italic, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeRichTextHtml } from "@/lib/richText";

type RichTextEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
  disabled?: boolean;
};

const TOOLBAR_ACTIONS = [
  { command: "bold", label: "Negrito", icon: Bold },
  { command: "italic", label: "Italico", icon: Italic },
  { command: "underline", label: "Sublinhado", icon: Underline },
  { command: "insertUnorderedList", label: "Lista", icon: List },
  { command: "insertOrderedList", label: "Lista numerada", icon: ListOrdered },
  { command: "removeFormat", label: "Limpar", icon: Eraser },
] as const;

export default function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = "Escreva aqui...",
  className,
  minHeightClassName = "min-h-[160px]",
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || "";
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  const applyCommand = (command: string) => {
    const el = editorRef.current;
    if (!el || disabled) return;
    el.focus();
    document.execCommand(command, false);
    const next = sanitizeRichTextHtml(el.innerHTML);
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
    onChange(next);
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (!el || disabled) return;
    onChange(el.innerHTML);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {TOOLBAR_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.command}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyCommand(action.command)}
            >
              <Icon className="h-4 w-4" />
              <span>{action.label}</span>
            </Button>
          );
        })}
      </div>
      <div className="rounded-md border border-input bg-background">
        <div
          id={id}
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder}
          onInput={handleInput}
          onBlur={handleInput}
          className={cn(
            "rich-text-editor w-full rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            minHeightClassName,
            disabled ? "cursor-not-allowed bg-muted/40 text-muted-foreground" : "cursor-text"
          )}
          style={{
            whiteSpace: "pre-wrap",
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Você pode usar negrito, itálico, sublinhado e listas.
      </p>
    </div>
  );
}
