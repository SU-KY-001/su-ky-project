import type {
  EpisodeAiSummary,
  EpisodeReadiness,
  ReadinessItem,
} from "@repo/shared";
import type { EpisodeWorkspaceEntity } from "../domain/content.entity";

export interface MappedNarration {
  id: string;
  type: "THIRD_PERSON" | "FIRST_PERSON";
  scriptContent: string | null;
  wordCount: number;
  estimatedDurationMs: number;
  audioAnalysis: {
    formatStatus: "PASS" | "WARNING" | "UNKNOWN";
    durationStatus: "PASS" | "WARNING" | "UNKNOWN";
    noiseStatus: "PASS" | "WARNING" | "UNKNOWN";
    noiseLevelDb: number | null;
  } | null;
  audio: { durationMs: number | null } | null;
  warnings: Array<{
    key: "SCRIPT_CHANGED_AFTER_AUDIO" | "DURATION_MISMATCH";
    ratio?: number;
  }>;
}

export interface ReadinessConfig {
  minScriptWords: number;
}

export interface ReadinessAiInput {
  enabled: boolean;
  summary: EpisodeAiSummary | null;
}

export const DEFAULT_MIN_SCRIPT_WORDS = 150;
const PERCENT = 100;

const level = (
  key: ReadinessItem["key"],
  levelValue: ReadinessItem["level"],
  state: ReadinessItem["state"],
  extra: Pick<ReadinessItem, "narration" | "params"> = {},
): ReadinessItem => ({ key, level: levelValue, state, ...extra });

function requiredChecklist(episode: EpisodeWorkspaceEntity): ReadinessItem[] {
  const third = (episode.narrations ?? []).find(
    (item) => item.narrationType === "THIRD_PERSON",
  );
  return [
    level("BASIC_INFO", "REQUIRED", episode.title.trim() ? "OK" : "MISSING"),
    level(
      "THIRD_PERSON_SCRIPT",
      "REQUIRED",
      third?.scriptContent?.trim() ? "OK" : "MISSING",
    ),
    level(
      "THIRD_PERSON_AUDIO",
      "REQUIRED",
      third?.audioAsset?.status === "READY" ? "OK" : "MISSING",
    ),
  ];
}

/**
 * One source of truth for episode readiness. The required rows are also used by the legacy publish checklist, while
 * the optional mapped narrations and AI input add advisory rows only when the caller already has that data.
 */
export function computeEpisodeReadiness(
  episode: EpisodeWorkspaceEntity,
  narrations: MappedNarration[] = [],
  config: ReadinessConfig = { minScriptWords: DEFAULT_MIN_SCRIPT_WORDS },
  ai: ReadinessAiInput = { enabled: false, summary: null },
  now: Date = new Date(),
): EpisodeReadiness {
  const items: ReadinessItem[] = requiredChecklist(episode);
  items.push(...audioAndScript(episode, narrations, config));
  items.push(...firstPerson(episode));
  items.push(...entityTags(episode));
  items.push(...episodeProfile(episode));
  if (ai.enabled) items.push(...aiRows(episode, ai.summary));
  return {
    ready: items.every(
      (item) => item.level !== "REQUIRED" || item.state === "OK",
    ),
    contentRevision: episode.contentRevision,
    computedAt: now,
    items,
  };
}

/** Compatibility shape for publish/readiness consumers that still need the old checklist payload. */
export function episodeChecklistFromReadiness(readiness: EpisodeReadiness) {
  const items = readiness.items
    .filter((item) => item.level === "REQUIRED")
    .map((item) => ({ key: item.key, ok: item.state === "OK" }));
  const warnings = readiness.items
    .filter((item) => item.level === "WARNING" && item.state === "WARN")
    .map((item) => ({ key: item.key, count: item.params?.count as number | undefined }));
  return { ready: readiness.ready, items, warnings };
}

