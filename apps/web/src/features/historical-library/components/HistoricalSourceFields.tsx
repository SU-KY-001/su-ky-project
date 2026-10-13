import { z } from "zod";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CreateSourceSchema,
  canEditHistoricalContent,
  SourceTierSchema,
  type CatalogSourceDto,
} from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { formField } from "@/features/moderator/components/CreationPage";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useIdempotentMutation } from "@/lib/useIdempotentMutation";
import {
  historicalCatalogService as api,
  type HistoricalKind,
} from "../services/historicalCatalogService";
import { uploadCatalogMedia } from "../services/catalogMediaService";
import {
  useCatalogInvalidation,
  useHistoricalSources,
} from "../hooks/useHistoricalCatalog";
const field = formField;
const tiers = {
  TIER_1_CHINH_SU: "Chính sử",
  TIER_2_KHAO_CO: "Khảo cổ",
  TIER_3_KHOA_HOC: "Nghiên cứu khoa học",
  TIER_4_DA_SU: "Dã sử",
};
export function SourceVerification({ source }: { source: CatalogSourceDto }) {
  const user = useCurrentUser().data;
  const invalidate = useCatalogInvalidation();
  const [note, setNote] = useState("");
  const [history, setHistory] = useState(false);
  const revisions = useQuery({
    queryKey: ["historical-catalog", "source-revisions", source.id],
    queryFn: () => api.sourceRevisions(source.id),
    enabled: history,
  });
  const archive = useMutation({
    mutationFn: () =>
      api.archiveSource(source.id, source.version, Boolean(source.archivedAt)),
    onSuccess: invalidate,
  });
  const review = useMutation({
    mutationFn: (decision: "VERIFY" | "REJECT") =>
      api.reviewSource(source.id, {
        baseVersion: source.version,
        expectedStatus: source.verificationStatus,
        decision,
        note,
      }),
    onSuccess: invalidate,
  });
  const canReview =
    user &&
    !source.archivedAt &&
    user.id !== source.createdById &&
    (user.role === "moderator" || user.role === "admin");
  return (
    <div className="space-y-2">
      <p className="text-xs">
        {tiers[source.tier]} · phiên bản {source.version} ·{" "}
        <strong>
          {source.verificationStatus === "VERIFIED"
            ? "Đã xác minh"
            : source.verificationStatus === "REJECTED"
              ? "Bị từ chối"
              : "Chưa xác minh"}
        </strong>
      </p>
      {source.verificationNote ? (
        <p className="text-sm">Nhận xét: {source.verificationNote}</p>
      ) : null}
      {canReview && source.verificationStatus !== "REJECTED" ? (
        <>
          <label className="block text-sm">
            Nhận xét nguồn
            <Textarea
              autoGrow
              className={field}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            {source.verificationStatus === "PENDING" ? (
              <Button
                size="sm"
                disabled={!note.trim() || review.isPending}
                onClick={() => review.mutate("VERIFY")}
              >
                Xác minh nguồn
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={!note.trim() || review.isPending}
              onClick={() => review.mutate("REJECT")}
            >
              {source.verificationStatus === "VERIFIED"
                ? "Rút xác minh"
                : "Từ chối nguồn"}
            </Button>
          </div>
        </>
      ) : null}
      {review.error ? <p role="alert">{review.error.message}</p> : null}
      <div className="flex gap-2">
        <Button size="xs" variant="ghost" onClick={() => setHistory(!history)}>
          Phiên bản nguồn
        </Button>
        {user?.role === "admin" || user?.id === source.createdById ? (
          <Button
            size="xs"
            variant="ghost"
            disabled={archive.isPending}
            onClick={() => archive.mutate()}
          >
            {source.archivedAt ? "Khôi phục nguồn" : "Lưu trữ nguồn"}
          </Button>
        ) : null}
      </div>
      {archive.error ? <p role="alert">{archive.error.message}</p> : null}
      {history ? (
        <div>
          {revisions.isPending ? (
            <p>Đang tải…</p>
          ) : revisions.error ? (
            <p role="alert">{revisions.error.message}</p>
          ) : (
            revisions.data?.items.map((r) => (
              <details key={r.id}>
                <summary>
                  Phiên bản {r.version} · {r.createdAt.toLocaleString("vi-VN")}
                </summary>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">
                  {JSON.stringify(r.snapshot, null, 2)}
                </pre>
              </details>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
export function SourceComposer({
  onSaved,
  source,
  onCancel,
}: {
  onSaved: (s: CatalogSourceDto) => void;
  source?: CatalogSourceDto;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(source?.title ?? "");
  const [author, setAuthor] = useState(source?.author ?? "");
  const [publisher, setPublisher] = useState(source?.publisher ?? "");
  const [edition, setEdition] = useState(source?.edition ?? "");
  const [year, setYear] = useState(source?.publicationYear?.toString() ?? "");
  const [isbn, setIsbn] = useState(source?.isbn ?? "");
  const [url, setUrl] = useState(source?.url ?? "");
  const [tier, setTier] = useState(
    source?.tier ?? SourceTierSchema.enum.TIER_3_KHOA_HOC,
  );
  const [file, setFile] = useState<File>();
  const [assetId, setAssetId] = useState(source?.fileAssetId ?? undefined);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const invalidate = useCatalogInvalidation();
  const create = useIdempotentMutation(api.createSource);
  const patch = useMutation({
    mutationFn: (input: Parameters<typeof api.patchSource>[1]) => {
      if (!source) throw new Error("Nguồn không tồn tại");
      return api.patchSource(source.id, input);
    },
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      let uploadedId = assetId;
      if (file && !uploadedId) {
        setUploading(true);
        uploadedId = await uploadCatalogMedia(file);
        setAssetId(uploadedId);
        setUploading(false);
      }
      const input = CreateSourceSchema.parse({
        title,
        author: author || null,
        publisher: publisher || null,
        edition: edition || null,
        publicationYear: year ? Number(year) : null,
        isbn: isbn || null,
        url: url || null,
        fileAssetId: uploadedId ?? null,
        tier,
      });
      const saved = source
        ? await patch.mutateAsync({ ...input, baseVersion: source.version })
        : await create.mutateAsync(input);
      await invalidate();
      onSaved(saved);
    } catch (e) {
      setUploading(false);
      setError(
        e instanceof z.ZodError
          ? "Vui lòng kiểm tra tên tài liệu, năm xuất bản và bổ sung đường dẫn hợp lệ hoặc PDF."
          : e instanceof Error
            ? e.message
            : "Không lưu được nguồn.",
      );
    }
  };
  return (
    <form
      onSubmit={(e) => {
        void submit(e);
      }}
      className="space-y-3 rounded border border-mod-border p-4"
      aria-label={source ? "Sửa nguồn tư liệu" : "Tạo nguồn tư liệu"}
    >
      <h3 className="font-semibold">
        {source ? "Sửa nguồn tư liệu" : "Thêm nguồn tư liệu dùng chung"}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            label: "Tên tài liệu",
            value: title,
            set: setTitle,
            required: true,
          },
          { label: "Tác giả", value: author, set: setAuthor },
          {
            label: "Cơ quan / Nhà xuất bản",
            value: publisher,
            set: setPublisher,
          },
          { label: "Ấn bản", value: edition, set: setEdition },
          { label: "Năm xuất bản", value: year, set: setYear, type: "number" },
          { label: "ISBN", value: isbn, set: setIsbn },
          { label: "Đường dẫn tài liệu", value: url, set: setUrl, type: "url" },
        ].map((f) => (
          <label key={f.label} className="text-sm">
            {f.label}
            <Input
              aria-label={f.label}
              required={f.required}
              type={f.type ?? "text"}
              className={field}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
            />
          </label>
        ))}
        <label className="text-sm">
          Loại tư liệu
          <ModeratorSelect
            label="Loại tư liệu"
            value={tier}
            onValueChange={(value) => setTier(SourceTierSchema.parse(value))}
            options={Object.entries(tiers).map(([value, label]) => ({ value, label }))}
            placeholder="Chọn loại tư liệu"
          />
        </label>
        <label className="text-sm">
          Tài liệu PDF
          <Input
            type="file"
            accept="application/pdf"
            className={field}
            onChange={(e) => {
              setFile(e.target.files?.[0]);
              setAssetId(undefined);
            }}
          />
        </label>
      </div>
      <p className="text-xs text-mod-text-secondary">
        Loại tư liệu không thay thế việc xác minh. Cần đường dẫn hoặc PDF.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-mod-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={uploading || create.isPending || patch.isPending}
        >
          {uploading ? "Đang tải PDF…" : "Lưu nguồn"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
export function HistoricalSourceFields({
  kind,
  id,
}: {
  kind: HistoricalKind;
  id: string;
}) {
  const user = useCurrentUser().data;
  const invalidate = useCatalogInvalidation();
  const owner = useQuery({
    queryKey: ["historical-catalog", "detail", kind, id],
    queryFn: () => api.detail(kind, id),
  });
  const citations = useQuery({
    queryKey: ["historical-catalog", "citations", kind, id],
    queryFn: () => api.citations(kind, id),
  });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const sources = useHistoricalSources(q, page);
  const [sourceId, setSourceId] = useState("");
  const [locator, setLocator] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [error, setError] = useState("");
  const canEdit = canEditHistoricalContent(user ? { userId: user.id, role: user.role } : undefined, owner.data?.createdById, kind);
  const baseVersion = owner.data?.version ?? 0;
  const add = useIdempotentMutation(
    (
      input: {
        sourceId: string;
        locator: string;
        excerpt: string;
        note: string;
        baseVersion: number;
      },
      key,
    ) => api.addCitation(kind, id, input, key),
  );
  const change = useMutation({
    mutationFn: async (input: {
      citationId: string;
      remove?: boolean;
      refreshSourceId?: string;
    }) => {
      if (input.remove)
        await api.deleteCitation(kind, id, input.citationId, baseVersion);
      else
        await api.patchCitation(kind, id, input.citationId, {
          baseVersion,
          sourceId: input.refreshSourceId ?? sourceId,
          locator,
          excerpt,
          note,
        });
    },
    onSuccess: invalidate,
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) await change.mutateAsync({ citationId: editing });
      else
        await add.mutateAsync({
          sourceId,
          locator,
          excerpt,
          note,
          baseVersion,
        });
      await invalidate();
      setEditing(undefined);
      setLocator("");
      setExcerpt("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được trích dẫn.");
    }
  };
  const act = async (
    citationId: string,
    remove: boolean,
    refreshSourceId?: string,
  ) => {
    try {
      setError("");
      if (refreshSourceId) {
        await api.patchCitation(kind, id, citationId, {
          baseVersion,
          sourceId: refreshSourceId,
        });
        await invalidate();
      } else await change.mutateAsync({ citationId, remove });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không cập nhật được trích dẫn.",
      );
    }
  };
  return (
    <section className="space-y-4" aria-label="Nguồn tư liệu lịch sử">
      <h3 className="font-semibold">Nguồn tư liệu</h3>
      {citations.isPending ? (
        <p>Đang tải nguồn…</p>
      ) : citations.error ? (
        <p role="alert">{citations.error.message}</p>
      ) : citations.data?.items.length ? (
        citations.data.items.map((c) => (
          <article
            key={c.id}
            className="space-y-2 rounded border border-mod-border p-4"
          >
            <h4 className="font-semibold">{c.source.title}</h4>
            <p className="text-sm">
              {[
                c.source.author,
                c.source.publisher,
                c.source.edition,
                c.source.publicationYear,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-sm">Vị trí: {c.locator || "Chưa nhập"}</p>
            {c.excerpt ? (
              <blockquote className="border-l-2 border-mod-border pl-3 text-sm">
                {c.excerpt}
              </blockquote>
            ) : null}
            {c.note ? <p className="text-sm">Ghi chú: {c.note}</p> : null}
            {c.source.url ? (
              <a
                href={c.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-4 text-sm underline"
              >
                Xem nguồn
              </a>
            ) : null}
            {c.source.file ? (
              <a
                href={c.source.file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                PDF phiên bản {c.sourceVersion}
              </a>
            ) : null}
            {c.outdated ? (
              <p className="text-sm text-mod-warning">
                Đang trích phiên bản {c.sourceVersion}; nguồn hiện tại là{" "}
                {c.currentSourceVersion}.
                {canEdit ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      void act(c.id, false, c.sourceId);
                    }}
                  >
                    Ghim phiên bản mới
                  </Button>
                ) : null}
              </p>
            ) : (
              <SourceVerification source={c.source} />
            )}
            <div className="flex gap-2">
              {canEdit ? (
                <>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c.id);
                      setSourceId(c.sourceId);
                      setLocator(c.locator);
                      setExcerpt(c.excerpt ?? "");
                      setNote(c.note ?? "");
                    }}
                  >
                    Sửa trích dẫn
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={change.isPending}
                    onClick={() => {
                      void act(c.id, true);
                    }}
                  >
                    Gỡ trích dẫn
                  </Button>
                </>
              ) : null}
            </div>
          </article>
        ))
      ) : (
        <p className="text-sm text-mod-text-secondary">
          Chưa có nguồn. Có thể lưu nháp rồi bổ sung trích dẫn.
        </p>
      )}
      {canEdit && !owner.data?.deletedAt ? (
        <>
          <form
            aria-label="Gắn nguồn tư liệu"
            onSubmit={(e) => {
              void submit(e);
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              Tìm nguồn dùng chung
              <Input
                className={field}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="block text-sm">
              Chọn nguồn
              <ModeratorSelect
                required
                label="Chọn nguồn"
                value={sourceId}
                onValueChange={setSourceId}
                options={sources.data?.items.map((source) => ({
                  value: source.id,
                  label: `${source.title} · ${source.verificationStatus === "VERIFIED" ? "Đã xác minh" : "Chưa xác minh"}`,
                })) ?? []}
                placeholder="Chọn tài liệu…"
              />
            </label>
            {sources.error ? <p role="alert">{sources.error.message}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Trang trước
              </Button>
              <span className="self-center text-xs">Trang {page}</span>
              <Button
                type="button"
                variant="ghost"
                disabled={
                  !sources.data ||
                  page * sources.data.limit >= sources.data.total
                }
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreating(true)}
              >
                Thêm nguồn mới
              </Button>
            </div>
            <label className="block text-sm">
              Vị trí trích dẫn
              <Input
                className={field}
                placeholder="Quyển / chương / trang / mục"
                value={locator}
                onChange={(e) => setLocator(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Đoạn trích
              <Textarea
                autoGrow
                className={field}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Ghi chú nội bộ
              <Textarea
                autoGrow
                className={field}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <Button
              type="submit"
              disabled={
                !sourceId || !baseVersion || add.isPending || change.isPending
              }
            >
              {editing ? "Lưu trích dẫn" : "Gắn nguồn"}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(undefined)}
              >
                Hủy sửa
              </Button>
            ) : null}
          </form>
          {creating ? (
            <SourceComposer
              onCancel={() => setCreating(false)}
              onSaved={(s) => {
                setQ(s.title);
                setPage(1);
                setSourceId(s.id);
                setCreating(false);
              }}
            />
          ) : null}
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-mod-danger">
          {error} Nội dung đã tạo vẫn được giữ; hãy tải phiên bản mới trước khi
          thử lại nếu có xung đột.
        </p>
      ) : null}
    </section>
  );
}
