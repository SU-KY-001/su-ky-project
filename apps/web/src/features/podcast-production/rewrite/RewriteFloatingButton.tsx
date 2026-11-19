import type { ReactElement } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface Props {
  top: number;
  left: number;
  onClick: () => void;
}

/** mousedown is cancelled so pressing the button never collapses the text selection it acts on. */
export function RewriteFloatingButton({ top, left, onClick }: Props): ReactElement {
  return (
    <div className="absolute z-20" style={{ top, left }}>
      <Button type="button" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={onClick}>
        <Sparkles size={14} aria-hidden="true" /> Viết lại
      </Button>
    </div>
  );
}
