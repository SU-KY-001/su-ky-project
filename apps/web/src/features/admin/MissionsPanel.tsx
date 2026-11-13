import { useMemo, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { notify } from "@/shared/lib/notifications";
import { errorMessage } from "@/lib/apiError";
import { adminService } from "./adminService";
import { State, SectionTitle } from "./AdminPrimitives";

export function MissionsPanel() {
  const client = useQueryClient();
  const templates = useQuery({
    queryKey: ["admin", "mission-templates"],
    queryFn: adminService.missionTemplates,
  });
  const weekly = useQuery({
    queryKey: ["admin", "weekly-missions"],
    queryFn: adminService.weeklyMissions,
  });
  const create = useMutation({
    mutationFn: adminService.createMissionTemplate,
    onSuccess: async () => {
      notify.success({ title: "Đã tạo mẫu nhiệm vụ." });
      await client.invalidateQueries({
        queryKey: ["admin", "mission-templates"],
      });
    },
    onError: (error) =>
      notify.error({
        title: "Không thể tạo mẫu.",
        description: errorMessage(error),
      }),
  });
  const activate = useMutation({
    mutationFn: ({ id, date }: { id: string; date: Date }) =>
      adminService.activateMission(id, date),
    onSuccess: async () => {
      notify.success({ title: "Đã kích hoạt nhiệm vụ tuần." });
      await client.invalidateQueries({
        queryKey: ["admin", "weekly-missions"],
      });
    },
    onError: (error) =>
      notify.error({
        title: "Không thể kích hoạt.",
        description: errorMessage(error),
      }),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      title: String(data.get("title")),
      description: String(data.get("description")) || null,
      activityType: String(data.get("activityType")) as
        | "COMPLETE_EPISODE"
        | "PASS_QUIZ",
      targetCount: Number(data.get("targetCount")),
      xpReward: Number(data.get("xpReward")),
    });
    event.currentTarget.reset();
  };
  const nextMonday = useMemo(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    const days = (8 - d.getUTCDay()) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }, []);
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Nhiệm vụ tuần"
        description="Tạo mẫu tái sử dụng và chủ động kích hoạt cho từng tuần."
      />
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-xl border border-mod-border bg-mod-surface p-4 md:grid-cols-6"
      >
        <Input required name="title" placeholder="Tên nhiệm vụ" />
        <Input name="description" placeholder="Mô tả" />
        <select
          name="activityType"
          className="rounded-md border border-mod-border bg-white px-3 text-sm"
        >
          <option value="COMPLETE_EPISODE">Hoàn thành Episode</option>
          <option value="PASS_QUIZ">Vượt Quiz</option>
        </select>
        <Input
          required
          name="targetCount"
          type="number"
          min={1}
          defaultValue={1}
        />
        <Input
          required
          name="xpReward"
          type="number"
          min={0}
          defaultValue={20}
        />
        <Button>Tạo mẫu</Button>
      </form>
      {templates.isPending ? (
        <State>Đang tải mẫu…</State>
      ) : templates.error ? (
        <State>{templates.error.message}</State>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {templates.data.items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-mod-border bg-mod-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold">{item.title}</h2>
                  <p className="mt-1 text-sm text-mod-text-secondary">
                    {item.activityType === "COMPLETE_EPISODE"
                      ? "Hoàn thành Episode"
                      : "Vượt Quiz"}{" "}
                    · mục tiêu {item.targetCount} · {item.xpReward} XP
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!item.isActive || activate.isPending}
                  onClick={() =>
                    activate.mutate({ id: item.id, date: nextMonday })
                  }
                >
                  Kích hoạt tuần tới
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <h2 className="text-lg font-bold">Đã kích hoạt</h2>
      {weekly.data?.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-mod-border bg-mod-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhiệm vụ</TableHead>
                <TableHead>Tuần bắt đầu</TableHead>
                <TableHead>Mục tiêu</TableHead>
                <TableHead>Người tham gia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekly.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    {item.weekStartDate.toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell>{item.targetCount}</TableCell>
                  <TableCell>{item._count.userMissions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <State>Chưa có nhiệm vụ tuần.</State>
      )}
    </div>
  );
}
