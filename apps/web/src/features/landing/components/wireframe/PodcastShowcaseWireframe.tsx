import { useState, type ReactElement, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen, CalendarBlank, CaretLeft, CaretRight, Headphones, Play, Trophy, X } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/lib/utils";
import "./podcast-showcase-wireframe.css";

const sections = [
  { id: "history", label: "Dòng lịch sử" },
  { id: "books", label: "Triển lãm sách nói" },
  { id: "podcasts", label: "Podcast theo sự kiện" },
  { id: "honors", label: "Thành tựu & vinh danh" },
  { id: "schedule", label: "Lịch phát hành" },
];

const surfaceOptions = [
  { id: "paper", label: "A · Tờ giấy nổi nhẹ", description: "Bóng rộng và nhạt, ánh sáng mỏng trên mép, aurora nằm dưới lớp giấy. Đáy tan nhẹ vào nền." },
  { id: "slab", label: "B · Phiến nổi có chiều sâu", description: "Hai tầng bóng tạo độ nâng rõ hơn. Aurora gom ở các góc, mép khối hiện rõ bằng ánh sáng và bóng, không dùng viền." },
  { id: "light", label: "C · Surface hòa sáng", description: "Ánh sáng khuếch tán nâng nội dung khỏi nền. Ít bóng, các cạnh và đáy hòa mềm vào background." },
];

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }): ReactElement {
  return (
    <section id={`wf-${id}`} aria-labelledby={`wf-${id}-title`} className="scroll-mt-80 py-10 sm:scroll-mt-56 md:py-14 lg:scroll-mt-40">
      <div className="mb-7 max-w-2xl">
        <h2 id={`wf-${id}-title`} className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FilterSlot({ id, label, placeholder }: { id: string; label: string; placeholder: string }): ReactElement {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select disabled>
        <SelectTrigger id={id} className="bg-paper-soft"><SelectValue placeholder={placeholder} /></SelectTrigger>
      </Select>
    </div>
  );
}

function Lines(): ReactElement {
  return <div aria-hidden="true" className="space-y-2"><div className="h-2 w-4/5 rounded bg-ink/10" /><div className="h-2 w-full rounded bg-ink/10" /><div className="h-2 w-3/5 rounded bg-ink/10" /></div>;
}

function BookPreview({ book, onClose }: { book: number | null; onClose: () => void }): ReactElement {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  return (
    <Dialog open={book !== null} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent showCloseButton={false} className="wf-reader inset-0 left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 bg-paper p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><DialogTitle>Sách nói · Vị trí {book}</DialogTitle><DialogDescription>Wireframe tương tác — bìa và nội dung đang là vùng giữ chỗ.</DialogDescription></div>
          <DialogClose asChild><Button variant="outline"><X aria-hidden="true" /> Thoát sách</Button></DialogClose>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10">
          <div className="wf-book-scene" data-open={open}>
            <div className="wf-book-pages">
              <div className="flex flex-col justify-between border-r border-line p-4 sm:p-7"><BookOpen size={28} aria-hidden="true" /><div><p className="mb-5 text-sm">Vùng nội dung sách</p><Lines /></div><span className="text-xs text-muted-foreground">{page * 2 + 1}</span></div>
              <div key={page} className="wf-turn-page flex flex-col justify-between p-4 sm:p-7"><Lines /><p className="text-xs leading-5 text-muted-foreground">Vị trí nội dung và điều khiển giọng đọc theo trang.</p><span className="self-end text-xs text-muted-foreground">{page * 2 + 2}</span></div>
            </div>
            <button type="button" className="wf-book-cover" aria-label={open ? "Đóng bìa sách" : "Mở bìa sách"} onClick={() => setOpen(!open)}>
              <BookOpen size={40} aria-hidden="true" /><span className="text-2xl font-semibold">Bìa sách</span><span className="text-sm">Nhấn để mở</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setOpen(!open)}>{open ? "Đóng sách" : "Mở sách"}</Button>
            <Button variant="outline" aria-label="Trang trước" disabled={!open || page === 0} onClick={() => setPage(page - 1)}><CaretLeft aria-hidden="true" /></Button>
            <span className="text-sm" aria-live="polite">{open ? `Trang ${page * 2 + 1}–${page * 2 + 2}` : "Sách đang đóng"}</span>
            <Button variant="outline" aria-label="Trang sau" disabled={!open || page >= 4} onClick={() => setPage(page + 1)}><CaretRight aria-hidden="true" /></Button>
          </div>
          <div className="flex max-w-lg flex-col items-center gap-3 text-center"><Button disabled><Play aria-hidden="true" /> Phát giọng đọc</Button><p className="text-xs leading-5 text-muted-foreground">Âm thanh sẽ dùng bản thu thật ở bước build. Bản wireframe chỉ mô phỏng thao tác mở, lật và đóng sách.</p></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PodcastShowcaseWireframe(): ReactElement {
  const [params, setParams] = useSearchParams();
  const catalog = params.get("layout") !== "open";
  const surface = surfaceOptions.find((option) => option.id === params.get("surface")) ?? surfaceOptions[0];
  const [book, setBook] = useState<number | null>(null);
  const [period, setPeriod] = useState("week");
  const [schedule, setSchedule] = useState("week");
  const [activeSection, setActiveSection] = useState("history");

  function selectPreview(key: string, value: string): void {
    setParams((previous) => { const next = new URLSearchParams(previous); next.set(key, value); return next; }, { preventScrollReset: true });
  }

  function navigate(id: string): void {
    setActiveSection(id);
    document.getElementById(`wf-${id}`)?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  return (
    <div className="wf-page h-[100dvh] overflow-y-auto bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur-md">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Về landing"><ArrowLeft /></Link></Button><div><p className="text-sm font-semibold">Podcast Showcase</p><p className="text-xs text-muted-foreground">Wireframe → <strong>Chọn</strong> → Build → Đánh giá → Sửa</p></div></div>
          <div role="group" aria-label="Phương án bố cục" className="flex flex-wrap gap-2">
            <Button size="sm" variant={catalog ? "outline" : "default"} aria-pressed={!catalog} onClick={() => selectPreview("layout", "open")}>Bố cục: Trải ngang</Button>
            <Button size="sm" variant={catalog ? "default" : "outline"} aria-pressed={catalog} onClick={() => selectPreview("layout", "catalog")}>Bố cục: Mục lục</Button>
          </div>
          <Button asChild variant="link" size="sm"><Link to="/wireframes/history">Duyệt Dòng lịch sử <ArrowRight aria-hidden="true" /></Link></Button>
          <div role="group" aria-label="Phương án surface" className="flex w-full flex-wrap gap-2 border-t border-line pt-3">
            {surfaceOptions.map((option) => <Button key={option.id} size="sm" variant={surface.id === option.id ? "default" : "outline"} aria-pressed={surface.id === option.id} onClick={() => selectPreview("surface", option.id)}>{option.label}</Button>)}
          </div>
        </div>
      </header>

      <main className="w-full px-5 pb-24 md:px-8">
        <div className="py-10 md:py-14">
          <Badge variant="outline">Duyệt surface · Nội dung giữ chỗ</Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">{surface.label}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground" aria-live="polite">{surface.description}</p>
        </div>

        <div data-surface={surface.id} className="wf-surface relative isolate px-4 py-3 md:px-8 lg:px-10">
          <div className={cn("relative", catalog && "lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10")}>
            <aside className={cn("py-6", catalog ? "lg:sticky lg:top-36 lg:self-start" : "border-b border-line")} aria-label="Mục lục showcase">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Mục lục thư viện</p>
              <nav className={cn("flex gap-2 overflow-x-auto pb-2", catalog && "lg:flex-col lg:overflow-visible")}>
                {sections.map(({ id, label }) => <Button key={id} size="sm" variant={activeSection === id ? "secondary" : "ghost"} aria-current={activeSection === id ? "location" : undefined} className="justify-start" onClick={() => navigate(id)}>{label}</Button>)}
              </nav>
            </aside>

            <div className="min-w-0 divide-y divide-line">
              <Section id="history" title="Dòng lịch sử" description="Đi từ bối cảnh rộng đến từng sự kiện. Bộ lọc xếp theo cấu trúc Thời kỳ → Giai đoạn → Sự kiện.">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FilterSlot id="wf-period" label="Thời kỳ" placeholder="Tất cả thời kỳ" />
                  <FilterSlot id="wf-stage" label="Giai đoạn" placeholder="Chọn sau thời kỳ" />
                  <FilterSlot id="wf-event" label="Sự kiện" placeholder="Chọn sau giai đoạn" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Bộ lọc giữ chỗ — sẽ kích hoạt khi nối dữ liệu lịch sử thật.</p>
                <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
                  {["Thời kỳ", "Giai đoạn", "Sự kiện"].map((title, index) => <div key={title} className="relative min-h-44 border-l-2 border-bronze/50 bg-paper/60 p-5"><span className="text-xs text-muted-foreground">Cấp {index + 1}</span><h3 className="mb-6 mt-2 font-medium">{title}</h3><Lines /><p className="mt-5 text-xs text-muted-foreground">{index === 2 ? "Mở chi tiết sự kiện và podcast liên quan" : "Chọn để hiển thị các mục cấp tiếp theo"}</p></div>)}
                </div>
              </Section>

              <Section id="books" title="Triển lãm sách nói" description="Một kệ sách để dừng lại khám phá. Chọn sách → toàn màn hình → mở sách → lật trang → nghe giọng đọc.">
                <div className={cn("wf-shelf grid grid-cols-2 items-end gap-x-6 gap-y-9 px-4 pb-7 pt-4", catalog ? "md:grid-cols-3" : "md:grid-cols-4")}>
                  {Array.from({ length: catalog ? 3 : 4 }, (_, index) => <button key={index} type="button" className="group flex min-w-0 flex-col items-center gap-5 rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setBook(index + 1)}><span className="wf-cover-slot"><BookOpen size={32} aria-hidden="true" /><span className="text-sm font-medium">Bìa sách {index + 1}</span><span className="text-xs text-muted-foreground">Vùng ảnh bìa</span></span><span className="text-xs font-medium group-hover:text-vermilion">Mở trải nghiệm sách <ArrowRight className="ml-1 inline" aria-hidden="true" /></span></button>)}
                </div>
              </Section>

              <Section id="podcasts" title="Nghe lịch sử qua từng sự kiện" description="Chọn sự kiện để xem các tập liên quan. Khu vực nghe đặt liền danh sách, không làm mất ngữ cảnh khám phá.">
                <div className={cn("grid gap-7", !catalog && "lg:grid-cols-[minmax(0,1fr)_280px]")}>
                  <div><FilterSlot id="wf-podcast-event" label="Lọc podcast theo sự kiện" placeholder="Tất cả sự kiện" /><div className="mt-5 divide-y divide-line">{[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-4 py-4"><div className="grid size-14 shrink-0 place-items-center rounded border border-dashed border-bronze/50 bg-paper"><Headphones size={22} className="text-muted-foreground" aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="mb-3 text-sm">Vị trí tên tập podcast</p><Lines /></div><Button size="icon" variant="outline" disabled aria-label={`Phát tập ở vị trí ${item}`}><Play /></Button></div>)}</div></div>
                  <div className="flex flex-col items-start justify-center gap-4 border border-dashed border-bronze/50 bg-paper/70 p-6"><Headphones size={30} aria-hidden="true" /><h3 className="font-medium">Khu vực đang nghe</h3><p className="text-sm leading-6 text-muted-foreground">Ảnh tập, tên người đọc, tiến trình, tua và tốc độ phát sẽ xuất hiện khi chọn podcast.</p><div className="h-1 w-full bg-line" /><Button disabled><Play aria-hidden="true" /> Chưa chọn tập</Button></div>
                </div>
              </Section>

              <Section id="honors" title="Mỗi lần nghe, một bước tiến" description="Nhiệm vụ và thành tựu cá nhân đi cùng bảng vinh danh cộng đồng theo tuần hoặc tháng.">
                <div className="mb-6 flex gap-2" role="group" aria-label="Kỳ vinh danh">{[{ value: "week", label: "Tuần" }, { value: "month", label: "Tháng" }].map(({ value, label }) => <Button key={value} size="sm" variant={period === value ? "default" : "outline"} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</Button>)}</div>
                <div className="grid gap-8 md:grid-cols-2">
                  <div><h3 className="mb-5 font-medium">Nhiệm vụ & thành tựu</h3>{["Thời lượng nghe", "Flashcard & quiz", "Thống kê hành trình"].map((label) => <div key={label} className="flex items-center gap-4 py-4"><Trophy size={24} className="shrink-0 text-bronze-dark" aria-hidden="true" /><div className="flex-1"><p className="mb-3 text-sm">{label}</p><div className="h-1.5 rounded bg-line" /></div></div>)}</div>
                  <div className="border-l border-line pl-6"><h3 className="mb-5 font-medium">Vinh danh {period === "week" ? "tuần" : "tháng"}</h3><p className="mb-5 text-xs leading-5 text-muted-foreground">Vị trí bảng xếp hạng thật — chưa có tên, điểm hoặc thứ hạng giả.</p>{[1, 2, 3].map((position) => <div key={position} className="flex items-center gap-4 py-4"><div className="size-9 shrink-0 rounded-full border border-dashed border-bronze/50" /><div className="flex-1"><Lines /></div></div>)}</div>
                </div>
              </Section>

              <Section id="schedule" title="Hẹn gặp ở chương tiếp theo" description="Lịch phát hành tập podcast theo series. Chuyển giữa tổng quan tuần và các mốc trong tháng.">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div className="w-full sm:w-64"><FilterSlot id="wf-schedule-series" label="Series" placeholder="Tất cả series" /></div><div className="flex gap-2" role="group" aria-label="Chế độ lịch">{[{ value: "week", label: "Tuần" }, { value: "month", label: "Tháng" }].map(({ value, label }) => <Button key={value} size="sm" variant={schedule === value ? "default" : "outline"} aria-pressed={schedule === value} onClick={() => setSchedule(value)}>{label}</Button>)}</div></div>
                <div className="overflow-x-auto rounded-md border border-line"><div className="grid min-w-[560px] grid-cols-7 bg-paper/60">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <div key={day} className="border-b border-line px-3 py-3 text-center text-xs font-medium">{day}</div>)}{Array.from({ length: schedule === "week" ? 7 : 35 }, (_, index) => <div key={index} className={cn("border-b border-r border-line p-3", schedule === "week" ? "min-h-36" : "min-h-20")}><div aria-hidden="true" className="h-2 w-5 rounded bg-line" /></div>)}</div></div>
                <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-muted-foreground"><CalendarBlank size={18} className="shrink-0" aria-hidden="true" /> Vị trí ngày phát, tên series và tập sắp ra mắt. Không tự tạo lịch phát hành.</p>
              </Section>
            </div>
          </div>
        </div>
        <Separator className="mt-10" />
        <p className="mt-6 text-sm leading-7 text-muted-foreground">Chọn surface A, B hoặc C để áp dụng lên landing. Có thể chuyển phương án bằng các nút cố định phía trên để so sánh tại cùng vị trí cuộn.</p>
      </main>
      {book !== null && <BookPreview key={book} book={book} onClose={() => setBook(null)} />}
    </div>
  );
}
