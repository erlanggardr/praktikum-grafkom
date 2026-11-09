# P10 YOLO - seams -> unwrap -> equal texel density -> pack (run inside Blender)
import bpy, bmesh
import numpy as np
from collections import defaultdict
from mathutils import Vector

MARGIN = 0.006          # 12.3 px @ 2048
TINY = 0.004            # m2, islands smaller than this are merged into a neighbour
o = bpy.data.objects["SciFi_Crate"]
me = o.data
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
bpy.context.view_layer.objects.active = o
while len(me.uv_layers) > 1:
    me.uv_layers.remove(me.uv_layers[-1])
if not me.uv_layers:
    me.uv_layers.new(name="UVMap")
me.uv_layers[0].name = "UVMap"


def islands(bm):
    iid = {}; comps = []
    for f in bm.faces:
        if f.index in iid: continue
        k = len(comps); st = [f]; iid[f.index] = k; c = [f]
        while st:
            cur = st.pop()
            for e in cur.edges:
                if e.seam: continue
                for lf in e.link_faces:
                    if lf.index not in iid:
                        iid[lf.index] = k; st.append(lf); c.append(lf)
        comps.append(c)
    return iid, comps


# 1) seams where the dominant normal axis changes (+X,-X,+Y,-Y,+Z,-Z), boundaries always cut
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); bm.edges.ensure_lookup_table()
def grp(f):
    n = f.normal; a = max(range(3), key=lambda i: abs(n[i])); return a*2 + (0 if n[a] >= 0 else 1)
G = {f.index: grp(f) for f in bm.faces}
for e in bm.edges:
    fs = e.link_faces
    e.seam = (len(fs) != 2) or (G[fs[0].index] != G[fs[1].index])
n_axis = len(islands(bm)[1])
# 2) merge tiny islands (bevel strips etc.) into the neighbour sharing the longest border
for it in range(20):
    iid, comps = islands(bm); area = [sum(f.calc_area() for f in c) for c in comps]
    border = defaultdict(lambda: defaultdict(float))
    for e in bm.edges:
        fs = e.link_faces
        if e.seam and len(fs) == 2:
            a, b = iid[fs[0].index], iid[fs[1].index]
            if a != b:
                border[a][b] += e.calc_length(); border[b][a] += e.calc_length()
    touched = set(); merged = 0
    for k in sorted(range(len(comps)), key=lambda i: area[i]):
        if area[k] >= TINY or k in touched or not border[k]: continue
        cand = [t for t in border[k] if t not in touched]
        if not cand: continue
        tgt = max(cand, key=lambda t: border[k][t])
        for e in bm.edges:
            fs = e.link_faces
            if e.seam and len(fs) == 2 and {iid[fs[0].index], iid[fs[1].index]} == {k, tgt}:
                e.seam = False
        touched |= {k, tgt}; merged += 1
    if not merged: break
n_final = len(islands(bm)[1])
print("SEAMS islands %d -> %d | seam edges %d" % (n_axis, n_final, sum(e.seam for e in bm.edges)))
bm.to_mesh(me); bm.free()

# 3) unwrap + checker-test loop: faces that stretch (>STRETCH_MAX) are cut into their own island
STRETCH_MAX = 1.30
def unwrap():
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.unwrap(method='ANGLE_BASED', fill_holes=True, correct_aspect=True, margin=MARGIN)
    bpy.ops.object.mode_set(mode='OBJECT')
def face_stretch(f, uvl):
    r = []
    for l in f.loops:
        e3 = (l.vert.co - l.link_loop_next.vert.co).length
        e2 = (l[uvl].uv - l.link_loop_next[uvl].uv).length
        if e3 > 1e-6: r.append(e2/e3)
    return max(r)/max(min(r), 1e-9) if r else 1.0
def fold_pairs(bm, uvl, RES=1024, min_px=2):
    """pairs of faces whose UV triangles overlap (rasterised) -> returns set of (a,b)"""
    ids = np.full((RES, RES), -1, np.int32); pairs = defaultdict(int)
    for f in bm.faces:
        pts = [l[uvl].uv for l in f.loops]
        for i in range(1, len(pts)-1):
            a, b, c = pts[0], pts[i], pts[i+1]
            x0 = int(max(0, min(a.x, b.x, c.x)*RES)); x1 = int(min(RES-1, max(a.x, b.x, c.x)*RES))
            y0 = int(max(0, min(a.y, b.y, c.y)*RES)); y1 = int(min(RES-1, max(a.y, b.y, c.y)*RES))
            if x1 < x0 or y1 < y0: continue
            xs, ys = np.meshgrid(np.arange(x0, x1+1)+0.5, np.arange(y0, y1+1)+0.5); px, py = xs/RES, ys/RES
            d = (b.y-c.y)*(a.x-c.x) + (c.x-b.x)*(a.y-c.y)
            if abs(d) < 1e-14: continue
            w1 = ((b.y-c.y)*(px-c.x) + (c.x-b.x)*(py-c.y))/d
            w2 = ((c.y-a.y)*(px-c.x) + (a.x-c.x)*(py-c.y))/d
            m = (w1 > 0) & (w2 > 0) & (1-w1-w2 > 0); sub = ids[y0:y1+1, x0:x1+1]
            clash = m & (sub >= 0) & (sub != f.index)
            for oid in np.unique(sub[clash]):
                pairs[(int(oid), f.index)] += int((clash & (sub == oid)).sum())
            sub[m] = f.index
    return [k for k, n in pairs.items() if n >= min_px]
