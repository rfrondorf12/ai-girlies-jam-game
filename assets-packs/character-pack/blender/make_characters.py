"""Generate the AGJ character pack. Run: blender -b --python make_characters.py [-- name ...]
Each character = list of boxes bound rigidly to a 7-bone rig (hips, spine, head, arm.L/R, leg.L/R).
Front faces Blender -Y, which becomes three.js +Z (toward the camera)."""
import bpy, math, os, sys
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "characters")
R = math.radians
# Shared palette: same material names in every file so recolouring code works across the set.
PAL = {"Skin": (.95,.72,.55), "ZSkin": (.36,.62,.25), "ZSkinDark": (.25,.45,.2), "Shirt": (.18,.24,.5),
       "Jacket": (.85,.42,.12), "Pants": (.28,.2,.13), "Olive": (.3,.36,.18), "Dark": (.08,.08,.1),
       "Pack": (.55,.32,.15), "Hair": (.22,.13,.07), "Red": (.75,.1,.1), "Eyes": (1,.06,.02)}
EMIT = {"Eyes": 4}

def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions, bpy.data.armatures):
        for d in list(coll): coll.remove(d)

def mat(n):
    m = bpy.data.materials.get(n)
    if m: return m
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*PAL[n], 1); b.inputs["Roughness"].default_value = .9
    if n in EMIT: b.inputs["Emission Color"].default_value = (*PAL[n], 1); b.inputs["Emission Strength"].default_value = EMIT[n]
    return m

def build(name, parts, bones, clips, scale=1.0):
    reset(); objs = []
    for (pn, size, loc, m, bone) in parts:
        bpy.ops.mesh.primitive_cube_add(size=1, location=[v*scale for v in loc]); o = bpy.context.object
        o.scale = [v*scale for v in size]; bpy.ops.object.transform_apply(scale=True); o.data.materials.append(mat(m))
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
    for cname, keys in clips.items():   # keys: [(frame, {bone: (rx,ry,rz[,lz])}), ...] degrees
        act = bpy.data.actions.new(cname); act.use_fake_user = True; arm.animation_data.action = act
        for f, pose in keys:
            for b in pb:
                r = pose.get(b.name, (0, 0, 0)); b.rotation_euler = (R(r[0]), R(r[1]), R(r[2]))
                b.location = (0, 0, r[3] if len(r) > 3 else 0)
                b.keyframe_insert("rotation_euler", frame=f); b.keyframe_insert("location", frame=f)
    arm.animation_data.action = None
    os.makedirs(OUT, exist_ok=True); out = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True,
                              export_animation_mode='ACTIONS', export_apply=False,
                              export_optimize_animation_size=True, export_frame_step=2)
    print("EXPORTED", name, os.path.getsize(out), "bytes", len(body.data.vertices), "verts", list(clips))

def rig(hipZ=.75, shoulderZ=1.35, shoulderX=.35, arms_forward=False, headTop=1.9):
    at = (lambda x: (x, -.6, shoulderZ)) if arms_forward else (lambda x: (x, 0, shoulderZ - .6))
    b = [("hips", (0,0,hipZ), (0,0,hipZ+.2), None), ("spine", (0,0,hipZ+.2), (0,0,shoulderZ+.1), "hips"),
         ("head", (0,0,shoulderZ+.1), (0,0,headTop), "spine")]
    for s, x in (("L", 1), ("R", -1)):
        b += [("leg."+s, (x*.13,0,hipZ-.03), (x*.13,0,0), "hips"), ("arm."+s, (x*shoulderX,0,shoulderZ), at(x*shoulderX), "spine")]
    return b

def cycle(n, amp_leg, amp_arm, lean=0, bob=.04, arm_base=0, head=0):
    """Walk/run loop over n frames: legs and arms swing opposite."""
    out = []
    for i, ph in enumerate((0, 1, 0, -1, 0)):
        out.append((1 + i*n//4, {"leg.L": (amp_leg*ph,0,0), "leg.R": (-amp_leg*ph,0,0),
            "arm.L": (arm_base - amp_arm*ph,0,0), "arm.R": (arm_base + amp_arm*ph,0,0),
            "spine": (lean,0,4*ph), "head": (head,0,0), "hips": (0,0,0,bob*abs(ph))}))
    return out

