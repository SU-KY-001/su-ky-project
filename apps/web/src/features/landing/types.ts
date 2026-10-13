export interface HeroSlide {
  id: string;
  period: string;
  year: string;
  title: string;
  subtitle: string;
  description: string;
  episodeCount: number;
  duration: string;
  perspectives: string;
  image: string;
  thumbnailImage: string;
  imageAlt: string;
}

export type TimelineStatus = "available" | "upcoming";

export interface TimelineEvent {
  id: string;
  period: string;
  year: string;
  title: string;
  summary: string;
  character: string;
  series: string;
  status: TimelineStatus;
}

export interface Episode {
  number: number;
  title: string;
  duration: string;
  perspectives: string;
}

export interface FeaturedSeries {
  id: string;
  title: string;
  period: string;
  summary: string;
  image: string;
  imageAlt: string;
  episodes: Episode[];
}

export interface DiscoveryCard {
  id: string;
  title: string;
  period: string;
  topic: string;
  character: string;
  description: string;
  image: string;
  imageAlt: string;
}

export interface Citation {
  id: string;
  title: string;
  author: string;
  episode: string;
  href: string;
}

export type CardOrientation = "portrait" | "landscape";

/** At least one of portraitImage / landscapeImage is expected; the card falls back to the other. */
export interface PodcastItem {
  id: string;
  title: string;
  period: string;
  episodeCount: number;
  duration: string;
  weeklyListens: number;
  monthlyListens: number;
  likes: number;
  publishedAt: string;
  portraitImage?: string;
  landscapeImage?: string;
  imageAlt: string;
}

export interface UpcomingPodcast extends PodcastItem {
  releaseDate: string;
}

export interface ContinueListeningItem {
  podcast: PodcastItem;
  episodeTitle: string;
  /** 0..1 */
  progress: number;
}
