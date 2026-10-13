import { useState, type ReactElement } from "react";
import { CirclePlay, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

const voices = [
  { id: "male-documentary", name: "Nam trầm kể chuyện", detail: "Giọng tài liệu · Tiếng Việt" },
  { id: "female-news", name: "Nữ thời sự", detail: "Rõ ràng · Tiếng Việt" },
  { id: "moderator-clone", name: "Giọng clone của Mod", detail: "Cần xác nhận đồng ý" },
];

export function AiVoiceMockPanel({ characterCount }: { characterCount: number }): ReactElement {
  const [voice, setVoice] = useState(voices[0]!.id);
  const [generating, setGenerating] = useState(false);
  const simulate = (): void => {
    setGenerating(true);
    window.setTimeout(() => setGenerating(false), 900);
  };
  return (
    <section className="space-y-5" aria-labelledby="ai-voice-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 id="ai-voice-title" className="font-bold text-mod-text">Dùng giọng AI</h3><p className="mt-1 text-sm text-mod-text-secondary">Mô phỏng luồng tạo giọng theo từng đoạn.</p></div>
        <span className="rounded-full bg-mod-attention/10 px-3 py-1 text-xs font-bold text-mod-attention">Bản xem trước</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {voices.map((item) => <button key={item.id} type="button" onClick={() => setVoice(item.id)} className={cn("rounded-xl border p-4 text-left", voice === item.id ? "border-mod-primary bg-mod-primary/5" : "border-mod-border hover:bg-mod-canvas-accent")}><p className="font-bold text-mod-text">{item.name}</p><p className="mt-1 text-xs text-mod-text-secondary">{item.detail}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-mod-primary"><CirclePlay size={14} /> Nghe thử</span></button>)}
      </div>
      <div className="grid gap-4 rounded-xl border border-mod-border p-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-mod-text">Tốc độ đọc <span className="float-right text-mod-text-secondary">1.0x</span><input type="range" min="0.75" max="1.25" step="0.05" defaultValue="1" className="mt-2 w-full accent-mod-primary" /></label>
        <label className="text-sm font-semibold text-mod-text">Độ ổn định <span className="float-right text-mod-text-secondary">75%</span><input type="range" min="0" max="100" defaultValue="75" className="mt-2 w-full accent-mod-primary" /></label>
      </div>
      <div className="rounded-xl border border-mod-border">
        <div className="flex items-center justify-between border-b border-mod-border px-4 py-3"><p className="font-bold text-mod-text">Tạo theo từng đoạn</p><p className="text-xs text-mod-text-secondary">Ước tính {characterCount.toLocaleString("vi-VN")} ký tự</p></div>
        {["Mở đầu", "Bối cảnh", "Diễn biến", "Kết"].map((segment, index) => <div key={segment} className="flex items-center gap-3 border-b border-mod-border px-4 py-3 last:border-0"><CirclePlay size={17} className="text-mod-text-low" /><span className="flex-1 text-sm font-semibold text-mod-text">{segment}: đoạn {index + 1}</span><span className="text-xs text-mod-text-secondary">Chưa tạo</span><Button type="button" variant="outline" size="sm" onClick={simulate}>Tạo</Button></div>)}
      </div>
      <Button type="button" variant="outline" className="ml-auto flex" onClick={simulate} disabled={generating}>{generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {generating ? "Đang mô phỏng…" : "Tạo tất cả đoạn còn lại"}</Button>
      <p className="text-xs text-mod-text-secondary">Các nút trong chế độ này chỉ thay đổi trạng thái giao diện và không gọi dịch vụ AI.</p>
    </section>
  );
}

