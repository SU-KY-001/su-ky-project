import { Play, Stop } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InkWaveform } from "./InkWaveform";

type NarrativeMode = "historian" | "character";

const copy = {
  historian: "Cuối năm 938, Ngô Quyền cho đóng cọc ngầm ở cửa sông Bạch Đằng. Khi nước triều rút, đội thuyền Nam Hán mắc vào trận địa đã được chuẩn bị.",
  character: "Ta nhìn con nước lên và biết thời khắc đã gần. Những hàng cọc nằm im dưới sóng, còn quân sĩ chỉ chờ một hiệu lệnh.",
};

export function NarrativeDemo() {
  const [mode, setMode] = useState<NarrativeMode>("historian");
  const [playing, setPlaying] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const words = copy[mode].split(" ");
  const dark = mode === "character";

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setWordIndex((current) => {
        if (current >= words.length - 1) {
          setPlaying(false);
          return 0;
        }
        return current + 1;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [playing, words.length]);

  const selectMode = (nextMode: NarrativeMode): void => {
    setMode(nextMode);
    setPlaying(false);
    setWordIndex(0);
  };

  return (
    <section role="region" aria-labelledby="narrative-heading" className="px-5 py-20 md:px-7 md:py-28">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-stretch gap-8 md:flex-row">
        <div className="flex flex-[.75] flex-col justify-center gap-4">
          <p className="text-xs font-bold uppercase tracking-[.17em] text-vermilion">Một sự kiện, hai tiếng nói</p>
          <h2 id="narrative-heading" className="font-serif text-3xl font-bold leading-tight text-ink md:text-5xl">Lịch sử thay đổi khi người trong cuộc lên tiếng</h2>
          <p className="text-base leading-7 text-ink-soft">Chuyển ngôi kể để cảm nhận khoảng cách giữa sử liệu và ký ức cá nhân.</p>
        </div>
        <div className={cn("flex flex-1 flex-col gap-5 rounded-lg border p-5 md:p-7", dark ? "border-bronze-dark bg-night-soft" : "border-bronze bg-paper-soft")}>
          <div className={cn("flex self-start gap-1 rounded-md border p-1", dark ? "border-bronze-dark" : "border-line")} role="group" aria-label="Chọn ngôi kể">
            <Button variant="ghost" className={cn("px-4", mode === "historian" && "bg-vermilion text-paper-soft hover:bg-vermilion-dark", mode !== "historian" && dark && "text-paper-deep hover:bg-white/10")} onClick={() => selectMode("historian")}>Sử gia</Button>
            <Button variant="ghost" className={cn("px-4", mode === "character" && "bg-vermilion text-paper-soft hover:bg-vermilion-dark", mode !== "character" && dark && "text-paper-deep hover:bg-white/10")} onClick={() => selectMode("character")}>Ngô Quyền</Button>
          </div>
          <p className={cn("text-sm font-semibold", dark ? "text-bronze" : "text-vermilion")}>Bạch Đằng, năm 938</p>
          <p className={cn("text-lg leading-8 md:text-xl", dark ? "font-serif italic text-paper-soft" : "text-ink")}>
            {words.map((word, index) => <span key={`${word}-${index}`} className={playing && index <= wordIndex ? "text-vermilion" : undefined}>{word}{" "}</span>)}
          </p>
          <InkWaveform active={playing} dark={dark} />
          <Button variant="outline" className={cn("self-start", dark ? "border-bronze text-paper-soft hover:bg-white/10" : "border-vermilion text-vermilion hover:bg-vermilion/10")} onClick={() => { setPlaying((current) => !current); setWordIndex(0); }}>
            {playing ? <Stop size={17} /> : <Play size={17} />}{playing ? "Dừng minh họa" : "Nghe thử cách kể"}
          </Button>
          <p className={cn("text-xs", dark ? "text-paper-deep" : "text-ink-soft")}>Minh họa chữ chạy, không phát âm thanh.</p>
        </div>
      </div>
    </section>
  );
}
