import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EpisodePoster } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { ImageUploadDropzone } from "@/shared/components/common/ImageUploadDropzone";
import { notify } from "@/shared/lib/notifications";
import { podcastProductionService as api } from "../services/podcastProductionService";

export function PodcastPosterField({ value, busy, readOnly, onChange, onBusyChange, label = "Poster podcast" }: { value: EpisodePoster | null; busy: boolean; readOnly: boolean; onChange: (poster: EpisodePoster | null) => void; onBusyChange: (busy: boolean) => void; label?: string }): ReactElement {
  const policy = useQuery({ queryKey: ["media", "image-upload-policy"], queryFn: ({ signal }) => api.imagePolicy(AbortSignal.any([signal, AbortSignal.timeout(15000)])), enabled: !readOnly, staleTime: 60000 });
  if (policy.isError && !policy.data && !readOnly) return <div className="space-y-3"><p className="text-sm font-semibold text-mod-text">{label}</p><p role="alert" className="text-xs leading-6 text-mod-danger">Chưa lấy được định dạng và giới hạn dung lượng từ máy chủ. Kiểm tra kết nối rồi bấm Thử lại để chọn ảnh.</p><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { void policy.refetch(); }}>Thử lại</Button>{value?.url && <img src={value.url} alt={`${label} đã lưu`} className="h-36 max-w-full rounded-lg object-contain" />}</div>;
  return <ImageUploadDropzone label={label} value={value} policy={policy.data} disabled={busy || policy.isPending} readOnly={readOnly} onUpload={async (file, signal) => {
    try {
      const image = await api.uploadPoster(file, signal);
      notify.success({ title: "Đã tải ảnh lên", description: "Lưu podcast để áp dụng ảnh." });
      return image;
    } catch (caught) {
      if (!signal.aborted) notify.error({ title: "Không thể tải ảnh", description: caught instanceof Error ? caught.message : "Vui lòng thử lại." });
      throw caught;
    }
  }} onChange={(image) => {
    onChange(image);
    if (!image) notify.info({ title: "Đã bỏ ảnh", description: "Lưu podcast để áp dụng thay đổi." });
  }} onBusyChange={onBusyChange} />;
}
