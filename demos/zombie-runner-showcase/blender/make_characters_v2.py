"""AGJ character pack v2: rounded (bevelled, smooth-shaded) parts, faces, cloth details, distinct silhouettes.
Same rig (hips, spine, head, arm.L/R, leg.L/R) and the same clip names as v1.
Run: blender -b --python make_characters_v2.py [-- Survivor ...]   Output: ../characters/*.glb (overwrites v1)."""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_characters as v1
from make_characters import rig, cycle, idle, attack, reset
OUT = os.environ.get("AGJ_OUT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "characters_v2"))
v1.PAL.update({"White": (.95,.93,.88), "Mouth": (.25,.04,.06), "Strap": (.2,.12,.07), "Steel": (.35,.38,.42), "Patch": (.55,.45,.3)})
mat = v1.mat
R = math.radians

def B(size, loc, m, bone, rot=(0,0,0), bev=.04, seg=1): return ("box", size, loc, m, bone, rot, bev, seg)
def S(r, loc, m, bone, sc=(1,1,1)): return ("ball", (r*sc[0], r*sc[1], r*sc[2]), loc, m, bone, (0,0,0), 0, 0)
def C(r, h, loc, m, bone, rot=(0,0,0)): return ("cyl", (r, r, h), loc, m, bone, rot, 0, 0)

def build(name, parts, bones, clips, scale=1.0):
    reset(); objs = []
    for kind, size, loc, m, bone, rot, bev, seg in parts:
        L = [v*scale for v in loc]
        if kind == "box": bpy.ops.mesh.primitive_cube_add(size=1, location=L)
        elif kind == "ball": bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=1, location=L)
        else: bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1, depth=1, location=L)
        o = bpy.context.object; o.scale = [v*scale for v in size]; o.rotation_euler = [R(a) for a in rot]
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if kind == "box" and bev:
            md = o.modifiers.new("b", "BEVEL"); md.width = bev*scale; md.segments = seg; md.limit_method = 'NONE'
            bpy.ops.object.modifier_apply(modifier="b")
        bpy.ops.object.shade_smooth()
        o.data.materials.append(mat(m))
        o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))), 1, 'REPLACE'); objs.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); body = bpy.context.object; body.name = name + "Mesh"
    bpy.ops.object.armature_add(); arm = bpy.context.object; arm.name = name
    bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; eb.remove(eb[0])
    for bn, h, t, p in bones:
        b = eb.new(bn); b.head = [v*scale for v in h]; b.tail = [v*scale for v in t]
        if p: b.parent = eb[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    body.parent = arm; md = body.modifiers.new("Armature", "ARMATURE"); md.object = arm
    arm.animation_data_create(); pb = arm.pose.bones
    for b in pb: b.rotation_mode = 'XYZ'
    for cname, keys in clips.items():
        act = bpy.data.actions.new(cname); act.use_fake_user = True; arm.animation_data.action = act
        for f, pose in keys:
            for b in pb:
                r = pose.get(b.name, (0, 0, 0)); b.rotation_euler = (R(r[0]), R(r[1]), R(r[2]))
                b.location = (0, 0, r[3] if len(r) > 3 else 0)
                b.keyframe_insert("rotation_euler", frame=f); b.keyframe_insert("location", frame=f)
    arm.animation_data.action = None
    os.makedirs(OUT, exist_ok=True); out = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS',
                              export_apply=False, export_optimize_animation_size=True, export_frame_step=2, export_texcoords=False)
    print("EXPORTED", name, os.path.getsize(out), "bytes", len(body.data.vertices), "verts", list(clips))

def head_human(skin="Skin", hair="Hair", z=1.76):
    return [B((.5,.46,.5), (0,0,z), skin, "head", bev=.13, seg=2),
            B((.07,.06,.09), (0,-.25,z-.04), skin, "head", bev=.02),            # nose
            S(.065, (.11,-.215,z+.02), "White", "head"), S(.065, (-.11,-.215,z+.02), "White", "head"),
            S(.036, (.11,-.27,z+.02), "Dark", "head"), S(.036, (-.11,-.27,z+.02), "Dark", "head"),
            B((.13,.03,.035), (.11,-.235,z+.11), hair, "head", rot=(0,8,0), bev=.01), B((.13,.03,.035), (-.11,-.235,z+.11), hair, "head", rot=(0,-8,0), bev=.01),
            B((.13,.02,.03), (0,-.235,z-.13), "Mouth", "head", bev=.01)]

