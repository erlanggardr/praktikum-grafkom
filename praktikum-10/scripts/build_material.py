# P10 YOLO - build the crate PBR node graph (run inside Blender)
# Layout: absolute coordinates first, frames are attached LAST (child locations become frame-relative).
import bpy

TEX = "//textures/"
mat = bpy.data.materials["Mat_SciFi_Crate_PBR"]
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
N, L = nt.nodes, nt.links


def load(name, cs):
    for im in list(bpy.data.images):
        if im.name == name:
            bpy.data.images.remove(im)
    im = bpy.data.images.load(bpy.path.abspath(TEX + name), check_existing=False)
    im.filepath = TEX + name
    im.name = name
    im.colorspace_settings.name = cs
    return im


def node(t, name, label, x, y, **kw):
    n = N.new(t); n.name = name; n.label = label; n.location = (x, y)
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def frame(label, color, *kids):
    f = N.new("NodeFrame"); f.label = label; f.label_size = 20
    f.use_custom_color = True; f.color = color
    for k in kids:
        k.parent = f
    return f


R1, R2 = 420, 40
tc = node("ShaderNodeTexCoord", "TexCoord", "UV Coordinates", -1900, 230)
mp = node("ShaderNodeMapping", "Mapping", "Mapping (identity)", -1620, 230)
L.new(tc.outputs["UV"], mp.inputs["Vector"])


def tex(name, label, fn, cs, x, y):
    t = node("ShaderNodeTexImage", name, label, x, y, image=load(fn, cs), interpolation='Linear', extension='REPEAT')
    t.image.colorspace_settings.name = cs
    L.new(mp.outputs["Vector"], t.inputs["Vector"])
    return t


t_base = tex("Tex_BaseColor", "Base Color  [sRGB]", "crate_base_color.png", "sRGB", -1260, R1)
t_emc = tex("Tex_EmissionColor", "Emission Color  [sRGB]", "crate_emission.png", "sRGB", -1260, R2)
t_rgh = tex("Tex_Roughness", "Roughness  [Non-Color]", "crate_roughness.png", "Non-Color", -920, R1)
t_met = tex("Tex_Metallic", "Metallic  [Non-Color]", "crate_metallic.png", "Non-Color", -920, R2)
t_nrm = tex("Tex_Normal", "Normal  [Non-Color]", "crate_normal.png", "Non-Color", -580, R1)
t_msk = tex("Tex_EmissionMask", "Emission Mask  [Non-Color]", "crate_emission_mask.png", "Non-Color", -580, R2)
nmap = node("ShaderNodeNormalMap", "NormalMap", "Normal Map (Tangent, UVMap)", -200, R1, space='TANGENT', uv_map="UVMap")
nmap.inputs["Strength"].default_value = 1.0
mul = node("ShaderNodeMath", "EmissionStrength", "Emission Strength = mask x 4.0", -200, R2 - 40, operation='MULTIPLY')
mul.inputs[1].default_value = 4.0
bsdf = node("ShaderNodeBsdfPrincipled", "Principled BSDF", "Principled BSDF", 200, 330)
out = node("ShaderNodeOutputMaterial", "Material Output", "Material Output", 560, 330)

L.new(t_nrm.outputs["Color"], nmap.inputs["Color"])
L.new(t_msk.outputs["Color"], mul.inputs[0])
L.new(t_base.outputs["Color"], bsdf.inputs["Base Color"])
L.new(t_rgh.outputs["Color"], bsdf.inputs["Roughness"])
L.new(t_met.outputs["Color"], bsdf.inputs["Metallic"])
L.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
L.new(t_emc.outputs["Color"], bsdf.inputs["Emission Color"])
L.new(mul.outputs["Value"], bsdf.inputs["Emission Strength"])
L.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

frame("1 · UV / Mapping", (0.20, 0.20, 0.28), tc, mp)
frame("2 · Color maps (sRGB)", (0.30, 0.18, 0.12), t_base, t_emc)
frame("3 · Data maps (Non-Color)", (0.12, 0.24, 0.18), t_rgh, t_met, t_nrm, t_msk)
frame("4 · Normal + Emission control", (0.18, 0.18, 0.32), nmap, mul)
frame("5 · Shader", (0.28, 0.12, 0.22), bsdf, out)
print("MATERIAL graph: %d nodes, %d links" % (len(nt.nodes), len(nt.links)))
