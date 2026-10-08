import { ArrowSquareOut, BookOpenText } from "@phosphor-icons/react";
import { citations } from "../data";
import { SectionFrame, SectionHeading } from "./SectionFrame";

export function CitationsSection() {
  return (
    <SectionFrame labelledBy="citations-heading">
      <div className="flex flex-col items-start gap-8 md:flex-row">
        <div className="flex flex-[.72] flex-col gap-5">
          <SectionHeading id="citations-heading" eyebrow="Nguồn tham khảo" title="Mỗi tập đều có đường trở về sử liệu" description="Chúng tôi ghi rõ tài liệu, tác giả và tập podcast đã sử dụng nguồn." />
          <div className="flex items-center gap-3 text-vermilion"><BookOpenText size={28} /><span className="text-base font-bold">Cam kết: mỗi tập có nguồn</span></div>
        </div>
        <div className="flex flex-[1.28] flex-col rounded-lg border border-bronze bg-paper-soft p-4 md:p-6">
          {citations.map((citation, index) => (
            <article key={citation.id} className={`flex flex-col items-start gap-3 py-4 md:flex-row ${index < citations.length - 1 ? "border-b border-line" : ""}`}>
              <span className="min-w-[42px] font-serif text-lg font-bold text-bronze-dark">[{index + 1}]</span>
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="text-base font-bold text-ink">{citation.title}</h3>
                <p className="text-sm text-ink-soft">{citation.author}</p>
                <p className="text-xs text-vermilion">Dùng trong {citation.episode}</p>
              </div>
              <a className="rounded p-2 text-vermilion hover:bg-vermilion/10" href={citation.href} target="_blank" rel="noopener noreferrer" aria-label={`Mở nguồn ${citation.title}`}>
                <ArrowSquareOut size={20} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
