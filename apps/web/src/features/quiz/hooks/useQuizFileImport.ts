import { useCallback, useEffect, useRef, useState } from "react";
import { QUIZ_IMPORT_LIMITS, type QuizImportPreview } from "@repo/shared";
import { quizService } from "../services/quizService";

type ImportState = { status: "idle" } | { status: "uploading" | "processing"; fileName: string } | { status: "preview"; result: QuizImportPreview } | { status: "failure"; message: string };
interface QuizFileImportController { state: ImportState; loading: boolean; waiting: boolean; load: (files: File[]) => Promise<void>; reset: () => void; }
export function useQuizFileImport(defaultTime: number): QuizFileImportController {
  const [state, setState] = useState<ImportState>({ status: "idle" }), [waiting, setWaiting] = useState(false);
  const request = useRef<AbortController | null>(null), sequence = useRef(0);
  const loading = state.status === "uploading" || state.status === "processing";
  const reset = useCallback((): void => { sequence.current++; request.current?.abort(); request.current = null; setState({ status: "idle" }); setWaiting(false); }, []);
  useEffect(() => (): void => { sequence.current++; request.current?.abort(); }, []);
  useEffect(() => {
    if (!loading) { setWaiting(false); return; }
    const timer = window.setTimeout(() => setWaiting(true), 10_000); return () => window.clearTimeout(timer);
  }, [loading]);
  const load = async (files: File[]): Promise<void> => {
    if (request.current) return;
    const file = files[0];
    let message = "";
    if (files.length !== 1 || !file) message = "Mỗi lần chọn đúng một tài liệu.";
    else if (!/\.(doc|docx|pdf|txt|md)$/i.test(file.name)) message = "Sai định dạng. Chỉ hỗ trợ DOC, DOCX, PDF có văn bản, TXT và MD.";
    else if (!file.size) message = "Tệp đang trống. Hãy chọn tài liệu có câu hỏi.";
    else if (file.size > QUIZ_IMPORT_LIMITS.bytes) message = "Tài liệu tối đa 5 MB. Hãy chia nhỏ file.";
    if (message || !file) { setState({ status: "failure", message }); return; }
    const controller = new AbortController(), id = ++sequence.current;
    request.current = controller; setState({ status: "uploading", fileName: file.name });
    try {
      const result = await quizService.previewDocument(file, defaultTime, controller.signal, () => {
        if (id === sequence.current && !controller.signal.aborted) setState({ status: "processing", fileName: file.name });
      });
      if (id === sequence.current && !controller.signal.aborted) setState({ status: "preview", result });
    } catch (error) {
      if (id === sequence.current && !controller.signal.aborted) setState({ status: "failure", message: error instanceof Error ? error.message : "Không đọc được tài liệu. Hãy lưu lại file và thử lại." });
    } finally { if (id === sequence.current) request.current = null; }
  };
  return { state, loading, waiting, load, reset };
}
