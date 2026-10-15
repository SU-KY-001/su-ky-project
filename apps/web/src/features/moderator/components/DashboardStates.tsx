import { ChartBar } from "@phosphor-icons/react";
import { ModeratorText } from "./ModeratorText";

export function EmptyChartState({ title }: { title: string }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center gap-2.5 rounded-xl bg-mod-canvas px-[18px] text-center">
      <ChartBar size={26} color="var(--modTextLow)" aria-hidden="true" />
      <ModeratorText className="text-sm text-mod-text-secondary">Chưa có dữ liệu cho {title.toLocaleLowerCase("vi-VN")}.</ModeratorText>
    </div>
  );
}
