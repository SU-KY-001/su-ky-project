import type { EpisodeWorkspaceDto, ReleaseScheduleRecord } from "@repo/shared";

export function releaseReviewFixture(): { schedule: ReleaseScheduleRecord; episode: EpisodeWorkspaceDto } {
  const timestamp = new Date("2026-10-16T05:00:00Z");
  const schedule: ReleaseScheduleRecord = {
    id: "00000000-0000-4000-8000-000000000001", title: "Nhiệm vụ Điện Biên Phủ",
    episodeId: "00000000-0000-4000-8000-000000000002", status: "SCHEDULED", version: 1,
    createdById: "admin-1", createdAt: timestamp, updatedAt: timestamp,
    productionDeadline: new Date("2026-10-19T05:00:00Z"), scheduledAt: new Date("2026-10-20T05:00:00Z"),
    publishedAt: null, cancelledAt: null, failureCode: null, failureMessage: null,
    assignments: [], episode: { id: "00000000-0000-4000-8000-000000000002", title: "Chiến dịch Điện Biên Phủ", status: "DRAFT", contentRevision: 3, updatedAt: timestamp },
    reviews: [{ id: "00000000-0000-4000-8000-000000000003", scheduleId: "00000000-0000-4000-8000-000000000001", episodeId: "00000000-0000-4000-8000-000000000002", revision: 3, status: "IN_REVIEW", submittedById: "mod-1", submittedAt: timestamp, reviewedAt: null, reviewedById: null, reviewNote: null }],
  };
  const episode: EpisodeWorkspaceDto = {
    id: schedule.episodeId!, seriesId: "00000000-0000-4000-8000-000000000004", seriesTitle: "Lịch sử Việt Nam",
    seriesStatus: "DRAFT", title: "Chiến dịch Điện Biên Phủ", slug: "dien-bien-phu", description: "Tư liệu chiến dịch năm 1954", sortOrder: 1,
    status: "DRAFT", isDeleted: false, lock: null, publishedAt: null, updatedAt: timestamp,
    narrations: [{ id: "00000000-0000-4000-8000-000000000005", type: "THIRD_PERSON", narrator: null,
      scriptContent: "Nội dung kịch bản cần kiểm duyệt. <script>không thực thi</script>", scriptDocument: null, audioAnalysis: null,
      wordCount: 9, estimatedDurationMs: 4000, updatedAt: timestamp, warnings: [],
      audio: { assetId: "00000000-0000-4000-8000-000000000006", durationMs: 4000, sizeBytes: 1024, format: "mp3", previewUrl: "https://example.org/recording.mp3", attachedAt: timestamp },
    }],
    attachments: [{ id: "00000000-0000-4000-8000-000000000007", fileName: "Tài liệu chiến dịch.pdf", createdAt: timestamp,
      asset: { assetId: "00000000-0000-4000-8000-000000000008", format: "pdf", sizeBytes: 1024, previewUrl: "https://example.org/document.pdf" } }],
    entityTags: [], publishChecklist: { ready: true, items: [], warnings: [] }, readiness: { ready: true, contentRevision: 3, computedAt: timestamp, items: [] },
  };
  return { schedule, episode };
}
