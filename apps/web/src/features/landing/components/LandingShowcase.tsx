import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { continueListening, newest, topLiked, topMonth, topWeek, upcomingPodcasts } from "../showcaseData";
import { ContentRow } from "./ContentRow";
import { PodcastCard } from "./PodcastCard";

export function LandingShowcase() {
  const session = useCurrentUser();
  // Progress is tracked for signed-in users only; guests never see this row.
  const showContinue = Boolean(session.data) && continueListening.length > 0;

  return (
    <div className="py-6">
      {showContinue ? (
        <ContentRow id="continue" title="Nghe tiếp">
          {continueListening.map(({ podcast, episodeTitle, progress }) => (
            <PodcastCard key={podcast.id} item={podcast} orientation="landscape" progress={progress} caption={episodeTitle} />
          ))}
        </ContentRow>
      ) : null}
      <ContentRow id="top-week" title="Top lượt nghe tuần">
        {topWeek.map((item) => <PodcastCard key={item.id} item={item} caption={`${item.weeklyListens.toLocaleString("vi-VN")} lượt nghe`} />)}
      </ContentRow>
      <ContentRow id="top-month" title="Top lượt nghe tháng">
        {topMonth.map((item) => <PodcastCard key={item.id} item={item} caption={`${item.monthlyListens.toLocaleString("vi-VN")} lượt nghe`} />)}
      </ContentRow>
      <ContentRow id="new" title="Podcast mới lên">
        {newest.map((item) => <PodcastCard key={item.id} item={item} orientation="landscape" />)}
      </ContentRow>
      <ContentRow id="top-liked" title="Top được yêu thích">
        {topLiked.map((item) => <PodcastCard key={item.id} item={item} caption={`${item.likes.toLocaleString("vi-VN")} yêu thích`} />)}
      </ContentRow>
      <ContentRow id="upcoming" title="Sắp phát hành">
        {upcomingPodcasts.map((item) => <PodcastCard key={item.id} item={item} orientation="landscape" caption={`Ra mắt ${new Date(item.releaseDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`} />)}
      </ContentRow>
    </div>
  );
}
