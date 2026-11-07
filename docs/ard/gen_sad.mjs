// Generates the Su-Ky system architecture diagram (drawio) with Simple Icons embedded as data URIs.
// Usage: node docs/ard/gen_sad.mjs docs/ard/00-system-architecture.drawio   (needs network for icons)
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node gen_sad.mjs <out.drawio>");

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
const img = async (slug, x, y, size) => vertex(`i${seq++}`, "", await iconStyle(slug), x, y, size, size);

const LANE = "swimlane;html=1;startSize=26;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontStyle=1;fontSize=12;fontColor=#000000;";
const BOX = "html=1;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#666666;strokeWidth=1.5;fontSize=12;fontColor=#000000;";
const BOX_ICON = `${BOX}verticalAlign=bottom;spacingBottom=8;`;

// Box with one or more centred icons above a bottom label.
async function iconBox(id, label, x, y, w, h, slugs, size = 44) {
  vertex(id, label, BOX_ICON, x, y, w, h);
  const gap = 12;
  const total = slugs.length * size + (slugs.length - 1) * gap;
  let ix = x + (w - total) / 2;
  for (const s of slugs) { await img(s, ix, y + 14, size); ix += size + gap; }
}

// Edge with exit/entry given as absolute points on the source/target border.
function edge(from, to, { label = "", ex, nx, both = false, dashed = 0 } = {}) {
  const a = box[from], b = box[to];
  let style = `edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;endFill=1;startArrow=${both ? "block" : "none"};startFill=1;strokeWidth=1.5;strokeColor=#000000;fontSize=11;labelBackgroundColor=#FFFFFF;dashed=${dashed};`;
  if (ex) style += `exitX=${(ex[0] - a.x) / a.w};exitY=${(ex[1] - a.y) / a.h};exitDx=0;exitDy=0;`;
  if (nx) style += `entryX=${(nx[0] - b.x) / b.w};entryY=${(nx[1] - b.y) / b.h};entryDx=0;entryDy=0;`;
  cells.push(`<mxCell id="e${seq++}" value="${esc(label)}" style="${style}" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
}

// ---------- Third-party services (top) ----------
vertex("ext", "Third-party Services", LANE, 480, 20, 700, 200);
await iconBox("gemini", "Google Gemini\n(LLM + TTS)", 500, 60, 190, 140, ["googlegemini"], 56);
await iconBox("cloud", "Cloudinary\n(audio · images · PDF)", 730, 60, 190, 140, ["cloudinary"], 56);
await iconBox("gauth", "Google OAuth", 960, 60, 190, 140, ["google"], 56);

// ---------- Client (left) ----------
vertex("client", "Client", LANE, 20, 400, 230, 260);
await iconBox("web", "Web (React + Vite)", 40, 440, 190, 100, ["react", "vite"], 40);
await iconBox("mobile", "Mobile (Expo)", 40, 550, 190, 100, ["expo"], 40);

// ---------- Traefik ----------
await iconBox("traefik", "Traefik\n(TLS)", 360, 460, 110, 160, ["traefikproxy"], 48);

// ---------- Modular monolith server ----------
vertex("srv", "Modular Monolith Server — suky-api (Bun, :3005)", LANE, 560, 300, 540, 720);
vertex("hono", "Hono", `${BOX}verticalAlign=top;align=left;spacingLeft=64;spacingTop=10;fontSize=26;fontStyle=1;`, 600, 340, 460, 660);
await img("hono", 616, 346, 44);
const MODS = [
  "Auth Module\nBetter Auth · email/password + Google",
  "Catalog & Content Module",
  "Listening Module",
  "Gamification Module\nQuiz · Weekly mission",
  "Exhibition & Showcase Module",
  "Releases Module",
  "Media Module",
  "AI Assist Module\nPi coding agent engine (in-process) · TTS",
];
MODS.forEach((m, i) => vertex(`m${i}`, m, BOX, 630, 410 + i * 68, 400, 52));
const modMid = (i) => 410 + i * 68 + 26;

// ---------- Right column ----------
vertex("db", "PostgreSQL 18", "shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=18;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontSize=12;verticalAlign=bottom;spacingBottom=6;", 1190, 330, 170, 180);
await img("postgresql", 1250, 372, 50);
await iconBox("worker", "suky-worker (Bun)\npg-boss: production reminders", 1420, 350, 200, 140, ["bun"], 44);
await iconBox("office", "LibreOffice Writer\nDOC → DOCX (quiz import)", 1190, modMid(3) - 60, 220, 120, ["libreoffice"], 44);
await iconBox("ffmpeg", "ffmpeg\nWAV → MP3", 1190, modMid(7) - 60, 220, 120, ["ffmpeg"], 44);

// ---------- Edges ----------
edge("web", "traefik", { label: "HTTPS Request", ex: [230, 490], nx: [360, 500] });
edge("mobile", "traefik", { label: "HTTPS Request", ex: [230, 600], nx: [360, 600] });
edge("traefik", "client", { label: "JSON / SSE", ex: [360, 540], nx: [250, 540] });
edge("traefik", "srv", { label: "HTTP Request", ex: [470, 500], nx: [560, 500] });
edge("srv", "traefik", { label: "Response", ex: [560, 580], nx: [470, 580] });

edge("gemini", "srv", { label: "Prompt · TTS / Response", ex: [595, 200], nx: [595, 300], both: true });
edge("cloud", "srv", { label: "Upload file / File URL", ex: [825, 200], nx: [825, 300], both: true });
edge("gauth", "srv", { label: "OAuth", ex: [1055, 200], nx: [1055, 300], both: true });

edge("srv", "db", { label: "Read / Write (Prisma)", ex: [1100, 420], nx: [1190, 420] });
edge("db", "srv", { label: "Return", ex: [1190, 470], nx: [1100, 470] });
edge("worker", "db", { label: "pg-boss", ex: [1420, 420], nx: [1360, 420] });
edge("m3", "office", { label: "DOC file", ex: [1030, modMid(3)], nx: [1190, modMid(3)], both: true });
edge("m7", "ffmpeg", { label: "WAV list", ex: [1030, modMid(7)], nx: [1190, modMid(7)], both: true });

const xml = `<mxfile host="drawio"><diagram name="System Architecture"><mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1700" pageHeight="1060" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram></mxfile>`;
writeFileSync(OUT, xml);
console.log("wrote", OUT, cells.length, "cells");
