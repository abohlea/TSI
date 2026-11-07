"""Validate an exported TSI-CHAR-001 GLB inside Blender.
Usage: blender --background --python tools/art/validate_character_glb.py -- file.glb [--max-triangles 65000] [--report-json report.json] [--strict-topology]
Exit code 0 means structural checks passed; this is not an artistic/visual approval.
"""
import bpy, bmesh, json, os, sys

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
EXPECTED_DETAIL_MARKERS = {
    "TSI001_helmet_brow", "TSI001_helmet_rear_rail", "TSI001_neck_seal",
    "TSI001_respirator_filter_L", "TSI001_respirator_filter_R",
    "TSI001_cheek_vent_L", "TSI001_cheek_vent_R",
}
EXPECTED_SOCKETS = {
    "TSI001_weapon_hand_socket", "TSI001_back_gear_socket",
    "TSI001_head_camera_socket",
}

def main():
    args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    if not args or args[0].startswith("--"):
        print("Usage: validate_character_glb.py -- file.glb [--max-triangles N] [--report-json report.json]")
        return 2
    path=os.path.abspath(args[0])
    max_triangles=int(args[args.index("--max-triangles")+1]) if "--max-triangles" in args else None
    report_path=os.path.abspath(args[args.index("--report-json")+1]) if "--report-json" in args else None
    strict_topology="--strict-topology" in args
    if not os.path.isfile(path):
        print("FAIL: GLB not found:", path)
        return 2
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=path)
    objects=list(bpy.context.scene.objects)
    armatures=[o for o in objects if o.type=="ARMATURE"]
    meshes=[o for o in objects if o.type=="MESH"]
    errors=[]; warnings=[]
    report={"asset":path,"status":"PENDING","mesh_count":len(meshes),"armature_count":len(armatures),
            "triangle_count":0,"vertex_count":0,"edge_count":0,"non_manifold_edges":0,
            "degenerate_faces":0,"unweighted_vertices":0,"max_vertex_influences":0,
            "materials":[],"clips":[],"warnings":warnings,"errors":errors}
    if len(armatures)!=1: errors.append("expected exactly one armature, found %d"%len(armatures))
    if not meshes: errors.append("no mesh objects imported")
    if len(armatures)==1:
        names={b.name for b in armatures[0].data.bones}
        missing=EXPECTED_BONES-names
        if missing: errors.append("missing bones: "+", ".join(sorted(missing)))
        missing_fingers=EXPECTED_FINGER_BONES-names
        if missing_fingers: errors.append("missing finger bones: "+", ".join(sorted(missing_fingers)))
        for name in EXPECTED_BONES | EXPECTED_FINGER_BONES:
            if name in names and armatures[0].data.bones[name].length < 1e-5:
                errors.append("zero-length bone: "+name)
        report["bone_count"]=len(names)
    names={o.name for o in objects}
    missing_sockets=EXPECTED_SOCKETS-names
    if missing_sockets: errors.append("missing sockets: "+", ".join(sorted(missing_sockets)))
    detail_markers=set()
    for mesh in meshes:
        detail_markers.update(filter(None,mesh.get("detail_markers","").split(";")))
    missing_details=EXPECTED_DETAIL_MARKERS-detail_markers
    if missing_details: errors.append("missing head detail markers in mesh manifest: "+", ".join(sorted(missing_details)))
    weighted_vertices=0; materials=set()
    for mesh in meshes:
        materials.update(m.name for m in mesh.data.materials if m)
        if not mesh.data.uv_layers: errors.append("mesh has no UV layer: "+mesh.name)
        if not any(m.type=="ARMATURE" for m in mesh.modifiers):
            errors.append("mesh has no armature modifier: "+mesh.name)
        groups={g.index:g.name for g in mesh.vertex_groups}
        for vertex in mesh.data.vertices:
            influences=[a for a in vertex.groups if a.weight>1e-6 and a.group in groups]
            if influences:
                weighted_vertices+=1
                report["max_vertex_influences"]=max(report["max_vertex_influences"],len(influences))
                total=sum(a.weight for a in influences)
                if abs(total-1.0)>0.02:
                    errors.append("non-normalized skin weights on %s vertex %d (sum %.3f)"%(mesh.name,vertex.index,total))
                    break
        bm=bmesh.new(); bm.from_mesh(mesh.data)
        report["non_manifold_edges"]+=sum(1 for e in bm.edges if not e.is_manifold)
        report["degenerate_faces"]+=sum(1 for face in bm.faces if face.calc_area()<1e-10)
        report["vertex_count"]+=len(mesh.data.vertices)
        report["edge_count"]+=len(mesh.data.edges)
        report["triangle_count"]+=sum(max(0,len(poly.vertices)-2) for poly in mesh.data.polygons)
        bm.free()
    report["unweighted_vertices"]=report["vertex_count"]-weighted_vertices
    if weighted_vertices==0: errors.append("no weighted mesh vertices found")
    if report["unweighted_vertices"]:
        warnings.append("%d vertices have no skin weights"%report["unweighted_vertices"])
    if report["non_manifold_edges"]:
        msg="%d non-manifold edges detected"%report["non_manifold_edges"]
        (errors if strict_topology else warnings).append(msg)
    if report["degenerate_faces"]:
        errors.append("%d degenerate faces detected"%report["degenerate_faces"])
    finger_groups=set()
    for mesh in meshes:
        finger_groups |= {g.name for g in mesh.vertex_groups if g.name in EXPECTED_FINGER_BONES}
    missing_groups=EXPECTED_FINGER_BONES-finger_groups
    if missing_groups: errors.append("finger vertex groups missing: "+", ".join(sorted(missing_groups)))
    clips=set()
    for arm in armatures:
        if arm.animation_data:
            for track in arm.animation_data.nla_tracks:
                clips.update(strip.name for strip in track.strips)
            if arm.animation_data.action: clips.add(arm.animation_data.action.name)
    report["clips"]=sorted(clips)
    missing_clips=EXPECTED_CLIPS-clips
    if missing_clips: errors.append("missing animation clips: "+", ".join(sorted(missing_clips)))
    report["materials"]=sorted(materials)
    if len(materials)<3: errors.append("expected at least 3 material slots, found %d"%len(materials))
    if report["triangle_count"]<=0: errors.append("mesh contains no triangles")
    if max_triangles is not None and report["triangle_count"]>max_triangles:
        errors.append("triangle budget exceeded: %d > %d"%(report["triangle_count"],max_triangles))
    report["triangle_budget"]=max_triangles
    report["status"]="FAILED" if errors else "PASSED"
    if report_path:
        os.makedirs(os.path.dirname(report_path) or ".",exist_ok=True)
        with open(report_path,"w",encoding="utf-8") as stream:
            json.dump(report,stream,ensure_ascii=False,indent=2)
    for warning in warnings: print("WARNING:",warning)
    for error in errors: print("FAIL:",error)
    print("TSI-CHAR-001 STRUCTURAL VALIDATION:",report["status"])
    print("Meshes:",len(meshes),"Triangles:",report["triangle_count"],"Vertices:",report["vertex_count"],
          "Non-manifold edges:",report["non_manifold_edges"],"Degenerate faces:",report["degenerate_faces"],
          "Bones:",report.get("bone_count",0),"Clips:",len(clips),"Materials:",len(materials))
    if max_triangles is not None: print("Triangle budget:",report["triangle_count"],"/",max_triangles)
    if report_path: print("JSON report:",report_path)
    print("NOTE: visual deformation, retopology quality, scale/orientation, IK and runtime playback still require manual QA.")
    return 1 if errors else 0

if __name__=="__main__":
    raise SystemExit(main())
