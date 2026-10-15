import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notifications";
import { errorMessage } from "@/lib/apiError";
import { adminService } from "./adminService";
import { State, SectionTitle } from "./AdminPrimitives";

export function ContentPanel() {
  const client = useQueryClient();
  const series = useQuery({
    queryKey: ["admin", "content"],
    queryFn: adminService.content,
  });
  const act = useMutation({
    mutationFn: (input: {
      kind: "series" | "episodes";
      id: string;
      action: "hide" | "trash" | "restore";
    }) => adminService.interveneContent(input.kind, input.id, input.action),
    onSuccess: async () => {
      notify.success({ title: "Đã cập nhật trạng thái nội dung." });
      await client.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (error) =>
      notify.error({
        title: "Không thể cập nhật nội dung.",
        description: errorMessage(error),
      }),
  });
  const actions = (
    kind: "series" | "episodes",
    item: { id: string; status: string; deletedAt: Date | null },
  ) =>
    item.deletedAt ? (
      <Button
        size="sm"
        variant="outline"
        disabled={act.isPending}
        onClick={() => act.mutate({ kind, id: item.id, action: "restore" })}
      >
        Khôi phục
      </Button>
    ) : (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={item.status === "HIDDEN" || act.isPending}
          onClick={() => act.mutate({ kind, id: item.id, action: "hide" })}
        >
          Ẩn & khóa
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={act.isPending}
          onClick={() => act.mutate({ kind, id: item.id, action: "trash" })}
        >
          Thùng rác
        </Button>
      </div>
    );
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Kiểm soát nội dung"
        description="Ẩn hoặc đưa nội dung vào thùng rác. Nội dung bị Admin khóa không thể được Moderator tự mở lại."
      />
      {series.isPending ? (
        <State>Đang tải nội dung…</State>
      ) : series.error ? (
        <State>{series.error.message}</State>
      ) : (
        <div className="space-y-3">
          {series.data.items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-mod-border bg-mod-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">{item.title}</h2>
                  <p className="text-xs text-mod-text-secondary">
                    {item.owner.name} ·{" "}
                    {item.deletedAt ? "Trong thùng rác" : item.status} ·{" "}
                    {item.episodes.length} episode
                  </p>
                </div>
                {actions("series", item)}
              </div>
              {item.episodes.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-mod-border pt-3">
                  {item.episodes.map((episode) => (
                    <div
                      key={episode.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-paper-soft px-3 py-2"
                    >
                      <span className="text-sm">
                        <strong>{episode.title}</strong> ·{" "}
                        {episode.deletedAt ? "Trong thùng rác" : episode.status}
                      </span>
                      {actions("episodes", episode)}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
