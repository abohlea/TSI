"""TSI-CHAR-001 — générateur Blender de proxy humanoïde riggé.
Usage:
  blender --background --factory-startup --python tools/art/generate_character_proxy.py
  blender --background --factory-startup --python tools/art/generate_character_proxy.py -- --output prototype/public/assets/tsi/TSI-CHAR-001-operator-proxy.glb

Génère un proxy de validation (pas le héros final). Les pièces sont rigides et parentées
aux os; le skinning organique, les doigts détaillés, UV/PBR et animations mocap restent
des étapes de production séparées.
"""
import bpy, math, os, sys
from mathutils import Vector

PREFIX = "TSI001_"
def output_path():
    args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    if "--output" in args: return os.path.abspath(args[args.index("--output")+1])
    return os.path.abspath("//TSI-CHAR-001-operator-proxy.glb")

def mat(name, color, metallic=0.0, rough=0.55):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1)
    m.use_nodes=True; p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1); p.inputs["Metallic"].default_value=metallic
    p.inputs["Roughness"].default_value=rough
    return m
GRAPH=mat("TSI | graphite armor",(0.025,0.035,0.045),.48,.38)
FAB=mat("TSI | tactical fabric",(0.075,0.09,0.105),.05,.82)
STEEL=mat("TSI | dark alloy",(.16,.19,.21),.78,.3)
ORANGE=mat("TSI | safety orange",(1,.16,.018),.12,.4)
BLUE=mat("TSI | electric blue",(.015,.22,.38),.35,.25)
SKIN=mat("TSI | neutral skin proxy",(.34,.22,.16),0,.65)

def ellipsoid(name, loc, scale, material, bone=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, location=loc)
    o=bpy.context.object; o.name=PREFIX+name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bone: o["attach_bone"]=bone
    return o
