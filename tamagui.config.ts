import { defaultConfig } from "@tamagui/config/v5";
import { createAnimations } from "@tamagui/animations-css";
import { createFont, createTamagui } from "tamagui";

const animations = createAnimations({
  instant: "linear 0ms",
  quick: "cubic-bezier(0.16, 1, 0.3, 1) 160ms",
  smooth: "cubic-bezier(0.16, 1, 0.3, 1) 280ms",
  settle: "cubic-bezier(0.22, 1, 0.36, 1) 420ms",
  reveal: "cubic-bezier(0.16, 1, 0.3, 1) 520ms",
});

const colorTokens = {
  paper: "#F4ECDC",
  paperDeep: "#E9DCC2",
  paperSoft: "#FAF6ED",
  night: "#14110F",
  nightSoft: "#211B17",
  ink: "#1C1714",
  inkSoft: "#5B4E44",
  vermilion: "#B8322A",
  vermilionDark: "#92251F",
  bronze: "#B58A3C",
  bronzeDark: "#7A5A26",
  line: "#CCB991",
  overlay: "rgba(20, 17, 15, 0.72)",
  overlaySoft: "rgba(20, 17, 15, 0.42)",
  focus: "#8F211B",
  modCanvas: "#F8FAFC",
  modCanvasAccent: "#EDF4F8",
  modSurface: "#FFFFFF",
  modSurfaceGlass: "rgba(255, 255, 255, 0.82)",
  modPrimary: "#0284C7",
  modPrimaryHover: "#0369A1",
  modAccentBlue: "#2563EB",
  modText: "#0F172A",
  modTextMuted: "#475569",
  modTextSecondary: "#64748B",
  modTextLow: "#94A3B8",
  modBorder: "#E2E8F0",
  modSuccess: "#15803D",
  modAttention: "#C2410C",
  modChartSky: "#0284C7",
  modChartViolet: "#7C3AED",
  modChartEmerald: "#059669",
} as const;

const vietnameseFont = createFont({
  family: "'Be Vietnam Pro', system-ui, sans-serif",
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 20,
    5: 28,
    6: 40,
    7: 64,
    true: 16,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 30,
    5: 36,
    6: 48,
    7: 72,
    true: 24,
  },
  weight: {
    4: "400",
    5: "500",
    6: "600",
    7: "700",
  },
  letterSpacing: {
    1: 0.1,
    2: 0,
    3: -0.1,
    4: -0.2,
    5: -0.4,
    6: -0.8,
    7: -1.4,
    true: 0,
  },
  face: {
    400: { normal: "Be Vietnam Pro" },
    500: { normal: "Be Vietnam Pro" },
    600: { normal: "Be Vietnam Pro" },
    700: { normal: "Be Vietnam Pro" },
  },
});

const moderatorFont = createFont({
  family: "'Manrope', system-ui, -apple-system, sans-serif",
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 20,
    5: 28,
    6: 40,
    7: 64,
    true: 16,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 30,
    5: 36,
    6: 48,
    7: 72,
    true: 24,
  },
  weight: {
    4: "400",
    5: "500",
    6: "600",
    7: "700",
    8: "800",
  },
  letterSpacing: {
    1: 0.1,
    2: 0,
    3: -0.1,
    4: -0.2,
    5: -0.4,
    6: -0.8,
    7: -1.4,
    true: 0,
  },
  face: {
    400: { normal: "Manrope" },
    500: { normal: "Manrope" },
    600: { normal: "Manrope" },
    700: { normal: "Manrope" },
    800: { normal: "Manrope" },
  },
});

export const config = createTamagui({
  ...defaultConfig,
  animations,
  shorthands: {
    ...defaultConfig.shorthands,
    w: "width",
    h: "height",
    f: "flex",
    fd: "flexDirection",
    g: "gap",
    bw: "borderWidth",
    bc: "borderColor",
    fw: "fontWeight",
    fs: "fontSize",
    lh: "lineHeight",
    ls: "letterSpacing",
    ff: "fontFamily",
    op: "opacity",
    pos: "position",
    wrap: "flexWrap",
  } as const,
  media: {
    ...defaultConfig.media,
    modDesktop: { minWidth: 981 },
    modTablet: { minWidth: 621, maxWidth: 980 },
    modMobile: { maxWidth: 620 },
  },
  tokens: {
    ...defaultConfig.tokens,
    size: {
      ...defaultConfig.tokens.size,
      content: 1280,
    },
    color: colorTokens,
  },
  fonts: {
    ...defaultConfig.fonts,
    body: vietnameseFont,
    heading: vietnameseFont,
    moderator: moderatorFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: "$paper",
      backgroundHover: "$paperSoft",
      backgroundPress: "$paperDeep",
      borderColor: "$line",
      borderColorHover: "$bronze",
      color: "$ink",
      color10: "$inkSoft",
      color11: "$inkSoft",
      color12: "$ink",
      accentBackground: "$vermilion",
      accentColor: "$paperSoft",
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: "$night",
      backgroundHover: "$nightSoft",
      backgroundPress: "$ink",
      borderColor: "$bronzeDark",
      borderColorHover: "$bronze",
      color: "$paper",
      color10: "$paperDeep",
      color11: "$paperDeep",
      color12: "$paperSoft",
      accentBackground: "$vermilion",
      accentColor: "$paperSoft",
    },
  },
});

type AppConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
