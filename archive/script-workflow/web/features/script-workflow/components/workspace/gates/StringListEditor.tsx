import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react";
import { Section } from "../steps/stepUi";
import { INPUT_CLASS } from "./storyOutlineForm";

const ICON_SIZE_SM = 16;

type StringListEditorProps = {
  title: string;
  items: readonly string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
};

export function StringListEditor({ title, items, disabled, onChange }: StringListEditorProps) {
  const handleItemChange = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const handleMove = (fromIndex: number, direction: -1 | 1) => {
    const targetIndex = fromIndex + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const current = next[fromIndex];
    const target = next[targetIndex];
    if (current === undefined || target === undefined) return;
    next[fromIndex] = target;
    next[targetIndex] = current;
    onChange(next);
  };

  return (
    <Section title={title}>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              disabled={disabled}
              value={item}
              aria-label={`${title} dòng ${index + 1}`}
              onChange={(event) => handleItemChange(index, event.target.value)}
              className={INPUT_CLASS}
            />
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => handleMove(index, -1)}
              aria-label={`Chuyển dòng ${index + 1} lên`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-mod-border bg-mod-surface text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-40"
            >
              <ArrowUp size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            </button>
            <button
              type="button"
              disabled={disabled || index === items.length - 1}
              onClick={() => handleMove(index, 1)}
              aria-label={`Chuyển dòng ${index + 1} xuống`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-mod-border bg-mod-surface text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-40"
            >
              <ArrowDown size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, idx) => idx !== index))}
              aria-label={`Xoá dòng ${index + 1} khỏi ${title}`}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border border-mod-border bg-mod-surface text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-40"
            >
              <Trash size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([...items, ""])}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <Plus size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            Thêm dòng
          </button>
        </div>
      </div>
    </Section>
  );
}
