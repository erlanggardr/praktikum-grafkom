# P10 YOLO - UV quality report: texel density, stretch, coverage, overlap (run inside Blender)
import bpy, bmesh
import numpy as np
SIZE = 2048
MARGIN_PX = 0.006 * SIZE
o = bpy.data.objects["SciFi_Crate"]; me = o.data
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); uv = bm.loops.layers.uv.active
hid_l = bm.faces.layers.int.get("hidden")
dens = []; stretch = []; oob = 0; n_hidden = 0
ids = np.full((SIZE, SIZE), -1, np.int32)      # which face owns each texel
overlap = np.zeros((SIZE, SIZE), bool)          # texel claimed by two DIFFERENT faces
for f in bm.faces:
    wa = f.calc_area(); pts = [l[uv].uv.copy() for l in f.loops]; ua = 0
    for i in range(len(pts)):
        p, q = pts[i], pts[(i+1) % len(pts)]; ua += p.x*q.y - q.x*p.y
    ua = abs(ua)/2
    is_hidden = bool(hid_l and f[hid_l]); n_hidden += is_hidden
    if wa > 1e-9 and ua > 0 and not is_hidden: dens.append((ua/wa)**0.5*SIZE)
    r = []
    for l in f.loops:
        e3 = (l.vert.co - l.link_loop_next.vert.co).length
        e2 = (l[uv].uv - l.link_loop_next[uv].uv).length
        if e3 > 1e-6: r.append(e2/e3)
    if r and np.mean(r) > 0 and not is_hidden: stretch.append(max(r)/max(min(r), 1e-9))
    if any(not (0 <= p.x <= 1 and 0 <= p.y <= 1) for p in pts): oob += 1
    for i in range(1, len(pts)-1):
        a, b, c = pts[0], pts[i], pts[i+1]
        x0 = int(max(0, min(a.x, b.x, c.x)*SIZE)); x1 = int(min(SIZE-1, max(a.x, b.x, c.x)*SIZE))
        y0 = int(max(0, min(a.y, b.y, c.y)*SIZE)); y1 = int(min(SIZE-1, max(a.y, b.y, c.y)*SIZE))
        if x1 < x0 or y1 < y0: continue
        xs, ys = np.meshgrid(np.arange(x0, x1+1)+0.5, np.arange(y0, y1+1)+0.5); px, py = xs/SIZE, ys/SIZE
        d = (b.y-c.y)*(a.x-c.x) + (c.x-b.x)*(a.y-c.y)
        if abs(d) < 1e-14: continue
        w1 = ((b.y-c.y)*(px-c.x) + (c.x-b.x)*(py-c.y))/d
        w2 = ((c.y-a.y)*(px-c.x) + (a.x-c.x)*(py-c.y))/d
        m = (w1 > 0) & (w2 > 0) & (1-w1-w2 > 0)
        sub = ids[y0:y1+1, x0:x1+1]
        overlap[y0:y1+1, x0:x1+1] |= (m & (sub >= 0) & (sub != f.index))
        sub[m] = f.index
nm = sum(1 for e in bm.edges if len(e.link_faces) > 2); bd = sum(1 for e in bm.edges if len(e.link_faces) == 1)
bm.free()
d = np.array(dens); p10, p50, p90 = np.percentile(d, [10, 50, 90]); s = np.array(stretch)
print("METRICS visible faces %d (+%d hidden internal) | outside 0..1: %d | edges>2faces: %d | boundary edges: %d" % (len(d), n_hidden, oob, nm, bd))
print("texel density px/m @2K: min %.0f p10 %.0f median %.0f p90 %.0f max %.0f | p90/p10 = %.2f" % (d.min(), p10, p50, p90, d.max(), p90/p10))
print("edge stretch max/min per face (visible): median %.2f p95 %.2f max %.2f | faces>1.5: %d" % (np.median(s), np.percentile(s, 95), s.max(), (s > 1.5).sum()))
print("coverage %.1f%% | inter-face overlap px %d (%.5f%%) | margin %.1f px" % ((ids >= 0).sum()/ids.size*100, overlap.sum(), overlap.sum()/overlap.size*100, MARGIN_PX))
