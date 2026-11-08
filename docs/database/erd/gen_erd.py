"""Generate a per-domain ERD (.drawio) from docs/database/schema.sql.

Usage: python gen_erd.py <domain-id|all>   (ids: see DOMAINS)
Writes docs/database/erd/<domain-id>.drawio, then verify with check_erd.py.

Layout: tables in layered columns (parents left). Every edge leaves a table side at its own
port and runs through its own lane in a column gutter (or a top corridor when it skips
columns), so edges never share a segment. Table order / lane order are searched randomly
(fixed seed) for zero edge-table and edge-edge crossings; a domain that cannot reach zero
is reported, never silently accepted. Edges to `users` are omitted on purpose.
"""
import math
import random
import re
import sys
from pathlib import Path
from xml.sax.saxutils import quoteattr

import check_erd as chk

HERE = Path(__file__).resolve().parent
SCHEMA = HERE.parent / "schema.sql"
TW, RH, HH = 400, 26, 30
W = [56, 150, 150, 44]
GRID_COLS = 3
GAP_Y = 70            # vertical gap between stacked tables
LANE_STEP = 26
GUTTER_BASE = 60
CORRIDOR_STEP = 18
STUB_MAX_PORTS = 1    # one stub copy per FK: stub sits right next to its child, so no edge skips a column
PORT_NOISE = 600   # px; lets the search reorder ports on a table side
RESTARTS = 30
CLIMB_STEPS = 1500
SEED = 7
DOMAINS = {'01-catalog': ['historical_periods', 'historical_phases', 'historical_entities', 'historical_entity_revisions', 'historical_citations', 'sources', 'source_pages', 'source_revisions', 'topics'], '02-content': ['series', 'episodes', 'episode_narrations', 'episode_attachments', 'episode_entity_tags', 'series_sources'], '03-release': ['release_schedules', 'production_assignments', 'release_reassignment_tickets', 'episode_reviews', 'release_reminders', 'outbox_events'], '04-quiz': ['quizzes', 'quiz_questions', 'quiz_options', 'quiz_attempts', 'quiz_workspace_drafts'], '05-engagement': ['listening_progress', 'mission_templates', 'weekly_missions', 'user_weekly_missions', 'user_weekly_mission_items', 'xp_awards'], '06-ai-review': ['ai_checks', 'ai_check_items', 'ai_narrative_angles'], '07-auth-ops': ['users', 'sessions', 'accounts', 'verifications', 'idempotency_keys', 'rate_limit_buckets', 'system_configs', 'audit_logs', 'exhibitions'], '08-media': ['media_assets']}
FOOTNOTE = "Chú thích: PK khóa chính | FK khóa ngoại | UQ unique | N nullable (không có N = NOT NULL). "
FOOTNOTE_OTHER = FOOTNOTE + "Cột *_by_id → users không vẽ dây. Bảng xám (stub) thuộc domain khác."
TITLES = {
    "00-overview": "Tổng quan — toàn bộ 45 bảng của Su-Ky, tô màu theo domain; dây = khóa ngoại (không gồm FK tới users)",
    "01-catalog": "Catalog — kho tri thức lịch sử: thời kỳ, giai đoạn, nhân vật/sự kiện (kèm bản sửa), trích dẫn, nguồn tư liệu, chủ đề",
    "02-content": "Content — series, tập, lời dẫn (narration), tệp đính kèm, gắn thực thể lịch sử vào tập, nguồn của series",
    "03-release": "Release — lịch phát hành, phân công sản xuất, đổi người phụ trách, duyệt tập, nhắc lịch, outbox sự kiện",
    "04-quiz": "Quiz — bài quiz của tập, câu hỏi, đáp án, lượt làm bài, bản nháp quiz",
    "05-engagement": "Engagement — tiến độ nghe, nhiệm vụ tuần (mẫu, nhiệm vụ, tiến độ người dùng), điểm XP",
    "06-ai-review": "AI review — lượt kiểm tra AI cho tập, chi tiết từng mục kiểm, góc kể chuyện gợi ý",
    "07-auth-ops": "Auth & Ops — người dùng, phiên, tài khoản, xác minh; idempotency, rate limit, cấu hình hệ thống, audit log, triển lãm",
    "08-media": "Media — kho tệp media dùng chung, được nhiều domain tham chiếu",
}
TITLE_MIN_W = 500
TITLE_CHAR_PX = 12   # rough bold 20px glyph width, to size the wrapped text box
TITLE_LINE_PX = 28


