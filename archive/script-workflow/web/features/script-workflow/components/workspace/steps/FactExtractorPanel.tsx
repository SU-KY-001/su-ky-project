import { useState } from "react";
import { STEP_OUTPUT_SCHEMAS, type ResearchPack } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { TabList, TabPanel, type TabDefinition } from "../Tabs";
import { EntitiesTab, FactCardsTab, TimelineTab } from "./FactExtractorTabs";
import { BulletList, EmptyNote, ParsedOutput } from "./stepUi";

type FactTab = "facts" | "timeline" | "entities" | "gaps";

const TAB_ID_PREFIX = "fact-extractor";

function FactExtractorContent({ pack }: { pack: ResearchPack }) {
  const [tab, setTab] = useState<FactTab>("facts");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const tabs: readonly TabDefinition<FactTab>[] = [
    { id: "facts", label: "Thẻ sự kiện", count: pack.factCards.length },
    { id: "timeline", label: "Niên biểu", count: pack.chronologicalTimeline.length },
    { id: "entities", label: "Nhân vật", count: pack.keyEntities.length },
    { id: "gaps", label: "Khoảng trống", count: pack.identifiedResearchGaps.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <ModeratorText as="h2" className="text-lg font-extrabold text-mod-text">{pack.topic}</ModeratorText>
        <ModeratorText as="p" className="text-sm text-mod-text-secondary">Trọng tâm kể: {pack.selectedNarrativeFocus}</ModeratorText>
      </div>
      <div>
        <TabList
          label="Nội dung trích xuất"
          idPrefix={TAB_ID_PREFIX}
          tabs={tabs}
          value={tab}
          onChange={(next) => {
            setHighlightId(null);
            setTab(next);
          }}
        />
        <TabPanel idPrefix={TAB_ID_PREFIX} id="facts" value={tab}>
          <FactCardsTab pack={pack} highlightId={highlightId} />
        </TabPanel>
        <TabPanel idPrefix={TAB_ID_PREFIX} id="timeline" value={tab}>
          <TimelineTab
            pack={pack}
            onOpenCard={(id) => {
              setHighlightId(id);
              setTab("facts");
            }}
          />
        </TabPanel>
        <TabPanel idPrefix={TAB_ID_PREFIX} id="entities" value={tab}>
          <EntitiesTab pack={pack} />
        </TabPanel>
        <TabPanel idPrefix={TAB_ID_PREFIX} id="gaps" value={tab}>
          {pack.identifiedResearchGaps.length === 0 ? (
            <EmptyNote>AI không ghi nhận khoảng trống nghiên cứu nào.</EmptyNote>
          ) : (
            <BulletList items={pack.identifiedResearchGaps} />
          )}
        </TabPanel>
      </div>
    </div>
  );
}

/** Automatic step, read-only: fact cards, timeline, entities and research gaps. */
export function FactExtractorPanel({ output }: { output: unknown }) {
  return (
    <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.FACT_EXTRACTOR} output={output}>
      {(pack) => <FactExtractorContent pack={pack} />}
    </ParsedOutput>
  );
}
