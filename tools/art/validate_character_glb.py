"""Validate an exported TSI-CHAR-001 GLB inside Blender.
Usage: blender --background --python tools/art/validate_character_glb.py -- path/to/file.glb
Exit code 0 means structural checks passed; this is not an artistic/visual approval.
"""
import bpy, os, sys

EXPECTED_CLIPS = {
    "TSI_Character_Idle_Rifle", "TSI_Character_Walk_Forward",
    "TSI_Character_Run_Forward", "TSI_Character_Sprint_Forward",
    "TSI_Character_Aim_Rifle", "TSI_Character_Fire_Rifle",
    "TSI_Character_Reload_Rifle", "TSI_Character_Hit_Reaction",
    "TSI_Character_Death",
}
EXPECTED_BONES = {
    "root", "pelvis", "spine", "chest", "neck", "head",
    "upper_arm.L", "lower_arm.L", "hand.L", "upper_arm.R",
    "lower_arm.R", "hand.R", "thigh.L", "shin.L", "foot.L",
    "thigh.R", "shin.R", "foot.R",
}
EXPECTED_FINGER_BONES = {
    "finger_%s_%s_%d" % (digit, side, segment)
    for side in ("L", "R")
    for digit in ("thumb", "index", "middle", "ring", "pinky")
    for segment in ((1, 2) if digit == "thumb" else (1, 2, 3))
}
EXPECTED_SOCKETS = {
    "TSI001_weapon_hand_socket", "TSI001_back_gear_socket",
    "TSI001_head_camera_socket",
}

def fail(message):
    print("FAIL:", message)
    return False

def main():
    args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    if not args:
        print("Usage: blender --background --python tools/art/validate_character_glb.py -- file.glb")
        return 2
    path=os.path.abspath(args[0])
    if not os.path.isfile(path):
        print("FAIL: GLB not found:", path)
        return 2
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=path)
    objects=list(bpy.context.scene.objects)
    armatures=[o for o in objects if o.type=="ARMATURE"]
    meshes=[o for o in objects if o.type=="MESH"]
    errors=[]
    if len(armatures)!=1: errors.append("expected exactly one armature, found %d"%len(armatures))
    if not meshes: errors.append("no mesh objects imported")
    if len(armatures)==1:
        arm=armatures[0]
        names={b.name for b in arm.data.bones}
        missing=EXPECTED_BONES-names
        if missing: errors.append("missing bones: "+", ".join(sorted(missing)))
        missing_fingers=EXPECTED_FINGER_BONES-names
        if missing_fingers: errors.append("missing finger bones: "+", ".join(sorted(missing_fingers)))
        for name in EXPECTED_BONES | EXPECTED_FINGER_BONES:
            if name in names and arm.data.bones[name].length < 1e-5:
                errors.append("zero-length bone: "+name)
    names={o.name for o in objects}
    missing_sockets=EXPECTED_SOCKETS-names
    if missing_sockets: errors.append("missing sockets: "+", ".join(sorted(missing_sockets)))
    weighted=False
    for mesh in meshes:
        group_names={g.name for g in mesh.vertex_groups}
        if not group_names: continue
        deform_count=0
        for vertex in mesh.data.vertices:
            for assignment in vertex.groups:
                if assignment.group < len(mesh.vertex_groups) and assignment.weight > 0:
                    deform_count+=1
                    break
        if deform_count: weighted=True
    if not weighted: errors.append("no weighted mesh vertices found")
    finger_weight_groups=set()
    for mesh in meshes:
        finger_weight_groups |= {
            group.name for group in mesh.vertex_groups
            if group.name in EXPECTED_FINGER_BONES
        }
    missing_finger_groups=EXPECTED_FINGER_BONES-finger_weight_groups
    if missing_finger_groups:
        errors.append("finger vertex groups missing: "+", ".join(sorted(missing_finger_groups)))
    clip_names=set()
    for arm in armatures:
        if arm.animation_data:
            for track in arm.animation_data.nla_tracks:
                for strip in track.strips:
                    clip_names.add(strip.name)
            if arm.animation_data.action:
                clip_names.add(arm.animation_data.action.name)
    missing_clips=EXPECTED_CLIPS-clip_names
    if missing_clips: errors.append("missing animation clips: "+", ".join(sorted(missing_clips)))
    materials={m.name for mesh in meshes for m in mesh.data.materials if m}
    if len(materials)<3: errors.append("expected at least 3 material slots, found %d"%len(materials))
    if errors:
        for error in errors: fail(error)
        print("TSI-CHAR-001 STRUCTURAL VALIDATION: FAILED")
        return 1
    print("TSI-CHAR-001 STRUCTURAL VALIDATION: PASSED")
    print("Meshes:",len(meshes),"Bones:",len(armatures[0].data.bones),"Clips:",len(clip_names),"Materials:",len(materials))
    print("NOTE: visual deformation, scale/orientation, IK behavior and PlayCanvas playback still require manual QA.")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
