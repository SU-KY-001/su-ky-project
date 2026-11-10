"""Machine-check a .drawio ERD: edges vs tables, edges vs edges.

Usage: python check_erd.py <file.drawio>
Exit code 1 when any violation is found.

Models orthogonal edges exactly as the generator emits them:
  exit point -> waypoints -> entry point, axis-aligned segments.
Edges without waypoints must be straight (exit and entry share an axis);
anything else is reported as UNMODELED rather than silently passed.
"""
import itertools
import re
import sys
import xml.etree.ElementTree as ET

EPS = 1.0  # px tolerance


def parse(path):
    root = ET.parse(path).getroot()
    tables, edges = {}, []
    for c in root.iter("mxCell"):
        style = c.get("style") or ""
        g = c.find("mxGeometry")
        if c.get("vertex") == "1" and "shape=table;" in style and g is not None:
            tables[c.get("id")] = (
                c.get("value"),
                float(g.get("x")), float(g.get("y")),
                float(g.get("width")), float(g.get("height")),
            )
        elif c.get("edge") == "1":
            st = dict(kv.split("=", 1) for kv in style.split(";") if "=" in kv)
            pts = [(float(p.get("x")), float(p.get("y"))) for p in c.iter("mxPoint")]
            edges.append((c.get("id"), c.get("value"), c.get("source"), c.get("target"), st, pts))
    return tables, edges


def port(t, fx, fy):
    _, x, y, w, h = t
    return (x + w * float(fx), y + h * float(fy))


def segments(tables, e):
    eid, label, src, tgt, st, pts = e
    a = port(tables[src], st["exitX"], st["exitY"])
    b = port(tables[tgt], st["entryX"], st["entryY"])
    path = [a] + pts + [b]
    if not pts and abs(a[0] - b[0]) > EPS and abs(a[1] - b[1]) > EPS:
        return None
    segs = list(zip(path, path[1:]))
    for (p, q) in segs:
        if abs(p[0] - q[0]) > EPS and abs(p[1] - q[1]) > EPS:
            return None  # diagonal => generator bug / unmodeled
    return segs


def seg_rect(seg, rect):
    (x1, y1), (x2, y2) = seg
    _, rx, ry, rw, rh = rect
    lx, hx = min(x1, x2), max(x1, x2)
    ly, hy = min(y1, y2), max(y1, y2)
    # shrink rect so touching the border at the port is not a hit
    return lx < rx + rw - EPS and hx > rx + EPS and ly < ry + rh - EPS and hy > ry + EPS


def seg_seg(s, t):
    (a, b), (c, d) = s, t
    def vert(p, q): return abs(p[0] - q[0]) <= EPS
    sv, tv = vert(a, b), vert(c, d)
    if sv == tv:  # parallel: overlap on the same line?
        if sv and abs(a[0] - c[0]) <= EPS:
            lo, hi = max(min(a[1], b[1]), min(c[1], d[1])), min(max(a[1], b[1]), max(c[1], d[1]))
            return hi - lo > EPS
        if not sv and abs(a[1] - c[1]) <= EPS:
            lo, hi = max(min(a[0], b[0]), min(c[0], d[0])), min(max(a[0], b[0]), max(c[0], d[0]))
            return hi - lo > EPS
        return False
    v, h = (s, t) if sv else (t, s)
    vx = v[0][0]
    hy = h[0][1]
    return (min(h[0][0], h[1][0]) + EPS < vx < max(h[0][0], h[1][0]) - EPS
            and min(v[0][1], v[1][1]) + EPS < hy < max(v[0][1], v[1][1]) - EPS)


def main(path):
    tables, edges = parse(path)
    segs = {}
    bad = 0
    for e in edges:
        s = segments(tables, e)
        name = f"{tables[e[2]][0]} -> {tables[e[3]][0]} [{e[1]}]"
        if s is None:
            print(f"UNMODELED  {name}")
            bad += 1
            continue
        segs[name] = s
        for seg in s:
            for tid, t in tables.items():
                if seg_rect(seg, t):
                    print(f"EDGE-THROUGH-TABLE  {name}  crosses  {t[0]}  seg={seg}")
                    bad += 1
    for (n1, s1), (n2, s2) in itertools.combinations(segs.items(), 2):
        for a in s1:
            for b in s2:
                if seg_seg(a, b):
                    print(f"EDGE-EDGE  {n1}  x  {n2}  at {a} / {b}")
                    bad += 1
    print(f"{len(tables)} tables, {len(edges)} edges, {bad} violations")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
