import { useState, type ReactElement } from "react";
import type { EpisodeWorkspaceDto } from "@repo/shared";
import { ArrowLeft, ArrowRight, Pencil, Save } from "lucide-react";
import { CreationPage } from "@/features/moderator/components/CreationPage";
import {
  primaryAction,
  secondaryAction,
} from "@/features/moderator/components/ModeratorTable";
import { useHistoricalEvent } from "@/features/historical-library/hooks/useHistoricalCatalog";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notifications";
import { PodcastInformationStep } from "./components/PodcastInformationStep";
import { PodcastScriptStep } from "./components/PodcastScriptStep";
import { PodcastVoiceStep } from "./components/PodcastVoiceStep";
import { PodcastReviewStep } from "./components/PodcastReviewStep";
import { PodcastWizardStepper } from "./components/PodcastWizardStepper";
import { usePodcastCreationWizard } from "./hooks/usePodcastCreationWizard";
import {
  usePodcastEpisode,
  usePodcastSeries,
  usePodcastSeriesDetail,
} from "./hooks/usePodcastProduction";
import { podcastWizardStateFromEpisode, type PodcastWizardStep } from "./podcastWizardState";
import { podcastProductionService as api } from "./services/podcastProductionService";

interface PodcastCreationProps {
  onBack: () => void;
  onSaved: (seriesId: string) => void;
  episodeId?: string;
}

const stepOrder: PodcastWizardStep[] = [
  "information",
  "script",
  "voice",
  "review",
];

export function PodcastCreation({ onBack, onSaved, episodeId }: PodcastCreationProps): ReactElement {
  const episode = usePodcastEpisode(episodeId ?? "");
  const existingSeries = usePodcastSeriesDetail(episode.data?.seriesId ?? "");
  if (episodeId && (episode.error || existingSeries.error || !episode.data)) {
    if (!episode.error && episode.isPending) {
      return <CreationPage title="Chi tiết podcast" onBack={onBack}><p className="text-sm text-mod-text-secondary">Đang tải tập podcast…</p></CreationPage>;
    }
    return <CreationPage title="Chi tiết podcast" onBack={onBack}><p role="alert" className="text-sm text-mod-danger">{episode.error?.message ?? existingSeries.error?.message ?? "Không tải được tập podcast."}</p></CreationPage>;
  }
  if (episodeId && existingSeries.isPending) {
    return <CreationPage title="Chi tiết podcast" onBack={onBack}><p className="text-sm text-mod-text-secondary">Đang tải series của tập…</p></CreationPage>;
  }
  return <PodcastWizardPage
    key={episodeId ?? "new"}
    onBack={onBack}
    onSaved={onSaved}
    existingEpisode={episodeId ? episode.data : undefined}
    historicalEventId={existingSeries.data?.primaryHistoricalEventId ?? ""}
  />;
}