function audioAndScript(
  episode: EpisodeWorkspaceEntity,
  narrations: MappedNarration[],
  config: ReadinessConfig,
): ReadinessItem[] {
  const rows: ReadinessItem[] = [];
  for (const narration of narrations) {
    const type = narration.type;
    const entity = (episode.narrations ?? []).find((item) => item.id === narration.id);
    const warn = (
      key: ReadinessItem["key"],
      params?: ReadinessItem["params"],
    ) => level(key, "WARNING", "WARN", { narration: type, params });
    if (
      narration.scriptContent?.trim() &&
      narration.wordCount < config.minScriptWords
    ) {
      rows.push(
        warn("SCRIPT_TOO_SHORT", {
          words: narration.wordCount,
          min: config.minScriptWords,
        }),
      );
    }
    if (!narration.audio || entity?.audioAsset?.status !== "READY") continue;
    if (
      narration.warnings.some(
        (item) => item.key === "SCRIPT_CHANGED_AFTER_AUDIO",
      )
    )
      rows.push(warn("SCRIPT_CHANGED_AFTER_AUDIO"));
    const mismatch = narration.warnings.find(
      (item) => item.key === "DURATION_MISMATCH",
    );
    if (mismatch && narration.audio.durationMs != null)
      rows.push(
        warn("DURATION_MISMATCH", {
          ratio: Math.round(Math.abs(1 - (mismatch.ratio ?? 1)) * PERCENT),
          audioMs: narration.audio.durationMs,
          estimatedMs: narration.estimatedDurationMs,
        }),
      );
    const analysis = narration.audioAnalysis;
    if (
      analysis &&
      (analysis.formatStatus === "WARNING" ||
        analysis.noiseStatus === "WARNING")
    )
      rows.push(
        warn("AUDIO_QUALITY", {
          format: analysis.formatStatus,
          noiseDb: analysis.noiseLevelDb ?? "",
        }),
      );
    if (
      !analysis ||
      [analysis.formatStatus, analysis.durationStatus, analysis.noiseStatus].includes(
        "UNKNOWN",
      )
    )
      rows.push(level("AUDIO_UNANALYZED", "INFO", "INFO", { narration: type }));
    if (narration.audio.durationMs === null)
      rows.push(level("AUDIO_DURATION_UNKNOWN", "INFO", "INFO", { narration: type }));
  }
  return rows;
}

function firstPerson(episode: EpisodeWorkspaceEntity): ReadinessItem[] {
  const rows: ReadinessItem[] = [];
  for (const narration of (episode.narrations ?? []).filter(
    (item) => item.narrationType === "FIRST_PERSON",
  )) {
    const missing = [
      ...(narration.narratorEntityId ? [] : ["NARRATOR"]),
      ...(narration.scriptContent?.trim() ? [] : ["SCRIPT"]),
      ...(narration.audioAsset?.status === "READY" ? [] : ["AUDIO"]),
    ];
    for (const part of missing)
      rows.push(
        level("FIRST_PERSON_INCOMPLETE", "WARNING", "WARN", {
          narration: "FIRST_PERSON",
          params: { missing: part },
        }),
      );
  }
  return rows;
}

function entityTags(episode: EpisodeWorkspaceEntity): ReadinessItem[] {
  const suggested = (episode.entityTags ?? []).filter(
    (tag) => tag.status === "SUGGESTED",
  ).length;
  const confirmed = (episode.entityTags ?? []).some(
    (tag) => tag.status === "CONFIRMED",
  );
  return [
    suggested
      ? level("ENTITY_TAGS_UNCONFIRMED", "WARNING", "WARN", {
          params: { count: suggested },
        })
      : level("ENTITY_TAGS_UNCONFIRMED", "WARNING", "OK"),
    confirmed
      ? level("ENTITY_TAGS_NONE", "INFO", "OK")
      : level("ENTITY_TAGS_NONE", "INFO", "INFO"),
  ];
}

function episodeProfile(episode: EpisodeWorkspaceEntity): ReadinessItem[] {
  const hasPoster = (episode.attachments ?? []).some(
    (item) =>
      item.mediaAsset.kind === "IMAGE" &&
      item.mediaAsset.status === "READY" &&
      !item.mediaAsset.deletedAt,
  );
  return [
    level(
      "SERIES_NOT_PUBLISHED",
      "WARNING",
      episode.series.status === "PUBLISHED" ? "OK" : "WARN",
    ),
    level(
      "EPISODE_DESCRIPTION",
      "INFO",
      episode.description?.trim() ? "OK" : "INFO",
    ),
    level("EPISODE_POSTER", "INFO", hasPoster ? "OK" : "INFO"),
    ...(episode.adminLockedAt
      ? [level("EPISODE_LOCKED", "INFO", "INFO")]
      : []),
  ];
}

function aiRows(
  episode: EpisodeWorkspaceEntity,
  summary: EpisodeAiSummary | null,
): ReadinessItem[] {
  if (!summary) return [level("AI_REVIEW_NOT_RUN", "INFO", "INFO")];
  const rows: ReadinessItem[] = [
    level(
      "AI_REVIEW_SUMMARY",
      summary.openHigh > 0 ? "WARNING" : "INFO",
      summary.openHigh > 0 ? "WARN" : "INFO",
      {
        params: {
          total: summary.total,
          reviewed: summary.reviewed,
          open: summary.open,
          openHigh: summary.openHigh,
          applied: summary.applied,
          failedBlocks: summary.failedBlocks,
        },
      },
    ),
  ];
  const scriptChangedAt = Math.max(
    0,
    ...(episode.narrations ?? []).map((item) => item.scriptUpdatedAt?.getTime() ?? 0),
  );
  if (summary.createdAt.getTime() < scriptChangedAt)
    rows.push(level("AI_REVIEW_STALE", "INFO", "INFO"));
  if (
    summary.status === "FAILED" ||
    summary.status === "CANCELLED" ||
    summary.failedBlocks > 0
  )
    rows.push(
      level("AI_REVIEW_INCOMPLETE", "INFO", "INFO", {
        params: { errorCode: summary.errorCode ?? summary.status },
      }),
    );
  return rows;
}
