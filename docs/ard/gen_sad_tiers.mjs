// Su-Ky system architecture, tier style. Icons: simpleicons.org, embedded as data URIs.
// Usage: node docs/ard/gen_sad_tiers.mjs docs/ard/01-system-architecture-tiers.drawio   (needs network)
//
// Layout rules (kept on purpose, they are the "alignment" of the figure):
//  - every box sits on the grid below; boxes that talk to each other share a centre line, so arrows are straight
//  - one abstraction level per container; grouping = "runs inside" (Traefik is on the VPS but outside Compose)
//  - every arrow has a short label; dashed = in-process / local process, solid = network call
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node gen_sad_tiers.mjs <out.drawio>");

const ICON = 40;
const iconCache = {};
async function iconStyle(slug) {
  if (!iconCache[slug]) {
    const r = await fetch(`https://cdn.simpleicons.org/${slug}`);
    if (!r.ok) throw new Error(`simpleicons ${slug} -> ${r.status}`);
    iconCache[slug] = Buffer.from(await r.text()).toString("base64");
  }
  return `shape=image;aspect=fixed;image=data:image/svg+xml,${iconCache[slug]};`;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cells = [];
const box = {};
let seq = 2;

function vertex(id, value, style, x, y, w, h) {
  box[id] = { x, y, w, h };
  cells.push(`<mxCell id="${id}" value="${esc(value).replace(/\n/g, "&lt;br&gt;")}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
}
const img = async (slug, x, y) => vertex(`i${seq++}`, "", await iconStyle(slug), x, y, ICON, ICON);

const FONT = "fontFamily=Helvetica;fontColor=#0F172A;";
const GROUP = (fill, stroke, dashed) =>
  `rounded=1;arcSize=2;html=1;whiteSpace=wrap;fillColor=${fill};strokeColor=${stroke};strokeWidth=2;dashed=${dashed};verticalAlign=top;align=left;spacingLeft=16;spacingTop=8;fontStyle=1;fontSize=14;${FONT}`;
const NODE = `rounded=1;arcSize=8;html=1;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#94A3B8;strokeWidth=1.5;fontSize=12;${FONT}`;
const STACKED = `${NODE}verticalAlign=bottom;spacingBottom=8;`; // icon above label
const WIDE = `${NODE}verticalAlign=middle;align=left;spacingLeft=72;`; // icon left of label

// Icon above label, centred. `slugs` may be empty; `glyph` draws a text symbol instead of an icon.
async function stacked(id, label, x, y, w, h, slugs = [], glyph = "") {
  vertex(id, label, STACKED, x, y, w, h);
  const gap = 10;
  const total = slugs.length * ICON + (slugs.length - 1) * gap;
  let ix = x + (w - total) / 2;
  for (const s of slugs) { await img(s, ix, y + 12); ix += ICON + gap; }
  if (glyph) vertex(`g${seq++}`, glyph, `text;html=1;fontSize=34;fontStyle=1;align=center;verticalAlign=middle;${FONT}`, x + (w - ICON) / 2, y + 12, ICON, ICON);
}
// Icon at the left, label to its right. Used for the full-width layers.
async function wide(id, label, x, y, w, h, slug) {
  vertex(id, label, WIDE, x, y, w, h);
  await img(slug, x + 16, y + (h - ICON) / 2);
}

// Edge between two ids; ex/nx are absolute border points (so the line ends exactly where intended).
function edge(from, to, { label = "", ex, nx, both = false, dashed = false } = {}) {
  const a = box[from], b = box[to];
  let style = `edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;endFill=1;startArrow=${both ? "block" : "none"};startFill=1;strokeWidth=1.5;strokeColor=#334155;fontSize=11;${FONT}labelBackgroundColor=#FFFFFF;dashed=${dashed ? 1 : 0};`;
  if (dashed) style += "dashPattern=6 4;";
  if (ex) style += `exitX=${(ex[0] - a.x) / a.w};exitY=${(ex[1] - a.y) / a.h};exitDx=0;exitDy=0;`;
  if (nx) style += `entryX=${(nx[0] - b.x) / b.w};entryY=${(nx[1] - b.y) / b.h};entryDx=0;entryDy=0;`;
  cells.push(`<mxCell id="e${seq++}" value="${esc(label)}" style="${style}" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
}

// ---- Grid (PAD = space between a container border and its content; HEADER = title zone) ----
const PAD = 30, HEADER = 60;
const LEAF_W = 140, LEAF_GAP = 30;
const INNER_W = 4 * LEAF_W + 3 * LEAF_GAP;                  // 650
const ROW_GAP = 60;                                          // room for vertical arrow labels

const VPS = { x: 540, y: 60 };                               // 110px right of the Client frame: room for the HTTPS label
const COMPOSE = { x: VPS.x + 230, y: VPS.y + 50 };           // 770, 110
const API = { x: COMPOSE.x + PAD, y: COMPOSE.y + HEADER };   // 720, 170
const INNER_X = API.x + PAD;                                 // 750
const INNER_R = INNER_X + INNER_W;                           // 1400
const ROW_A = { y: API.y + HEADER + 20, h: 80 };             // Hono           centre 290
const ROW_B = { y: ROW_A.y + ROW_A.h + ROW_GAP, h: 80 };     // Domain modules centre 430
const ROW_C = { y: ROW_B.y + ROW_B.h + ROW_GAP, h: 100 };    // leaf boxes     centre 580
const API_H = ROW_C.y + ROW_C.h + PAD - API.y;
const DB_Y = API.y + API_H + 50, DB_H = 120;                 // DB + worker row, 50px below the API container
const COMPOSE_H = DB_Y + DB_H + PAD - COMPOSE.y;
const mid = (r) => r.y + r.h / 2;
const COL = [0, 1, 2, 3].map((i) => INNER_X + i * (LEAF_W + LEAF_GAP));
const EXT_X = VPS.x + 1030 + 60;                             // 60px right of the VPS frame
const GROUP_HEAD = "spacingLeft=56;spacingTop=20;";           // title next to a 40px icon

vertex("title", "Su-Ky — System Architecture", `text;html=1;fontSize=22;fontStyle=1;align=left;${FONT}`, 30, 10, 600, 36);

// ---- Actor + client ----
const CLIENT = { x: 170, y: 100, w: 260, h: 370 };
vertex("user", "Listener · Moderator", "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeWidth=2;strokeColor=#475569;fillColor=#FFFFFF;fontSize=11;", 30, 250, 40, 70);
vertex("client", "Client", GROUP("#EFF6FF", "#3B82F6", 0), CLIENT.x, CLIENT.y, CLIENT.w, CLIENT.h);
await stacked("web", "Web App", CLIENT.x + PAD, 150, CLIENT.w - 2 * PAD, 120, ["react", "vite", "tailwindcss"]);
await stacked("mobile", "Mobile App", CLIENT.x + PAD, 310, CLIENT.w - 2 * PAD, 120, ["expo"]);

// ---- VPS: Traefik outside Compose, services inside ----
const TRAEFIK_X = VPS.x + PAD, TRAEFIK_W = 130;
vertex("vps", "VPS", GROUP("#F8FAFC", "#64748B", 1), VPS.x, VPS.y, COMPOSE.x - VPS.x + 770 + PAD, COMPOSE.y + COMPOSE_H + PAD - VPS.y);
await stacked("traefik", "Traefik", TRAEFIK_X, mid(ROW_A) - 50, TRAEFIK_W, 100, ["traefikproxy"]);

vertex("compose", "Docker Compose", `${GROUP("#FFFFFF", "#0DB7ED", 1)}${GROUP_HEAD}`, COMPOSE.x, COMPOSE.y, 770, COMPOSE_H);
await img("docker", COMPOSE.x + 12, COMPOSE.y + 10);

vertex("api", "suky-api · Bun", `${GROUP("#ECFDF5", "#10B981", 0)}${GROUP_HEAD}`, API.x, API.y, INNER_W + 2 * PAD, API_H);
await img("bun", API.x + 12, API.y + 10);

await wide("hono", "Hono API\nREST · SSE · Auth", INNER_X, ROW_A.y, INNER_W, ROW_A.h, "hono");
await wide("mods", "Domain modules\ncatalog · listening · quiz · release · media", INNER_X, ROW_B.y, INNER_W, ROW_B.h, "typescript");
await stacked("prisma", "Prisma", COL[0], ROW_C.y, LEAF_W, ROW_C.h, ["prisma"]);
await stacked("office", "LibreOffice", COL[1], ROW_C.y, LEAF_W, ROW_C.h, ["libreoffice"]);
await stacked("ffmpeg", "ffmpeg", COL[2], ROW_C.y, LEAF_W, ROW_C.h, ["ffmpeg"]);
await stacked("ai", "AI Assist\nPi agent", COL[3], ROW_C.y, LEAF_W, ROW_C.h, [], "π");

// DB sits under Prisma (same centre line), worker to its right
const DB_W = 160, WORKER_W = 200;
const DB_X = COL[0] + LEAF_W / 2 - DB_W / 2;
const WORKER_X = DB_X + DB_W + 100;
await stacked("db", "PostgreSQL 18", DB_X, DB_Y, DB_W, DB_H, ["postgresql"]);
await stacked("worker", "suky-worker", WORKER_X, DB_Y, WORKER_W, DB_H, ["bun"]);

// ---- External ----
const EXT_BOX_X = EXT_X + PAD, EXT_BOX_W = 220;
const EXT_Y = mid(ROW_A) - 50 - HEADER;
vertex("ext", "External Services", GROUP("#FFF7ED", "#F97316", 0), EXT_X, EXT_Y, EXT_BOX_W + 2 * PAD, mid(ROW_C) + 60 + PAD - EXT_Y);
await stacked("gauth", "Google OAuth", EXT_BOX_X, mid(ROW_A) - 50, EXT_BOX_W, 100, ["google"]);
await stacked("cloud", "Cloudinary", EXT_BOX_X, mid(ROW_B) - 50, EXT_BOX_W, 100, ["cloudinary"]);
await stacked("gemini", "Google Gemini", EXT_BOX_X, mid(ROW_C) - 60, EXT_BOX_W, 120, ["googlegemini"]);

// ---- Edges (labels short; dashed = in-process / local) ----
edge("user", "client", { label: "use", ex: [70, 285], nx: [CLIENT.x, 285] });
edge("client", "traefik", { label: "HTTPS", ex: [CLIENT.x + CLIENT.w, mid(ROW_A)], nx: [TRAEFIK_X, mid(ROW_A)], both: true });
edge("traefik", "hono", { label: "HTTP", ex: [TRAEFIK_X + TRAEFIK_W, mid(ROW_A)], nx: [INNER_X, mid(ROW_A)], both: true });
const cx = (col) => COL[col] + LEAF_W / 2;
edge("hono", "mods", { label: "route", ex: [cx(0), ROW_A.y + ROW_A.h], nx: [cx(0), ROW_B.y], dashed: true });
edge("mods", "prisma", { label: "query", ex: [cx(0), ROW_B.y + ROW_B.h], nx: [cx(0), ROW_C.y], dashed: true });
edge("mods", "office", { label: "DOC", ex: [cx(1), ROW_B.y + ROW_B.h], nx: [cx(1), ROW_C.y], dashed: true });
edge("mods", "ai", { label: "review · TTS", ex: [cx(3), ROW_B.y + ROW_B.h], nx: [cx(3), ROW_C.y], dashed: true });
edge("ai", "ffmpeg", { label: "WAV", ex: [COL[3], mid(ROW_C)], nx: [COL[2] + LEAF_W, mid(ROW_C)], dashed: true });
edge("prisma", "db", { label: "SQL", ex: [cx(0), ROW_C.y + ROW_C.h], nx: [cx(0), DB_Y] });
edge("worker", "db", { label: "pg-boss", ex: [WORKER_X, DB_Y + DB_H / 2], nx: [DB_X + DB_W, DB_Y + DB_H / 2] });
edge("hono", "gauth", { label: "OAuth", ex: [INNER_R, mid(ROW_A)], nx: [EXT_BOX_X, mid(ROW_A)], both: true });
edge("mods", "cloud", { label: "files", ex: [INNER_R, mid(ROW_B)], nx: [EXT_BOX_X, mid(ROW_B)], both: true });
edge("ai", "gemini", { label: "LLM · TTS", ex: [COL[3] + LEAF_W, mid(ROW_C)], nx: [EXT_BOX_X, mid(ROW_C)], both: true });

vertex("legend", "──  network call        - - -  in-process / local process", `text;html=1;fontSize=11;align=left;${FONT}fontColor=#475569;`, CLIENT.x, COMPOSE.y + COMPOSE_H + PAD + 40, 520, 24);

const xml = `<mxfile host="drawio"><diagram name="System Architecture (tiers)"><mxGraphModel dx="2000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2000" pageHeight="1000" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram></mxfile>`;
writeFileSync(OUT, xml);
console.log("wrote", OUT, cells.length, "cells");
