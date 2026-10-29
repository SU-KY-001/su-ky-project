import { useRef, useState, type ReactElement } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExhibitionDocumentSchema, type ExhibitionDocument } from "@repo/shared";
import { AnimatedBeam } from "@/features/podcast-production";
import { moderatorExhibitionPath } from "@/features/moderator/paths";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/notifications";
import { AudioUploadDropzone } from "@/shared/components/common/AudioUploadDropzone";
import preview from "./exhibition-scene-preview.png";
import { exhibitionService } from "../services/exhibitionService";

function newChapter(index: number): ExhibitionDocument["chapters"][number] {
  return { id: crypto.randomUUID(), roomKey: (["room-1", "room-2", "room-3"] as const)[index]!, title: `Chương ${index + 1}`, period: "", description: "" };
}

export function ExhibitionCreate(): ReactElement {
  const navigate = useNavigate();
  const key = useRef(crypto.randomUUID());
  const [audioName, setAudioName] = useState("");
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, watch, getValues, setValue, formState: { errors } } = useForm<ExhibitionDocument>({
    resolver: zodResolver(ExhibitionDocumentSchema),
    defaultValues: { schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, metadata: { title: "", subtitle: "", description: "", coverAssetId: null }, audioAssetId: null, chapters: [newChapter(0), newChapter(1), newChapter(2)], items: [] },
  });
  const chapters = watch("chapters");
  const audioAssetId = watch("audioAssetId");
  const mutation = useMutation({ mutationFn: (document: ExhibitionDocument) => exhibitionService.create(document, key.current), onSuccess: workspace => navigate(moderatorExhibitionPath.edit(workspace.id)), onError: error => notify.error({ title: "Không thể tạo triển lãm", description: error.message }) });
  const setRooms = (count: number): void => {
    const current = getValues("chapters");
    setValue("chapters", Array.from({ length: count }, (_, index) => current[index] ?? newChapter(index)), { shouldValidate: true, shouldDirty: true });
    key.current = crypto.randomUUID();
  };
  const uploadAudio = async (file: File): Promise<void> => {
    setUploading(true);
    try {
      const audio = await exhibitionService.uploadAudio(file, new AbortController().signal);
      setValue("audioAssetId", audio.id, { shouldDirty: true }); setAudioName(file.name); setAudioPreview(audio.url); key.current = crypto.randomUUID();
    } catch (error) { notify.error({ title: "Không thể tải âm thanh", description: error instanceof Error ? error.message : "Vui lòng thử lại" }); throw error; }
    finally { setUploading(false); }
  };
  return <form noValidate onChange={() => { key.current = crypto.randomUUID(); }} onSubmit={handleSubmit(value => mutation.mutate(value), () => notify.error({ title: "Thông tin chưa hợp lệ", description: "Hãy kiểm tra các trường được đánh dấu." }))} className="exhibition-create space-y-6 font-moderator">
    <header><h1 className="text-3xl font-bold text-mod-text">Tạo triển lãm 3D</h1><p className="mt-2 text-mod-text-secondary">Bắt đầu từ không gian hiện có.</p></header>
    <nav aria-label="Các bước tạo triển lãm" className="overflow-x-auto"><div className="relative mx-auto min-w-[420px] max-w-3xl"><AnimatedBeam stepCount={3} activeStepIndex={0} inset="16.6667%" /><ol className="relative grid grid-cols-3">{["Thông tin", "Bố trí không gian", "Xem thử"].map((label, index) => <li key={label} aria-current={index === 0 ? "step" : undefined} className={`flex flex-col items-center gap-2 text-center text-xs font-medium ${index === 0 ? "text-mod-primary" : "text-mod-text-secondary"}`}><span className={`z-10 grid size-8 place-items-center rounded-full border bg-mod-surface ${index === 0 ? "border-mod-primary text-mod-primary" : "border-mod-border"}`}>{index + 1}</span>{label}</li>)}</ol></div></nav>
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.25fr)]">
      <section className="space-y-5 rounded-lg border border-mod-border bg-mod-surface p-5">
        <label className="block text-sm font-semibold">Tên triển lãm<Input className="mt-2" placeholder="Ví dụ: Ký ức ngày thống nhất" maxLength={255} aria-invalid={!!errors.metadata?.title} {...register("metadata.title")} />{errors.metadata?.title && <span role="alert" className="mt-1 block text-xs text-mod-danger">Vui lòng nhập tên triển lãm.</span>}</label>
        <label className="block text-sm font-semibold">Phụ đề<Input className="mt-2" placeholder="Ví dụ: Những câu chuyện mùa xuân 1975" maxLength={255} {...register("metadata.subtitle")} /></label>
        <label className="block text-sm font-semibold">Giới thiệu<Textarea className="mt-2" placeholder="Giới thiệu ngắn về chủ đề và câu chuyện của triển lãm" maxLength={2000} {...register("metadata.description")} /></label>
        <div className="space-y-2"><label htmlFor="exhibition-room-count" className="block text-sm font-semibold">Số phòng triển lãm</label><ModeratorSelect id="exhibition-room-count" label="Số phòng triển lãm" value={String(chapters.length)} onValueChange={value => setRooms(Number(value))} placeholder="Chọn số phòng" options={[1, 2, 3].map(count => ({ value: String(count), label: `${count} phòng` }))} /></div>
        <fieldset className="space-y-2"><legend className="text-sm font-semibold">Chương triển lãm</legend>{chapters.map((chapter, index) => <div key={chapter.id} className="rounded-md border border-mod-border p-2"><label className="flex items-center gap-2 text-sm"><span className="w-9 text-center font-semibold">{String(index + 1).padStart(2, "0")}</span><span className="sr-only">Tên chương {index + 1}</span><Input placeholder="Tên chương, ví dụ: Những ngày đầu" aria-invalid={!!errors.chapters?.[index]?.title} maxLength={255} {...register(`chapters.${index}.title`)} /></label>{errors.chapters?.[index]?.title && <p role="alert" className="px-2 pt-1 text-xs text-mod-danger">Vui lòng nhập tên chương.</p>}<details className="mt-1 text-xs text-mod-text-secondary"><summary className="cursor-pointer px-2 py-1">Thời kỳ và mô tả</summary><div className="space-y-2 pt-2"><Input aria-label={`Thời kỳ chương ${index + 1}`} placeholder="Ví dụ: Tháng 4 năm 1975" maxLength={255} {...register(`chapters.${index}.period`)} /><Textarea aria-label={`Mô tả chương ${index + 1}`} placeholder="Mô tả sự kiện hoặc nội dung của chương" maxLength={2000} {...register(`chapters.${index}.description`)} /></div></details></div>)}</fieldset>
        <div className="space-y-2"><AudioUploadDropzone busy={uploading} hasAudio={!!audioAssetId} fileName={audioName} previewUrl={audioPreview} onSelect={uploadAudio} onRemove={() => { setValue("audioAssetId", null, { shouldDirty: true }); setAudioName(""); setAudioPreview(null); key.current = crypto.randomUUID(); }} /><p className="text-xs text-mod-text-secondary">Một file được phát trong suốt chuyến tham quan. Bạn có thể bổ sung sau.</p></div>
      </section>
      <section className="rounded-lg border border-mod-border bg-mod-surface p-5"><h2 className="mb-4 text-xl font-bold">Không gian triển lãm</h2><div className="h-[clamp(360px,52vh,520px)] overflow-hidden rounded-md bg-mod-canvas-accent"><img src={preview} alt="Hình minh họa không gian triển lãm" className="h-full w-full object-cover" /></div><p className="mt-4 rounded-md bg-mod-canvas-accent p-4 text-center text-sm font-semibold">{chapters.length} phòng</p><p className="mt-3 text-center text-xs text-mod-text-secondary">Bạn sẽ chọn vị trí và thêm nội dung cho tranh ở bước tiếp theo.</p></section>
    </div>
    <div className="flex justify-end"><Button type="submit" disabled={mutation.isPending || uploading}>{mutation.isPending ? "Đang tạo…" : "Vào bố trí không gian →"}</Button></div>
  </form>;
}