def limbs_human(top, pants, skin="Skin", shoe="Dark"):
    p = []
    for x, s in ((1, "L"), (-1, "R")):
        p += [B((.19,.21,.66), (x*.13,0,.37), pants, "leg."+s, bev=.05), B((.22,.33,.13), (x*.13,-.04,.07), shoe, "leg."+s, bev=.05),
              B((.14,.14,.5), (x*.33,0,1.06), skin, "arm."+s, bev=.05), B((.19,.19,.28), (x*.33,0,1.25), top, "arm."+s, bev=.05),
              S(.085, (x*.33,0,.79), skin, "arm."+s)]
    return p

def zombie_head(skin, z=1.74, y=-.08, size=1.0, hair=None):
    k = size; p = [B((.5*k,.46*k,.5*k), (0,y,z), skin, "head", bev=.12*k, seg=2),
        S(.07*k, (.11*k,y-.23*k,z+.03), "Eyes", "head"), S(.055*k, (-.12*k,y-.23*k,z+.02), "Eyes", "head"),
        B((.16*k,.04,.04), (.11*k,y-.24*k,z+.12*k), "Dark", "head", rot=(0,-22,0), bev=.01),
        B((.16*k,.04,.04), (-.11*k,y-.24*k,z+.12*k), "Dark", "head", rot=(0,22,0), bev=.01),
        B((.24*k,.04,.11*k), (0,y-.235*k,z-.13*k), "Mouth", "head", bev=.015),
        B((.05*k,.03,.05*k), (.06*k,y-.25*k,z-.09*k), "White", "head", bev=.005), B((.05*k,.03,.05*k), (-.05*k,y-.25*k,z-.17*k), "White", "head", bev=.005),
        B((.1*k,.05,.08*k), (.17*k,y+.05,z+.24*k), "ZSkinDark", "head", bev=.02)]       # skull patch
    if hair: p += [B((.08,.08,.12), (x,y+.05,z+.27*k), hair, "head", rot=(0,a,0), bev=.02) for x, a in ((-.1,-20),(.02,5),(.12,25))]
    return p

def torn_hem(m, w, z, y=0, n=4):  # jagged triangles hanging from a shirt hem
    return [B((.12*w,.3*w,.12*w), (-.2*w + i*.4*w/(n-1), y, z - (.02 if i % 2 else .06)), m, "spine", rot=(0,45,0), bev=0) for i in range(n)]

def zombie_limbs(skin, shirt, pants, w=1.0, arm_len=.6, arm_t=.15, hand=.09, torn_sleeve=True):
    p = []
    for x, s in ((1, "L"), (-1, "R")):
        p += [B((.2*w,.22*w,.66), (x*.13*w,0,.37), pants, "leg."+s, bev=.05),
              B((.22*w,.32*w,.12), (x*.13*w,-.05,.07), "Dark" if s == "L" else skin, "leg."+s, bev=.05),   # one bare foot
              B((arm_t,arm_len,arm_t), (x*.35*w,-.05-arm_len/2,1.35), skin, "arm."+s, bev=.04),
              B((arm_t+.05,.2,arm_t+.05), (x*.35*w,-.05,1.35), shirt, "arm."+s, bev=.04),
              S(hand, (x*.35*w,-.08-arm_len,1.35), skin, "arm."+s, sc=(1,1.2,.8))]
    return p + [B((.12,.03,.12), (.13*w,-.12*w,.45), "Patch", "leg.L", bev=.01)]   # knee patch

ZOMB = (zombie_head("ZSkin") + zombie_limbs("ZSkin", "Shirt", "Pants") + torn_hem("Shirt", 1, .86, -.0) + [
    B((.56,.33,.58), (0,0,1.15), "Shirt", "spine", bev=.06), B((.5,.3,.24), (0,0,.8), "Pants", "hips", bev=.05),
    B((.52,.04,.05), (0,-.16,.84), "Strap", "hips", bev=.01), B((.18,.04,.14), (.12,-.17,1.2), "ZSkinDark", "spine", bev=.02)])  # tear in shirt
FAST = (zombie_head("ZSkinDark", size=.9, hair="Dark") + zombie_limbs("ZSkinDark", "Red", "Dark", w=.72, arm_len=.78, arm_t=.11, hand=.07)
    + torn_hem("Red", .72, .9) + [B((.42,.26,.55), (0,0,1.15), "Red", "spine", bev=.05), B((.38,.24,.22), (0,0,.8), "Dark", "hips", bev=.04),
    B((.06,.27,.3), (0,0,1.48), "ZSkinDark", "spine", bev=.02)])   # bony spine ridge
