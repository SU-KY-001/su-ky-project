import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { prisma } from "@repo/db";
import { EditorDocumentSchema, HistoricalTimeSchema } from "@repo/shared";
import { VIETNAM_PODCAST_SEED } from "./vietnam-podcast-seed-data";
import { VIETNAM_PUBLICATION_DATA } from "./vietnam-podcast-publication-data";
import { jsonSnapshot } from "../modules/catalog/infrastructure/prisma-historical-catalog.repository";
import { collectHistoricalEvidence, publishWithHistoricalEvidence } from "../modules/content/infrastructure/historical-evidence";
import { extractScriptText } from "../modules/content/application/script-document";
import { writeAudit } from "../core/audit";

const note = "Dữ liệu demo landing, bổ sung tự động theo yêu cầu chủ workspace. Đối chiếu nguồn trực tuyến; không phải xác nhận duyệt biên tập của con người. MP3 là audio mẫu, chưa phải bản đọc kịch bản này.";
const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  const existing = await prisma.series.findMany({
    where: { slug: { in: VIETNAM_PODCAST_SEED.map(item => item.slug) } },
    include: { episodes: { include: { narrations: { include: { audioAsset: true } }, attachments: true, entityTags: true } }, sources: { include: { source: true, sourceRevision: true } }, primaryHistoricalEvent: { include: { revisions: true, citations: true } } },
  });
  if (existing.length !== 4) throw new Error("Cần đủ bốn series seed trước khi xuất bản.");
  for (const entry of VIETNAM_PODCAST_SEED) {
    const series = existing.find(item => item.slug === entry.slug)!;
    if (series.deletedAt || series.adminLockedAt) throw new Error(`Series đã xóa hoặc khóa: ${entry.slug}`);
    for (const item of entry.episodes) {
      const episode = series.episodes.find(row => row.slug === item.slug);
      const audio = episode?.narrations.find(row => row.narrationType === "THIRD_PERSON")?.audioAsset;
      if (!episode || episode.deletedAt || episode.adminLockedAt || audio?.status !== "READY" || audio.deletedAt) throw new Error(`Tập thiếu hoặc audio chưa sẵn sàng: ${item.slug}`);
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "check", series: 4, episodes: 9, existingPublished: existing.filter(item => item.status === "PUBLISHED").length }));
  if (!apply) return;

  const backupDirectory = fileURLToPath(new URL("../../../../data-seed/backups/", import.meta.url));
  await mkdir(backupDirectory, { recursive: true });
  const backupPath = `${backupDirectory}/before-publish-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(backupPath, JSON.stringify(existing, (_key, value: unknown) => typeof value === "bigint" ? value.toString() : value, 2), { flag: "wx" });
  console.log(`Backup: ${backupPath}`);

  await prisma.$transaction(async tx => {
    let cursor = 0;
    for (const entry of VIETNAM_PODCAST_SEED) {
      const series = existing.find(item => item.slug === entry.slug)!;
      // A completed run is resumable without changing reviewed versions or evidence.
      if (series.status === "PUBLISHED" && entry.episodes.every(item => series.episodes.some(episode => episode.slug === item.slug && episode.status === "PUBLISHED"))) { cursor += entry.episodes.length; continue; }
      await tx.$queryRaw`SELECT id FROM series WHERE id=${series.id}::uuid FOR UPDATE`;
      const evidenceRows: { eventId: string; phaseId: string; revisionId: string; sourceId: string; sourceRevisionId: string; citationId: string; summary: string; locator: string; start: number; end: number }[] = [];
      for (const item of entry.episodes) {
        const metadata = VIETNAM_PUBLICATION_DATA[cursor++]!;
        const episode = series.episodes.find(row => row.slug === item.slug)!;
        await tx.$queryRaw`SELECT id FROM episodes WHERE id=${episode.id}::uuid FOR UPDATE`;
        let period = await tx.historicalPeriod.findFirst({ where: { name: metadata.period, deletedAt: null, isActive: true } });
        if (!period) {
          if (metadata.period !== "Thời cổ đại") throw new Error(`Không tìm thấy thời kỳ ${metadata.period}`);
          period = await tx.historicalPeriod.create({ data: { name: metadata.period, slug: "landing-demo-thoi-co-dai", startYear: -700, endYear: -110, sortOrder: 1, summary: "Dữ liệu demo về đời sống cư dân Việt cổ và văn hóa Đông Sơn.", time: jsonSnapshot(HistoricalTimeSchema.parse({ kind: "RANGE", start: { year: -700, precision: "YEAR", approximate: true }, end: { year: -111, precision: "YEAR", approximate: true }, endState: "KNOWN", note: "Khoảng thời gian minh họa, các mốc niên đại cổ đại có tính ước định." })), createdById: series.ownerId } });
        }
        const phase = await tx.historicalPhase.upsert({ where: { slug: `landing-demo-phase-${item.slug}` }, update: {}, create: { periodId: period.id, name: metadata.phase, slug: `landing-demo-phase-${item.slug}`, startYear: metadata.phaseStart, endYear: metadata.phaseEnd, isActive: true, createdById: series.ownerId, summary: metadata.summary, time: jsonSnapshot(HistoricalTimeSchema.parse({ kind: "RANGE", start: { year: metadata.phaseStart, precision: "YEAR" }, end: { year: metadata.phaseEnd - 1, precision: "YEAR" }, endState: "KNOWN" })) } });
        const approximate = "approximate" in metadata && metadata.approximate;
        const time = HistoricalTimeSchema.parse(metadata.start === metadata.end ? { kind: "POINT", at: { year: metadata.start, precision: "YEAR" } } : { kind: "RANGE", start: { year: metadata.start, precision: "YEAR", approximate }, end: { year: metadata.end, precision: "YEAR", approximate }, endState: "KNOWN", ...(approximate ? { note: "Niên đại quy ước để hiển thị dữ liệu demo; các giai đoạn văn hóa cổ đại có tính ước định." } : {}) });
        let source = await tx.source.findFirst({ where: { url: metadata.url, archivedAt: null } });
        if (!source) source = await tx.source.create({ data: { title: metadata.source, url: metadata.url, publisher: metadata.url.includes("dangcongsan.vn") ? "Tư liệu - Văn kiện Đảng" : "Bảo tàng Lịch sử Quốc gia", tier: "TIER_3_KHOA_HOC", version: 1, verificationStatus: "VERIFIED", verifiedVersion: 1, verifiedAt: new Date(), verificationNote: note, createdById: series.ownerId } });
        if (source.verificationStatus !== "VERIFIED" || source.verifiedVersion !== source.version) throw new Error(`Nguồn hiện hữu chưa xác minh đúng phiên bản: ${source.title}`);
        const sourceRevision = await tx.sourceRevision.upsert({ where: { sourceId_version: { sourceId: source.id, version: source.version } }, update: {}, create: { sourceId: source.id, version: source.version, snapshot: jsonSnapshot(source), createdById: series.ownerId } });

        // Retain the event already selected by the user for the ancient series.
        let event = item.slug === "van-hoa-dong-son" && series.primaryHistoricalEvent ? await tx.historicalEntity.findUnique({ where: { id: series.primaryHistoricalEvent.id } }) : await tx.historicalEntity.findUnique({ where: { slug: `landing-demo-${item.slug}` } });
        if (event?.deletedAt) throw new Error(`Sự kiện nằm trong thùng rác: ${event.name}`);
        if (!event) event = await tx.historicalEntity.create({ data: { name: metadata.event, slug: `landing-demo-${item.slug}`, entityType: "EVENT", historicalPhaseId: phase.id, summary: metadata.summary, time: jsonSnapshot(time), startYear: metadata.start, endYear: metadata.end + 1, createdById: series.ownerId } });
        const reviewed = await tx.historicalEntity.update({ where: { id: event.id }, data: { historicalPhaseId: phase.id, time: jsonSnapshot(time), startYear: metadata.start, endYear: metadata.end + 1, summary: event.summary?.trim() || metadata.summary, version: { increment: 1 }, reviewStatus: "APPROVED", reviewedVersion: event.version + 1, reviewedAt: new Date(), reviewNote: note } });
        let citation = await tx.historicalCitation.findFirst({ where: { entityId: event.id, sourceId: source.id, sourceRevisionId: sourceRevision.id } });
        const locator = `Bài trực tuyến: ${metadata.source}`;
        if (!citation) citation = await tx.historicalCitation.create({ data: { entityId: event.id, sourceId: source.id, sourceRevisionId: sourceRevision.id, locator, note, createdById: series.ownerId } });
        const withCitations = await tx.historicalEntity.findUniqueOrThrow({ where: { id: event.id }, include: { citations: { include: { sourceRevision: true } } } });
        const revision = await tx.historicalEntityRevision.create({ data: { entityId: event.id, version: reviewed.version, snapshot: jsonSnapshot(withCitations), createdById: series.ownerId } });
        evidenceRows.push({ eventId: event.id, phaseId: phase.id, revisionId: revision.id, sourceId: source.id, sourceRevisionId: sourceRevision.id, citationId: citation.id, summary: metadata.summary, locator: citation.locator, start: metadata.start, end: metadata.end });

        const narration = await tx.episodeNarration.findUniqueOrThrow({ where: { episodeId_narrationType: { episodeId: episode.id, narrationType: "THIRD_PERSON" } } });
        if (!narration.scriptContent?.trim()) {
          const document = EditorDocumentSchema.safeParse(narration.scriptDocument);
          const content = (document.success ? extractScriptText(document.data) : "") || metadata.script;
          const nextDocument = document.success && extractScriptText(document.data) ? document.data : EditorDocumentSchema.parse({ type: "doc", content: content.split(/\n\s*\n/).map(text => ({ type: "paragraph", content: [{ type: "text", text }] })) });
          await tx.episodeNarration.update({ where: { id: narration.id }, data: { scriptContent: content, scriptDocument: jsonSnapshot(nextDocument), scriptUpdatedAt: new Date() } });
        }
        if (!episode.description?.trim() || episode.description.startsWith("Podcast về ")) await tx.episode.update({ where: { id: episode.id }, data: { description: `${metadata.summary}\n\nBản nghe demo dùng MP3 mẫu để xem và thử giao diện.`, contentRevision: { increment: 1 } } });
        await tx.episodeEntityTag.upsert({ where: { episodeId_entityId: { episodeId: episode.id, entityId: event.id } }, update: {}, create: { episodeId: episode.id, entityId: event.id, status: "CONFIRMED", origin: "MODERATOR", confirmedAt: new Date() } });
      }
      const primary = evidenceRows[0]!;
      for (const [index, row] of evidenceRows.entries()) await tx.seriesSource.upsert({ where: { seriesId_sourceId_locator: { seriesId: series.id, sourceId: row.sourceId, locator: row.locator } }, update: {}, create: { seriesId: series.id, sourceId: row.sourceId, sourceRevisionId: row.sourceRevisionId, historicalCitationId: row.eventId === primary.eventId ? row.citationId : null, locator: row.locator, sortOrder: index + 1 } });
      await tx.series.update({ where: { id: series.id }, data: { primaryHistoricalEventId: primary.eventId, historicalEntityRevisionId: primary.revisionId, historicalPhaseId: primary.phaseId, startYear: Math.min(...evidenceRows.map(row => row.start)), endYear: Math.max(...evidenceRows.map(row => row.end)), ...(!series.description?.trim() || series.description.startsWith("Các tập podcast trong series ") ? { description: `${entry.title}: ${evidenceRows.map(row => row.summary).join(" ")}\n\nBộ dữ liệu demo landing; audio dùng tệp MP3 mẫu.` } : {}) } });
      await collectHistoricalEvidence(tx, series.id);
      await writeAudit(tx, { actorId: null, actorType: "SYSTEM", action: "series.demo_publication_prepared", resourceType: "series", resourceId: series.id, changes: { note, episodes: entry.episodes.length }, ipAddress: null });
    }
  }, { timeout: 60000 });

  for (const entry of VIETNAM_PODCAST_SEED) {
    for (const item of entry.episodes) {
      const episode = await prisma.episode.findUniqueOrThrow({ where: { slug: item.slug } });
      if (episode.status !== "PUBLISHED") await publishWithHistoricalEvidence(null, episode.id, episode.updatedAt, "episode");
    }
    const series = await prisma.series.findUniqueOrThrow({ where: { slug: entry.slug } });
    if (series.status !== "PUBLISHED") await publishWithHistoricalEvidence(null, series.id, series.updatedAt, "series");
    console.log(`Published: ${entry.title}`);
  }
  console.log(JSON.stringify({ publishedSeries: 4, publishedEpisodes: 9 }));
}

try { await main(); }
catch (error) { console.error(error instanceof Error ? error.message : "Không hoàn tất xuất bản demo."); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
