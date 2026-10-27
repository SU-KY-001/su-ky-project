import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import type { EpisodePoster as UploadedImage, ImageUploadPolicy } from "@repo/shared";
import { ArrowClockwise } from "@phosphor-icons/react/dist/icons/ArrowClockwise";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { Image as ImageIcon } from "@phosphor-icons/react/dist/icons/Image";
import { SpinnerGap } from "@phosphor-icons/react/dist/icons/SpinnerGap";
import { UploadSimple } from "@phosphor-icons/react/dist/icons/UploadSimple";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { X } from "@phosphor-icons/react/dist/icons/X";
import { ApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

type UploadStatus = "idle" | "uploading" | "success" | "error" | "invalid-format";
const statusLabels: Record<UploadStatus, string> = { idle: "Chưa chọn ảnh", uploading: "Đang tải", success: "Tải xong", error: "Tải lỗi", "invalid-format": "Sai định dạng" };
const sizeLabel = (bytes: number): string => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024).toLocaleString("vi-VN")} KB` : `${(bytes / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} MB`;

function uploadFailure(error: unknown): { status: "error" | "invalid-format"; message: string; retry: boolean } {
  if (error instanceof ApiError) {
    if (["MEDIA_TYPE_NOT_ALLOWED", "MEDIA_INVALID"].includes(error.errorCode ?? "")) return { status: "invalid-format", message: "Máy chủ không chấp nhận định dạng hoặc nội dung ảnh này. Xuất lại ảnh theo định dạng cho phép và chọn tệp mới.", retry: false };
    if (error.errorCode === "MEDIA_TOO_LARGE") return { status: "error", message: "Ảnh vượt giới hạn dung lượng hiện tại của máy chủ. Nén ảnh hoặc chọn ảnh nhỏ hơn rồi tải lại.", retry: false };
    if (error.status === 401 || error.status === 403) return { status: "error", message: "Phiên đăng nhập đã hết hạn hoặc tài khoản không có quyền tải ảnh. Đăng nhập lại và chọn ảnh để tiếp tục.", retry: false };
    if (error.status === 429) return { status: "error", message: "Bạn đang tải ảnh quá nhanh. Chờ một lát rồi bấm Thử tải lại.", retry: true };
    if (error.status === 503) return { status: "error", message: "Kho lưu trữ ảnh tạm thời chưa sẵn sàng. Bấm Thử tải lại sau ít phút; nếu lỗi tiếp diễn, liên hệ quản trị viên.", retry: true };
  }
  if (error instanceof DOMException && error.name === "TimeoutError") return { status: "error", message: "Tải ảnh quá thời gian chờ. Kiểm tra kết nối mạng rồi bấm Thử tải lại.", retry: true };
  return { status: "error", message: "Chưa hoàn tất tải và xác minh ảnh trên kho lưu trữ. Kiểm tra kết nối rồi bấm Thử tải lại hoặc chọn ảnh khác.", retry: true };
}

export function ImageUploadDropzone({ label, value, policy, disabled = false, readOnly = false, onUpload, onChange, onBusyChange }: {
  label: string; value: UploadedImage | null; policy?: ImageUploadPolicy; disabled?: boolean; readOnly?: boolean;
  onUpload: (file: File, signal: AbortSignal) => Promise<UploadedImage>;
  onChange: (image: UploadedImage | null) => void; onBusyChange: (busy: boolean) => void;
}): ReactElement {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const busyChange = useRef(onBusyChange);
  busyChange.current = onBusyChange;
  const localUrl = useRef<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>(value ? "success" : "idle");
  const [candidate, setCandidate] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(false);
  const uploading = status === "uploading";
  const unavailable = disabled || uploading || !policy;
  const failed = status === "error" || status === "invalid-format";
  const previewUrl = preview ?? value?.url;
  const formats = policy?.formats.map((format) => format.toUpperCase()).join(", ");

  useEffect(() => () => { controller.current?.abort(); if (localUrl.current) URL.revokeObjectURL(localUrl.current); busyChange.current(false); }, []);

  function replacePreview(url: string | null): void {
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    localUrl.current = url;
    setPreview(url);
    setPreviewFailed(false);
  }

  async function upload(file: File): Promise<void> {
    if (unavailable || readOnly || !policy) return;
    setRetry(false);
    setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!policy.mimeTypes.includes(file.type) || !extension || !policy.formats.includes(extension)) {
      setStatus("invalid-format");
      setMessage(`Tệp “${file.name}” không đúng định dạng được phép (${formats}). Chọn một ảnh khác; đổi tên đuôi tệp không chuyển đổi định dạng ảnh.`);
      return;
    }
    if (!file.size || file.size > policy.maxBytes) {
      setStatus("error");
      setMessage(file.size ? `Ảnh có dung lượng ${sizeLabel(file.size)}, vượt mức ${sizeLabel(policy.maxBytes)}. Nén ảnh hoặc chọn ảnh nhỏ hơn rồi tải lại.` : "Tệp ảnh đang rỗng (0 byte). Xuất lại ảnh hoặc chọn một tệp khác.");
      return;
    }
    setCandidate(file);
    setStatus("uploading");
    onBusyChange(true);
    const operation = new AbortController();
    controller.current = operation;
    const signal = AbortSignal.any([operation.signal, AbortSignal.timeout(120000)]);
    const url = URL.createObjectURL(file);
    replacePreview(url);
    try {
      const image = new Image();
      image.src = url;
      try { await image.decode(); } catch {
        if (operation.signal.aborted) return;
        replacePreview(null);
        setStatus("invalid-format");
        setMessage("Không đọc được nội dung ảnh; tệp có thể bị hỏng hoặc chỉ được đổi đuôi. Mở ảnh trong trình chỉnh sửa, xuất lại đúng định dạng rồi chọn tệp mới.");
        return;
      }
      signal.throwIfAborted();
      const uploaded = await onUpload(file, signal);
      if (operation.signal.aborted) return;
      onChange(uploaded);
      setStatus("success");
    } catch (error) {
      if (operation.signal.aborted) return;
      const failure = uploadFailure(error);
      setStatus(failure.status); setMessage(failure.message); setRetry(failure.retry);
    } finally {
      if (!operation.signal.aborted) onBusyChange(false);
    }
  }

  function choose(files: File[]): void {
    if (unavailable || readOnly || !files.length) return;
    if (files.length !== 1) { setStatus("error"); setRetry(false); setMessage("Mỗi tập chỉ dùng một ảnh poster. Chọn hoặc kéo thả một ảnh duy nhất."); return; }
    void upload(files[0]);
  }

  function clearCandidate(): void {
    replacePreview(null); setCandidate(null); setMessage(""); setRetry(false); setStatus(value ? "success" : "idle");
  }

  return <div className="space-y-2" aria-busy={uploading}>
    <Label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold text-mod-text">{label}</Label>
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={!readOnly ? `${id}-conditions ${id}-status` : `${id}-status`} className={cn("flex min-h-56 flex-col justify-center rounded-xl border border-mod-text-low/40 bg-mod-surface p-5 transition-colors", !readOnly && "border-dashed", dragging && "border-mod-primary bg-mod-primary/5", failed && "border-mod-danger/60")}
      onDragOver={(event) => { event.preventDefault(); if (!unavailable && !readOnly && event.dataTransfer.types.includes("Files")) setDragging(true); }}
      onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); choose(Array.from(event.dataTransfer.files)); }}>
      <input ref={input} id={id} className="sr-only" tabIndex={-1} type="file" accept={policy ? [...policy.mimeTypes, ...policy.formats.map((format) => `.${format}`)].join(",") : undefined} disabled={unavailable || readOnly} aria-describedby={`${id}-conditions ${id}-status`} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; choose(files); }} />
      <div className={cn("flex flex-col items-center gap-3 text-center", (candidate || value) && "sm:flex-row sm:gap-5 sm:text-left")}>
        {candidate || value ? <div className="grid h-32 w-40 shrink-0 place-items-center overflow-hidden rounded-lg border border-mod-border bg-mod-canvas-accent/30">{previewUrl && !previewFailed ? <img src={previewUrl} alt={`Xem trước ${label.toLowerCase()}`} className="size-full object-contain" onError={() => setPreviewFailed(true)} /> : <ImageIcon size={30} className="text-mod-text-low" aria-hidden="true" />}</div> : <span className="grid size-10 place-items-center rounded-lg border border-mod-border bg-mod-surface text-mod-text-secondary shadow-xs"><UploadSimple size={22} aria-hidden="true" /></span>}
        <div className="min-w-0"><p className="text-sm font-semibold text-mod-text">{readOnly ? value?.fileName ?? "Chưa có poster" : dragging ? "Thả ảnh tại đây" : "Kéo thả ảnh vào đây"}</p>
          {!readOnly && <p id={`${id}-conditions`} className="mt-2 text-xs leading-5 text-mod-text-secondary">{policy ? `${formats} (tối đa ${sizeLabel(policy.maxBytes)}) · Chỉ một ảnh` : "Đang lấy điều kiện tải ảnh…"}</p>}
          {(candidate || value) && !readOnly && <p className="mt-2 break-words text-xs leading-5 text-mod-text-secondary">{candidate?.name ?? value?.fileName}{(candidate?.size ?? value?.sizeBytes) ? ` · ${sizeLabel(candidate?.size ?? value?.sizeBytes ?? 0)}` : ""}</p>}
          {!readOnly && <div className={cn("mt-3 flex flex-wrap justify-center gap-2", (candidate || value) && "sm:justify-start")}><Button type="button" variant="outline" size="sm" disabled={unavailable} onClick={() => input.current?.click()}>{value || candidate ? "Chọn ảnh khác" : "Chọn ảnh"}</Button>{retry && candidate && <Button type="button" variant="outline" size="sm" disabled={unavailable} onClick={() => { void upload(candidate); }}><ArrowClockwise aria-hidden="true" /> Thử tải lại</Button>}{value && failed && <Button type="button" variant="ghost" size="sm" disabled={uploading || disabled} onClick={clearCandidate}>Giữ ảnh đã tải</Button>}{(value || candidate) && <Button type="button" variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => { clearCandidate(); onChange(null); setStatus("idle"); }}><X aria-hidden="true" /> Gỡ ảnh</Button>}</div>}
        </div>
      </div>
    </div>
    <div id={`${id}-status`} role="status" aria-live="polite" className={cn("flex items-center gap-2 text-xs font-medium", failed ? "text-mod-danger" : status === "success" ? "text-mod-success" : "text-mod-text-secondary")}>
      {uploading ? <SpinnerGap size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : status === "success" ? <CheckCircle size={16} aria-hidden="true" /> : failed ? <WarningCircle size={16} aria-hidden="true" /> : null}{statusLabels[status]}
    </div>
    {message && <p role="alert" className="text-xs leading-6 text-mod-danger">{message}</p>}
    {previewFailed && <p role="alert" className="text-xs leading-6 text-mod-danger">Không mở được ảnh xem trước. Tải lại trang hoặc chọn ảnh khác.</p>}
    {!readOnly && status === "success" && <p className="text-xs leading-6 text-mod-text-secondary">Ảnh đã được tải lên và xác minh. Lưu bản nháp hoặc lưu thay đổi để gắn poster vào tập.</p>}
  </div>;
}
