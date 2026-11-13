/**
 * Thời kỳ → Giai đoạn seed (plan 261010-1200, Phase 1).
 *
 * Years follow the half-open convention `[startYear, endYear)`: `endYear` is excluded, so a
 * phase ends where the next one begins and no year is ever counted twice. `startYear = null`
 * is prehistory, `endYear = null` is ongoing. BCE years are negative and there is no year 0.
 * The boundaries -700 and 1900 are proposed values (the source document only names centuries).
 */
export interface SeedPhase {
  slug: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
}

export interface SeedPeriod {
  slug: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  phases: readonly SeedPhase[];
}

export const HISTORICAL_PERIOD_TREE: readonly SeedPeriod[] = [
  {
    slug: "tien-su-so-su",
    name: "Tiền sử & Sơ sử",
    startYear: null,
    endYear: -179,
    phases: [
      { slug: "tien-su", name: "Tiền sử", startYear: null, endYear: -700 },
      { slug: "hong-bang-van-lang", name: "Hồng Bàng - Văn Lang", startYear: -700, endYear: -208 },
      { slug: "thuc-phan-au-lac", name: "Thục Phán - Âu Lạc", startYear: -208, endYear: -179 },
    ],
  },
  {
    slug: "bac-thuoc",
    name: "Bắc thuộc",
    startYear: -179,
    endYear: 939,
    phases: [
      { slug: "bac-thuoc-lan-1", name: "Bắc thuộc lần I", startYear: -179, endYear: 43 },
      { slug: "bac-thuoc-lan-2", name: "Bắc thuộc lần II", startYear: 43, endYear: 542 },
      { slug: "van-xuan", name: "Vạn Xuân", startYear: 542, endYear: 602 },
      { slug: "bac-thuoc-lan-3-tu-chu", name: "Bắc thuộc lần III & tự chủ", startYear: 602, endYear: 939 },
    ],
  },
  {
    slug: "quan-chu",
    name: "Quân chủ",
    startYear: 939,
    endYear: 1858,
    phases: [
      { slug: "so-khai", name: "Sơ khai (Ngô, Đinh, Tiền Lê)", startYear: 939, endYear: 1009 },
      { slug: "ly-tran-ho", name: "Lý, Trần, Hồ", startYear: 1009, endYear: 1407 },
      { slug: "chong-minh-le-so", name: "Chống Minh & Lê sơ", startYear: 1407, endYear: 1527 },
      { slug: "phan-liet-noi-chien", name: "Phân liệt, nội chiến", startYear: 1527, endYear: 1802 },
      { slug: "nguyen-doc-lap", name: "Nhà Nguyễn độc lập", startYear: 1802, endYear: 1858 },
    ],
  },
  {
    slug: "can-dai",
    name: "Cận đại",
    startYear: 1858,
    endYear: 1945,
    phases: [
      { slug: "phap-xam-luoc-khang-chien", name: "Pháp xâm lược & kháng chiến", startYear: 1858, endYear: 1900 },
      { slug: "khai-thac-thuoc-dia", name: "Khai thác thuộc địa, chuyển biến", startYear: 1900, endYear: 1930 },
      { slug: "chuan-bi-cach-mang-thang-tam", name: "Chuẩn bị Cách mạng Tháng Tám", startYear: 1930, endYear: 1945 },
    ],
  },
  {
    slug: "hien-dai",
    name: "Hiện đại",
    startYear: 1945,
    endYear: null,
    phases: [
      { slug: "khang-chien-chong-phap", name: "Kháng chiến chống Pháp", startYear: 1945, endYear: 1954 },
      { slug: "khang-chien-chong-my", name: "Kháng chiến chống Mỹ", startYear: 1954, endYear: 1975 },
      { slug: "thong-nhat-doi-moi", name: "Thống nhất, Đổi mới", startYear: 1975, endYear: null },
    ],
  },
];

function formatYear(year: number): string {
  return year < 0 ? `${-year} TCN` : String(year);
}

/** Human note stating the open end explicitly, e.g. "Từ năm 179 TCN đến trước năm 43". */
export function describeHalfOpenRange(startYear: number | null, endYear: number | null): string {
  if (startYear === null && endYear === null) return "Không xác định";
  if (startYear === null) return `Đến trước năm ${formatYear(endYear!)}`;
  if (endYear === null) return `Từ năm ${formatYear(startYear)} đến nay`;
  return `Từ năm ${formatYear(startYear)} đến trước năm ${formatYear(endYear)}`;
}
