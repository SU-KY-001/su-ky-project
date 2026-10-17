export const queryKeys = {
  episodes: {
    all: ["episodes"] as const,
    bySlug: (slug: string) => ["episodes", slug] as const,
  },
  timeline: {
    periods: ["timeline", "periods"] as const,
  },
  catalog: {
    series: ["catalog", "series"] as const,
  },
};
