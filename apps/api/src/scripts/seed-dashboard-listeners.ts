import { createHash } from "node:crypto";
import { Prisma, prisma } from "@repo/db";
import { getSystemConfig } from "../core/config/system-config";
import { mergeSessionBitmap } from "../modules/listening/application/listening-session-policy";

// Explicit local sample accounts; no credentials, login sessions, Premium or XP are generated.
function seedId(key: string): string {
  const value = createHash("sha256").update(`dashboard-listener-cohort-v1:${key}`).digest("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20, 32)}`;
}

async function main(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Chỉ được tạo mẫu trên database local.");
  const now = new Date();
  const today = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  const day = new Date(`${today}T00:00:00Z`);
  const previousMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const currentMonth = today.slice(0, 7);
  const users = Array.from({ length: 35 }, (_, index) => {
    const suffix = String(index + 1).padStart(2, "0");
    return { id: `dashboard-listener-${suffix}`, name: `Người nghe mẫu ${suffix}`, email: `dashboard-listener-${suffix}@seed.example.invalid`, role: "user", emailVerified: false, createdAt: new Date(`${previousMonth}-01T00:00:00+07:00`) };
  });
  const existingUsers = await prisma.user.findMany({ where: { id: { in: users.map((user) => user.id) } }, select: { id: true, email: true, role: true } });
  if (existingUsers.some((user) => user.role !== "user" || !users.some((sample) => sample.id === user.id && sample.email === user.email))) throw new Error("ID tài khoản mẫu đã được sử dụng cho tài khoản khác.");
  const available = await prisma.episodeNarration.findMany({
    where: { episode: { deletedAt: null, status: "PUBLISHED", series: { deletedAt: null, status: "PUBLISHED" } }, audioAsset: { kind: "AUDIO", status: "READY", deletedAt: null, durationMs: { gt: 0 } } },
    select: { id: true, episodeId: true, audioAssetId: true, audioAsset: { select: { durationMs: true } } }, orderBy: [{ episodeId: "asc" }, { id: "asc" }],
  });
  const tracks = available.filter((track, index) => available.findIndex((other) => other.episodeId === track.episodeId) === index).slice(0, 8);
  if (tracks.length < 5) throw new Error("Cần ít nhất 5 tập có audio để phân bổ dữ liệu mẫu.");
  const completionRatio = await getSystemConfig("listening.completion_ratio");
  const sessions: Prisma.ListeningSessionCreateManyInput[] = [];
  const progress = new Map<string, Prisma.ListeningProgressCreateManyInput>();
  const plans: Array<{ month: string; existing: number; insert: number }> = [];
  for (const [month, target, trackOffset] of [[previousMonth, 50, 0], [currentMonth, 45, 4]] as const) {
    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(`${month}-01T00:00:00+07:00`);
    const end = new Date(Date.UTC(year!, monthNumber!, 1) - 7 * 3_600_000);
    const existing = await prisma.listeningSession.count({ where: { startedAt: { gte: start, lt: end, lte: now }, qualifiedAt: { not: null, lte: now }, playedMs: { gt: 0 } } });
    const count = Math.max(0, target - existing);
    plans.push({ month, existing, insert: count });
    const numberOfDays = month === currentMonth ? day.getUTCDate() : new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
    const weights = Array.from({ length: numberOfDays }, (_, index) => [1.6, 1, .6, 1.4, .8, .4, 1.2][new Date(`${month}-${String(index + 1).padStart(2, "0")}T00:00:00Z`).getUTCDay()] ?? 1);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < count; index++) {
      const user = users[index % users.length]!;
      const track = tracks[(index + trackOffset) % tracks.length]!;
      if (!track.audioAssetId || !track.audioAsset?.durationMs) continue;
      let weight = (index + .5) / count * totalWeight;
      let selectedDay = 0;
      while (selectedDay < numberOfDays - 1 && weight > weights[selectedDay]!) weight -= weights[selectedDay++]!;
      const startedAt = new Date(`${month}-${String(selectedDay + 1).padStart(2, "0")}T${String(8 + index % 10).padStart(2, "0")}:15:00+07:00`);
      const durationMs = track.audioAsset.durationMs;
      const ratio = index % 4 === 0 ? Math.min(.65, completionRatio * .9) : 1;
      const targetMs = Math.max(Math.min(30_000, Math.ceil(durationMs * .8)), Math.floor(durationMs * ratio));
      const bitmap = new Uint8Array(Math.ceil(Math.ceil(durationMs / 1000) / 8));
      for (let second = 0; second < Math.ceil(targetMs / 1000); second++) bitmap[Math.floor(second / 8)]! |= 1 << (second % 8);
      const accepted = mergeSessionBitmap(new Uint8Array(bitmap.length), bitmap, durationMs, durationMs);
      const updatedAt = new Date(startedAt.getTime() + accepted.playedMs);
      if (updatedAt > now) throw new Error("Chưa đủ thời gian trong ngày để tạo mẫu; chạy lại vào cuối ngày.");
      sessions.push({ id: seedId(`${month}:${existing + index}`), userId: user.id, narrationId: track.id, episodeId: track.episodeId, audioAssetId: track.audioAssetId, durationMs, startedAt, updatedAt, playedMs: accepted.playedMs, playedBitmap: new Uint8Array(accepted.bitmap), qualifiedAt: new Date(startedAt.getTime() + Math.min(30_000, Math.ceil(durationMs * .8))) });
      const key = `${user.id}:${track.id}`;
      const previous = progress.get(key);
      progress.set(key, { userId: user.id, narrationId: track.id, episodeId: track.episodeId, audioAssetId: track.audioAssetId, positionMs: Math.max(previous?.positionMs ?? 0, accepted.playedMs), playedSeconds: Math.max(previous?.playedSeconds ?? 0, Math.floor(accepted.playedMs / 1000)), playedBitmap: new Uint8Array(previous && (previous.playedSeconds ?? 0) > Math.floor(accepted.playedMs / 1000) ? previous.playedBitmap : accepted.bitmap), completedAt: previous?.completedAt ?? (accepted.playedMs >= durationMs * completionRatio ? updatedAt : null), lastListenedAt: updatedAt });
    }
  }
  console.info(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "dry-run", sampleAccounts: users.length, plans }));
  if (!process.argv.includes("--apply")) return;
  console.info(JSON.stringify(await prisma.$transaction(async (tx) => ({
    accounts: (await tx.user.createMany({ data: users, skipDuplicates: true })).count,
    sessions: (await tx.listeningSession.createMany({ data: sessions, skipDuplicates: true })).count,
    progress: (await tx.listeningProgress.createMany({ data: [...progress.values()], skipDuplicates: true })).count,
  }))));
}

try { await main(); } finally { await prisma.$disconnect(); }
