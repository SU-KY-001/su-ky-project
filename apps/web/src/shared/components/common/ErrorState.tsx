import { ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "../ui/button";

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry: () => void;
}

export function ErrorState({ title = "Chưa thể xác minh quyền truy cập", description, onRetry }: ErrorStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-5 py-10 text-center" role="alert">
      <h1 className="font-serif text-2xl font-bold text-ink">{title}</h1>
      <p className="max-w-md text-sm leading-6 text-ink-soft">{description}</p>
      <Button className="rounded-full bg-vermilion px-5 text-paper-soft hover:bg-vermilion-dark" onClick={onRetry}>
        <ArrowClockwise size={18} aria-hidden="true" />
        Thử lại
      </Button>
    </main>
  );
}
