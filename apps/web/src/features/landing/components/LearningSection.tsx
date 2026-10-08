import { ArrowCounterClockwise, LockKey, SealCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionFrame, SectionHeading } from "./SectionFrame";
import { scrollToLandingTarget } from "../hooks/useLandingMotion";

export function LearningSection() {
  const [flipped, setFlipped] = useState(false);

  return (
    <SectionFrame id="learn" labelledBy="learn-heading">
      <div className="flex flex-col gap-7">
        <SectionHeading id="learn-heading" title="Nghe để hiểu, ôn để nhớ" description="Biến mỗi tập đã nghe thành một mốc kiến thức có thể quay lại bất cứ lúc nào." />
        <div className="flex flex-col items-stretch gap-5 md:flex-row">
          <Button type="button" variant="ghost" className={`flex min-h-[390px] w-full flex-1 flex-col justify-between gap-6 whitespace-normal rounded-lg border border-bronze p-6 text-left transition-colors ${flipped ? "bg-night hover:bg-night" : "bg-paper-deep hover:bg-paper-deep"}`} onClick={() => setFlipped((current) => !current)} aria-label={flipped ? "Xem câu hỏi" : "Lật thẻ xem đáp án"} aria-pressed={flipped}>
            <div className="flex items-center justify-between"><span className={`text-sm font-bold ${flipped ? "text-bronze" : "text-vermilion"}`}>Thẻ ôn tập</span><ArrowCounterClockwise size={20} color={flipped ? "#B58A3C" : "#B8322A"} /></div>
            {flipped ? (
              <div className="flex flex-col gap-4"><span className="text-sm font-bold text-bronze">Đáp án</span><span className="font-serif text-2xl font-bold leading-tight text-paper-soft md:text-3xl">Năm 938</span><span className="text-base leading-7 text-paper-deep">Ngô Quyền chiến thắng quân Nam Hán trên sông Bạch Đằng, mở đầu thời kỳ độc lập lâu dài.</span><span className="text-xs text-bronze">Nguồn: Bạch Đằng 938, tập 4</span></div>
            ) : (
              <div className="flex flex-col gap-4"><span className="text-sm font-bold text-vermilion">Câu hỏi</span><span className="font-serif text-2xl font-bold leading-tight text-ink md:text-3xl">Chiến thắng Bạch Đằng của Ngô Quyền diễn ra vào năm nào?</span></div>
            )}
            <span className={`text-sm ${flipped ? "text-paper-deep" : "text-ink-soft"}`}>Chạm để {flipped ? "quay lại câu hỏi" : "xem đáp án"}</span>
          </Button>

          <div className="relative min-h-[390px] flex-[1.18] overflow-hidden rounded-lg border border-line bg-paper-deep p-6">
            <div className="flex flex-col gap-6 opacity-40 blur-[3px]" aria-hidden="true">
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-vermilion">Nhiệm vụ tháng này</span><span className="text-sm text-ink-soft">3 nhiệm vụ</span></div>
              {["Nghe trọn một series", "Ôn lại năm mốc lịch sử", "Đọc nguồn của hai tập"].map((mission, index) => <div key={mission} className="flex items-center gap-4"><span className="grid size-10 place-items-center rounded-md border border-bronze">{index === 0 ? <SealCheck size={18} color="#B8322A" /> : null}</span><span className="text-base font-semibold text-ink">{mission}</span></div>)}
              <div className="flex items-center justify-between text-sm"><span className="text-ink-soft">Học trò</span><span className="font-bold text-vermilion">Sử quan</span><span className="text-ink-soft">Sử gia</span></div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#e9dcc2]/75 p-6 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-vermilion text-paper-soft"><LockKey size={22} /></span>
              <h3 className="max-w-md font-serif text-2xl font-bold text-ink">Lưu hành trình học của bạn</h3>
              <p className="max-w-[420px] text-base leading-7 text-ink-soft">Đăng ký để mở nhiệm vụ cá nhân, cấp bậc và bộ thẻ từ các tập đã nghe.</p>
              <Button className="rounded-md bg-vermilion px-5 text-paper-soft hover:bg-vermilion-dark" onClick={() => scrollToLandingTarget("signup")}>Tạo tài khoản</Button>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
