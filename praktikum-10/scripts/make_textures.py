#!/usr/bin/env python3
"""P10 YOLO - procedural PBR textures for SciFi_Crate (own work, no external images).

Position-bake approach: every texel of the UV layout is mapped back to its object-space
position/normal by rasterising the mesh triangles into UV space.  All patterns (hazard
stripes, panel grooves, rivets, wear, LEDs...) are then functions of 3D position, so they
stay correct for any UV layout.  Normal map = gradient of a height field in UV space.
usage: make_textures.py <crate_tris.npz> <out_dir> [size] [median_px_per_m_at_2K]
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

npz, out = sys.argv[1], sys.argv[2]
S = int(sys.argv[3]) if len(sys.argv) > 3 else 2048
d = np.load(npz)
UV, POS, NRM, PID, MAT, HID = d["uv"], d["pos"], d["nrm"], d["pid"], d["mat"], d["hidden"]

# ---------------------------------------------------------------- bake position / normal / part
P = np.zeros((S, S, 3), np.float32); N = np.zeros((S, S, 3), np.float32)
PART = np.full((S, S), -1, np.int8); VALID = np.zeros((S, S), bool)
order = np.argsort(-HID)                       # hidden first, visible faces overwrite
for t in order:
    if MAT[t] != 0:                            # rubber slot is not textured by this atlas
        continue
    a, b, c = UV[t]
    x0 = int(max(0, np.floor(min(a[0], b[0], c[0]) * S))); x1 = int(min(S-1, np.ceil(max(a[0], b[0], c[0]) * S)))
    y0 = int(max(0, np.floor(min(a[1], b[1], c[1]) * S))); y1 = int(min(S-1, np.ceil(max(a[1], b[1], c[1]) * S)))
    if x1 < x0 or y1 < y0: continue
    xs, ys = np.meshgrid(np.arange(x0, x1+1) + 0.5, np.arange(y0, y1+1) + 0.5)
    px, py = xs / S, ys / S
    den = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
    if abs(den) < 1e-14: continue
    w1 = ((b[1]-c[1])*(px-c[0]) + (c[0]-b[0])*(py-c[1])) / den
    w2 = ((c[1]-a[1])*(px-c[0]) + (a[0]-c[0])*(py-c[1])) / den
    w3 = 1 - w1 - w2
    m = (w1 >= -1e-4) & (w2 >= -1e-4) & (w3 >= -1e-4)
    if not m.any(): continue
    pos = w1[..., None]*POS[t, 0] + w2[..., None]*POS[t, 1] + w3[..., None]*POS[t, 2]
    sl = (slice(y0, y1+1), slice(x0, x1+1))
    P[sl][m] = pos[m]; N[sl][m] = NRM[t]; PART[sl][m] = PID[t]; VALID[sl][m] = True

# distance (px) from the island border -> used as an "edge" mask for paint wear
EDGE_PX = ndi.distance_transform_edt(VALID).astype(np.float32)
# bleed the baked data into the margin so filtering/mip-maps never show background
idx = ndi.distance_transform_edt(~VALID, return_distances=False, return_indices=True)
P = P[idx[0], idx[1]]; N = N[idx[0], idx[1]]; PART = PART[idx[0], idx[1]]
x, y, z = P[..., 0], P[..., 1], P[..., 2]
nx, ny, nz = N[..., 0], N[..., 1], N[..., 2]
ax = np.argmax(np.abs(N), axis=-1)             # dominant axis of the surface
u = np.where(ax == 0, y, x); v = np.where(ax == 2, y, z)       # in-plane coordinates (m)
DENS = float(sys.argv[4]) * S / 2048 if len(sys.argv) > 4 else 202.0 * S / 2048   # px/m (median measured @2K)
MPP = 1.0 / DENS
rng = np.random.default_rng(1042)


def sstep(e0, e1, v_):
    t = np.clip((v_ - e0) / (e1 - e0), 0, 1); return t*t*(3-2*t)


def noise3(scale, octaves=3, seed=0):
    r = np.random.default_rng(seed); acc = np.zeros((S, S), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        for _ in range(5):
            dvec = r.normal(size=3); dvec /= np.linalg.norm(dvec)
            ph = r.uniform(0, 6.283)
            acc += amp * np.sin(6.283*scale*(P @ dvec) + ph); tot += amp
        scale *= 2.1; amp *= 0.5
    return (acc/tot * 0.5 + 0.5).astype(np.float32)


def tri(w):
    return np.abs((w % 1.0) * 2 - 1)


n_lo, n_mid, n_hi = noise3(1.3, 3, 1), noise3(6.0, 3, 2), noise3(40.0, 2, 3)
body, lid, brk, arm = (PART == 0), (PART == 1), (PART == 2), (PART == 3)
side = (ax != 2)

# ---------------------------------------------------------------- layout patterns
# panel grooves (grid) on body + lid
gw = 0.0035
lineu = np.abs((u + 0.25) % 0.5 - 0.25); linev = np.abs((v + 0.2) % 0.4 - 0.2)
groove = (sstep(gw+0.0015, gw-0.0015, lineu) + sstep(gw+0.0015, gw-0.0015, linev)).clip(0, 1) * (body | lid)
# rivets at the groove crossings (every 0.1 m along the vertical grooves)
ru = (u + 0.25) % 0.5 - 0.25; rv = (v + 0.05) % 0.1 - 0.05
rivet = sstep(0.0115, 0.0085, np.hypot(ru, rv)) * (body | lid) * (np.abs(ru) < 0.02)
# hazard stripes on the lower skirt of the body
skirt = sstep(-0.455, -0.465, z) * body * side
stripe = sstep(0.48, 0.52, tri((u + v) / 0.07))               # 0=yellow 1=black, soft AA edge
hazard = skirt
# armour plate: diamond tread + bare metal
diam = np.clip(tri((u + v) / 0.035) * tri((u - v) / 0.035), 0, 1) ** 0.5
# edge wear (paint chipped on hard edges): island-border distance + noise
edge = np.exp(-EDGE_PX / 2.0)
wear = sstep(0.55, 0.85, edge * 0.75 + (n_mid - 0.5) * 0.8 + (n_hi - 0.5) * 0.35)
wear *= (~arm)
# scratches
scr = np.zeros((S, S), np.float32)
for k, (ang, fr) in enumerate([(0.3, 5), (1.9, 7), (2.6, 9)]):      # ~1.5 px wide lines
    w_ = x*np.cos(ang) + y*np.sin(ang) + z*np.cos(ang*1.7)
    scr = np.maximum(scr, sstep(0.26, 0.14, np.abs(np.sin(6.283*fr*w_))) * (noise3(5.0, 1, 20+k) > 0.80))
scr = scr.astype(np.float32) * (~arm)

# ---------------------------------------------------------------- BASE COLOR (sRGB, painted)
navy = np.array([0.050, 0.072, 0.110], np.float32)
navy2 = np.array([0.085, 0.108, 0.150], np.float32)
steel = np.array([0.560, 0.565, 0.580], np.float32)
yellow = np.array([0.820, 0.520, 0.030], np.float32)
graph = np.array([0.075, 0.080, 0.088], np.float32)
col = np.zeros((S, S, 3), np.float32)
col[:] = navy
col = np.where(lid[..., None], navy2, col)
lidtop = (lid & (nz > 0.9) & (z > 0.69))
col = np.where(lidtop[..., None], np.array([0.17, 0.18, 0.205], np.float32), col)   # lid plate: lighter
col = np.where(brk[..., None], yellow, col)
col = np.where(arm[..., None], graph, col)
col = col * (0.82 + 0.36 * n_lo[..., None])                          # large-scale paint variation
col = col * (1 - 0.35 * groove[..., None])                           # dark grooves
col = np.where(hazard[..., None] > 0.5, np.where(stripe[..., None] > 0.5, np.array([0.015, 0.015, 0.018], np.float32), yellow), col)
col = np.where(rivet[..., None] > 0.5, steel * 0.7, col)
dirt = sstep(0.55, 0.9, n_mid)[..., None] * 0.35
col = col * (1 - dirt * (~arm)[..., None])
col = np.where(wear[..., None] > 0.45, steel * (0.55 + 0.45 * n_hi[..., None]), col)   # bare steel where chipped
col = np.where(scr[..., None] > 0.5, steel * 0.42, col)
col = np.clip(col, 0, 1)

# ---------------------------------------------------------------- METALLIC
metal = np.zeros((S, S), np.float32)
metal = np.where(arm, 0.92, metal)                                    # armour plate = bare gunmetal
metal = np.maximum(metal, (wear > 0.45).astype(np.float32))           # chipped paint exposes metal
metal = np.maximum(metal, (rivet > 0.5).astype(np.float32))
metal = np.maximum(metal, 0.45 * (scr > 0.5).astype(np.float32))
metal = np.where(arm, 0.92 - 0.12 * n_hi, metal)                      # micro variation on bare metal
metal = np.clip(metal, 0, 1)

# ---------------------------------------------------------------- ROUGHNESS (custom variation)
rough = 0.52 + 0.16 * (n_lo - 0.5) * 2 + 0.07 * (n_hi - 0.5) * 2      # painted: patchy
rough = np.where(lid, rough - 0.05, rough)
rough = np.where(brk, rough - 0.06, rough)
rough = np.where(arm, 0.30 + 0.12 * tri(u / 0.004) * 0.5 + 0.10 * (n_hi - 0.5), rough)   # brushed
rough = np.where(groove > 0.5, 0.85, rough)
rough = np.where(hazard > 0.5, 0.46 + 0.05 * (n_hi - 0.5), rough)
rough = np.where(wear > 0.45, 0.28 + 0.2 * n_hi, rough)
rough = np.where(scr > 0.5, 0.40, rough)
rough = np.where(rivet > 0.5, 0.3, rough)
rough = np.clip(rough, 0.05, 1.0)

# ---------------------------------------------------------------- EMISSION (colour + separate mask)
emit_col = np.zeros((S, S, 3), np.float32); emask = np.zeros((S, S), np.float32)
cyan = np.array([0.10, 0.85, 1.00], np.float32); orange = np.array([1.00, 0.42, 0.04], np.float32)
def led(mask, color):
    global emit_col, emask
    emask = np.maximum(emask, mask.astype(np.float32))
    emit_col = np.where(mask[..., None] > 0.01, color, emit_col)
front = arm & (ny > 0.9)
led(front * (np.abs(np.abs(x) - 0.45) < 0.011) * (np.abs(z) < 0.19), orange)                      # two vertical bars
dots = front * (np.hypot((((x + 0.3) % 0.1) - 0.05), z - 0.19) < 0.011) * (np.abs(x) < 0.31)
led(dots, cyan)                                                                                    # LED row
dring = np.maximum(np.abs(x) - 0.93, np.abs(y) - 0.63)
led(lidtop * (np.abs(dring) < 0.0045), cyan)                                                       # lid ring
led(body * (nx > 0.9) * (np.abs(y) < 0.13) * (np.abs(z - 0.32) < 0.018), cyan)                     # +X status bar
led(body * (nx < -0.9) * (np.abs(y) < 0.13) * (np.abs(z - 0.32) < 0.018), orange)                  # -X status bar
emask = ndi.gaussian_filter(emask, 0.6)                                                           # soft AA
emit_col = np.clip(ndi.gaussian_filter(emit_col, (0.6, 0.6, 0)), 0, 1)

# ---------------------------------------------------------------- HEIGHT -> TANGENT-SPACE NORMAL
h = np.zeros((S, S), np.float32)
h -= 0.0028 * groove                                    # grooves cut in
h += 0.0030 * rivet                                     # rivet heads
h += 0.0009 * diam * arm                                # diamond tread
h += 0.0006 * (hazard > 0.5) * (stripe < 0.5)           # raised paint stripes
h -= 0.0010 * (wear > 0.45)                             # chipped paint steps down
h -= 0.0004 * (scr > 0.5)
h += 0.0005 * (n_hi - 0.5) + 0.0004 * (n_mid - 0.5)     # surface grain
h = ndi.gaussian_filter(h, 0.7)
gy, gx = np.gradient(h, MPP)                           # rows = +V, cols = +U (V-up array)
k = 1.0
nm = np.stack([-gx * k, -gy * k, np.ones_like(h)], -1)
nm /= np.linalg.norm(nm, axis=-1, keepdims=True)
nmap = (nm * 0.5 + 0.5)

# ---------------------------------------------------------------- save (flip: array is V-up, PNG top-down)
def save(name, arr, mode=None):
    a = np.flipud((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8))
    Image.fromarray(a, mode).save(f"{out}/{name}", optimize=True)
    print("wrote", name, a.shape)

def srgb(c):  # linear->sRGB so that the PNG (tagged sRGB in Blender) reproduces the linear palette above
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 1e-6, 1), 1/2.4) - 0.055)

save("crate_base_color.png", srgb(col))
save("crate_roughness.png", rough, "L")
save("crate_metallic.png", metal, "L")
save("crate_normal.png", nmap)
save("crate_emission.png", srgb(emit_col))
save("crate_emission_mask.png", emask, "L")
print("done; valid texel coverage %.1f%%" % (VALID.mean() * 100))
