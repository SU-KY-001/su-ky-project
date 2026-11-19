// Su-Ky system architecture v04: C4-style arrows. Every line is ONE-way and labelled; each request/response
// interaction is drawn as two parallel lines (request, then response).
// Icons: simpleicons.org, embedded as data URIs.
// Usage: node docs/ard/gen_sad_04.mjs docs/ard/04-system-architecture-paired.drawio   (needs network)
//
// Rules kept on purpose:
//  - one line = one direction = one short label (what travels on it; protocol on the request line).
//  - dashed = in-process / local process, solid = network call.
//  - boxes that talk to each other share a centre line, so the two parallel lines stay straight.
//  - grouping = "runs inside" (Traefik is on the VPS but outside Docker Compose).
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node gen_sad_04.mjs <out.drawio>");

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

async function stacked(id, label, x, y, w, h, slugs = [], glyph = "") {
  vertex(id, label, STACKED, x, y, w, h);
  const gap = 10;
  const total = slugs.length * ICON + (slugs.length - 1) * gap;
  let ix = x + (w - total) / 2;
  for (const s of slugs) { await img(s, ix, y + 12); ix += ICON + gap; }
  if (glyph) vertex(`g${seq++}`, glyph, `text;html=1;fontSize=34;fontStyle=1;align=center;verticalAlign=middle;${FONT}`, x + (w - ICON) / 2, y + 12, ICON, ICON);
}
async function wide(id, label, x, y, w, h, slug) {
  vertex(id, label, WIDE, x, y, w, h);
  await img(slug, x + 16, y + (h - ICON) / 2);
}

// One-way line. ex/nx = absolute border points on source/target; pts = optional waypoints (absolute).
function edge(from, to, { label = "", ex, nx, dashed = false, pts = [] } = {}) {
  const a = box[from], b = box[to];
  let style = `edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;endFill=1;startArrow=none;strokeWidth=1.5;strokeColor=#334155;fontSize=12;${FONT}labelBackgroundColor=#FFFFFF;dashed=${dashed ? 1 : 0};`;
  if (dashed) style += "dashPattern=6 4;";
  if (ex) style += `exitX=${(ex[0] - a.x) / a.w};exitY=${(ex[1] - a.y) / a.h};exitDx=0;exitDy=0;`;
  if (nx) style += `entryX=${(nx[0] - b.x) / b.w};entryY=${(nx[1] - b.y) / b.h};entryDx=0;entryDy=0;`;
  const wp = pts.length ? `<Array as="points">${pts.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>` : "";
  cells.push(`<mxCell id="e${seq++}" value="${esc(label)}" style="${style}" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry">${wp}</mxGeometry></mxCell>`);
}

// Request + response between a and b, as two parallel one-way lines.
// ap/bp = border points of a and b on the shared centre line; dir "h" = horizontal, "v" = vertical.
// The request line sits on the upper/left side, the response line on the lower/right side.
const H_OFF = 18, V_OFF = 36;
function pair(a, b, { req, res, ap, bp, dir, dashed = false }) {
  const o = dir === "h" ? H_OFF : V_OFF;
  const shift = (p, s) => (dir === "h" ? [p[0], p[1] + s] : [p[0] + s, p[1]]);
  edge(a, b, { label: req, ex: shift(ap, -o), nx: shift(bp, -o), dashed });
  edge(b, a, { label: res, ex: shift(bp, o), nx: shift(ap, o), dashed });
}

// ---- Grid (PAD = space between a container border and its content; HEADER = title zone) ----
const PAD = 30, HEADER = 60;
const LEAF_W = 140, LEAF_GAP = 90;   // wide gaps keep lines long enough to breathe
const INNER_W = 4 * LEAF_W + 3 * LEAF_GAP;
const ROW_GAP = 90;                                          // room for the two vertical lines and their labels
const COMPOSE_W = INNER_W + 4 * PAD;                         // content + API padding + Compose padding

const VPS = { x: 610, y: 60 };                               // 180px right of the Client frame
const COMPOSE = { x: VPS.x + 290, y: VPS.y + 50 };          // 290px: Traefik sits left of it with long lines
const API = { x: COMPOSE.x + PAD, y: COMPOSE.y + HEADER };
const INNER_X = API.x + PAD;
const INNER_R = INNER_X + INNER_W;
const ROW_A = { y: API.y + HEADER + 20, h: 80 };             // Hono           (centre line with Traefik)
const ROW_B = { y: ROW_A.y + ROW_A.h + ROW_GAP, h: 80 };     // Domain modules (centre line with Cloudinary)
const ROW_C = { y: ROW_B.y + ROW_B.h + ROW_GAP, h: 100 };    // leaf boxes     (centre line with Gemini)
const API_H = ROW_C.y + ROW_C.h + PAD - API.y;
const DB_Y = API.y + API_H + 90, DB_H = 120;                 // DB + queue + worker row
const COMPOSE_H = DB_Y + DB_H + PAD - COMPOSE.y;
const VPS_W = COMPOSE.x - VPS.x + COMPOSE_W + PAD;
const VPS_BOTTOM = COMPOSE.y + COMPOSE_H + PAD;
const mid = (r) => r.y + r.h / 2;
const COL = [0, 1, 2, 3].map((i) => INNER_X + i * (LEAF_W + LEAF_GAP));
const EXT_X = VPS.x + VPS_W + 120;                           // 120px right of the VPS frame
const GROUP_HEAD = "spacingLeft=56;spacingTop=20;";           // title next to a 40px icon

