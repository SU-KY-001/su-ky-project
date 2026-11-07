"""Generate 00-overview.drawio: all tables as name-only boxes, colored by domain.

Layout comes from ELK (layered, orthogonal routing) via overview_layout.mjs; the result is
converted to draw.io and must still pass check_erd.py (ELK alone does not guarantee 0 crossings).

Usage: (once) mkdir tmp/elk && cd tmp/elk && bun add elkjs ; then ERD_ELK_DIR=<that dir> python gen_overview.py
Fan-in tables listed in HUBS are drawn as one gray "(ref)" copy per FK so their edges never
have to fan across the whole canvas. Edges to `users` are omitted (30 FKs, noted in the footnote).
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import quoteattr

import gen_erd as g

OVERVIEW = "00-overview"
HERE = Path(__file__).resolve().parent
ELK_DIR = Path(os.environ.get("ERD_ELK_DIR", HERE.parent.parent.parent / "tmp" / "elk"))
HUBS = {"media_assets", "episodes", "historical_entities", "sources", "source_revisions"}
BOX_W = 240
PORT_PITCH = 16
MIN_H = 40
ELK_TIMEOUT_S = 120
COLORS = {
    "01-catalog": "#dae8fc", "02-content": "#d5e8d4", "03-release": "#ffe6cc", "04-quiz": "#e1d5e7",
    "05-engagement": "#fff2cc", "06-ai-review": "#f8cecc", "07-auth-ops": "#e6e6e6", "08-media": "#b0e3e6",
    "ref": "#f5f5f5",
}
NOTE = ("Tổng quan 45 bảng, màu theo domain (xám = bản tham chiếu (ref) của bảng được nhiều bảng khác trỏ tới). Dây = FK, nhãn = cột FK; "
        "đầu cha: đúng một / không-hoặc-một nếu FK nullable; đầu con: nhiều / không-hoặc-một nếu unique. "
        "30 FK tới users không vẽ dây.")


def make_input(T):
    dom = {t: d for d, ts in g.DOMAINS.items() for t in ts}
    nodes = [{"id": t, "dom": dom[t], "tab": t} for t in dom]
    edges, copies = [], {}
    for t in dom:
        for col, ref, _ in T[t]["fks"]:
            if ref == "users":
                continue
            if ref in HUBS:
                copies[ref] = copies.get(ref, 0) + 1
                rid = f"{ref}#{copies[ref]}"
                nodes.append({"id": rid, "dom": "ref", "tab": ref})
                ref = rid
            edges.append([ref, t, col])
    inc = {}
    for p, c, _ in edges:
        inc[p] = inc.get(p, 0) + 1
        inc[c] = inc.get(c, 0) + 1
    for n in nodes:
        n["h"] = max(MIN_H, PORT_PITCH * (inc.get(n["id"], 0) + 1))
    return {"nodes": nodes, "edges": edges, "width": BOX_W}


def run_elk(inp):
    (ELK_DIR / "in.json").write_text(json.dumps(inp), encoding="utf8")
    shutil.copy(HERE / "overview_layout.mjs", ELK_DIR / "run.mjs")
    subprocess.run(["bun", "run", "run.mjs"], cwd=ELK_DIR, check=True, timeout=ELK_TIMEOUT_S)
    return json.loads((ELK_DIR / "out.json").read_text(encoding="utf8"))


def to_drawio(T, inp, lay):
    ch = {c["id"]: c for c in lay["children"]}
    node = {n["id"]: n for n in inp["nodes"]}
    cells = []
    for nid, c in ch.items():
        n = node[nid]
        label = n["tab"] + (" (ref)" if n["dom"] == "ref" else "")
        cells.append(f'<mxCell id="t_{nid}" value={quoteattr(label)} style="shape=table;startSize={int(c["height"])};container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;fontStyle=1;align=center;html=1;fillColor={COLORS[n["dom"]]};strokeColor=#333333;fontColor=#1a1a1a;" vertex="1" parent="1"><mxGeometry x="{c["x"]}" y="{c["y"]}" width="{c["width"]}" height="{c["height"]}" as="geometry"/></mxCell>')
    frac = lambda pt, n: ((pt["x"] - ch[n]["x"]) / ch[n]["width"], (pt["y"] - ch[n]["y"]) / ch[n]["height"])
    for i, e in enumerate(lay["edges"]):
        p, c = e["sources"][0], e["targets"][0]
        col = inp["edges"][i][2]
        sec = e["sections"][0]
        ex, nx = frac(sec["startPoint"], p), frac(sec["endPoint"], c)
        cc = next(x for x in T[node[c]["tab"]]["cols"] if x[0] == col)
        one = any(u == [col] for u in T[node[c]["tab"]]["uq"])
        sa = "ERzeroToOne" if cc[2] else "ERmandOne"
        ea = "ERzeroToOne" if one else "ERmany"
        pts = "".join(f'<mxPoint x="{b["x"]}" y="{b["y"]}"/>' for b in sec.get("bendPoints", []))
        cells.append(f'<mxCell id="e{i}" value={quoteattr(col)} style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;fontSize=9;labelBackgroundColor=default;endArrow={ea};startArrow={sa};endFill=0;startFill=0;exitX={ex[0]:.6f};exitY={ex[1]:.6f};entryX={nx[0]:.6f};entryY={nx[1]:.6f};" edge="1" parent="1" source="t_{p}" target="t_{c}"><mxGeometry relative="1" as="geometry"><Array as="points">{pts}</Array></mxGeometry></mxCell>')
    y, x = lay["height"] + 40, 0
    for d, colr in COLORS.items():
        if d == "ref":
            continue
        cells.append(f'<mxCell id="lg_{d}" value={quoteattr(d)} style="rounded=0;fillColor={colr};strokeColor=#333333;fontColor=#1a1a1a;html=1;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="150" height="26" as="geometry"/></mxCell>')
        x += 160
    cells.append(f'<mxCell id="note" value={quoteattr(NOTE)} style="text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="0" y="{y + 40}" width="1400" height="40" as="geometry"/></mxCell>')
    cells.append(g.title_cell(OVERVIEW, lay["width"]))
    xml = f'<mxfile host="drawio"><diagram name="{OVERVIEW}" id="d1"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>{"".join(cells)}</root></mxGraphModel></diagram></mxfile>'
    out = HERE / f"{OVERVIEW}.drawio"
    out.write_text(xml, encoding="utf8")
    return out


if __name__ == "__main__":
    T = g.parse()
    inp = make_input(T)
    out = to_drawio(T, inp, run_elk(inp))
    print(f"{len(inp['nodes'])} boxes, {len(inp['edges'])} edges -> {out.name}")
    sys.exit(0)
