"""TSI-CHAR-001 — prépare une surface de référence pour retopologie manuelle.
Ce script ne prétend pas produire une topologie de production : il crée une copie
dense et propre du proxy, non destructive pour le GLB source, dans un .blend de travail.
Usage:
 blender --background --factory-startup --python tools/art/prepare_character_retopology.py -- source.glb --blend-output work/TSI001-retopo.blend --obj-output work/TSI001-retopo-reference.obj
"""
import bpy, os, sys

def args():
    return sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []

def main():
    a=args()
    if not a or a[0].startswith("--"):
        raise SystemExit("Usage: script.py -- source.glb [--blend-output file.blend] [--obj-output file.obj]")
    source=os.path.abspath(a[0])
    if not os.path.isfile(source):
        raise FileNotFoundError(source)
    blend=os.path.abspath(a[a.index("--blend-output")+1]) if "--blend-output" in a else os.path.abspath("TSI001-retopo-workbench.blend")
    obj=os.path.abspath(a[a.index("--obj-output")+1]) if "--obj-output" in a else os.path.abspath("TSI001-retopo-reference.obj")
    voxel=float(a[a.index("--voxel-size")+1]) if "--voxel-size" in a else 0.008
    if not 0.002 <= voxel <= 0.03:
        raise ValueError("--voxel-size must be between 0.002 and 0.03 metres")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=source)
    originals=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    if not originals:
        raise RuntimeError("Source GLB contains no mesh")
    # Keep the imported rigged source in a hidden collection for comparison.
    source_col=bpy.data.collections.new("SOURCE_LOCKED_DO_NOT_EDIT")
    bpy.context.scene.collection.children.link(source_col)
    for o in originals:
        for c in list(o.users_collection): c.objects.unlink(o)
        source_col.objects.link(o)
        o.hide_viewport=True; o.hide_render=True
    # Duplicate geometry into a clean, unrigged retopology reference.
    refs=[]
    for src in originals:
        dup=src.copy(); dup.data=src.data.copy(); dup.name="RETOPO_REF_"+src.name
        bpy.context.scene.collection.objects.link(dup)
        dup.hide_viewport=False; dup.hide_render=False
        for mod in list(dup.modifiers):
            if mod.type=="ARMATURE":
                bpy.context.view_layer.objects.active=dup
                bpy.ops.object.modifier_apply(modifier=mod.name)
        dup.parent=None
        refs.append(dup)
    bpy.ops.object.select_all(action="DESELECT")
    for o in refs: o.select_set(True)
    active=refs[0]; bpy.context.view_layer.objects.active=active
    if len(refs)>1:
        bpy.ops.object.join()
    active.name="TSI001_RETOPOLOGY_REFERENCE"
    # Voxel remesh welds intersecting armor pieces into a continuous sculptable
    # reference surface. Fine details may be softened: original stays preserved.
    remesh=active.modifiers.new("TSI001_Voxel_Weld_Reference","REMESH")
    remesh.mode="VOXEL"; remesh.voxel_size=voxel
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=active.modifiers.new("TSI001_Surface_Cleanup","SMOOTH")
    smooth.factor=0.35; smooth.iterations=2
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    for face in active.data.polygons: face.use_smooth=True
    active["tsi_asset_role"]="retopology_reference_only"
    active["tsi_source_glb"]=source
    active["tsi_voxel_size_m"]=voxel
    active["tsi_warning"]="Voxel remesh reference, NOT production quad topology. Retopologize manually and rebuild UV/weights."
    # Save both source comparison and reference in editable workbench.
    os.makedirs(os.path.dirname(blend) or ".",exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    os.makedirs(os.path.dirname(obj) or ".",exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT"); active.select_set(True)
    bpy.context.view_layer.objects.active=active
    bpy.ops.wm.obj_export(filepath=obj, export_selected_objects=True)
    triangles=sum(len(p.vertices)-2 for p in active.data.polygons)
    print("RETPOLOGY WORKBENCH:",blend)
    print("REFERENCE OBJ:",obj)
    print("REFERENCE TRIANGLES:",triangles,"VOXEL_SIZE:",voxel)
    print("IMPORTANT: manual quad retopology, UVs, skin weights and visual QA are still required.")

if __name__=="__main__":
    main()
