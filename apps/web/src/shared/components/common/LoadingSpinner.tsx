interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ label = "Đang tải trang…", fullScreen = true }: LoadingSpinnerProps) {
  return (
    <div className={`grid ${fullScreen ? "min-h-screen" : "min-h-12"} place-items-center`} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="size-8 animate-spin rounded-full border-[3px] border-vermilion/20 border-t-vermilion" />
    </div>
  );
}