def title_cell(dom_id, width):
    """Heading above the diagram: '<id> · <what this domain draws>', box sized to wrap inside `width`."""
    text = f"{dom_id} · {TITLES[dom_id]}"
    w = max(int(width), TITLE_MIN_W)
    h = TITLE_LINE_PX * math.ceil(len(text) * TITLE_CHAR_PX / w) + 8
    return f'<mxCell id="title" value={quoteattr(text)} style="text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;fontSize=20;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="40" y="{-h - 20}" width="{w}" height="{h}" as="geometry"/></mxCell>'


def parse():
    s = SCHEMA.read_text(encoding="utf8")
    T = {}
    for m in re.finditer(r"CREATE TABLE (\w+) \((.*?)\n\);", s, re.S):
        name, body = m.groups()
        t = {"cols": [], "fks": [], "uq": [], "pk": []}
        for line in body.split("\n"):
            line = line.strip().rstrip(",")
            if not line:
                continue
            if line.startswith("PRIMARY KEY"):
                t["pk"] = re.findall(r"\w+", line[line.index("(") :])
            elif line.startswith("CONSTRAINT"):
                fk = re.search(r"FOREIGN KEY \((\w+)\) REFERENCES (\w+) \((\w+)\)", line)
                uq = re.search(r"UNIQUE \(([^)]*)\)", line)
                if fk:
                    t["fks"].append(fk.groups())
                elif uq:
                    t["uq"].append([c.strip() for c in uq.group(1).split(",")])
            else:
                cn, ty, rest = (line.split(None, 2) + [""])[:3]
                ty_m = re.match(r"([A-Za-z_0-9]+(?:\(\d+(?:,\d+)?\))?)\s*(.*)", line.split(None, 1)[1])
                ty, rest = ty_m.groups()
                t["cols"].append((cn, ty, "NOT NULL" not in rest and "PRIMARY" not in rest, rest))
                if re.search(r"\bUNIQUE\b", rest):
                    t["uq"].append([cn])
        T[name] = t
    return T


def build(T, dom_id):
    tabs = DOMAINS[dom_id]
    edges, stub_users = [], {}
    for t in tabs:
        for col, ref, _rc in T[t]["fks"]:
            if ref == "users" and "users" not in tabs:  # users is drawn only in its own domain
                continue
            if ref == t:
                raise SystemExit(f"self reference {t}.{col}: draw manually")
            edges.append([ref, t, col])
            if ref not in tabs:
                stub_users.setdefault(ref, []).append(len(edges) - 1)
    nodes = {t: {"stub": False, "h": HH + RH * len(T[t]["cols"]), "tab": t} for t in tabs}
    for ref, idxs in stub_users.items():
        n_copy = math.ceil(len(idxs) / STUB_MAX_PORTS)
        for k in range(n_copy):
            nid = ref if n_copy == 1 else f"{ref}#{k + 1}"
            nodes[nid] = {"stub": True, "h": HH + RH, "tab": ref}
            for i in idxs[k * STUB_MAX_PORTS : (k + 1) * STUB_MAX_PORTS]:
                edges[i][0] = nid
    return nodes, edges


def layers(nodes, edges):
    lay = {n: 0 for n in nodes}
    for _ in range(len(nodes) + 1):
        changed = False
        for p, c, _ in edges:
            if not nodes[p]["stub"] and lay[c] < lay[p] + 1:
                lay[c] = lay[p] + 1
                changed = True
        if not changed:
            break
    else:
        raise SystemExit("cycle in FK graph: draw manually")
    for n, v in nodes.items():
        if v["stub"]:
            lay[n] = max(lay[c] for p, c, _ in edges if p == n) + 1
    return lay


def order_lanes(users, info, perm):
    """Order one gutter's lanes (left to right) so no edge's horizontal crosses another's vertical.

    info[key] = (span_lo, span_hi, left_ys, right_ys). Lane i may sit left of lane j iff i's
    right-hand horizontals miss j's vertical and j's left-hand horizontals miss i's vertical.
    A topological order of that relation is zero-crossing; `perm` breaks ties (search state).
    """
    def inside(y, k):
        lo, hi = info[k][0], info[k][1]
        return lo + chk.EPS < y < hi - chk.EPS

    def ok(i, j):
        return not any(inside(y, j) for y in info[i][3]) and not any(inside(y, i) for y in info[j][2])

    rest = sorted(users, key=lambda k: perm[k])
    out = []
    while rest:
        pick = next((k for k in rest if all(ok(k, o) or not ok(o, k) for o in rest if o != k)), rest[0])
        out.append(pick)
        rest.remove(pick)
    return out


