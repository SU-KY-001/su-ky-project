import { createHash } from "node:crypto";
import { Prisma, prisma } from "@repo/db";
import { getSystemConfig } from "../core/config/system-config";
import { mergeSessionBitmap } from "../modules/listening/application/listening-session-policy";

// Local demonstration records, persisted for the real report API. Never represents observed listening.
const DAY = 86_400_000;
function sessionId(userId: string, day: string): string {
  const hash = createHash("sha256").update(`admin-dashboard-listening-v1:${userId}:${day}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function main(): Promise<void> {
  const database = new URL(process.env.DATABASE_URL ?? "");
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) throw new Error("Seed chỉ được chạy trên database local, ngoài production.");
  const userId = process.argv.find((arg) => arg.startsWith("--admin-id="))?.slice("--admin-id=".length);
  if (!userId) throw new Error("Truyền --admin-id=<ID tài khoản Admin>.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, role: true } });
  if (user.role !== "admin") throw new Error("Tài khoản được chọn không phải Admin.");
  const now = new Date();
  const today = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  const start = Date.parse(`${today}T00:00:00Z`) - 55 * DAY;
  const available = await prisma.episodeNarration.findMany({
    where: { episode: { deletedAt: null, status: "PUBLISHED", series: { deletedAt: null, status: "PUBLISHED" } }, audioAsset: { kind: "AUDIO", status: "READY", deletedAt: null, durationMs: { gt: 0 } } },
    select: { id: true, episodeId: true, audioAssetId: true, audioAsset: { select: { durationMs: true } } }, orderBy: [{ episodeId: "asc" }, { id: "asc" }],
  });
  const tracks = available.filter((track, index) => available.findIndex((other) => other.episodeId === track.episodeId) === index).slice(0, 8);
  if (!tracks.length) throw new Error("Cần có tập công khai với audio READY trước khi tạo dữ liệu nghe.");
  const completionDays = [5, 13, 23, 31, 39, 47, 54, 55];
  const completionRatio = await getSystemConfig("listening.completion_ratio");
  const rows: Prisma.ListeningSessionCreateManyInput[] = [];
  const progress = new Map<string, Prisma.ListeningProgressCreateManyInput>();
  for (let index = 0; index < 56; index++) {
    const utcDay = new Date(start + index * DAY);
    const date = utcDay.toISOString().slice(0, 10);
    const completionTrack = completionDays.slice(0, tracks.length).indexOf(index);
    if (![1, 2, 4, 6].includes(utcDay.getUTCDay()) && completionTrack < 0) continue;
    const absoluteDay = Math.floor(utcDay.getTime() / DAY);
    const track = tracks[completionTrack >= 0 ? completionTrack : absoluteDay % tracks.length];
    if (!track?.audioAssetId || !track.audioAsset?.durationMs) continue;
    const durationMs = track.audioAsset.durationMs;
    const fraction = completionTrack >= 0 ? 1 : [0.12, 0.42, 0.68, Math.min(0.85, completionRatio * 0.95)][absoluteDay % 4] ?? 0.42;
    const bitmap = new Uint8Array(Math.ceil(Math.ceil(durationMs / 1000) / 8));
    const seconds = fraction === 1 ? Math.ceil(durationMs / 1000) : Math.floor(durationMs * fraction / 1000);
    for (let second = 0; second < seconds; second++) bitmap[Math.floor(second / 8)]! |= 1 << (second % 8);
    const accepted = mergeSessionBitmap(new Uint8Array(bitmap.length), bitmap, durationMs, durationMs);
    const startedAt = new Date(`${date}T${["08", "12", "19"][absoluteDay % 3]}:20:00+07:00`);
    const updatedAt = new Date(startedAt.getTime() + accepted.playedMs);
    if (updatedAt > now) continue;
    const qualifiedAt = accepted.qualified ? new Date(startedAt.getTime() + Math.min(30_000, Math.ceil(durationMs * .8))) : null;
    rows.push({ id: sessionId(userId, date), userId, narrationId: track.id, episodeId: track.episodeId, audioAssetId: track.audioAssetId, durationMs, startedAt, updatedAt, playedMs: accepted.playedMs, playedBitmap: new Uint8Array(accepted.bitmap), qualifiedAt });
    const previous = progress.get(track.id);
    const complete = accepted.playedMs >= durationMs * completionRatio;
    progress.set(track.id, {
      userId, narrationId: track.id, episodeId: track.episodeId, audioAssetId: track.audioAssetId,
      positionMs: Math.max(previous?.positionMs ?? 0, accepted.playedMs),
      playedSeconds: Math.max(previous?.playedSeconds ?? 0, Math.floor(accepted.playedMs / 1000)),
      playedBitmap: new Uint8Array(previous && (previous.playedSeconds ?? 0) > Math.floor(accepted.playedMs / 1000) ? previous.playedBitmap : accepted.bitmap),
      completedAt: previous?.completedAt ?? (complete ? updatedAt : null), lastListenedAt: updatedAt,
    });
  }
  const existing = await prisma.listeningSession.count({ where: { id: { in: rows.map((row) => row.id) } } });
  console.info(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "dry-run", account: user.name, from: new Date(start).toISOString().slice(0, 10), to: today, plannedSessions: rows.length, existingSessions: existing, episodes: tracks.length }));
  if (!process.argv.includes("--apply")) return;
  const result = await prisma.$transaction(async (tx) => {
    const sessions = await tx.listeningSession.createMany({ data: rows, skipDuplicates: true });
    const histories = await tx.listeningProgress.createMany({ data: [...progress.values()], skipDuplicates: true });
    return { insertedSessions: sessions.count, insertedProgress: histories.count };
  });
  console.info(JSON.stringify(result));
}

try { await main(); } finally { await prisma.$disconnect(); }
