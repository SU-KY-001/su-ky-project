import type { ReactElement } from "react";
import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";
import { LibraryState } from "@/features/landing/components/library/LibraryPrimitives";

/** Shown when a Free account runs out of today's quota for a feature. */
export function QuotaGate({ title, description }: { title: string; description: string }): ReactElement {
  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl px-5 pt-36">
      <LibraryState error title={title} description={description} />
      <Button asChild className="mt-4 bg-vermilion text-paper-soft hover:bg-vermilion-dark">
        <Link to={APP_PATHS.member}>Xem gói Premium</Link>
      </Button>
    </main>
  );
}
