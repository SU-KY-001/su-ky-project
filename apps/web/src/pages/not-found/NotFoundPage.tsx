import { Link } from "react-router";
import { PageState } from "../../shared/components/PageState";

export function NotFoundPage() {
  return (
    <div className="space-y-5">
      <PageState eyebrow="404" title="Không tìm thấy trang" description="Đường dẫn này chưa có nội dung hoặc không còn tồn tại." />
      <Link to="/" className="inline-flex rounded-md border border-amber-500/40 px-4 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">Trở về trang chủ</Link>
    </div>
  );
}
