import { useQuery } from "@tanstack/react-query";
import { adminService } from "./adminService";
import { State, SectionTitle, Card } from "./AdminPrimitives";

export function OverviewPanel() {
  const q = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: adminService.dashboard,
  });
  if (q.isPending) return <State>Đang tải thống kê…</State>;
  if (q.error) return <State>{q.error.message}</State>;
  const d = q.data;
  const cards = [
    ["Tổng tài khoản", d.users.total],
    ["Moderator", d.users.moderators],
    ["Tài khoản bị khóa", d.users.banned],
    ["Series", d.content.series],
    ["Episode", d.content.episodes],
    ["Người đã nghe", d.listening.totalListeners],
    ["Episode hoàn thành", d.listening.completedEpisodes],
    ["Thao tác 7 ngày", d.operations.auditEventsLast7Days],
  ] as const;
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Tổng quan hệ thống"
        description="Tình trạng tài khoản, nội dung và hoạt động nghe trên toàn hệ thống."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}
