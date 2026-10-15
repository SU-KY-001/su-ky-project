import { type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/notifications";
import { errorMessage } from "@/lib/apiError";
import { adminService } from "./adminService";
import { State, SectionTitle } from "./AdminPrimitives";

export function CatalogPanel() {
  const client = useQueryClient();
  const topics = useQuery({
    queryKey: ["admin", "topics"],
    queryFn: adminService.topics,
  });
  const periods = useQuery({
    queryKey: ["admin", "historical-periods"],
    queryFn: adminService.historicalPeriods,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["admin", "topics"] });
    await client.invalidateQueries({
      queryKey: ["admin", "historical-periods"],
    });
  };
  const createTopic = useMutation({
    mutationFn: adminService.createTopic,
    onSuccess: async () => {
      notify.success({ title: "Đã tạo chủ đề." });
      await refresh();
    },
    onError: (error) =>
      notify.error({
        title: "Không thể tạo chủ đề.",
        description: errorMessage(error),
      }),
  });
  const createPeriod = useMutation({
    mutationFn: adminService.createHistoricalPeriod,
    onSuccess: async () => {
      notify.success({ title: "Đã tạo thời kỳ." });
      await refresh();
    },
    onError: (error) =>
      notify.error({
        title: "Không thể tạo thời kỳ.",
        description: errorMessage(error),
      }),
  });
  const toggle = useMutation({
    mutationFn: (input: {
      kind: "topic" | "period";
      id: string;
      isActive: boolean;
    }) =>
      input.kind === "topic"
        ? adminService.patchTopic(input.id, { isActive: input.isActive })
        : adminService.patchHistoricalPeriod(input.id, {
            isActive: input.isActive,
          }),
    onSuccess: refresh,
    onError: (error) =>
      notify.error({
        title: "Không thể cập nhật danh mục.",
        description: errorMessage(error),
      }),
  });
  const topicSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    createTopic.mutate({
      name: String(data.get("name")),
      sortOrder: Number(data.get("sortOrder")),
      isActive: true,
    });
    form.reset();
  };
  const periodSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const year = (key: string) =>
      data.get(key) === "" ? null : Number(data.get(key));
    createPeriod.mutate({
      name: String(data.get("name")),
      summary: String(data.get("summary")) || null,
      startYear: year("startYear"),
      endYear: year("endYear"),
      sortOrder: Number(data.get("sortOrder")),
      isActive: true,
    });
    form.reset();
  };
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Chủ đề và thời kỳ lịch sử"
        description="Admin quản lý danh mục dùng để phân loại; Moderator chỉ chọn các mục đang hoạt động."
      />
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Chủ đề</h2>
        <form
          onSubmit={topicSubmit}
          className="grid gap-3 rounded-xl border border-mod-border bg-mod-surface p-4 md:grid-cols-[1fr_140px_auto]"
        >
          <Input required name="name" placeholder="Tên chủ đề" />
          <Input
            required
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={0}
          />
          <Button disabled={createTopic.isPending}>Thêm chủ đề</Button>
        </form>
        {topics.isPending ? (
          <State>Đang tải chủ đề…</State>
        ) : topics.error ? (
          <State>{topics.error.message}</State>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {topics.data.items.map((item) => (
              <article
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-mod-border bg-mod-surface p-4"
              >
                <div>
                  <strong>{item.name}</strong>
                  <p className="text-xs text-mod-text-secondary">
                    Thứ tự {item.sortOrder} ·{" "}
                    {item.isActive ? "Đang dùng" : "Đã tắt"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggle.mutate({
                      kind: "topic",
                      id: item.id,
                      isActive: !item.isActive,
                    })
                  }
                >
                  {item.isActive ? "Tắt" : "Bật"}
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Thời kỳ lịch sử</h2>
        <form
          onSubmit={periodSubmit}
          className="grid gap-3 rounded-xl border border-mod-border bg-mod-surface p-4 lg:grid-cols-6"
        >
          <Input required name="name" placeholder="Tên thời kỳ" />
          <Input name="summary" placeholder="Mô tả ngắn" />
          <Input
            name="startYear"
            type="number"
            max={1945}
            placeholder="Năm bắt đầu"
          />
          <Input
            name="endYear"
            type="number"
            max={1945}
            placeholder="Năm kết thúc"
          />
          <Input
            required
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={0}
          />
          <Button disabled={createPeriod.isPending}>Thêm thời kỳ</Button>
        </form>
        {periods.isPending ? (
          <State>Đang tải thời kỳ…</State>
        ) : periods.error ? (
          <State>{periods.error.message}</State>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {periods.data.items.map((item) => (
              <article
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-mod-border bg-mod-surface p-4"
              >
                <div>
                  <strong>{item.name}</strong>
                  <p className="text-xs text-mod-text-secondary">
                    {item.startYear ?? "?"} – {item.endYear ?? "?"} ·{" "}
                    {item.isActive ? "Đang dùng" : "Đã tắt"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggle.mutate({
                      kind: "period",
                      id: item.id,
                      isActive: !item.isActive,
                    })
                  }
                >
                  {item.isActive ? "Tắt" : "Bật"}
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