def layout(nodes, edges, lay, order, lane_perm):
    """Return geometry for one candidate; pure function of order + lane_perm."""
    ncol = max(lay.values()) + 1
    cls = []
    for p, c, _ in edges:
        d = lay[c] - lay[p]
        cls.append("rev" if nodes[p]["stub"] else "same" if d == 0 else "adj" if d == 1 else "skip")
    users = {g: [] for g in range(-1, ncol)}  # gutter g sits right of column g; -1 = left margin
    for i, (p, c, _) in enumerate(edges):
        if cls[i] == "adj":
            users[lay[p]].append((i, "L"))
        elif cls[i] == "rev":
            users[lay[c]].append((i, "L"))
        elif cls[i] == "skip":
            users[lay[p]].append((i, "Lp"))
            users[lay[c] - 1].append((i, "Lc"))
        else:
            users[lay[p] - 1].append((i, "L"))
    n_skip = cls.count("skip")
    gw = {g: GUTTER_BASE + LANE_STEP * len(u) for g, u in users.items()}
    col_x = {}
    x = gw[-1]
    for c in range(ncol):
        col_x[c] = x
        x += TW + gw[c]
    ytop = 30 + CORRIDOR_STEP * n_skip + 20
    ypos = {}
    for c in range(ncol):
        y = ytop
        for n in order[c]:
            ypos[n] = y
            y += nodes[n]["h"] + GAP_Y
    ctr = {n: ypos[n] + nodes[n]["h"] / 2 for n in nodes}
    skips = sorted((i for i in range(len(edges)) if cls[i] == "skip"), key=lambda i: lane_perm["C"][i])
    corr = {i: 30 + CORRIDOR_STEP * k for k, i in enumerate(skips)}
    side_users = {}
    for i, (p, c, _) in enumerate(edges):
        ps, cs = ("L", "L") if cls[i] == "same" else ("L", "R") if cls[i] == "rev" else ("R", "L")
        pk = corr.get(i, ctr[c])
        ck = corr.get(i, ctr[p])
        side_users.setdefault((p, ps), []).append((pk + lane_perm["P"].get((i, "p"), 0.0), i, "p"))
        side_users.setdefault((c, cs), []).append((ck + lane_perm["P"].get((i, "c"), 0.0), i, "c"))
    port_y = {}
    for (n, side), lst in side_users.items():
        lst.sort()
        for r, (_, i, role) in enumerate(lst):
            port_y[(i, role)] = ypos[n] + nodes[n]["h"] * (r + 1) / (len(lst) + 1)
    lane_x = {}
    for g, u in users.items():
        info = {}
        for (i, role) in u:
            ey, ty = port_y[(i, "p")], port_y[(i, "c")]
            if role == "Lp":
                info[(i, role)] = (min(ey, corr[i]), max(ey, corr[i]), [ey], [])
            elif role == "Lc":
                info[(i, role)] = (min(ty, corr[i]), max(ty, corr[i]), [], [ty])
            elif cls[i] == "same":
                info[(i, role)] = (min(ey, ty), max(ey, ty), [], [ey, ty])
            elif cls[i] == "rev":
                info[(i, role)] = (min(ey, ty), max(ey, ty), [ty], [ey])
            else:
                info[(i, role)] = (min(ey, ty), max(ey, ty), [ey], [ty])
        left = 0 if g == -1 else col_x[g] + TW
        for rank, key in enumerate(order_lanes(u, info, lane_perm[g])):
            lane_x[key] = left + 28 + LANE_STEP * rank
    geo = {"rects": {}, "edges": [], "ypos": ypos, "col_x": col_x, "corr": corr}
    for n in nodes:
        geo["rects"][n] = (n, col_x[lay[n]], ypos[n], TW, nodes[n]["h"])
    for i, (p, c, col) in enumerate(edges):
        ey, ty = port_y[(i, "p")], port_y[(i, "c")]
        if cls[i] == "same":
            ex = nx = col_x[lay[p]]
            pts = [(lane_x[(i, "L")], ey), (lane_x[(i, "L")], ty)]
        elif cls[i] == "rev":
            ex, nx = col_x[lay[p]], col_x[lay[c]] + TW
            pts = [(lane_x[(i, "L")], ey), (lane_x[(i, "L")], ty)]
        else:
            ex, nx = col_x[lay[p]] + TW, col_x[lay[c]]
            if cls[i] == "adj":
                pts = [(lane_x[(i, "L")], ey), (lane_x[(i, "L")], ty)]
            else:
                Y = corr[i]
                pts = [(lane_x[(i, "Lp")], ey), (lane_x[(i, "Lp")], Y), (lane_x[(i, "Lc")], Y), (lane_x[(i, "Lc")], ty)]
        geo["edges"].append({"i": i, "exit": (ex, ey), "entry": (nx, ty), "pts": pts})
    return geo


