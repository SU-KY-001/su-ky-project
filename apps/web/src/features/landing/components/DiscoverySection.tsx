import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { discoveryCards } from "../data";
import { SectionFrame, SectionHeading } from "./SectionFrame";

const filters = ["Tất cả", "Quân sự", "Khởi nghĩa", "Đời sống"];
const characters = ["Ngô Quyền", "Trưng Trắc", "Người lính", "Người Hà Nội"];

export function DiscoverySection() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tất cả");

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return discoveryCards.filter((item) => {
      const matchesFilter = filter === "Tất cả" || item.topic === filter;
      const matchesQuery = !normalized || `${item.title} ${item.period} ${item.character}`.toLocaleLowerCase("vi").includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <SectionFrame id="discover" tone="deep" labelledBy="discover-heading">
      <div className="flex flex-col gap-7">
        <SectionHeading id="discover-heading" eyebrow="Khám phá" title="Bắt đầu từ điều bạn đang tò mò" description="Tìm theo sự kiện, nhân vật, chủ đề hoặc giai đoạn lịch sử." />
        <div className="flex max-w-[900px] flex-col gap-4">
          <Label htmlFor="landing-search" className="text-ink">Bạn muốn nghe câu chuyện nào?</Label>
          <div className="flex items-center gap-3 rounded-md border border-bronze bg-paper-soft px-4 focus-within:ring-2 focus-within:ring-focus">
            <MagnifyingGlass size={21} className="shrink-0 text-ink-soft" aria-hidden="true" />
            <Input id="landing-search" className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" placeholder="Nhập sự kiện, nhân vật hoặc giai đoạn" value={query} onChange={(event) => setQuery(event.target.value)} aria-describedby="search-help" />
            {query ? <Button variant="ghost" size="icon" className="size-8 shrink-0 text-ink-soft" aria-label="Xóa từ khóa" onClick={() => setQuery("")}><X size={18} /></Button> : null}
          </div>
          <p id="search-help" className="text-xs text-ink-soft">Ví dụ: Bạch Đằng, Hai Bà Trưng, năm 1954.</p>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button key={item} variant={filter === item ? "default" : "outline"} size="sm" className={cn("rounded-md", filter === item ? "bg-vermilion text-paper-soft hover:bg-vermilion-dark" : "border-line bg-paper text-ink")} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-soft">Tìm theo nhân vật:</span>
            {characters.map((character) => <Button key={character} variant="link" className="h-auto p-0 text-vermilion" onClick={() => setQuery(character)}>{character}</Button>)}
          </div>
        </div>

        {results.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {results.map((item, index) => (
              <article key={item.id} className={cn("group relative min-h-[300px] overflow-hidden rounded-lg bg-night", index % 2 === 0 && "min-h-[350px]", "md:col-span-2", (index % 4 === 0 || index % 4 === 3) && "md:col-span-3")}>
                <img src={item.image} alt={item.imageAlt} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" decoding="async" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/95 via-night/35 to-transparent" />
                <div className="relative flex min-h-[inherit] flex-col justify-end gap-2 p-5">
                  <p className="text-xs font-bold text-bronze">{item.period} / {item.topic}</p>
                  <h3 className="font-serif text-2xl font-bold text-paper-soft">{item.title}</h3>
                  <p className="text-sm leading-6 text-paper-deep">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-line bg-paper p-6 text-center">
            <h3 className="text-xl font-bold text-ink">Chưa tìm thấy câu chuyện phù hợp</h3>
            <p className="text-base text-ink-soft">Thử một tên nhân vật khác hoặc bỏ bớt bộ lọc.</p>
            <Button variant="outline" className="border-vermilion text-vermilion hover:bg-vermilion/10" onClick={() => { setQuery(""); setFilter("Tất cả"); }}>Xóa bộ lọc</Button>
          </div>
        )}
      </div>
    </SectionFrame>
  );
}
