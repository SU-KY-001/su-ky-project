import type { ReactElement } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function ScriptAssistantMock({ characterCount }: { characterCount: number }): ReactElement {
  const estimatedMinutes = Math.max(1, Math.round(characterCount / 850));
  return (
    <section className="space-y-4" aria-labelledby="script-assistant-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="script-assistant-title" className="font-bold text-mod-text">Trợ lý AI</h3>
          <p className="text-xs text-mod-text-secondary">Dữ liệu minh họa cho giao diện phân tích.</p>
        </div>
        <span className="rounded-full bg-mod-attention/10 px-2.5 py-1 text-xs font-bold text-mod-attention">
          Bản xem trước
        </span>
      </div>
      {characterCount === 0 ? (
        <p className="rounded-lg border border-dashed border-mod-border p-4 text-sm text-mod-text-secondary">
          Nhập kịch bản để xem phân tích và gợi ý.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-mod-border p-4">
            <p className="text-3xl font-bold text-mod-text">78<span className="text-base">/100</span></p>
            <p className="mt-1 text-sm font-semibold text-mod-text">điểm kịch bản</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt>Độ tin cậy nguồn</dt><dd className="font-semibold text-mod-attention">4 câu cần nguồn</dd></div>
              <div className="flex justify-between gap-3"><dt>Nhịp kể chuyện</dt><dd className="font-semibold text-mod-success">Tốt</dd></div>
              <div className="flex justify-between gap-3"><dt>Thời lượng dự kiến</dt><dd className="font-semibold">~{estimatedMinutes} phút</dd></div>
            </dl>
          </div>
          <div className="rounded-lg border border-mod-border p-4 text-sm">
            <p className="font-semibold text-mod-text">Một câu được đánh dấu hơi dài khi đọc.</p>
            <p className="mt-1 text-mod-text-secondary">Gợi ý tách câu chỉ là dữ liệu minh họa và chưa thay đổi kịch bản.</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" size="sm">Xem gợi ý</Button>
              <Button type="button" variant="ghost" size="sm">Bỏ qua</Button>
            </div>
          </div>
        </>
      )}
      <Button type="button" variant="outline" className="w-full" disabled>
        <Sparkles size={16} aria-hidden="true" /> Phân tích lại kịch bản
      </Button>
    </section>
  );
}