def violations(geo):
    paths = []
    for e in geo["edges"]:
        path = [e["exit"]] + e["pts"] + [e["entry"]]
        paths.append(list(zip(path, path[1:])))
    bad = 0
    for segs in paths:
        for sg in segs:
            for r in geo["rects"].values():
                bad += chk.seg_rect(sg, r)
    for a in range(len(paths)):
        for b in range(a + 1, len(paths)):
            for s1 in paths[a]:
                for s2 in paths[b]:
                    bad += chk.seg_seg(s1, s2)
    return bad


def search(nodes, edges, lay):
    rnd = random.Random(SEED)
    ncol = max(lay.values()) + 1
    cols = [[n for n in nodes if lay[n] == c] for c in range(ncol)]
    keys = {g: [] for g in range(-1, ncol)}
    for i, (p, c, _) in enumerate(edges):
        d = lay[c] - lay[p]
        if nodes[p]["stub"]:
            keys[lay[c]].append((i, "L"))
        elif d == 1:
            keys[lay[p]].append((i, "L"))
        elif d > 1:
            keys[lay[p]].append((i, "Lp"))
            keys[lay[c] - 1].append((i, "Lc"))
        else:
            keys[lay[p] - 1].append((i, "L"))
    keys["P"] = [(i, r) for i in range(len(edges)) for r in "pc"]
    keys["C"] = [i for i, (p, c, _) in enumerate(edges) if not nodes[p]["stub"] and lay[c] - lay[p] > 1]
    best, best_geo = None, None
    for restart in range(RESTARTS):
        order = [rnd.sample(c, len(c)) for c in cols]
        lane_perm = {g: {k: (0.0 if g == "P" else rnd.random()) for k in ks} for g, ks in keys.items()}
        cur = violations(layout(nodes, edges, lay, order, lane_perm))
        for _ in range(CLIMB_STEPS):
            o2 = [list(c) for c in order]
            lp2 = {g: dict(d) for g, d in lane_perm.items()}
            if rnd.random() < 0.5:
                c = rnd.choice(o2)
                if len(c) > 1:
                    i, j = rnd.sample(range(len(c)), 2)
                    c[i], c[j] = c[j], c[i]
            else:
                g = rnd.choice([g for g, ks in keys.items() if len(ks) > 1] or [None])
                if g is not None:
                    if g == "P":
                        lp2[g][rnd.choice(keys[g])] = rnd.uniform(-PORT_NOISE, PORT_NOISE)
                    else:
                        k1, k2 = rnd.sample(keys[g], 2)
                        lp2[g][k1], lp2[g][k2] = lp2[g][k2], lp2[g][k1]
            geo = layout(nodes, edges, lay, o2, lp2)
            v = violations(geo)
            if v <= cur:
                order, lane_perm, cur = o2, lp2, v
                if best is None or v < best:
                    best, best_geo = v, geo
                if v == 0:
                    return 0, geo
    return best, best_geo