for rnd in range(8):
    unwrap()
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); uvl = bm.loops.layers.uv.active
    bad = [f for f in bm.faces if face_stretch(f, uvl) > STRETCH_MAX]
    folds = fold_pairs(bm, uvl)
    print("CHECKER round %d: %d stretched faces (>%.2f), %d folded/overlapping pairs" % (rnd, len(bad), STRETCH_MAX, len(folds)))
    if not bad and not folds:
        bm.free(); break
    for f in bad:
        for e in f.edges: e.seam = True
    for a, b in folds:
        shared = set(bm.faces[a].edges) & set(bm.faces[b].edges)
        for e in shared: e.seam = True
        if not shared:               # not neighbours: isolate the smaller face
            for e in bm.faces[b].edges: e.seam = True
    bm.to_mesh(me); bm.free()

# 4) equalise texel density island by island (fully hidden internal faces get a tiny island)
import math
from mathutils.bvhtree import BVHTree
HIDDEN_SCALE = 0.15
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); uv = bm.loops.layers.uv.active
def fib(n):
    ga = math.pi*(3-5**0.5)
    out = []
    for i in range(n):
        y = 1-2*(i+0.5)/n; r = (1-y*y)**0.5; t = ga*i
        out.append(Vector((math.cos(t)*r, y, math.sin(t)*r)))
    return out
DIRS = fib(66)
# visibility is tested on the bevelled shape the renderer actually sees
dg = bpy.context.evaluated_depsgraph_get()
ev = o.evaluated_get(dg).to_mesh()
bm_ev = bmesh.new(); bm_ev.from_mesh(ev); bm_ev.faces.ensure_lookup_table()
tree = BVHTree.FromBMesh(bm_ev, epsilon=1e-6)
def exposed(f):
    c = f.calc_center_median()
    samples = [c] + [c.lerp(v.co, 0.7) for v in f.verts[:4]]
    for p in samples:
        for d in DIRS:
            loc, nor, idx, dist = tree.ray_cast(p + d*20.0, -d)
            if loc is not None and (loc - p).length < 0.035:
                return True
    return False
EXP = {f.index: exposed(f) for f in bm.faces}
o.evaluated_get(dg).to_mesh_clear(); bm_ev.free()
hid_l = bm.faces.layers.int.get("hidden") or bm.faces.layers.int.new("hidden")
iid, comps = islands(bm)
hidden_isl = set()
for k, c in enumerate(comps):
    if not any(EXP[f.index] for f in c):
        hidden_isl.add(k)
for f in bm.faces: f[hid_l] = 1 if iid[f.index] in hidden_isl else 0
print("HIDDEN islands %d of %d | hidden faces %d of %d" % (len(hidden_isl), len(comps), sum(f[hid_l] for f in bm.faces), len(bm.faces)))
def uv_area(c):
    s = 0
    for f in c:
        pts = [l[uv].uv for l in f.loops]; a = 0
        for i in range(len(pts)):
            p, q = pts[i], pts[(i+1) % len(pts)]; a += p.x*q.y - q.x*p.y
        s += abs(a)/2
    return s
W = [sum(f.calc_area() for f in c) for c in comps]; U = [uv_area(c) for c in comps]
dens = [(u/w)**0.5 if w > 0 and u > 0 else 0 for u, w in zip(U, W)]
vis_w = [w if k not in hidden_isl else 0 for k, w in enumerate(W)]
tgt = float(np.average(dens, weights=vis_w))
for k, (c, d) in enumerate(zip(comps, dens)):
    if d <= 0: continue
    s = (tgt/d) * (HIDDEN_SCALE if k in hidden_isl else 1.0); cen = Vector((0, 0)); n = 0
    for f in c:
        for l in f.loops: cen += l[uv].uv; n += 1
    cen /= n
    for f in c:
        for l in f.loops: l[uv].uv = cen + (l[uv].uv - cen)*s
bm.to_mesh(me); bm.free()

# 5) pack with a safe margin (uniform scale keeps relative density)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=MARGIN, shape_method='CONCAVE')
bpy.ops.object.mode_set(mode='OBJECT')
print("UV pipeline done")