vertex("title", "Sử Ký System Architecture Diagram", `text;html=1;fontSize=22;fontStyle=1;align=left;${FONT}`, 30, 10, 900, 36);

// ---- Actor + client ----
const CLIENT = { x: 170, y: 100, w: 260, h: 370 };
vertex("user", "User", "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;strokeWidth=2;strokeColor=#475569;fillColor=#FFFFFF;fontSize=12;", 30, 250, 40, 70);
vertex("client", "Client", GROUP("#EFF6FF", "#3B82F6", 0), CLIENT.x, CLIENT.y, CLIENT.w, CLIENT.h);
await stacked("web", "Web App", CLIENT.x + PAD, 150, CLIENT.w - 2 * PAD, 120, ["react", "vite", "tailwindcss"]);
await stacked("mobile", "Mobile App", CLIENT.x + PAD, 310, CLIENT.w - 2 * PAD, 120, ["expo"]);

// ---- VPS: Traefik outside Compose, services inside ----
const TRAEFIK_X = VPS.x + PAD, TRAEFIK_W = 130;
vertex("vps", "VPS", GROUP("#F8FAFC", "#64748B", 1), VPS.x, VPS.y, VPS_W, VPS_BOTTOM - VPS.y);
await stacked("traefik", "Traefik", TRAEFIK_X, mid(ROW_A) - 50, TRAEFIK_W, 100, ["traefikproxy"]);

vertex("compose", "Docker Compose", `${GROUP("#FFFFFF", "#0DB7ED", 1)}${GROUP_HEAD}`, COMPOSE.x, COMPOSE.y, COMPOSE_W, COMPOSE_H);
await img("docker", COMPOSE.x + 12, COMPOSE.y + 10);

vertex("api", "suky-api · Bun", `${GROUP("#ECFDF5", "#10B981", 0)}${GROUP_HEAD}`, API.x, API.y, INNER_W + 2 * PAD, API_H);
await img("bun", API.x + 12, API.y + 10);

await wide("hono", "Hono API\nREST · SSE · Auth", INNER_X, ROW_A.y, INNER_W, ROW_A.h, "hono");
await wide("mods", "Domain modules\ncatalog · listening · quiz · release · media", INNER_X, ROW_B.y, INNER_W, ROW_B.h, "typescript");
await stacked("prisma", "Prisma", COL[0], ROW_C.y, LEAF_W, ROW_C.h, ["prisma"]);
await stacked("office", "LibreOffice", COL[1], ROW_C.y, LEAF_W, ROW_C.h, ["libreoffice"]);
await stacked("ffmpeg", "ffmpeg", COL[2], ROW_C.y, LEAF_W, ROW_C.h, ["ffmpeg"]);
await stacked("ai", "AI Assist\nPi agent", COL[3], ROW_C.y, LEAF_W, ROW_C.h, [], "π");

// DB sits under Prisma (same centre line); queue and worker follow on the same row
const DB_W = 160, QUEUE_W = 200, WORKER_W = 200, BOTTOM_GAP = 120;
const DB_X = COL[0] + LEAF_W / 2 - DB_W / 2;
const QUEUE_X = DB_X + DB_W + BOTTOM_GAP;
const WORKER_X = QUEUE_X + QUEUE_W + BOTTOM_GAP;
const DB_MID_Y = DB_Y + DB_H / 2;
await stacked("db", "PostgreSQL 18", DB_X, DB_Y, DB_W, DB_H, ["postgresql"]);
await stacked("queue", "Job queue · pg-boss\n(tables in PostgreSQL)", QUEUE_X, DB_Y, QUEUE_W, DB_H, [], "⏱");
await stacked("worker", "suky-worker", WORKER_X, DB_Y, WORKER_W, DB_H, ["bun"]);

// ---- External ----
const EXT_BOX_X = EXT_X + PAD, EXT_BOX_W = 220;
const EXT_Y = mid(ROW_B) - 50 - HEADER;
const EXT_W = EXT_BOX_W + 2 * PAD;
vertex("ext", "External Services", GROUP("#FFF7ED", "#F97316", 0), EXT_X, EXT_Y, EXT_W, mid(ROW_C) + 60 + PAD - EXT_Y);
await stacked("cloud", "Cloudinary", EXT_BOX_X, mid(ROW_B) - 50, EXT_BOX_W, 100, ["cloudinary"]);
await stacked("gemini", "Google Gemini", EXT_BOX_X, mid(ROW_C) - 60, EXT_BOX_W, 120, ["googlegemini"]);