def emit(T, dom_id, nodes, edges, geo):
    cells = []
    sid = lambda n: "t_" + re.sub(r"\W", "_", n)
    for n, nd in nodes.items():
        tab = T[nd["tab"]]
        r = geo["rects"][n]
        fkc = {c for c, _, _ in tab["fks"]}
        cols = [c for c in tab["cols"] if c[0] in tab["pk"]] if nd["stub"] else tab["cols"]
        label = nd["tab"] + (" (stub)" if nd["stub"] else "")
        fill = "fillColor=#f5f5f5;fontColor=#333333;" if nd["stub"] else ""
        cells.append(f'<mxCell id="{sid(n)}" value={quoteattr(label)} style="shape=table;startSize={HH};container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;html=1;{fill}" vertex="1" parent="1"><mxGeometry x="{r[1]}" y="{r[2]}" width="{TW}" height="{r[4]}" as="geometry"/></mxCell>')
        for i, (cn, ty, nl, _) in enumerate(cols):
            key = []
            if cn in tab["pk"]:
                key.append("PK")
            if cn in fkc and not nd["stub"]:
                key.append("FK")
            if any(u == [cn] for u in tab["uq"]):
                key.append("UQ")
            rid = f"{sid(n)}_{cn}"
            cells.append(f'<mxCell id="{rid}" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;top=0;left=0;right=0;bottom=0;html=1;" vertex="1" parent="{sid(n)}"><mxGeometry y="{HH + RH * i}" width="{TW}" height="{RH}" as="geometry"/></mxCell>')
            xo = 0
            for j, (v, wd) in enumerate(zip([",".join(key), cn, ty, "N" if nl else ""], W)):
                fs = "fontStyle=1;" if j == 0 else ("fontStyle=5;" if j == 1 and "PK" in key else "")
                al = "align=center;" if j in (0, 3) else "align=left;spacingLeft=6;"
                cells.append(f'<mxCell id="{rid}_{j}" value={quoteattr(v)} style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;overflow=hidden;{fs}{al}" vertex="1" parent="{rid}"><mxGeometry x="{xo}" width="{wd}" height="{RH}" as="geometry"><mxRectangle width="{wd}" height="{RH}" as="alternateBounds"/></mxGeometry></mxCell>')
                xo += wd
    for e in geo["edges"]:
        p, c, col = edges[e["i"]]
        rp, rc = geo["rects"][p], geo["rects"][c]
        cc = next(x for x in T[nodes[c]["tab"]]["cols"] if x[0] == col)
        one = any(u == [col] for u in T[nodes[c]["tab"]]["uq"])
        sa = "ERzeroToOne" if cc[2] else "ERmandOne"
        ea = "ERzeroToOne" if one else "ERmany"
        fr = lambda pt, r: ((pt[0] - r[1]) / r[3], (pt[1] - r[2]) / r[4])
        ex, nx = fr(e["exit"], rp), fr(e["entry"], rc)
        pts = "".join(f'<mxPoint x="{a}" y="{b}"/>' for a, b in e["pts"])
        cells.append(f'<mxCell id="e{e["i"]}" value={quoteattr(col)} style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;fontSize=10;labelBackgroundColor=default;endArrow={ea};startArrow={sa};endFill=0;startFill=0;exitX={ex[0]:.6f};exitY={ex[1]:.6f};entryX={nx[0]:.6f};entryY={nx[1]:.6f};" edge="1" parent="1" source="{sid(p)}" target="{sid(c)}"><mxGeometry relative="1" as="geometry"><Array as="points">{pts}</Array></mxGeometry></mxCell>')
    ymax = max(r[2] + r[4] for r in geo["rects"].values())
    cells.append(f'<mxCell id="note" value={quoteattr(FOOTNOTE if "users" in DOMAINS[dom_id] else FOOTNOTE_OTHER)} style="text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="40" y="{ymax + 50}" width="1100" height="40" as="geometry"/></mxCell>')
    cells.append(title_cell(dom_id, max(r[1] + r[3] for r in geo["rects"].values()) - 40))
    xml = f'<mxfile host="drawio"><diagram name="{dom_id}" id="d1"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>{"".join(cells)}</root></mxGraphModel></diagram></mxfile>'
    out = HERE / f"{dom_id}.drawio"
    out.write_text(xml, encoding="utf8")
    return out


def run(dom_id):
    T = parse()
    nodes, edges = build(T, dom_id)
    lay = layers(nodes, edges) if edges else {n: 0 for n in nodes}
    if not edges:
        names = list(nodes)
        lay = {n: i % GRID_COLS for i, n in enumerate(names)}  # no FKs between tables: plain grid
        order = [[n for n in names if lay[n] == c] for c in range(GRID_COLS)]
        geo = layout(nodes, edges, lay, order, {"C": {}, "P": {}, **{g: {} for g in range(-1, GRID_COLS)}})
        best = 0
    else:
        best, geo = search(nodes, edges, lay)
    out = emit(T, dom_id, nodes, edges, geo)
    print(f"{dom_id}: {len(nodes)} nodes, {len(edges)} edges, search violations={best} -> {out.name}")
    return best


if __name__ == "__main__":
    ids = list(DOMAINS) if sys.argv[1] == "all" else [sys.argv[1]]
    sys.exit(1 if any(run(d) for d in ids if d != "01-catalog") else 0)
