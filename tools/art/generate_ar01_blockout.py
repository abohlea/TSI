"""
TSI-WPN-AR-01 — générateur de blockout Blender.
Usage:
  blender --background --factory-startup --python tools/art/generate_ar01_blockout.py
  blender --background --factory-startup --python tools/art/generate_ar01_blockout.py -- --output /path/to/TSI-WPN-AR-01-blockout.glb

Ce script produit une base procédurale de validation des proportions et sockets.
Ce n'est PAS le modèle final high-poly, les textures PBR finales, ni les animations.
Repère: X = axe longitudinal (bouche vers +X), Y = largeur, Z = hauteur.
Échelle: mètres.
"""
import bpy
import math
import os
import sys
from mathutils import Vector

COLLECTION_NAME = "TSI_WPN_AR_01"
PREFIX = "AR01_"

def output_path():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "--output" in args:
        return os.path.abspath(args[args.index("--output") + 1])
    return os.path.abspath("//TSI-WPN-AR-01-blockout.glb")

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.collections):
        # Keep Blender's master scene collection intact.
        pass
    col = bpy.data.collections.get(COLLECTION_NAME)
    if col:
        bpy.data.collections.remove(col)
    return bpy.data.collections.new(COLLECTION_NAME)

def material(name, color, metallic=0.0, roughness=0.5):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    return mat

def finish(obj, name, mat, bevel=0.015):
    obj.name = PREFIX + name
    obj.data.materials.append(mat)
    if bevel and obj.type == "MESH":
        mod = obj.modifiers.new("Edge highlights — baked on export", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.profile = 0.5
        norm = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        # Keep modifiers live in the .blend; apply for predictable glTF export.
        bpy.context.view_layer.objects.active = obj
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.ops.object.modifier_apply(modifier=norm.name)
        except Exception:
            pass
    return obj

def box(col, name, loc, scale, mat, bevel=0.015, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = scale
    if rotation:
        obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)
    return finish(obj, name, mat, bevel)

def cylinder_x(col, name, loc, radius, depth, mat, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=loc, rotation=(0, math.pi / 2, 0))
    obj = bpy.context.object
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)
    return finish(obj, name, mat, 0.006)

def empty(col, name, loc, rot=(0, 0, 0), display="ARROWS", size=0.075):
    obj = bpy.data.objects.new(PREFIX + name, None)
    col.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    obj.empty_display_type = display
    obj.empty_display_size = size
    return obj

