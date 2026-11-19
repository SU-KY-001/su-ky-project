import type { ReactElement } from "react";
import { Link } from "react-router";
import { Brain } from "@phosphor-icons/react/dist/icons/Brain";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Button } from "@/shared/components/ui/button";

interface PodcastQuizInvitationProps {
  slug: string;
  title: string;
  questionCount: number;
  bottom: number;
  onStart: () => void;
  onDismiss: () => void;
}
export function PodcastQuizInvitation({ slug, title, questionCount, bottom, onStart, onDismiss }: PodcastQuizInvitationProps): ReactElement {
  return <section role="status" aria-label="Ôn tập sau khi nghe" className="fixed right-4 z-[46] w-[calc(100vw-2rem)] max-w-[22rem] overflow-y-auto rounded-xl border border-line bg-paper-soft p-4 text-ink shadow-sm" style={{ bottom, maxHeight: `calc(100dvh - ${bottom + 16}px)` }}>
    <div className="flex items-start gap-2.5"><Brain size={21} className="mt-0.5 shrink-0 text-vermilion" aria-hidden="true" /><h2 className="text-base font-semibold leading-6">Ôn lại nội dung vừa nghe</h2></div>
    <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-soft" title={title}>{title}</p>
    <p className="mt-2 text-xs font-medium text-ink-soft">{questionCount} câu hỏi</p>
    <div className="mt-4 flex flex-wrap items-center gap-2"><Button asChild size="sm" className="min-h-10 bg-vermilion text-paper-soft hover:bg-vermilion-dark"><Link to={`/quiz/${encodeURIComponent(slug)}`} onClick={onStart}>Bắt đầu quiz <ArrowRight aria-hidden="true" /></Link></Button><Button type="button" size="sm" variant="ghost" className="min-h-10 text-ink-soft hover:bg-paper-deep hover:text-ink" onClick={onDismiss}>Để sau</Button></div>
  </section>;
}
