import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/notifications";
import { errorMessage } from "@/lib/apiError";
import { adminService } from "./adminService";
import { State, SectionTitle } from "./AdminPrimitives";

export function ConfigPanel() {
  const client = useQueryClient();
  const configs = useQuery({
    queryKey: ["admin", "configs"],
    queryFn: adminService.configs,
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: ({
      key,
      raw,
      current,
    }: {
      key: string;
      raw: string;
      current: unknown;
    }) => {
      let value: unknown = raw;
      if (typeof current !== "string") {
        try {
          value = JSON.parse(raw);
        } catch {
          throw new Error("Giá trị phải là JSON hợp lệ.");
        }
      }
      return adminService.updateConfig(key, value);
    },
    onSuccess: async () => {
      notify.success({ title: "Đã lưu cấu hình." });
      await client.invalidateQueries({ queryKey: ["admin", "configs"] });
    },
    onError: (error) =>
      notify.error({
        title: "Giá trị không hợp lệ.",
        description: errorMessage(error),
      }),
  });
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Cấu hình hệ thống"
        description="Chỉ các khóa đã được backend cho phép và kiểm tra kiểu dữ liệu mới có thể cập nhật."
      />
      {configs.isPending ? (
        <State>Đang tải cấu hình…</State>
      ) : configs.error ? (
        <State>{configs.error.message}</State>
      ) : (
        <div className="space-y-3">
          {configs.data.items.map((item) => {
            const displayed =
              typeof item.value === "string"
                ? item.value
                : JSON.stringify(item.value);
            const raw = drafts[item.key] ?? displayed;
            return (
              <article
                key={item.key}
                className="grid gap-3 rounded-xl border border-mod-border bg-mod-surface p-4 lg:grid-cols-[1.2fr_1fr_auto]"
              >
                <div>
                  <strong className="text-sm text-mod-text">{item.key}</strong>
                  <p className="mt-1 text-xs text-mod-text-secondary">
                    {item.description}
                  </p>
                </div>
                <Input
                  value={raw}
                  onChange={(e) =>
                    setDrafts((old) => ({ ...old, [item.key]: e.target.value }))
                  }
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    save.mutate({ key: item.key, raw, current: item.value })
                  }
                >
                  Lưu
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