def build():
    col = clear_scene()
    graphite = material("TSI | Graphite ceramic", (0.035, 0.045, 0.055), 0.48, 0.32)
    polymer = material("TSI | Reinforced polymer", (0.012, 0.017, 0.022), 0.05, 0.62)
    steel = material("TSI | Dark metal", (0.12, 0.14, 0.16), 0.82, 0.28)
    orange = material("TSI | Safety orange", (1.0, 0.19, 0.025), 0.12, 0.38)
    glass = material("TSI | Optic glass tint", (0.035, 0.12, 0.15), 0.35, 0.16)

    # Main receiver and upper rail.
    box(col, "Body", (0.00, 0.0, 0.00), (0.46, 0.14, 0.16), graphite, 0.025)
    box(col, "UpperReceiver", (0.015, 0.0, 0.092), (0.48, 0.125, 0.045), steel, 0.012)
    box(col, "TopRail", (0.00, 0.0, 0.125), (0.50, 0.055, 0.018), graphite, 0.004)

    # Handguard, barrel and fictional muzzle assembly.
    box(col, "Handguard", (0.37, 0.0, 0.015), (0.38, 0.145, 0.13), graphite, 0.018)
    for i in range(7):
        x = 0.22 + i * 0.048
        box(col, "HandguardSlot_%02d" % i, (x, -0.074, 0.018), (0.025, 0.004, 0.055), polymer, 0.002)
        box(col, "HandguardSlot_R_%02d" % i, (x, 0.074, 0.018), (0.025, 0.004, 0.055), polymer, 0.002)
    cylinder_x(col, "Barrel", (0.69, 0.0, 0.02), 0.022, 0.34, steel)
    cylinder_x(col, "MuzzleDevice", (0.87, 0.0, 0.02), 0.031, 0.075, graphite)
    box(col, "MuzzleAccent", (0.87, 0.0, 0.02), (0.018, 0.066, 0.066), orange, 0.004)

    # Hard-surface side panels, fasteners and cooling ribs.
    for side in (-1, 1):
        y = side * 0.079
        box(col, "ReceiverSidePanel_%s" % side, (-0.005, y, 0.012), (0.30, 0.009, 0.085), steel, 0.008)
        box(col, "ReceiverInset_%s" % side, (-0.005, y + side * 0.006, 0.012), (0.18, 0.004, 0.042), graphite, 0.004)
        for i in range(3):
            x = -0.105 + i * 0.075
            cylinder_x(col, "ReceiverFastener_%s_%02d" % (side, i), (x, y + side * 0.008, 0.035), 0.008, 0.006, orange if i == 0 else steel, 12)
        for i in range(6):
            x = 0.245 + i * 0.046
            box(col, "HandguardCoolingRib_%s_%02d" % (side, i), (x, y, 0.015), (0.012, 0.012, 0.082), steel, 0.003)
    box(col, "LowerReceiverPanel", (0.04, 0.0, -0.085), (0.24, 0.115, 0.018), steel, 0.006)
    box(col, "TopRailFront", (0.31, 0.0, 0.096), (0.29, 0.065, 0.018), steel, 0.003)
    for i in range(9):
        box(col, "RailNotch_%02d" % i, (0.19 + i * 0.03, 0.0, 0.108), (0.009, 0.07, 0.009), polymer, 0.001)

    # Stock and cheek rest.
    box(col, "StockBridge", (-0.34, 0.0, -0.005), (0.30, 0.075, 0.095), steel, 0.012)
    box(col, "StockButtpad", (-0.51, 0.0, -0.005), (0.045, 0.105, 0.15), polymer, 0.012)
    box(col, "StockCheekRest", (-0.36, 0.0, 0.075), (0.22, 0.09, 0.035), polymer, 0.01)
    box(col, "StockBrace", (-0.34, 0.0, -0.085), (0.24, 0.035, 0.025), graphite, 0.006)

    # Grip and trigger guard: deliberately simplified visual shapes.
    box(col, "PistolGrip", (-0.04, 0.0, -0.145), (0.105, 0.085, 0.20), polymer,
        0.012, (0.0, -0.22, 0.0))
    box(col, "TriggerGuard", (0.105, 0.0, -0.085), (0.12, 0.012, 0.055), steel, 0.006)

    # Grip side panel and trigger detail.
    box(col, "GripSidePanel", (-0.04, -0.047, -0.15), (0.075, 0.006, 0.13), graphite, 0.005, (0.0, -0.22, 0.0))
    box(col, "Trigger", (0.105, 0.0, -0.105), (0.012, 0.012, 0.045), orange, 0.003)

    # Magazine, kept separate for a future reload animation.
    box(col, "Magazine", (0.12, 0.0, -0.205), (0.13, 0.085, 0.19), polymer,
        0.012, (0.0, -0.12, 0.0))
    box(col, "MagazineBase", (0.12, 0.0, -0.305), (0.14, 0.09, 0.025), graphite, 0.006)
    box(col, "MagazineMark", (0.12, -0.044, -0.205), (0.045, 0.004, 0.055), orange, 0.002)

    # Magazine ribs and floorplate details.
    for i in range(4):
        box(col, "MagazineRib_%02d" % i, (0.12, -0.046, -0.14 - i * 0.035), (0.082, 0.004, 0.008), steel, 0.002)
    box(col, "MagazineWitnessWindow", (0.12, -0.047, -0.235), (0.025, 0.004, 0.045), orange, 0.002)

    # Original compact optic silhouette.
    box(col, "OpticMount", (0.04, 0.0, 0.16), (0.14, 0.075, 0.025), steel, 0.005)
    box(col, "OpticHousing", (0.04, 0.0, 0.215), (0.13, 0.065, 0.085), graphite, 0.012)
    box(col, "OpticLensFront", (0.108, 0.0, 0.215), (0.006, 0.052, 0.058), glass, 0.002)
    box(col, "OpticLensRear", (-0.028, 0.0, 0.215), (0.006, 0.052, 0.058), glass, 0.002)

    # Optic adjustment turrets and protective hood.
    cylinder_x(col, "OpticWindageTurret", (0.04, -0.044, 0.215), 0.018, 0.025, steel, 16)
    cylinder_x(col, "OpticElevationTurret", (0.04, 0.0, 0.267), 0.014, 0.05, steel, 16)
    box(col, "OpticHood", (0.04, 0.0, 0.263), (0.15, 0.078, 0.012), graphite, 0.004)

    # Small authored accents, intentionally restrained.
    box(col, "ReceiverMark", (-0.07, -0.073, 0.015), (0.12, 0.004, 0.018), orange, 0.002)
    box(col, "ChargingHandle", (-0.16, 0.09, 0.075), (0.075, 0.025, 0.018), steel, 0.004)

    # Stable sockets: positions are provisional and must be aligned in the hand rig.
    sockets = [
        ("MuzzleFlashSocket", (0.925, 0.0, 0.02), (0, 0, 0)),
        ("LeftHandGrip", (0.39, 0.0, -0.01), (0, 0, 0)),
        ("RightHandGrip", (-0.01, 0.0, -0.12), (0, 0, 0)),
        ("EjectSocket", (-0.10, -0.085, 0.075), (0, 0, 0)),
        ("MagazineSocket", (0.12, 0.0, -0.11), (0, 0, 0)),
        ("SightSocket", (0.04, 0.0, 0.265), (0, 0, 0)),
    ]
    root = empty(col, "Root", (0, 0, 0), display="CUBE", size=0.12)
    for name, loc, rot in sockets:
        socket = empty(col, name, loc, rot)
        socket.parent = root

    # Parent every visible part to the stable root, preserving world transforms.
    for obj in list(col.objects):
        if obj != root and obj.parent is None:
            world = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = world

    # Export meshes AND empty sockets so runtime attachment points survive GLB export.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in list(col.objects):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = next((o for o in col.objects if o.name == PREFIX + "Body"), None)

    path = output_path()
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB",
                              use_selection=True, export_apply=True,
                              export_yup=True, export_materials="EXPORT")
    print("AR-01 BLOCKOUT GLB EXPORTED:", path)
    print("NOTE: detailed blockout only; validate scale, sockets, materials and PlayCanvas import.")

if __name__ == "__main__":
    build()
