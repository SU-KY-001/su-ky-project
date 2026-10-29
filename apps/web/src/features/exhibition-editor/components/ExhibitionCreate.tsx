import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useMutation } from "@tanstack/react-query";
import { Canvas } from "@react-three/fiber";
import { useNavigate } from "react-router";
import { exhibitionTemplate, ExhibitionDocumentSchema, type ExhibitionDocument } from "@repo/shared";
import { GalleryArchitecture, GalleryCeilingLights, galleryPalette, placementToPose } from "@/features/exhibition";
import { Edges } from "@react-three/drei";
import { NoToneMapping } from "three";
import { moderatorExhibitionPath } from "@/features/moderator/paths";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/notifications";
import { exhibitionService } from "../services/exhibitionService";

export function ExhibitionCreate(): ReactElement {
  const navigate = useNavigate();
  const [document, setDocument] = useState<ExhibitionDocument>(emptyDocumentWithoutValidation);
  const key = useRef(crypto.randomUUID());
  const mutation = useMutation({ mutationFn: () => exhibitionService.create(ExhibitionDocumentSchema.parse(document), key.current), onSuccess: workspace => navigate(moderatorExhibitionPath.edit(workspace.id)), onError: error => notify.error({ title: "Không thể tạo triển lãm", description: error.message }) });
  const change = (next: ExhibitionDocument): void => { key.current = crypto.randomUUID(); setDocument(next); };
  const submit = (event: FormEvent): void => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(); };
  return <form onSubmit={submit} className="exhibition-create space-y-6 font-moderator">
    <header><h1 className="text-3xl font-bold text-mod-text">Tạo triển lãm 3D</h1><p className="mt-2 text-mod-text-secondary">Bắt đầu từ không gian hiện có.</p></header>
    <ol aria-label="Các bước tạo triển lãm" className="mx-auto flex max-w-3xl items-center justify-center text-sm text-mod-text-secondary">{["Thông tin", "Bố trí không gian", "Xem thử"].map((label, index) => <li key={label} className="flex flex-1 items-center last:flex-none"><span className={`flex shrink-0 items-center gap-3 whitespace-nowrap ${index === 0 ? "font-semibold text-mod-primary" : ""}`}><span className={`grid size-10 place-items-center rounded-full border ${index === 0 ? "border-mod-primary bg-mod-primary text-white" : "border-mod-border bg-mod-canvas-accent text-mod-text"}`}>{index + 1}</span>{label}</span>{index < 2 && <span aria-hidden="true" className="mx-4 h-px min-w-4 flex-1 bg-mod-border" />}</li>)}</ol>
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.25fr)]">
      <section className="space-y-5 rounded-lg border border-mod-border bg-mod-surface p-5">
        <label className="block text-sm font-semibold">Tên triển lãm<Input className="mt-2" required maxLength={255} value={document.metadata.title} onChange={event => change({ ...document, metadata: { ...document.metadata, title: event.target.value } })} /></label>
        <label className="block text-sm font-semibold">Phụ đề<Input className="mt-2" maxLength={255} value={document.metadata.subtitle} onChange={event => change({ ...document, metadata: { ...document.metadata, subtitle: event.target.value } })} /></label>
        <label className="block text-sm font-semibold">Giới thiệu<Textarea className="mt-2" maxLength={2000} value={document.metadata.description} onChange={event => change({ ...document, metadata: { ...document.metadata, description: event.target.value } })} /></label>
        <div><h2 className="text-sm font-semibold">Không gian</h2><p className="mt-2 rounded-md border border-mod-border p-4 text-sm">Mẫu 3 phòng · Không gian hiện tại</p></div>
        <fieldset className="space-y-2"><legend className="text-sm font-semibold">Chương triển lãm</legend>{document.chapters.map((chapter, index) => <div key={chapter.id} className="rounded-md border border-mod-border p-2"><label className="flex items-center gap-2 text-sm"><span className="w-9 text-center font-semibold">{String(index + 1).padStart(2, "0")}</span><span className="sr-only">Tên chương {index + 1}</span><Input required maxLength={255} value={chapter.title} onChange={event => change({ ...document, chapters: document.chapters.map(value => value.id === chapter.id ? { ...value, title: event.target.value } : value) })} /></label><details className="mt-1 text-xs text-mod-text-secondary"><summary className="cursor-pointer px-2 py-1">Thời kỳ và mô tả</summary><div className="space-y-2 pt-2"><Input aria-label={`Thời kỳ chương ${index + 1}`} placeholder="Thời kỳ" maxLength={255} value={chapter.period} onChange={event => change({ ...document, chapters: document.chapters.map(value => value.id === chapter.id ? { ...value, period: event.target.value } : value) })} /><Textarea aria-label={`Mô tả chương ${index + 1}`} placeholder="Mô tả chương" maxLength={2000} value={chapter.description} onChange={event => change({ ...document, chapters: document.chapters.map(value => value.id === chapter.id ? { ...value, description: event.target.value } : value) })} /></div></details></div>)}</fieldset>
      </section>
      <section className="rounded-lg border border-mod-border bg-mod-surface p-5"><h2 className="mb-4 text-xl font-bold">Không gian của bạn</h2><div className="h-[clamp(360px,52vh,520px)] overflow-hidden rounded-md bg-mod-canvas-accent"><Canvas gl={{ antialias: true, powerPreference: "high-performance", alpha: false, toneMapping: NoToneMapping }} camera={{ position: [...exhibitionTemplate.spawns[0].position], rotation: [-0.13, 0, 0], fov: 66 }}><color attach="background" args={[galleryPalette.wall]} /><ambientLight intensity={0.55} color={galleryPalette.light} /><hemisphereLight args={[galleryPalette.light, galleryPalette.floor, 0.35]} /><directionalLight position={[-3, 8, 6]} intensity={Math.PI * 0.078} color={galleryPalette.light} /><GalleryArchitecture chapterText={document.chapters} /><GalleryCeilingLights />{exhibitionTemplate.suggestions.map(point => { const pose = placementToPose({ ...point, width: 2 }); return <mesh key={`${point.wallId}-${point.offset}`} position={pose.position} rotation={[0, pose.rotation, 0]}><planeGeometry args={[1.3, 1]} /><meshBasicMaterial color={galleryPalette.trim} transparent opacity={0.18} /><Edges color={galleryPalette.frame} /></mesh>; })}</Canvas></div><p className="mt-4 rounded-md bg-mod-canvas-accent p-4 text-center text-sm font-semibold">3 phòng &nbsp; · &nbsp; {exhibitionTemplate.suggestions.length} vị trí gợi ý</p><p className="mt-3 text-center text-xs text-mod-text-secondary">Có thể thay ảnh, sửa nội dung và gắn podcast tại từng vị trí.</p></section>
    </div>
    <div className="flex justify-end"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Đang tạo…" : "Vào bố trí không gian →"}</Button></div>
  </form>;
}

function emptyDocumentWithoutValidation(): ExhibitionDocument {
  const base = emptyDocumentTemplate();
  return { ...base, metadata: { ...base.metadata, title: "" } };
}
function emptyDocumentTemplate(): ExhibitionDocument {
  return ExhibitionDocumentSchema.parse({ schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, metadata: { title: "Mới", subtitle: "", description: "", coverAssetId: null }, chapters: ["Chương 1", "Chương 2", "Chương 3"].map((title, index) => ({ id: crypto.randomUUID(), roomKey: `room-${index + 1}`, title, period: "", description: "" })), items: [] });
}
