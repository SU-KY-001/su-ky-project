import { CaretDown } from "@phosphor-icons/react/dist/icons/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight";
import { Flag } from "@phosphor-icons/react/dist/icons/Flag";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { MapTrifold } from "@phosphor-icons/react/dist/icons/MapTrifold";
import { Stack } from "@phosphor-icons/react/dist/icons/Stack";
import { VinylRecord } from "@phosphor-icons/react/dist/icons/VinylRecord";
import type { ReactElement } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { branchAction } from "./ModeratorTable";

const contentKinds = {
  period: { label: "Thời kỳ", icon: MapTrifold },
  stage: { label: "Giai đoạn", icon: Stack },
  event: { label: "Sự kiện", icon: Flag },
  series: { label: "Series", icon: VinylRecord },
  episode: { label: "Tập podcast", icon: Headphones },
};

type ContentKind = keyof typeof contentKinds;

export function ContentKindIcon({ kind }: { kind: ContentKind }): ReactElement {
  const { icon: Icon, label } = contentKinds[kind];
  return <span className="mod-kind-icon" data-kind={kind} role="img" aria-label={label} title={label}>
    <Icon size={18} weight="duotone" aria-hidden="true" />
  </span>;
}

export function ContentKindLegend({ kinds }: { kinds: ContentKind[] }): ReactElement {
  return <aside aria-label="Chú giải loại nội dung" className="mod-kind-legend">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="font-semibold text-mod-text">Chú giải</span>
      {kinds.map((kind) => <span key={kind} className="inline-flex items-center gap-2">
      <span aria-hidden="true"><ContentKindIcon kind={kind} /></span>
      <span>{contentKinds[kind].label}</span>
      </span>)}
    </div>
  </aside>;
}

export function ModeratorTreeNode({ kind, name, open, onClick, onSelect, depth = 0, last = false, ancestorContinues = false }: {
  kind: ContentKind;
  name: string;
  open: boolean;
  onClick: () => void;
  onSelect?: () => void;
  depth?: 0 | 1 | 2;
  last?: boolean;
  ancestorContinues?: boolean;
}): ReactElement {
  const Caret = open ? CaretDown : CaretRight;
  if (onSelect) return <div className={cn("mod-tree-node", ancestorContinues && "mod-tree-ancestor")} data-depth={depth} data-last={last}>
    <div className="flex items-start gap-1">
      <Button variant="ghost" type="button" aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở rộng"} ${contentKinds[kind].label}: ${name}`} onClick={onClick} className="mt-1.5 size-7 shrink-0 p-0 text-mod-text-low focus-visible:ring-mod-primary/50"><Caret size={14} aria-hidden="true" /></Button>
      <Button variant="ghost" type="button" aria-label={`${contentKinds[kind].label}: ${name}`} onClick={onSelect} className={cn(branchAction, "mod-tree-button min-w-0")}>
        <ContentKindIcon kind={kind} /><span className="mod-tree-name">{name}</span>
      </Button>
    </div>
  </div>;
  return <div className={cn("mod-tree-node", ancestorContinues && "mod-tree-ancestor")} data-depth={depth} data-last={last}>
    <Button variant="ghost" type="button" aria-expanded={open} aria-label={`${contentKinds[kind].label}: ${name}`} onClick={onClick} className={cn(branchAction, "mod-tree-button")}>
      <Caret size={14} className="shrink-0 text-mod-text-low" aria-hidden="true" />
      <ContentKindIcon kind={kind} />
      <span className="mod-tree-name">{name}</span>
    </Button>
  </div>;
}