def idle(n=48, arm_base=0, lean=0, sway=3):
    return [(1, {"spine": (lean,0,0), "arm.L": (arm_base,0,0), "arm.R": (arm_base,0,0)}),
            (1+n//2, {"spine": (lean+3,0,sway), "head": (-4,0,sway*2), "arm.L": (arm_base+4,0,0), "arm.R": (arm_base+4,0,0), "hips": (0,0,0,-.015)}),
            (1+n, {"spine": (lean,0,0), "arm.L": (arm_base,0,0), "arm.R": (arm_base,0,0)})]

def attack(n=20, lean=15, arm_base=0):  # zombie lunge: rear back, then swipe forward
    return [(1, {"spine": (lean,0,0), "arm.L": (arm_base,0,0), "arm.R": (arm_base,0,0)}),
            (1+n*3//10, {"spine": (lean-15,0,0), "arm.L": (arm_base+45,0,0), "arm.R": (arm_base+45,0,0), "head": (-10,0,0)}),
            (1+n*6//10, {"spine": (lean+30,0,0), "arm.L": (arm_base-40,0,0), "arm.R": (arm_base-40,0,0), "head": (15,0,0), "leg.L": (-25,0,0), "leg.R": (15,0,0)}),
            (1+n, {"spine": (lean,0,0), "arm.L": (arm_base,0,0), "arm.R": (arm_base,0,0)})]

def zombie_body(skin="ZSkin", shirt="Shirt", pants="Pants", w=1.0, extra=()):
    p = [("Torso", (.55*w,.32*w,.6), (0,0,1.15), shirt, "spine"), ("Hips", (.5*w,.3*w,.25), (0,0,.8), pants, "hips"),
         ("Head", (.42,.4,.42), (0,-.06,1.7), skin, "head"), ("Jaw", (.3,.1,.08), (0,-.27,1.52), "ZSkinDark", "head")]
    for x, s in ((1, "L"), (-1, "R")):
        p += [("Eye"+s, (.09,.04,.06), (x*.11,-.27,1.74), "Eyes", "head"),
              ("Leg"+s, (.2*w,.22*w,.7), (x*.13*w,0,.35), pants, "leg."+s),
              ("Arm"+s, (.16*w,.62,.16*w), (x*.35*w,-.3,1.35), skin, "arm."+s),
              ("Sleeve"+s, (.19*w,.22,.19*w), (x*.35*w,-.05,1.35), shirt, "arm."+s)]
    return p + list(extra)

def human_body(top, pants, skin="Skin", hair="Hair", extra=()):
    p = [("Torso", (.5,.3,.58), (0,0,1.14), top, "spine"), ("Hips", (.46,.28,.24), (0,0,.8), pants, "hips"),
         ("Head", (.4,.38,.4), (0,0,1.68), skin, "head"), ("Hair", (.42,.4,.12), (0,.02,1.9), hair, "head")]
    for x, s in ((1, "L"), (-1, "R")):
        p += [("Eye"+s, (.07,.03,.07), (x*.1,-.2,1.7), "Dark", "head"),
              ("Leg"+s, (.19,.21,.7), (x*.13,0,.35), pants, "leg."+s), ("Shoe"+s, (.2,.3,.1), (x*.13,-.04,.05), "Dark", "leg."+s),
              ("Arm"+s, (.15,.15,.55), (x*.33,0,1.08), skin, "arm."+s), ("Sleeve"+s, (.18,.18,.25), (x*.33,0,1.25), top, "arm."+s)]
    return p + list(extra)

# Arm X rotation: + raises arms (forward/up), - lowers. Spine X: + leans forward. Zombie arm bones point forward at 0.
CHARS = {
 "Survivor": lambda: build("Survivor", human_body("Jacket", "Pants", extra=[
        ("Pack", (.4,.2,.45), (0,.26,1.15), "Pack", "spine"), ("PackFlap", (.42,.06,.15), (0,.38,1.3), "Olive", "spine"),
        ("Bandana", (.43,.41,.06), (0,0,1.82), "Red", "head")]), rig(),
        {"Idle": idle(), "Walk": cycle(24, 30, 30), "Run": cycle(16, 55, 60, lean=12, bob=.08),
         "Jump": [(1, {}), (5, {"leg.L": (40,0,0), "leg.R": (40,0,0), "spine": (15,0,0), "hips": (0,0,0,-.12)}),
                  (10, {"leg.L": (-30,0,0), "leg.R": (60,0,0), "arm.L": (150,0,0), "arm.R": (150,0,0)}),
                  (18, {"leg.L": (20,0,0), "leg.R": (20,0,0), "arm.L": (60,0,0), "arm.R": (60,0,0)}), (24, {})]}),
 "Zombie": lambda: build("Zombie", zombie_body(), rig(arms_forward=True),
        {"Idle": idle(arm_base=8, lean=8, sway=6), "Walk": cycle(24, 30, 8, lean=12, head=-8, arm_base=12),
         "Attack": attack(20, lean=12, arm_base=12)}),
 "FastZombie": lambda: build("FastZombie", zombie_body(skin="ZSkinDark", shirt="Red", pants="Dark", w=.75), rig(arms_forward=True, shoulderX=.26),
        {"Idle": idle(30, arm_base=15, lean=20, sway=8), "Run": cycle(12, 60, 25, lean=30, bob=.1, arm_base=30, head=-20),
         "Lunge": attack(14, lean=30, arm_base=25)}),
 "Brute": lambda: build("Brute", zombie_body(shirt="Olive", w=1.6, extra=[("Hunch", (.6,.4,.3), (0,.15,1.5), "ZSkin", "spine")]),
        rig(arms_forward=True, shoulderX=.56), {"Idle": idle(60, lean=15, sway=4, arm_base=15), "Walk": cycle(36, 22, 6, lean=18, bob=.06, arm_base=18),
         "Attack": [(1, {"spine": (15,0,0)}), (12, {"spine": (-10,0,0), "arm.L": (80,0,0), "arm.R": (80,0,0)}),
                    (18, {"spine": (40,0,0), "arm.L": (-60,0,0), "arm.R": (-60,0,0), "hips": (0,0,0,-.1)}), (30, {"spine": (15,0,0)})]}, scale=1.25),
 "Soldier": lambda: build("Soldier", human_body("Olive", "Olive", hair="Olive", extra=[
        ("Helmet", (.46,.46,.16), (0,0,1.92), "Olive", "head"), ("Vest", (.54,.34,.36), (0,0,1.2), "Dark", "spine"),
        ("Rifle", (.08,.7,.12), (-.33,-.35,.9), "Dark", "arm.R")]), rig(),
        {"Idle": idle(), "Walk": cycle(24, 28, 20), "Run": cycle(16, 50, 40, lean=10, bob=.08),
         "Attack": [(1, {}), (6, {"arm.R": (70,0,0), "arm.L": (60,0,-20)}), (8, {"arm.R": (80,0,0), "arm.L": (65,0,-20), "spine": (-5,0,0)}),
                    (14, {"arm.R": (70,0,0), "arm.L": (60,0,-20)}), (20, {})]}),
}
if __name__ == "__main__":
    want = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(CHARS)
    for n in want: CHARS[n]()