def box(name, loc, scale, material, bone=None, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=PREFIX+name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        b=o.modifiers.new("Soft armor edges","BEVEL"); b.width=bevel; b.segments=2
        bpy.context.view_layer.objects.active=o
        try: bpy.ops.object.modifier_apply(modifier=b.name)
        except Exception: pass
    if bone: o["attach_bone"]=bone
    return o

def build():
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
    arm_data=bpy.data.armatures.new("TSI001_RIG")
    arm=bpy.data.objects.new("TSI001_RIG",arm_data); bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active=arm; arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bones={
      "root":((0,0,0),(0,0,.95),None),
      "pelvis":((0,0,.88),(0,0,1.08),"root"),
      "spine":((0,0,1.08),(0,0,1.38),"pelvis"),
      "chest":((0,0,1.38),(0,0,1.57),"spine"),
      "neck":((0,0,1.57),(0,0,1.68),"chest"),
      "head":((0,0,1.68),(0,0,1.91),"neck"),
      "clavicle.L":((0,0,1.52),(.0,.24,1.5),"chest"),
      "upper_arm.L":((0,.24,1.5),(0,.43,1.28),"clavicle.L"),
      "lower_arm.L":((0,.43,1.28),(0,.43,1.02),"upper_arm.L"),
      "hand.L":((0,.43,1.02),(0,.43,.91),"lower_arm.L"),
      "clavicle.R":((0,0,1.52),(0,-.24,1.5),"chest"),
      "upper_arm.R":((0,-.24,1.5),(0,-.43,1.28),"clavicle.R"),
      "lower_arm.R":((0,-.43,1.28),(0,-.43,1.02),"upper_arm.R"),
      "hand.R":((0,-.43,1.02),(0,-.43,.91),"lower_arm.R"),
      "thigh.L":((0,.13,.91),(0,.13,.52),"pelvis"),
      "shin.L":((0,.13,.52),(0,.13,.12),"thigh.L"),
      "foot.L":((.12,.13,.12),(.28,.13,.06),"shin.L"),
      "thigh.R":((0,-.13,.91),(0,-.13,.52),"pelvis"),
      "shin.R":((0,-.13,.52),(0,-.13,.12),"thigh.R"),
      "foot.R":((.12,-.13,.12),(.28,-.13,.06),"shin.R")
    }
    for n,(h,t,parent) in bones.items():
        b=arm_data.edit_bones.new(n); b.head=h; b.tail=t
        if parent: b.parent=arm_data.edit_bones[parent]

    # Articulated finger chains (three phalanges per digit, thumb two).
    finger_names=("thumb","index","middle","ring","pinky")
    for side,sign in (("L",1),("R",-1)):
        for digit,index in zip(finger_names,range(5)):
            spread=(index-2)*0.027
            start=Vector((0.075,sign*(0.43+spread),0.955-(0.012 if index in (0,4) else 0)))
            lengths=(0.045,0.035) if digit=="thumb" else (0.052,0.043,0.032)
            parent="hand."+side
            for segment,length in enumerate(lengths):
                name="finger_%s_%s_%d"%(digit,side,segment+1)
                head=start.copy()
                tail=head+Vector((length,0,0))
                bone=arm_data.edit_bones.new(name); bone.head=head; bone.tail=tail
                bone.parent=arm_data.edit_bones[parent]
                parent=name; start=tail
    bpy.ops.object.mode_set(mode="OBJECT")
    arm.show_in_front=True

    # Hand IK targets and pole controls; artists can reposition these in Blender.
    ik_controls=[]
    for side,sign in (("L",1),("R",-1)):
        target=bpy.data.objects.new(PREFIX+"hand_ik_target_"+side,None)
        bpy.context.collection.objects.link(target)
        target.location=(.12,sign*.43,1.02)
        target.empty_display_type="SPHERE"; target.empty_display_size=.055
        pole=bpy.data.objects.new(PREFIX+"elbow_pole_"+side,None)
        bpy.context.collection.objects.link(pole)
        pole.location=(-.22,sign*.58,1.28)
        pole.empty_display_type="CIRCLE"; pole.empty_display_size=.07
        ik_controls.append((side,target,pole))
    for side,target,pole in ik_controls:
        constraint=arm.pose.bones["lower_arm."+side].constraints.new("IK")
        constraint.name="TSI001_Hand_IK_"+side
        constraint.target=target
        constraint.pole_target=pole
        constraint.chain_count=2
        constraint.use_stretch=False
        constraint.iterations=64
        constraint.influence=1.0

    parts=[]
    def E(*a,**k): parts.append(ellipsoid(*a,**k))
    def B(*a,**k): parts.append(box(*a,**k))
    # torso, armored vest and chest plates
    E("pelvis_shell",(0,0,.98),(.23,.22,.19),FAB,"pelvis")
    B("torso_fabric",(0,0,1.31),(.34,.48,.48),FAB,"spine")
    B("chest_plate",(0,-.006,1.43),(.37,.49,.22),GRAPH,"chest")
    B("chest_center",(0,-.255,1.43),(.14,.018,.12),STEEL,"chest")
    B("TSI_insignia",(0,-.27,1.49),(.07,.012,.025),ORANGE,"chest",.008)
    for z in (1.24,1.34):
        for y in (-.255,.255): B("utility_pouch",(0,y,z),(.14,.075,.095),GRAPH,"spine")
    # shoulders, arms, gloves
    for side,s in (("L",1),("R",-1)):
        E("shoulder_"+side,(0,s*.27,1.49),(.17,.18,.16),GRAPH,"clavicle."+side)
        B("shoulder_mark_"+side,(.012,s*.405,1.51),(.10,.014,.035),ORANGE,"clavicle."+side,.008)
        E("upper_arm_"+side,(0,s*.34,1.37),(.105,.12,.19),FAB,"upper_arm."+side)
        E("elbow_"+side,(0,s*.43,1.27),(.105,.11,.10),GRAPH,"lower_arm."+side)
        E("forearm_"+side,(0,s*.43,1.13),(.10,.105,.16),GRAPH,"lower_arm."+side)
        E("glove_"+side,(.025,s*.43,.96),(.095,.09,.09),STEEL,"hand."+side)
        B("wrist_band_"+side,(0,s*.43,1.02),(.10,.10,.035),ORANGE,"hand."+side,.01)
    # head, helmet, visor
    E("head_proxy",(0,0,1.77),(.13,.13,.17),SKIN,"head")
    E("helmet",(0,0,1.88),(.17,.17,.12),GRAPH,"head")
    B("helmet_front",(0,-.145,1.86),(.18,.025,.045),STEEL,"head",.012)
    B("visor",(0,-.137,1.79),(.19,.018,.065),BLUE,"head",.012)
    # legs, kneepads and boots
    for side,s in (("L",1),("R",-1)):
        E("thigh_"+side,(0,s*.13,.70),(.14,.14,.23),FAB,"thigh."+side)
        E("knee_"+side,(.025,s*.13,.51),(.13,.15,.11),GRAPH,"shin."+side)
        B("knee_mark_"+side,(.03,s*.13,.52),(.06,.012,.025),ORANGE,"shin."+side,.006)
        E("shin_guard_"+side,(0,s*.13,.31),(.12,.13,.20),GRAPH,"shin."+side)
        E("boot_"+side,(.12,s*.13,.10),(.20,.14,.10),STEEL,"foot."+side)
    # Join the proxy into one skinned mesh and compute smooth two-bone weights.
    # Geometry remains stylized/segmented, but joints now deform continuously with the rig.
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts: o.select_set(True)
    mesh=parts[0]
    bpy.context.view_layer.objects.active=mesh
    bpy.ops.object.join()
    mesh.name="TSI001_Skinned_Proxy"
    mesh.parent=None
    groups={name:mesh.vertex_groups.new(name=name) for name in bones}
    segments={}
    for name in bones:
        b=arm_data.bones[name]
        segments[name]=(arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local)
    def segment_distance(point, a, b):
        ab=b-a
        denom=ab.length_squared
        t=0.0 if denom < 1e-10 else max(0.0,min(1.0,(point-a).dot(ab)/denom))
        return (point-(a+ab*t)).length
    for vertex in mesh.data.vertices:
        p=mesh.matrix_world @ vertex.co
        ranked=sorted((segment_distance(p,a,b),name) for name,(a,b) in segments.items())[:2]
        scores=[1.0/max(distance,0.025)**3 for distance,name in ranked]
        total=sum(scores)
        for score,(distance,name) in zip(scores,ranked):
            groups[name].add([vertex.index],score/total,"REPLACE")
    modifier=mesh.modifiers.new("TSI001 Armature Deform","ARMATURE")
    modifier.object=arm
    mesh.parent=arm
    mesh.matrix_parent_inverse=arm.matrix_world.inverted()
    mesh["rigging_note"]="Procedural distance-weighted proxy skin; validate joints and replace with production retopology."

    # Named hand/weapon sockets as empties parented to rig bones.
    for name,bone,loc in [
      ("weapon_hand_socket","hand.R",(0,-.43,.96)),
      ("back_gear_socket","chest",(.08,.22,1.42)),
      ("head_camera_socket","head",(0,0,1.82))]:
        e=bpy.data.objects.new(PREFIX+name,None); bpy.context.collection.objects.link(e)
        e.parent=arm; e.parent_type="BONE"; e.parent_bone=bone; e.location=loc
        e.empty_display_type="SPHERE"; e.empty_display_size=.035

    # Simple keyframed preview actions. These are blockout motion, not final mocap.
    def action(name, keys):
        bpy.context.view_layer.objects.active=arm
        bpy.ops.object.mode_set(mode="POSE")
        for frame, rotations in keys:
            for bone, rot in rotations.items():
                p=arm.pose.bones[bone]; p.rotation_mode="XYZ"; p.rotation_euler=rot
                p.keyframe_insert(data_path="rotation_euler",frame=frame,group=bone)
        bpy.ops.object.mode_set(mode="OBJECT")
        act=arm.animation_data.action
        act.name=name
        for fc in act.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation="BEZIER"
        # Preserve each action as its own NLA strip so the glTF exporter can emit all clips.
        track=arm.animation_data.nla_tracks.new()
        track.name=name
        strip=track.strips.new(name, 1, act)
        strip.name=name
        arm.animation_data.action=None
    action("TSI_Character_Idle_Rifle",[(1,{}),(12,{"chest":(.015,0,0)}),(24,{})])
    action("TSI_Character_Walk_Forward",[(1,{"thigh.L":(.45,0,0),"thigh.R":(-.45,0,0)}),(12,{"thigh.L":(-.45,0,0),"thigh.R":(.45,0,0)}),(24,{"thigh.L":(.45,0,0),"thigh.R":(-.45,0,0)})])
    action("TSI_Character_Run_Forward",[(1,{"thigh.L":(.72,0,0),"thigh.R":(-.72,0,0)}),(12,{"thigh.L":(-.72,0,0),"thigh.R":(.72,0,0)}),(24,{"thigh.L":(.72,0,0),"thigh.R":(-.72,0,0)})])
    action("TSI_Character_Death",[(1,{}),(24,{"chest":(.65,0,0),"pelvis":(.3,0,0)})])
    action("TSI_Character_Sprint_Forward",[(1,{"thigh.L":(.95,0,0),"thigh.R":(-.95,0,0),"upper_arm.L":(-.55,0,0),"upper_arm.R":(.55,0,0)}),(12,{"thigh.L":(-.95,0,0),"thigh.R":(.95,0,0),"upper_arm.L":(.55,0,0),"upper_arm.R":(-.55,0,0)}),(24,{"thigh.L":(.95,0,0),"thigh.R":(-.95,0,0),"upper_arm.L":(-.55,0,0),"upper_arm.R":(.55,0,0)})])
    action("TSI_Character_Aim_Rifle",[(1,{"chest":(-.08,0,0),"upper_arm.L":(-.12,0,0),"upper_arm.R":(-.18,0,0)}),(24,{"chest":(-.08,0,0),"upper_arm.L":(-.12,0,0),"upper_arm.R":(-.18,0,0)})])
    action("TSI_Character_Fire_Rifle",[(1,{"chest":(-.08,0,0)}),(4,{"chest":(-.16,0,0)}),(8,{"chest":(-.08,0,0)})])
    action("TSI_Character_Reload_Rifle",[(1,{"upper_arm.L":(-.15,0,0)}),(10,{"upper_arm.L":(-.65,0,0),"lower_arm.L":(-.35,0,0)}),(20,{"upper_arm.L":(-.15,0,0)})])
    action("TSI_Character_Hit_Reaction",[(1,{}),(6,{"chest":(.22,0,.08),"head":(-.12,0,0)}),(18,{})])
    # Export all visible parts, armature and socket empties.
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.context.scene.objects: o.select_set(True)
    bpy.context.view_layer.objects.active=arm
    path=output_path(); os.makedirs(os.path.dirname(path) or ".",exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path,export_format="GLB",use_selection=True,
      export_apply=True,export_yup=True,export_animations=True,export_skins=True,
      export_materials="EXPORT",export_nla_strips=True)
    print("TSI-CHAR-001 PROXY EXPORTED:",path)
    print("WARNING: rigid armor proxy, not production skinning or final character.")

if __name__=="__main__": build()