// ---- Lines: 15 request/response pairs = 30 one-way lines ----
const cx = (col) => COL[col] + LEAF_W / 2;
const CLIENT_R = CLIENT.x + CLIENT.w, TRAEFIK_R = TRAEFIK_X + TRAEFIK_W;
const ROW_A_BOTTOM = ROW_A.y + ROW_A.h, ROW_B_BOTTOM = ROW_B.y + ROW_B.h, ROW_C_BOTTOM = ROW_C.y + ROW_C.h;
const QUEUE_MID_X = QUEUE_X + QUEUE_W / 2;

pair("user", "client", { dir: "h", ap: [70, 285], bp: [CLIENT.x, 285], req: "use", res: "see" });
pair("client", "traefik", { dir: "h", ap: [CLIENT_R, mid(ROW_A)], bp: [TRAEFIK_X, mid(ROW_A)], req: "request (HTTPS)", res: "data (JSON, SSE)" });
pair("traefik", "hono", { dir: "h", ap: [TRAEFIK_R, mid(ROW_A)], bp: [INNER_X, mid(ROW_A)], req: "forward (HTTP)", res: "reply" });
pair("hono", "mods", { dir: "v", dashed: true, ap: [cx(0), ROW_A_BOTTOM], bp: [cx(0), ROW_B.y], req: "route", res: "result" });
pair("mods", "prisma", { dir: "v", dashed: true, ap: [cx(0), ROW_B_BOTTOM], bp: [cx(0), ROW_C.y], req: "query", res: "rows" });
pair("mods", "office", { dir: "v", dashed: true, ap: [cx(1), ROW_B_BOTTOM], bp: [cx(1), ROW_C.y], req: "DOC", res: "DOCX" });
pair("mods", "ai", { dir: "v", dashed: true, ap: [cx(3), ROW_B_BOTTOM], bp: [cx(3), ROW_C.y], req: "ask", res: "answer" });
pair("ai", "ffmpeg", { dir: "h", dashed: true, ap: [COL[3], mid(ROW_C)], bp: [COL[2] + LEAF_W, mid(ROW_C)], req: "WAV", res: "MP3" });
pair("prisma", "db", { dir: "v", ap: [cx(0), ROW_C_BOTTOM], bp: [cx(0), DB_Y], req: "SQL", res: "rows" });
pair("api", "queue", { dir: "v", ap: [QUEUE_MID_X, API.y + API_H], bp: [QUEUE_MID_X, DB_Y], req: "schedule", res: "job" });
pair("queue", "db", { dir: "h", ap: [QUEUE_X, DB_MID_Y], bp: [DB_X + DB_W, DB_MID_Y], req: "SQL", res: "rows" });
pair("worker", "queue", { dir: "h", ap: [WORKER_X, DB_MID_Y], bp: [QUEUE_X + QUEUE_W, DB_MID_Y], req: "poll", res: "job" });
pair("ai", "gemini", { dir: "h", ap: [COL[3] + LEAF_W, mid(ROW_C)], bp: [EXT_BOX_X, mid(ROW_C)], req: "prompt (HTTPS)", res: "text, audio" });
pair("mods", "cloud", { dir: "h", ap: [INNER_R, mid(ROW_B)], bp: [EXT_BOX_X, mid(ROW_B)], req: "check, delete (HTTPS)", res: "status" });

// The browser uploads straight to Cloudinary with a signed ticket, so these two lines bypass Traefik and the API.
// The two paths are nested rectangles (inner/outer) so they never cross.
const BYPASS_Y = VPS_BOTTOM + 40, EXT_RIGHT = EXT_X + EXT_W;
const CLIENT_MID_X = CLIENT.x + CLIENT.w / 2, CLOUD_RIGHT = EXT_BOX_X + EXT_BOX_W, CLOUD_MID_Y = mid(ROW_B);
const D = 14;
const bypass = (s) => [[CLIENT_MID_X + s, BYPASS_Y - s], [EXT_RIGHT + 40 - s, BYPASS_Y - s], [EXT_RIGHT + 40 - s, CLOUD_MID_Y + s]];
// upload: inner path (s = +D), result: outer path (s = -D)
edge("client", "cloud", { label: "upload (HTTPS)", ex: [CLIENT_MID_X + D, CLIENT.y + CLIENT.h], nx: [CLOUD_RIGHT, CLOUD_MID_Y + D], pts: bypass(D) });
edge("cloud", "client", { label: "result", ex: [CLOUD_RIGHT, CLOUD_MID_Y - D], nx: [CLIENT_MID_X - D, CLIENT.y + CLIENT.h], pts: bypass(-D).reverse() });

vertex("legend", "Every line is one-way and shows what travels on it   |   Solid = network call   |   Dashed = inside the same process / machine", `text;html=1;fontSize=12;align=left;${FONT}fontColor=#475569;`, CLIENT.x, BYPASS_Y + 50, 1300, 24);

const pageW = EXT_RIGHT + 100, pageH = BYPASS_Y + 110;
const xml = `<mxfile host="drawio"><diagram name="System Architecture v04"><mxGraphModel dx="${pageW}" dy="${pageH}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram></mxfile>`;
writeFileSync(OUT, xml);
console.log("wrote", OUT, cells.length, "cells");