BRUTE = (zombie_head("ZSkin", z=1.66, y=-.22, size=.85) + [
    B((.95,.6,.72), (0,0,1.15), "Olive", "spine", bev=.12, seg=2), B((.75,.5,.4), (0,.12,1.55), "ZSkin", "spine", bev=.12, seg=2),
    B((.7,.4,.3), (0,0,.8), "Pants", "hips", bev=.06), B((.5,.08,.4), (0,-.31,1.05), "ZSkinDark", "spine", bev=.05),
    B((.04,.03,.3), (0,-.36,1.05), "Dark", "spine", bev=0), B((.25,.03,.03), (0,-.36,1.1), "Dark", "spine", bev=0), B((.25,.03,.03), (0,-.36,.98), "Dark", "spine", bev=0)])
for x, s in ((1, "L"), (-1, "R")):
    BRUTE += [B((.3,.32,.62), (x*.22,0,.36), "Pants", "leg."+s, bev=.07), B((.32,.42,.15), (x*.22,-.05,.08), "Dark", "leg."+s, bev=.06),
              B((.32,.7,.32), (x*.56,-.4,1.35), "ZSkin", "arm."+s, bev=.1, seg=2), B((.42,.3,.42), (x*.56,-.05,1.4), "Olive", "arm."+s, bev=.08),
              S(.2, (x*.56,-.82,1.33), "ZSkinDark", "arm."+s), B((.1,.1,.1), (x*.6,.0,1.65), "Steel", "arm."+s, rot=(45,0,45), bev=0)]   # shoulder spike

SURV = (head_human() + limbs_human("Jacket", "Pants") + [
    B((.5,.3,.56), (0,0,1.14), "Jacket", "spine", bev=.06), B((.46,.28,.24), (0,0,.8), "Pants", "hips", bev=.05),
    B((.07,.02,.52), (.15,-.16,1.15), "Pack", "spine", bev=.01), B((.07,.02,.52), (-.15,-.16,1.15), "Pack", "spine", bev=.01),
    B((.44,.24,.5), (0,.28,1.13), "Pack", "spine", bev=.07), B((.46,.08,.18), (0,.4,1.3), "Olive", "spine", bev=.03), C(.09, .5, (0,.28,1.45), "Olive", "spine", rot=(0,90,0)),
    B((.53,.49,.16), (0,.02,1.99), "Hair", "head", bev=.06), B((.52,.14,.32), (0,.2,1.86), "Hair", "head", bev=.05),
    B((.55,.5,.08), (0,0,1.91), "Red", "head", bev=.02), B((.06,.2,.06), (.08,.3,1.88), "Red", "head", rot=(-35,0,10), bev=.01), B((.06,.18,.06), (-.04,.3,1.86), "Red", "head", rot=(-50,0,-15), bev=.01)])
SOLD = (head_human() + limbs_human("Olive", "Olive", shoe="Dark") + [
    B((.5,.3,.56), (0,0,1.14), "Olive", "spine", bev=.06), B((.46,.28,.24), (0,0,.8), "Olive", "hips", bev=.05),
    B((.56,.36,.4), (0,0,1.2), "Dark", "spine", bev=.06), B((.14,.08,.14), (.13,-.2,1.08), "Olive", "spine", bev=.03), B((.14,.08,.14), (-.13,-.2,1.08), "Olive", "spine", bev=.03),
    B((.58,.54,.24), (0,0,1.97), "Olive", "head", bev=.1, seg=2), B((.62,.1,.05), (0,-.24,1.88), "Olive", "head", bev=.02),
    B((.4,.05,.08), (0,-.26,1.91), "Steel", "head", bev=.02),
    B((.07,.8,.12), (-.33,-.3,.86), "Dark", "arm.R", bev=.02), B((.06,.08,.18), (-.33,-.2,.75), "Steel", "arm.R", bev=.01)])

H = rig(headTop=2.05); Z = rig(arms_forward=True, headTop=2.0)
CHARS = {
 "Survivor": lambda: build("Survivor", SURV, H, v1_clips["Survivor"]),
 "Zombie": lambda: build("Zombie", ZOMB, Z, v1_clips["Zombie"]),
 "FastZombie": lambda: build("FastZombie", FAST, rig(arms_forward=True, shoulderX=.26, headTop=2.0), v1_clips["FastZombie"]),
 "Brute": lambda: build("Brute", BRUTE, rig(arms_forward=True, shoulderX=.56, headTop=1.95), v1_clips["Brute"], scale=1.25),
 "Soldier": lambda: build("Soldier", SOLD, H, v1_clips["Soldier"]),
}
# Reuse v1's animation clip definitions by capturing what v1.build receives.
v1_clips = {}
_orig = v1.build
v1.build = lambda name, parts, bones, clips, scale=1.0: v1_clips.__setitem__(name, clips)
for n, f in v1.CHARS.items(): f()
v1.build = _orig
want = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(CHARS)
for n in want: CHARS[n]()
