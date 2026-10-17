import type { PublicHistoricalEventDto } from "@repo/shared";
export function PublicHistoricalSources({
  citations,
}: {
  citations: PublicHistoricalEventDto["citations"];
}) {
  return (
    <section aria-label="Nguồn tư liệu">
      <h2 className="mb-3 text-lg font-semibold">Nguồn tư liệu</h2>
      <ol className="space-y-4">
        {citations.map((c, i) => (
          <li
            key={`${c.source.id}:${c.locator}:${i}`}
            className="border-b border-border pb-4"
          >
            <p className="font-semibold">{c.source.title}</p>
            <p className="text-sm text-muted-foreground">
              {[
                c.source.author,
                c.source.publisher,
                c.source.edition,
                c.source.publicationYear,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 text-sm">{c.locator}</p>
            {c.excerpt ? (
              <blockquote className="mt-2 border-l-2 border-border pl-3">
                {c.excerpt}
              </blockquote>
            ) : null}
            <p className="mt-2 text-sm">
              {c.source.verificationStatus === "VERIFIED"
                ? "Đã xác minh"
                : c.source.verificationStatus === "REJECTED"
                  ? "Đã rút xác minh"
                  : "Chưa xác minh"}
            </p>
            {c.source.url ? (
              <a
                className="mr-4 underline"
                href={c.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Xem nguồn gốc
              </a>
            ) : null}
            {c.source.file ? (
              <a
                className="underline"
                href={c.source.file.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Xem tài liệu PDF
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