function PodcastWizardPage({
  onBack,
  onSaved,
  existingEpisode,
  historicalEventId,
}: Pick<PodcastCreationProps, "onBack" | "onSaved"> & {
  existingEpisode?: EpisodeWorkspaceDto;
  historicalEventId: string;
}): ReactElement {
  const wizard = usePodcastCreationWizard(
    existingEpisode ? () => podcastWizardStateFromEpisode(existingEpisode, historicalEventId) : undefined,
  );
  const series = usePodcastSeries();
  const selected = usePodcastSeriesDetail(wizard.state.seriesId);
  const event = useHistoricalEvent(wizard.state.historicalEventId);
  const [editing, setEditing] = useState(!existingEpisode);
  const [busy, setBusy] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [error, setError] = useState("");
  const currentIndex = stepOrder.indexOf(wizard.state.activeStep);

  const handleSelectSeries = async (seriesId: string): Promise<void> => {
    wizard.dispatch({
      type: "updateInformation",
      value: { seriesId, historicalEventId: "" },
    });
    if (!seriesId) return;
    try {
      const detail = await api.detail(seriesId);
      wizard.dispatch({
        type: "updateInformation",
        value: { historicalEventId: detail.primaryHistoricalEventId ?? "" },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được thông tin series.");
    }
  };

  const saveDraft = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await wizard.saveInformation();
      if (wizard.state.scriptDirty) {
        await wizard.saveScript(wizard.state.scriptDocument);
      }
      notify.success({ title: existingEpisode ? "Đã lưu thay đổi." : "Đã lưu bản nháp." });
      if (existingEpisode) setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được bản nháp.");
    } finally {
      setBusy(false);
    }
  };

  const move = (offset: number): void => {
    const next = stepOrder[currentIndex + offset];
    if (next) wizard.selectStep(next);
  };

  const queryError = series.error ?? selected.error ?? event.error;
  return (
    <CreationPage
      title={existingEpisode ? "Chi tiết podcast" : "Tạo podcast"}
      onBack={onBack}
      description={existingEpisode ? "Xem lại bốn bước sản xuất của tập podcast." : undefined}
    >
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-mod-border bg-mod-surface shadow-sm">
        {existingEpisode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mod-border px-4 py-4 sm:px-6">
            <div>
              <p className="font-semibold text-mod-text">{wizard.state.title}</p>
              <p className="mt-1 text-xs text-mod-text-secondary">{editing ? "Đang chỉnh sửa tập podcast" : "Chế độ xem · chọn Chỉnh sửa để thay đổi nội dung"}</p>
            </div>
            {!editing ? (
              <Button type="button" className={primaryAction} onClick={() => setEditing(true)}>
                <Pencil size={16} aria-hidden="true" /> Chỉnh sửa
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="border-b border-mod-border px-4 py-5 sm:px-6">
          <PodcastWizardStepper
            activeStep={wizard.state.activeStep}
            completion={wizard.completion}
            onSelect={(step) => { if (!posterBusy) wizard.selectStep(step); }}
          />
        </div>

        <div className="min-h-[420px] min-w-0 max-w-full px-4 py-6 sm:px-6">
          <div hidden={wizard.state.activeStep !== "information"}>
            <PodcastInformationStep
              state={wizard.state}
              readOnly={!editing}
              seriesName={selected.data?.title ?? existingEpisode?.seriesTitle ?? ""}
              seriesOptions={
                series.data?.pages.flatMap((page) =>
                  page.items.map((item) => ({ value: item.id, label: item.title })),
                ) ?? []
              }
              eventName={event.data?.name ?? ""}
              busy={busy || posterBusy}
              onPosterChange={(value) => wizard.dispatch({ type: "setPoster", value })}
              onPosterBusyChange={setPosterBusy}
              hasMoreSeries={Boolean(series.hasNextPage)}
              error={error || queryError?.message}
              onLoadMore={() => {
                void series.fetchNextPage();
              }}
              onSelectSeries={(seriesId) => {
                void handleSelectSeries(seriesId);
              }}
              onChange={(value) =>
                wizard.dispatch({ type: "updateInformation", value })
              }
            />
          </div>
          <div hidden={wizard.state.activeStep !== "script"}>
            <PodcastScriptStep
              wizard={wizard}
              sources={selected.data?.sources ?? []}
              readOnly={!editing}
            />
          </div>
          <div hidden={wizard.state.activeStep !== "voice"}>
            <PodcastVoiceStep wizard={wizard} readOnly={!editing} published={existingEpisode?.status === "PUBLISHED"} />
          </div>
          <div hidden={wizard.state.activeStep !== "review"}>
            <PodcastReviewStep
              wizard={wizard}
              series={selected.data}
              eventName={event.data?.name ?? ""}
              onPublished={onSaved}
              readOnly={!editing}
              existingStatus={existingEpisode?.status}
            />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-mod-border px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className={secondaryAction}
            disabled={currentIndex === 0 || posterBusy}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Bước trước
          </Button>
          <div className="flex flex-wrap justify-end gap-3">
            {editing && wizard.state.activeStep !== "review" ? (
              <Button
                type="button"
                variant="outline"
                className={secondaryAction}
                disabled={busy || posterBusy}
                onClick={() => {
                  void saveDraft();
                }}
              >
                <Save size={17} aria-hidden="true" />
                {busy ? "Đang lưu…" : existingEpisode ? "Lưu thay đổi" : "Lưu bản nháp"}
              </Button>
            ) : null}
            {currentIndex < stepOrder.length - 1 ? (
              <Button
                type="button"
                className={primaryAction}
                onClick={() => move(1)}
                disabled={busy || posterBusy}
              >
                Bước tiếp theo
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </footer>
      </div>
    </CreationPage>
  );
}
