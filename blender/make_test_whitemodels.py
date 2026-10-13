"""用灰模模拟「混元3D 白模」，用来在没有真模型时测试自动上色。

把若干灰模合并成单个网格、体素重建成封闭曲面（类似混元输出）、去掉材质，导出到指定目录：
    blender -b -P blender/make_test_whitemodels.py -- out/test_models
然后用它们搭场景、看自动上色效果：
    blender -P blender/build_scene.py -- --models out/test_models
"""
import os
import sys

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1 else 'out/test_models'
sys.path.insert(0, os.path.join(os.getcwd(), 'blender'))
sys.argv = ['x']  # 不让 build_scene 解析到本脚本的参数
import bpy  # noqa: E402
import build_scene as bs  # noqa: E402

OUT = os.path.join(bs.ROOT, OUT)
os.makedirs(OUT, exist_ok=True)
ids = ['B01', 'B02', 'B03', 'B04', 'B05', 'B07', 'B11', 'S04', 'P05', 'P04', 'P10', 'C01', 'S03']
for aid in ids:
    bs.reset_scene()
    bs._colls.clear(); bs._mats.clear()
    a = bs.L['assets'][aid]
    root = bs.greybox(a, aid, 0, 0, bs.coll('tmp'))
    objs = [o for o in bs.coll('tmp').all_objects if o.type in ('MESH',) and not o.hide_render]
    bpy.context.view_layer.update()
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
            bpy.ops.object.modifier_apply(modifier=m.name)
    for o in list(bs.coll('tmp').all_objects):
        if o.type == 'MESH' and o.hide_render:
            bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.data.materials.clear()
    size = max(o.dimensions)
    rm = o.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = size / 220
    bpy.ops.object.modifier_apply(modifier='remesh')
    bpy.ops.object.shade_smooth()
    # 混元输出大致在单位立方体内：缩小成 ~2 个单位，再随便挪个位置（检验脚本的归一化）
    o.scale = (2 / size,) * 3; o.location = (0.3, -0.2, 0.1)
    for ob in list(bpy.data.objects):
        if ob != o: bpy.data.objects.remove(ob)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, a['file']), export_format='GLB', use_selection=True)
    print('exported', a['file'], len(o.data.polygons), 'faces')
