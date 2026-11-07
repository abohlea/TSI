"""Run repeatable deformation smoke tests on a TSI-CHAR-001 GLB in Blender.
Usage:
  blender --background --python tools/art/validate_character_deformation.py -- character.glb [--report-json work/deformation.json]
This detects broken skinning/dead regions; it does not replace visual pose approval.
"""
import bpy
import json
import math
import os
import sys

POSE_CASES = [
    ("left_shoulder_raise", "upper_arm.L", (0.0, 0.0, -55.0)),
    ("right_shoulder_raise", "upper_arm.R", (0.0, 0.0, 55.0)),
    ("left_elbow_flex", "lower_arm.L", (0.0, 0.0, -85.0)),
    ("right_elbow_flex", "lower_arm.R", (0.0, 0.0, 85.0)),
    ("left_wrist_flex", "hand.L", (20.0, 0.0, 0.0)),
    ("right_wrist_flex", "hand.R", (20.0, 0.0, 0.0)),
    ("left_hip_raise", "thigh.L", (0.0, 0.0, -35.0)),
    ("right_hip_raise", "thigh.R", (0.0, 0.0, 35.0)),
    ("left_knee_flex", "shin.L", (70.0, 0.0, 0.0)),
    ("right_knee_flex", "shin.R", (70.0, 0.0, 0.0)),
    ("left_index_curl", "finger_index_L_2", (0.0, 0.0, 35.0)),
    ("right_index_curl", "finger_index_R_2", (0.0, 0.0, -35.0)),
]
MIN_MOVED_FRACTION = 0.0005
MIN_BBOX_EXTENT = 0.01


def reset_pose(armature):
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0.0, 0.0, 0.0)
        bone.location = (0.0, 0.0, 0.0)
        bone.scale = (1.0, 1.0, 1.0)


def evaluated_vertices(mesh_obj, depsgraph):
    evaluated = mesh_obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def bounds(points):
    if not points:
        return [0.0, 0.0, 0.0]
    return [
        max(p[i] for p in points) - min(p[i] for p in points)
        for i in range(3)
    ]


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not args or args[0].startswith("--"):
        print("Usage: validate_character_deformation.py -- character.glb [--report-json report.json]")
        return 2
    source = os.path.abspath(args[0])
    report_path = None
    if "--report-json" in args:
        report_path = os.path.abspath(args[args.index("--report-json") + 1])
    if not os.path.isfile(source):
        print("FAIL: GLB not found:", source)
        return 2

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=source)
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    errors, warnings, results = [], [], []
    if len(armatures) != 1:
        errors.append("expected exactly one armature, found %d" % len(armatures))
    if not meshes:
        errors.append("no mesh objects imported")
    report = {
        "asset": source, "status": "PENDING", "pose_cases": results,
        "mesh_count": len(meshes), "armature_count": len(armatures),
        "errors": errors, "warnings": warnings,
        "note": "Smoke test only; visual deformation, intersections and weapon grip require human review."
    }
    if errors:
        report["status"] = "FAILED"
    else:
        armature = armatures[0]
        bone_names = {bone.name for bone in armature.pose.bones}
        depsgraph = bpy.context.evaluated_depsgraph_get()
        missing_mesh_binding = [
            obj.name for obj in meshes
            if not any(mod.type == "ARMATURE" and mod.object == armature for mod in obj.modifiers)
        ]
        if missing_mesh_binding:
            errors.append("meshes not bound to imported armature: " + ", ".join(missing_mesh_binding))

        reset_pose(armature)
        bpy.context.view_layer.update()
        baseline = {obj.name: evaluated_vertices(obj, depsgraph) for obj in meshes}
        total_vertices = sum(len(points) for points in baseline.values())
        if total_vertices == 0:
            errors.append("evaluated meshes contain no vertices")

        for case_name, bone_name, degrees in POSE_CASES:
            if bone_name not in bone_names:
                warnings.append("%s skipped: missing bone %s" % (case_name, bone_name))
                results.append({"case": case_name, "bone": bone_name, "status": "SKIPPED"})
                continue
            reset_pose(armature)
            pose_bone = armature.pose.bones[bone_name]
            pose_bone.rotation_euler = tuple(math.radians(value) for value in degrees)
            bpy.context.view_layer.update()
            moved, maximum_displacement, current_points = 0, 0.0, []
            for obj in meshes:
                posed = evaluated_vertices(obj, depsgraph)
                original = baseline[obj.name]
                current_points.extend(posed)
                for before, after in zip(original, posed):
                    distance = (after - before).length
                    maximum_displacement = max(maximum_displacement, distance)
                    if distance > 1e-5:
                        moved += 1
            moved_fraction = moved / max(total_vertices, 1)
            extent = bounds(current_points)
            case_errors = []
            if moved_fraction < MIN_MOVED_FRACTION:
                case_errors.append("pose moved too few vertices (%.6f)" % moved_fraction)
            if not all(math.isfinite(value) for value in extent + [maximum_displacement]):
                case_errors.append("non-finite evaluated geometry")
            if min(extent) < MIN_BBOX_EXTENT:
                case_errors.append("evaluated geometry has a collapsed bounding-box axis")
            results.append({
                "case": case_name, "bone": bone_name, "status": "FAILED" if case_errors else "PASSED",
                "moved_vertex_fraction": round(moved_fraction, 6),
                "max_displacement": round(maximum_displacement, 6),
                "bounds_extent": [round(value, 6) for value in extent],
                "errors": case_errors,
            })
            errors.extend("%s: %s" % (case_name, item) for item in case_errors)

        reset_pose(armature)
        bpy.context.view_layer.update()
        if len(results) < len(POSE_CASES):
            warnings.append("some pose cases were skipped because required bones are absent")
        if not results or not any(item["status"] == "PASSED" for item in results):
            errors.append("no deformation pose case passed")
        report["status"] = "FAILED" if errors else "PASSED"

    if report_path:
        os.makedirs(os.path.dirname(report_path) or ".", exist_ok=True)
        with open(report_path, "w", encoding="utf-8") as stream:
            json.dump(report, stream, ensure_ascii=False, indent=2)
    for warning in warnings:
        print("WARNING:", warning)
    for error in errors:
        print("FAIL:", error)
    print("TSI-CHAR-001 DEFORMATION SMOKE TEST:", report["status"])
    print("Pose cases:", len(results), "Passed:", sum(item["status"] == "PASSED" for item in results))
    if report_path:
        print("JSON report:", report_path)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
