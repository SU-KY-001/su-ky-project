import type { ReactElement } from "react";
import type { StudioSeriesDetailDto } from "@repo/shared";
import { BookOpen, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function ScriptSourcesPanel({
  sources,
  onInsert,
}: {
  sources: StudioSeriesDetailDto["sources"];
  onInsert: (sourceId: string) => void;
}): ReactElement {
  return (
    <section className="space-y-3" aria-labelledby="script-sources-title">
      <div>
        <h3 id="script-sources-title" className="font-bold text-mod-text">Nguồn của series</h3>
        <p className="mt-1 text-xs text-mod-text-secondary">Chọn đoạn văn trong editor rồi gắn nguồn phù hợp.</p>
      </div>
      {sources.length ? sources.map((item, index) => (
        <article key={item.id} className="rounded-lg border border-mod-border p-3">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mod-primary/10 text-mod-primary">
              <BookOpen size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-mod-primary">Nguồn {index + 1}</p>
              <h4 className="mt-0.5 text-sm font-semibold text-mod-text">{item.source.title}</h4>
              {item.locator ? <p className="mt-1 text-xs text-mod-text-secondary">{item.locator}</p> : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onInsert(item.id)}>
              <Plus size={14} aria-hidden="true" /> Gắn nguồn
            </Button>
            {item.source.url ? (
              <Button type="button" size="sm" variant="ghost" asChild>
                <a href={item.source.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} aria-hidden="true" /> Mở nguồn
                </a>
              </Button>
            ) : null}
          </div>
        </article>
      )) : (
        <p className="rounded-lg border border-dashed border-mod-border p-4 text-sm text-mod-text-secondary">
          Series chưa có nguồn tham khảo.
        </p>
      )}
    </section>
  );
}
