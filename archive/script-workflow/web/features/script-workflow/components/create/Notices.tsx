import { useEffect, useState, type ReactNode } from "react";
import { Timer, WarningCircle } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { COUNTDOWN_TICK_MS } from "./constants";

const NOTICE_ICON_SIZE = 20;

type NoticeProps = { icon: ReactNode; children: ReactNode; announce?: boolean };

function Notice({ icon, children, announce = true }: NoticeProps) {
  return (
    <div
      role={announce ? "alert" : "status"}
      aria-live={announce ? undefined : "off"}
      className="flex items-start gap-3 rounded-[12px] border border-mod-attention/40 bg-mod-attention/10 p-3"
    >
      <span className="mt-0.5 shrink-0 text-mod-attention">{icon}</span>
      <div className="flex flex-col gap-0.5 text-sm text-mod-text">{children}</div>
    </div>
  );
}

export function AiUnavailableNotice({ title, hint }: { title: string; hint?: string }) {
  return (
    <Notice icon={<WarningCircle size={NOTICE_ICON_SIZE} weight="fill" aria-hidden={true} />}>
      <ModeratorText className="font-bold text-mod-attention">{title}</ModeratorText>
      {hint ? <ModeratorText className="text-xs text-mod-text-muted">{hint}</ModeratorText> : null}
    </Notice>
  );
}

type RateLimitNoticeProps = { seconds: number; onElapsed: () => void };

/** Counts down a 429 Retry-After. The interval is an external timer, the legitimate use of an effect. */
export function RateLimitNotice({ seconds, onElapsed }: RateLimitNoticeProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    let left = seconds;
    const interval = window.setInterval(() => {
      left -= 1;
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(interval);
        onElapsed();
      }
    }, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(interval);
  }, [seconds, onElapsed]);

  return (
    <Notice announce={false} icon={<Timer size={NOTICE_ICON_SIZE} weight="fill" aria-hidden={true} />}>
      <ModeratorText className="font-bold text-mod-attention">Bạn thao tác hơi nhanh</ModeratorText>
      <ModeratorText className="text-xs text-mod-text-muted">Vui lòng thử lại sau {Math.max(remaining, 0)} giây.</ModeratorText>
    </Notice>
  );
}
