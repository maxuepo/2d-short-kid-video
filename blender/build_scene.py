"""元宵灯夜 · 3D 横版场景搭建脚本（Blender 4.2+ / 5.x）

读取 blender/layout.json，搭出整条明代街道：城门 → 铺面 → 运河石桥 → 打铁花 → 鼓楼。
- assets/models/ 里有对应的 GLB（Tripo 导出）就导入并自动统一尺寸、朝向、落地对齐；
- 没有就用灰模（彩色方块 + 坡屋顶）占位，所以随时可以跑。

用法（在仓库根目录）：
  # 打开 Blender 界面并搭好场景（macOS）
  /Applications/Blender.app/Contents/MacOS/Blender -P blender/build_scene.py
  # 后台搭建并保存 .blend
  blender -b -P blender/build_scene.py -- --save out/street.blend
  # 后台渲染整片（EEVEE，1080p30）
  blender -b -P blender/build_scene.py -- --render out/street.mp4
  # 低配预览：Cycles CPU 渲几张关键帧 / 俯视布局图（无显卡也能跑）
  blender -b -P blender/build_scene.py -- --preview out/blender_preview --frames 60,330,600,780,1170
  blender -b -P blender/build_scene.py -- --topview out/blender_preview/top.png
  # 低清动态分镜（Cycles CPU，每 3 帧取 1 帧，约 10fps）
  blender -b -P blender/build_scene.py -- --animatic out/animatic.mp4 --step 3 --percent 25
  # 白模自动上色：默认对没有贴图的模型自动生效；--autocolor all 强制所有模型统一上色，--autocolor off 关闭
  # --models 指定模型目录（默认 assets/models）

坐标：X 沿街向右，Y 向画面深处（建筑正立面在 y=0，朝向 -Y 方向的相机），Z 向上，单位米。
"""

import json
import math
import os
import random
import sys

import bpy  # 先导入 bpy（独立 bpy 模块下 bmesh 依赖它）
import bmesh
from mathutils import Vector


# ---------------------------------------------------------------- 参数与路径
def _root():
    here = globals().get('__file__')
    if here and os.path.basename(here) == 'build_scene.py':
        return os.path.dirname(os.path.dirname(os.path.abspath(here)))
    return os.getcwd()


ROOT = _root()
L = json.load(open(os.path.join(ROOT, 'blender', 'layout.json'), encoding='utf-8'))
ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name, default=None):
    if name in ARGV:
        i = ARGV.index(name)
        return ARGV[i + 1] if i + 1 < len(ARGV) and not ARGV[i + 1].startswith('--') else True
    return default


MODELS = os.path.join(ROOT, arg('--models')) if isinstance(arg('--models'), str) else os.path.join(ROOT, 'assets', 'models')
FPS = L['fps']
FRAMES = int(L['duration'] * FPS)
PREVIEW = bool(arg('--preview') or arg('--topview'))


# ---------------------------------------------------------------- 基础工具
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = 'METRIC'
    s.render.fps = FPS
    s.frame_start = 1
    s.frame_end = FRAMES
    return s


_colls = {}


def coll(name):
    if name not in _colls:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
        _colls[name] = c
    return _colls[name]


_mats = {}


def mat(name, color, emission=0.0, rough=0.85, metal=0.0):
    key = (name, tuple(color), emission)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emission:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emission
    m.diffuse_color = (*color, 1)
    _mats[key] = m
    return m


def mesh_obj(name, bm, collection, material=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    if material:
        me.materials.append(material)
    collection.objects.link(o)
    return o


def box(name, x0, x1, y0, y1, z0, z1, material, collection):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((x0 if v.co.x < 0 else x1, y0 if v.co.y < 0 else y1, z0 if v.co.z < 0 else z1))
    return mesh_obj(name, bm, collection, material)


def cylinder(name, x, y, z0, z1, r, material, collection, r2=None, seg=16):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, (z0 + z1) / 2))
    return mesh_obj(name, bm, collection, material)


def sphere(name, x, y, z, r, material, collection, seg=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(8, seg // 2), radius=r)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, z))
    return mesh_obj(name, bm, collection, material)


def prism(name, profile, y0, y1, material, collection):
    """XZ 平面上的多边形沿 Y 挤出（用于石桥、牌坊等）。"""
    bm = bmesh.new()
    front = [bm.verts.new((x, y0, z)) for x, z in profile]
    back = [bm.verts.new((x, y1, z)) for x, z in profile]
    bm.faces.new(front[::-1])
    bm.faces.new(back)
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, collection, material)


def hip_roof(name, cx, yf, w, d, z, h, material, collection, over=0.7, lift=0.35):
    """歇山/庑殿式简化坡屋顶，四角略微起翘。yf 为建筑正立面所在的 y。"""
    x0, x1 = cx - w / 2 - over, cx + w / 2 + over
    y0, y1 = yf - over, yf + d + over
    ridge = max(w - d, w * 0.35) / 2
    ym = (y0 + y1) / 2
    bm = bmesh.new()
    c = [bm.verts.new(p) for p in ((x0, y0, z + lift), (x1, y0, z + lift), (x1, y1, z + lift), (x0, y1, z + lift))]
    m = [bm.verts.new(p) for p in ((cx - w / 2 * 0.9, y0 - 0.05, z), (cx + w / 2 * 0.9, y0 - 0.05, z), (cx + w / 2 * 0.9, y1 + 0.05, z), (cx - w / 2 * 0.9, y1 + 0.05, z))]
    r0 = bm.verts.new((cx - ridge, ym, z + h))
    r1 = bm.verts.new((cx + ridge, ym, z + h))
    bm.faces.new((c[0], m[0], m[1], c[1], r1, r0))  # 前坡（檐口中段下垂，两角起翘）
    bm.faces.new((c[2], m[2], m[3], c[3], r0, r1))  # 后坡
    bm.faces.new((c[1], c[2], r1))  # 两侧山面
    bm.faces.new((c[3], c[0], r0))
    bm.faces.new((c[0], m[0], m[1], c[1], c[2], m[2], m[3], c[3]))  # 底面
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, collection, material)


def label(text, x, y, z, collection, size=1.2, flat=False):
    cu = bpy.data.curves.new(text, 'FONT')
    cu.body = text
    cu.size = size
    cu.align_x = 'CENTER'
    o = bpy.data.objects.new('label_' + text, cu)
    o.location = (x, y, z)
    o.rotation_euler = (0, 0, 0) if flat else (math.radians(90), 0, 0)
    o.data.materials.append(mat('label', (1, 1, 1), emission=2))
    o.hide_render = not flat
    collection.objects.link(o)
    return o


def point_light(name, loc, energy, color, collection, radius=0.15):
    ld = bpy.data.lights.new(name, 'POINT')
    ld.energy = energy
    ld.color = color
    ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld)
    o.location = loc
    collection.objects.link(o)
    return o


def monotone(points):
    """单调三次插值（Fritsch–Carlson），走位不过冲、不倒退。"""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    n = len(points)
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]] + [0 if d[i - 1] * d[i] <= 0 else (d[i - 1] + d[i]) / 2 for i in range(1, n - 1)] + [d[-1]]
    for i in range(n - 1):
        if d[i] == 0:
            m[i] = m[i + 1] = 0
            continue
        a, b = m[i] / d[i], m[i + 1] / d[i]
        s = a * a + b * b
        if s > 9:
            k = 3 / math.sqrt(s)
            m[i], m[i + 1] = k * a * d[i], k * b * d[i]

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = 0
        while x > xs[i + 1]:
            i += 1
        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h
        t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]

    return f


def deck_z(x):
    b = L['bridge']
    if x <= b['x0'] or x >= b['x1']:
        return 0.0
    u = (x - b['x0']) / (b['x1'] - b['x0'])
    return b['peak'] * (1 - math.cos(2 * math.pi * u)) / 2


# ---------------------------------------------------------------- 灰模（占位）
def greybox(a, aid, x, y, collection):
    """按资产类型生成占位体，返回根 empty。正立面中心底边在 (x, y, 0)。"""
    root = bpy.data.objects.new(f'{aid}_greybox', None)
    collection.objects.link(root)
    w, d, h = a['size']
    col = a['color']
    body = mat(f'gb_{aid}', col)
    roofm = mat('gb_roof', (0.18, 0.19, 0.26))
    warm = mat('gb_warm', (1.0, 0.55, 0.25), emission=1.2)
    dark = mat('gb_dark', (0.05, 0.05, 0.08))
    parts = []
    k = a['kind']
    if k in ('shop', 'shop2', 'stall'):
        eave = a.get('eave', 3.2)
        if k == 'stall':
            for sx in (-1, 1):
                parts.append(cylinder(f'{aid}_post', x + sx * (w / 2 - 0.15), y + 0.2, 0, eave, 0.08, body, collection))
            parts.append(box(f'{aid}_counter', x - w / 2 + 0.2, x + w / 2 - 0.2, y, y + 0.8, 0, 1.0, body, collection))
            parts.append(hip_roof(f'{aid}_roof', x, y, w - 0.6, d - 0.6, eave, h - eave, mat('gb_cloth', (0.8, 0.3, 0.25)), collection, over=0.4, lift=0.15))
        else:
            parts.append(box(f'{aid}_body', x - w / 2, x + w / 2, y, y + d, 0, eave, body, collection))
            parts.append(box(f'{aid}_shopfront', x - w * 0.36, x + w * 0.36, y - 0.02, y + 0.02, 0.3, eave * 0.78, warm, collection))
            top = eave
            if k == 'shop2':
                parts.append(hip_roof(f'{aid}_pent', x, y, w, 1.2, eave, 0.7, roofm, collection, over=0.7, lift=0.2))
                top = h * 0.68
                parts.append(box(f'{aid}_upper', x - w / 2 + 0.3, x + w / 2 - 0.3, y + 0.5, y + d, eave, top, body, collection))
                for i in (-1, 0, 1):
                    parts.append(box(f'{aid}_win', x + i * w * 0.28 - w * 0.1, x + i * w * 0.28 + w * 0.1, y + 0.47, y + 0.5, eave + 1.2, top - 0.6, warm, collection))
            parts.append(hip_roof(f'{aid}_roof', x, y, w, d, top, h - top, roofm, collection))
    elif k == 'gate':
        bh = h * 0.5
        base = box(f'{aid}_base', x - w / 2, x + w / 2, y, y + d, 0, bh, body, collection)
        # 券洞：矩形 + 半圆拱，沿 Y 贯穿城台
        ar, az = 2.4, bh * 0.55
        prof = [(x + ar, -1), (x + ar, az)] + [(x + ar * math.cos(math.pi * i / 16), az + ar * math.sin(math.pi * i / 16)) for i in range(1, 16)] + [(x - ar, az), (x - ar, -1)]
        cut = prism(f'{aid}_archcut', prof, y - 1, y + d + 1, dark, collection)
        m = base.modifiers.new('arch', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.object = cut
        cut.hide_render = True
        cut.hide_viewport = True
        cut.parent = root
        parts.append(base)
        parts.append(box(f'{aid}_glow', x - 2.4, x + 2.4, y + d - 0.3, y + d - 0.2, 0, bh * 0.55 + 2.4, warm, collection))  # 券洞深处透出的灯火
        z = bh
        parts.append(box(f'{aid}_hall', x - w * 0.36, x + w * 0.36, y + d * 0.2, y + d * 0.8, z, z + h * 0.16, mat(f'gb_{aid}_hall', (0.55, 0.18, 0.15)), collection))
        parts.append(hip_roof(f'{aid}_roof1', x, y + d * 0.2, w * 0.72, d * 0.6, z + h * 0.16, h * 0.09, roofm, collection, over=1.2))
        z2 = z + h * 0.24
        parts.append(box(f'{aid}_hall2', x - w * 0.24, x + w * 0.24, y + d * 0.28, y + d * 0.72, z2, z2 + h * 0.12, mat(f'gb_{aid}_hall', (0.55, 0.18, 0.15)), collection))
        parts.append(hip_roof(f'{aid}_roof2', x, y + d * 0.28, w * 0.48, d * 0.44, z2 + h * 0.12, h - z2 - h * 0.12, roofm, collection, over=1.0))
    elif k == 'scaffold':
        wood = mat('gb_wood', (0.35, 0.22, 0.14))
        for sx in (-1, -0.33, 0.33, 1):
            parts.append(box(f'{aid}_post', x + sx * w / 2 - 0.12, x + sx * w / 2 + 0.12, y + d * 0.4, y + d * 0.4 + 0.24, 0, h * 0.85, wood, collection))
        parts.append(box(f'{aid}_beam', x - w / 2, x + w / 2, y + d * 0.4, y + d * 0.4 + 0.24, h * 0.82, h * 0.87, wood, collection))
        parts.append(box(f'{aid}_pine', x - w / 2 - 0.4, x + w / 2 + 0.4, y, y + d, h * 0.86, h, mat('gb_pine', (0.15, 0.3, 0.2)), collection))
    elif k == 'arch':
        red = mat('gb_red', (0.55, 0.12, 0.1))
        for sx in (-0.42, -0.14, 0.14, 0.42):
            parts.append(box(f'{aid}_post', x + sx * w - 0.25, x + sx * w + 0.25, y + 0.75, y + 1.25, 0, h * 0.7, red, collection))
        parts.append(box(f'{aid}_beam', x - w / 2, x + w / 2, y + 0.7, y + 1.3, h * 0.55, h * 0.7, red, collection))
        parts.append(hip_roof(f'{aid}_roof', x, y + 0.5, w * 0.9, 1.0, h * 0.7, h * 0.3, roofm, collection, over=0.6))
    elif k == 'connector':
        white = mat('gb_white', (0.86, 0.86, 0.82))
        parts.append(box(f'{aid}_wall', x - w / 2, x + w / 2, y + 0.3, y + d, 0, h * 0.8, white, collection))
        for i, zz in enumerate((h * 0.8, h * 0.9)):
            parts.append(box(f'{aid}_step', x - w / 2 - 0.15, x + w / 2 + 0.15, y + 0.3 + i * d * 0.3, y + d, zz, zz + 0.25, roofm, collection))
    elif k == 'tree':
        trunk = mat('gb_trunk', (0.22, 0.15, 0.12))
        parts.append(cylinder(f'{aid}_trunk', x, y, 0, h * 0.55, 0.25, trunk, collection, r2=0.15))
        leaf = mat(f'gb_{aid}_leaf', col)
        if 'willow' in a['file']:
            parts.append(cylinder(f'{aid}_canopy', x, y, h * 0.25, h, w * 0.45, leaf, collection, r2=w * 0.12))
        else:
            for dx, dz in ((0, 0.75), (-0.25, 0.62), (0.25, 0.65)):
                parts.append(sphere(f'{aid}_canopy', x + dx * w, y, h * dz, w * 0.3, leaf, collection))
    elif k == 'pole':
        wood = mat('gb_wood', (0.35, 0.22, 0.14))
        parts.append(cylinder(f'{aid}_pole', x, y, 0, h, 0.08, wood, collection))
        parts.append(box(f'{aid}_arm', x, x + w * 0.7, y - 0.05, y + 0.05, h - 0.3, h - 0.2, wood, collection))
        parts.append(sphere(f'{aid}_lamp', x + w * 0.6, y, h - 0.9, 0.28, mat('gb_lantern', (1.0, 0.25, 0.1), emission=8), collection))
    elif k == 'lantern':
        parts.append(sphere(f'{aid}_lamp', x, y, h / 2, w / 2, mat(f'gb_{aid}_lamp', col, emission=8), collection))
    elif k in ('character', 'npc'):
        cm = mat(f'gb_{aid}', col)
        skin = mat('gb_skin', (1.0, 0.85, 0.75))
        parts.append(cylinder(f'{aid}_skirt', x, y, 0.05, h * 0.42, w * 0.42, cm, collection, r2=w * 0.22))
        parts.append(cylinder(f'{aid}_torso', x, y, h * 0.4, h * 0.68, w * 0.28, cm, collection, r2=w * 0.22))
        parts.append(sphere(f'{aid}_head', x, y, h * 0.8, h * 0.17, skin, collection))
        nose = cylinder(f'{aid}_facing', x + h * 0.17, y, h * 0.78, h * 0.82, 0.04, mat('gb_dark', (0.05, 0.05, 0.08)), collection)
        parts.append(nose)
    else:  # prop
        parts.append(box(f'{aid}_prop', x - w / 2, x + w / 2, y, y + d, 0, h, body, collection))
    for p in parts:
        p.parent = root
    return root


# ---------------------------------------------------------------- 白模自动上色（水彩风）
# 混元3D 本地生成的模型只有形状没有颜色。这里按「高度 + 面朝向」自动分配颜色：
#   朝上的斜面 → 青灰瓦；竖直面 → 粉墙（带水彩斑驳）；最底一圈 → 石台基；朝下的面 → 檐下暗木；
#   檐口下方一圈 → 红木额枋；凹进去的地方（门洞、窗、铺面）→ 暗部 + 夜里透出暖光；轮廓边缘加深（水彩积色）。
# 调色板可以在 layout.json 的 "autocolor" 里按类型覆盖。
AUTOCOLOR = {
    'building': {
        'wall': [(0.86, 0.80, 0.70), (0.74, 0.66, 0.58)],
        'roof': [(0.20, 0.23, 0.30), (0.30, 0.33, 0.40)],
        'base': (0.48, 0.45, 0.44),
        'under': (0.28, 0.13, 0.09),
        'trim': (0.55, 0.14, 0.10),
        'ink': (0.16, 0.10, 0.12),
        'glow': (1.0, 0.56, 0.26),
        'glowStrength': 3.0,
    },
    'gate': {
        'wall': [(0.55, 0.50, 0.52), (0.45, 0.40, 0.42)],
        'upper': [(0.62, 0.16, 0.12), (0.50, 0.12, 0.10)],
        'roof': [(0.20, 0.23, 0.30), (0.30, 0.33, 0.40)],
        'base': (0.40, 0.37, 0.38),
        'under': (0.28, 0.13, 0.09),
        'trim': (0.20, 0.38, 0.40),
        'ink': (0.16, 0.10, 0.12),
        'glow': (1.0, 0.56, 0.26),
        'glowStrength': 2.0,
    },
    'tree': {'trunk': (0.24, 0.16, 0.12), 'ink': (0.08, 0.10, 0.08)},
    'character': {
        'bands': [(0.0, (0.80, 0.18, 0.20)), (0.07, (0.95, 0.92, 0.86)), (0.13, (0.30, 0.60, 0.58)), (0.42, (0.93, 0.62, 0.74)),
                  (0.62, (1.0, 0.86, 0.76)), (0.86, (0.16, 0.10, 0.10))],
        'ink': (0.25, 0.12, 0.12),
    },
    'stone': {'wall': [(0.60, 0.58, 0.57), (0.50, 0.49, 0.50)], 'top': (0.70, 0.68, 0.66), 'ink': (0.18, 0.16, 0.18)},
    'prop': {'ink': (0.15, 0.10, 0.10)},
}
for _k, _v in L.get('autocolor', {}).items():
    AUTOCOLOR.setdefault(_k, {}).update({kk: (tuple(vv) if isinstance(vv, list) and vv and not isinstance(vv[0], list) else vv) for kk, vv in _v.items()})


def color_family(a):
    k = a['kind']
    if k in ('shop', 'shop2', 'stall', 'connector', 'arch', 'scaffold'):
        return 'building'
    if k == 'gate':
        return 'gate'
    if k in ('character', 'npc'):
        return 'character'
    if k == 'tree':
        return 'tree'
    if k == 'bridge':
        return 'stone'
    return 'prop'


def has_texture(objs):
    for o in objs:
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if m and m.node_tree and any(n.type == 'TEX_IMAGE' and n.image for n in m.node_tree.nodes):
                return True
    return False


def write_height_attribute(meshes, zmin, zmax):
    """把每个顶点在整个模型里的相对高度（0=底，1=顶）写成顶点属性 hfrac，材质读它来分层上色。"""
    import numpy as np

    span = max(zmax - zmin, 1e-6)
    for o in meshes:
        me = o.data
        n = len(me.vertices)
        co = np.empty(n * 3, dtype=np.float32)
        me.vertices.foreach_get('co', co)
        co = co.reshape(n, 3)
        mw = np.array(o.matrix_world, dtype=np.float32)
        wz = co @ mw[2, :3] + mw[2, 3]
        h = np.clip((wz - zmin) / span, 0, 1).astype(np.float32)
        attr = me.attributes.get('hfrac') or me.attributes.new('hfrac', 'FLOAT', 'POINT')
        attr.data.foreach_set('value', h)


class _NT:
    """简化节点连线的小工具。"""

    def __init__(self, m):
        self.nt = m.node_tree
        for n in list(self.nt.nodes):
            self.nt.nodes.remove(n)

    def node(self, t, **props):
        n = self.nt.nodes.new(t)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def link(self, out, inp):
        self.nt.links.new(out, inp)

    def val(self, v):
        n = self.node('ShaderNodeValue')
        n.outputs[0].default_value = v
        return n.outputs[0]

    def math(self, op, a, b=None):
        n = self.node('ShaderNodeMath', operation=op)
        n.use_clamp = op in ('MULTIPLY', 'SUBTRACT', 'ADD')
        for i, x in enumerate((a, b)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                n.inputs[i].default_value = x
            else:
                self.link(x, n.inputs[i])
        return n.outputs[0]

    def smooth(self, x, lo, hi):
        n = self.node('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
        self.link(x, n.inputs['Value'])
        n.inputs['From Min'].default_value = lo
        n.inputs['From Max'].default_value = hi
        return n.outputs['Result']

    def mix(self, fac, a, b, blend='MIX'):
        n = self.node('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        n.clamp_factor = True
        fin = [s for s in n.inputs if s.name == 'Factor' and s.type == 'VALUE'][0]
        ain = [s for s in n.inputs if s.name == 'A' and s.type == 'RGBA'][0]
        bin_ = [s for s in n.inputs if s.name == 'B' and s.type == 'RGBA'][0]
        for sock, x in ((fin, fac), (ain, a), (bin_, b)):
            if isinstance(x, (int, float)):
                sock.default_value = x
            elif isinstance(x, tuple):
                sock.default_value = (*x, 1)
            else:
                self.link(x, sock)
        return [s for s in n.outputs if s.type == 'RGBA'][0]


def autocolor_material(aid, a):
    fam = color_family(a)
    P = AUTOCOLOR[fam]
    m = bpy.data.materials.new(f'auto_{aid}')
    m.use_nodes = True
    g = _NT(m)
    out = g.node('ShaderNodeOutputMaterial')
    bsdf = g.node('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.9
    g.link(bsdf.outputs[0], out.inputs['Surface'])
    h = g.node('ShaderNodeAttribute', attribute_name='hfrac', attribute_type='GEOMETRY').outputs['Fac']
    geo = g.node('ShaderNodeNewGeometry')
    sn = g.node('ShaderNodeSeparateXYZ')
    g.link(geo.outputs['Normal'], sn.inputs[0])
    nz = sn.outputs['Z']
    tc = g.node('ShaderNodeTexCoord')
    noise = g.node('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 1.6
    noise.inputs['Detail'].default_value = 4.0
    g.link(tc.outputs['Object'], noise.inputs['Vector'])
    grain = g.node('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = 40.0
    g.link(tc.outputs['Object'], grain.inputs['Vector'])
    nf = g.smooth(noise.outputs['Fac'], 0.35, 0.65)  # 水彩斑驳
    ao_node = g.node('ShaderNodeAmbientOcclusion')
    ao_node.inputs['Distance'].default_value = 0.8
    ao = ao_node.outputs['AO']
    up = g.smooth(nz, 0.3, 0.5)
    flat = g.smooth(nz, 0.93, 0.985)
    down = g.smooth(g.math('MULTIPLY', nz, -1.0), 0.25, 0.5)
    glow_mask = None

    if fam in ('building', 'gate'):
        roof_lo = 0.3 if a['kind'] in ('shop2', 'gate') else 0.4
        if 'eave' in a and a['kind'] not in ('shop2', 'gate'):
            roof_lo = max(0.25, a['eave'] / a['size'][2] - 0.12)
        roof_mask = g.math('MULTIPLY', g.math('MULTIPLY', up, g.smooth(h, roof_lo - 0.06, roof_lo + 0.02)), g.math('SUBTRACT', 1.0, flat))
        c = g.mix(nf, P['wall'][0], P['wall'][1])
        if fam == 'gate':
            c = g.mix(g.smooth(h, 0.46, 0.52), c, g.mix(nf, P['upper'][0], P['upper'][1]))
        trim_lo = roof_lo - 0.1
        trim = g.math('MULTIPLY', g.smooth(h, trim_lo - 0.02, trim_lo), g.math('SUBTRACT', 1.0, g.smooth(h, roof_lo - 0.04, roof_lo)))
        c = g.mix(trim, c, P['trim'])
        c = g.mix(g.math('SUBTRACT', 1.0, g.smooth(h, 0.03, 0.07)), c, P['base'])
        c = g.mix(down, c, P['under'])
        roofc = g.mix(nf, P['roof'][0], P['roof'][1])
        # 瓦垄：沿 X 方向的细条纹
        wave = g.node('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X')
        wave.inputs['Scale'].default_value = 9.0
        wave.inputs['Distortion'].default_value = 0.0
        g.link(tc.outputs['Generated'], wave.inputs['Vector'])
        roofc = g.mix(g.math('MULTIPLY', g.smooth(wave.outputs['Fac'], 0.6, 0.9), 0.35), roofc, (0.08, 0.09, 0.13))
        c = g.mix(roof_mask, c, roofc)
        # 凹进去的铺面、门窗：夜里透出暖光（只在下半部、非屋顶）
        glow_mask = g.math('MULTIPLY', g.math('MULTIPLY', g.smooth(g.math('SUBTRACT', 1.0, ao), 0.25, 0.6), g.math('SUBTRACT', 1.0, g.smooth(h, roof_lo - 0.1, roof_lo))),
                           g.math('SUBTRACT', 1.0, g.math('ADD', roof_mask, down)))
    elif fam == 'character':
        ramp = g.node('ShaderNodeValToRGB')
        ramp.color_ramp.interpolation = 'CONSTANT'
        els = ramp.color_ramp.elements
        bands = P['bands']
        els[0].position, els[0].color = bands[0][0], (*bands[0][1], 1)
        els[1].position, els[1].color = bands[1][0], (*bands[1][1], 1)
        for pos, col in bands[2:]:
            e = els.new(pos)
            e.color = (*col, 1)
        g.link(h, ramp.inputs['Fac'])
        c = ramp.outputs['Color']
    elif fam == 'tree':
        leaf = tuple(a['color'])
        leaf2 = tuple(min(1, x * 1.25 + 0.05) for x in leaf)
        canopy = g.mix(nf, leaf, leaf2)
        trunk_mask = g.math('MULTIPLY', g.math('SUBTRACT', 1.0, g.smooth(h, 0.28, 0.4)), g.math('SUBTRACT', 1.0, up))
        c = g.mix(trunk_mask, canopy, P['trunk'])
    elif fam == 'stone':
        c = g.mix(nf, P['wall'][0], P['wall'][1])
        c = g.mix(up, c, P['top'])
    else:
        base = tuple(a['color'])
        c = g.mix(nf, base, tuple(min(1, x * 1.2 + 0.04) for x in base))
        c = g.mix(down, c, tuple(x * 0.45 for x in base))
        if a['kind'] == 'lantern':
            bsdf.inputs['Emission Color'].default_value = (*a['color'], 1)
            bsdf.inputs['Emission Strength'].default_value = 6.0

    # 纸纹颗粒 + 环境光遮蔽压暗 + 轮廓积色
    c = g.mix(g.math('MULTIPLY', grain.outputs['Fac'], 0.12), c, (0.0, 0.0, 0.0), blend='MULTIPLY')
    c = g.mix(g.math('MULTIPLY', g.math('SUBTRACT', 1.0, ao), 0.55), c, (0.0, 0.0, 0.0))
    lw = g.node('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.35
    c = g.mix(g.math('MULTIPLY', g.smooth(lw.outputs['Facing'], 0.55, 0.95), 0.45), c, P.get('ink', (0.15, 0.1, 0.1)))
    g.link(c, bsdf.inputs['Base Color'])
    if glow_mask is not None:
        bsdf.inputs['Emission Color'].default_value = (*P['glow'], 1)
        g.link(g.math('MULTIPLY', glow_mask, P['glowStrength']), bsdf.inputs['Emission Strength'])
    return m


def should_autocolor(a, objs):
    mode = arg('--autocolor')
    if mode == 'all':
        return True
    if mode == 'off':
        return False
    if 'autocolor' in a:
        return bool(a['autocolor'])
    return not has_texture(objs)


# ---------------------------------------------------------------- 导入 Tripo 模型
_imported = {}


def import_glb(aid, a, collection):
    """导入一次并统一：几何中心对齐原点、底面 z=0、按目标尺寸缩放。返回模板根节点（隐藏）。"""
    if aid in _imported:
        return _imported[aid]
    path = os.path.join(MODELS, a['file'])
    if not os.path.exists(path):
        _imported[aid] = None
        return None
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        for c in o.users_collection:
            c.objects.unlink(o)
        coll('_templates').objects.link(o)
    bpy.context.view_layer.update()
    meshes = [o for o in new if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    dims = mx - mn
    w, d, h = a['size']
    s = h / dims.z if a.get('fit') == 'height' else w / max(dims.x, 1e-6)
    root = bpy.data.objects.new(f'{aid}_template', None)
    coll('_templates').objects.link(root)
    pivot = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    for o in new:
        if o.parent is None:
            o.location -= pivot
            o.parent = root
    root['size'] = (dims.x * s, dims.y * s, dims.z * s)
    root['scale'] = s
    _imported[aid] = root
    colored = should_autocolor(a, meshes)
    if colored:
        write_height_attribute(meshes, mn.z, mx.z)
        m = autocolor_material(aid, a)
        for o in meshes:
            o.data.materials.clear()
            o.data.materials.append(m)
    print(f'[models] {a["file"]}: 原始 {dims.x:.2f}×{dims.y:.2f}×{dims.z:.2f} → 缩放 {s:.3f}' + ('（白模，已自动上色）' if colored else ''))
    return root


def instance(template, name, collection):
    """复制模板层级（网格数据共享，不占额外内存）。"""
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)

    def rec(src, parent):
        o = src.copy()
        collection.objects.link(o)
        o.parent = parent
        for ch in src.children:
            rec(ch, o)

    for ch in template.children:
        rec(ch, root)
    return root


def place(aid, x, y, collection, rot=0.0, mirror=False, scale=1.0, label_on=True):
    """把资产放到 (x, y)：正立面贴着 y，中心对齐 x，底面落在 z=0（桥上的物体贴合桥面）。"""
    a = L['assets'][aid]
    tpl = import_glb(aid, a, collection)
    b = L['bridge']
    on_bridge = abs(y - b['y']) <= b['width'] / 2
    z = deck_z(x) if a['kind'] in ('character', 'npc', 'prop') and on_bridge else 0.0
    if a['kind'] == 'prop' and L['canal']['x0'] < x < L['canal']['x1'] and not on_bridge:
        z = L['canal']['waterZ'] - 0.3  # 船等水上道具浮在水面
    if tpl is None:
        root = greybox(a, aid, 0, 0, collection)
        depth = a['size'][1]
        root.location = (x, y, z)
    else:
        root = instance(tpl, f'{aid}_{a["file"].split(".")[0]}', collection)
        s = tpl['scale'] * scale
        depth = tpl['size'][1] * scale
        root.scale = (-s if mirror else s, s, s)
        root.location = (x, y + depth / 2, z)
    if tpl is None and (mirror or scale != 1.0):
        root.scale = (-scale if mirror else scale, scale, scale)
    root.rotation_euler = (0, 0, math.radians(rot))
    if label_on and a['kind'] not in ('lantern',):
        label(aid, x, y - 0.6, a['size'][2] + 1.2, coll('Labels'))
    return root


# ---------------------------------------------------------------- 场景各部分
def build_ground():
    c = coll('Ground')
    st, cn = L['street'], L['canal']
    ground = mat('ground', (0.32, 0.3, 0.33))
    paving = mat('paving', (0.42, 0.39, 0.4), rough=0.6)
    curb = mat('curb', (0.5, 0.46, 0.45))
    for xa, xb in ((st['x0'], cn['x0']), (cn['x1'], st['x1'])):
        box('ground', xa, xb, -60, 120, -0.6, 0, ground, c)
        box('street', xa, xb, st['front'], 0, 0, 0.02, paving, c)
        box('curb', xa, xb, -st['curbDepth'], 0, 0, st['curbHeight'], curb, c)
    stone = mat('embankment', (0.38, 0.36, 0.38))
    box('bank_l', cn['x0'] - 0.6, cn['x0'], cn['y0'], cn['y1'], cn['waterZ'] - 1, 0.05, stone, c)
    box('bank_r', cn['x1'], cn['x1'] + 0.6, cn['y0'], cn['y1'], cn['waterZ'] - 1, 0.05, stone, c)
    box('canal_bed', cn['x0'], cn['x1'], cn['y0'], cn['y1'], cn['waterZ'] - 1.2, cn['waterZ'] - 1, stone, c)
    water = mat('water', (0.03, 0.05, 0.12), rough=0.04)
    box('water', cn['x0'], cn['x1'], cn['y0'], cn['y1'], cn['waterZ'] - 0.05, cn['waterZ'], water, c)


def build_bridge():
    a = L['assets']['S01']
    tpl = import_glb('S01', a, coll('Bridge'))
    b = L['bridge']
    if tpl is not None:
        place('S01', (b['x0'] + b['x1']) / 2, b['y'] - b['width'] / 2, coll('Bridge'))
        return
    c = coll('Bridge')
    cx = (b['x0'] + b['x1']) / 2
    profile = []
    n = 40
    for i in range(n + 1):
        x = b['x0'] + (b['x1'] - b['x0']) * i / n
        profile.append((x, deck_z(x) + 0.05))
    bottom = L['canal']['waterZ'] - 0.4
    profile += [(b['x1'], bottom), (cx + b['archR'], bottom), (cx + b['archR'], b['archZ'])]
    for i in range(1, 24):
        ang = math.pi * i / 24
        profile.append((cx + b['archR'] * math.cos(ang), b['archZ'] + b['archR'] * math.sin(ang)))
    profile += [(cx - b['archR'], b['archZ']), (cx - b['archR'], bottom), (b['x0'], bottom)]
    y0 = b['y'] - b['width'] / 2
    y1 = b['y'] + b['width'] / 2
    stone = mat('bridge_stone', a['color'])
    prism('bridge_body', profile, y0, y1, stone, c)
    # 两侧栏杆：望柱 + 栏板
    rail = mat('bridge_rail', (0.72, 0.7, 0.68))
    for yy in (y0 + 0.15, y1 - 0.15):
        x = b['x0'] + 1.0
        while x < b['x1'] - 0.8:
            z = deck_z(x)
            box('rail_post', x - 0.13, x + 0.13, yy - 0.13, yy + 0.13, z, z + 1.25, rail, c)
            x += 2.0
        top = [(b['x0'] + 1 + (b['x1'] - b['x0'] - 2) * i / 30, 0) for i in range(31)]
        prof = [(x, deck_z(x) + 1.0) for x, _ in top] + [(x, deck_z(x) + 0.1) for x, _ in reversed(top)]
        prism('rail_panel', prof, yy - 0.07, yy + 0.07, rail, c)
    label('S01', cx, y0 - 0.6, b['peak'] + 2.5, coll('Labels'))


def lantern_obj(kind, x, y, z, collection, light=True, small=False):
    aid = 'P01' if kind == 'red' else 'P02'
    a = L['assets'][aid]
    tpl = import_glb(aid, a, collection)
    if tpl is not None and not small:
        o = instance(tpl, f'lantern_{aid}', collection)
        s = tpl['scale']
        o.scale = (s, s, s)
        o.location = (x, y, z - a['size'][2] / 2)
    else:
        r = 0.12 if small else a['size'][0] / 2
        col = (1.0, 0.18, 0.08) if kind == 'red' else (1.0, 0.6, 0.22)
        sphere(f'lantern_{kind}', x, y, z, r, mat(f'lantern_{kind}', col, emission=10 if small else 14), collection, seg=10)
    if light:
        point_light('lantern_light', (x, y - 0.1, z), 18 if kind == 'red' else 14, (1.0, 0.52, 0.22) if kind == 'red' else (1.0, 0.68, 0.35), coll('Lights'))


def build_lanterns(placed):
    c = coll('Lanterns')
    rnd = random.Random(3)
    for aid, x, y in placed:
        a = L['assets'][aid]
        if 'eave' not in a or a['kind'] not in ('shop', 'shop2', 'gate', 'stall'):
            continue
        w = a['size'][0]
        n = 2 if w < 9 else 4
        for i in range(n):
            fx = (i + 0.5) / n - 0.5
            lantern_obj('red' if rnd.random() < 0.65 else 'amber', x + fx * w * 0.85, y - 0.9, a['eave'] - 0.35, c)
    # 石桥栏杆上的灯笼（桥头、桥身各一对，照亮桥面和水面）
    b = L['bridge']
    for fx in (0.12, 0.35, 0.65, 0.88):
        x = b['x0'] + (b['x1'] - b['x0']) * fx
        lantern_obj('amber' if fx in (0.12, 0.88) else 'red', x, b['y'] - b['width'] / 2 + 0.15, deck_z(x) + 1.7, c)
    # 运河两岸柳树下的灯笼
    for x in (L['canal']['x0'] - 2.5, L['canal']['x1'] + 2.5):
        lantern_obj('red', x, -0.8, 3.2, c)
    # 楼与楼之间的灯笼串
    for xa, xb in L['lanternStrings']:
        za, zb = 4.6, 4.6
        ys = -0.6
        cu = bpy.data.curves.new('string', 'CURVE')
        cu.dimensions = '3D'
        cu.bevel_depth = 0.015
        sp = cu.splines.new('POLY')
        pts = 16
        sp.points.add(pts - 1)
        for i in range(pts):
            u = i / (pts - 1)
            sp.points[i].co = (xa + (xb - xa) * u, ys, za + (zb - za) * u - 1.0 * 4 * u * (1 - u), 1)
        o = bpy.data.objects.new('lantern_string', cu)
        o.data.materials.append(mat('rope', (0.1, 0.06, 0.05)))
        c.objects.link(o)
        k = max(3, int(abs(xb - xa) / 1.3))
        for i in range(1, k):
            u = i / k
            lantern_obj('red' if i % 2 else 'amber', xa + (xb - xa) * u, ys, za - 1.0 * 4 * u * (1 - u) - 0.25, c, light=(i == k // 2), small=True)


def build_back_row():
    br = L['backRow']
    rnd = random.Random(br['seed'])
    c = coll('BackRow')
    x = br['x0']
    while x < br['x1']:
        aid = rnd.choice(br['ids'])
        a = L['assets'][aid]
        s = rnd.uniform(*br['scale'])
        w = a['size'][0] * s
        if not any(lo - w / 2 < x < hi + w / 2 for lo, hi in br['skipX']):
            y = rnd.uniform(br['y0'], br['y1'])
            place(aid, x, y, c, mirror=rnd.random() < 0.5, scale=s, label_on=False)
        x += w + rnd.uniform(*br['spacing']) - 6


def build_backdrop():
    c = coll('Backdrop')
    m = bpy.data.materials.new('sky_backdrop')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.55, 0.22, 0.18, 1)
    ramp.color_ramp.elements[1].position = 0.6
    ramp.color_ramp.elements[1].color = (0.012, 0.014, 0.05, 1)
    e = ramp.color_ramp.elements.new(0.18)
    e.color = (0.22, 0.1, 0.25, 1)
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    o = box('sky_backdrop', -160, 320, 160, 161, -5, 120, m, c)
    far = os.path.join(ROOT, 'assets', 'backdrop', 'far_city.png')
    if os.path.exists(far):
        # 远景城市/山：Banana 画的 2D 背景板（宽幅 PNG，透明天空）
        img = bpy.data.images.load(far)
        fm = bpy.data.materials.new('far_city')
        fm.use_nodes = True
        ntf = fm.node_tree
        tex = ntf.nodes.new('ShaderNodeTexImage')
        tex.image = img
        p = ntf.nodes.get('Principled BSDF')
        ntf.links.new(tex.outputs['Color'], p.inputs['Emission Color'])
        ntf.links.new(tex.outputs['Alpha'], p.inputs['Alpha'])
        p.inputs['Emission Strength'].default_value = 0.6
        p.inputs['Base Color'].default_value = (0, 0, 0, 1)
        aspect = img.size[0] / max(1, img.size[1])
        hgt = 40
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        me = bpy.data.meshes.new('far_city')
        bm.to_mesh(me)
        bm.free()
        fo = bpy.data.objects.new('far_city', me)
        me.materials.append(fm)
        fo.rotation_euler = (math.radians(90), 0, 0)
        fo.scale = (hgt * aspect, hgt, 1)
        fo.location = (80, 110, hgt / 2 - 4)
        c.objects.link(fo)
    return o


def build_world(fog):
    s = bpy.context.scene
    w = bpy.data.worlds.new('night')
    s.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (0.01, 0.012, 0.03, 1)
    bg.inputs['Strength'].default_value = 1.0
    if fog:
        vol = w.node_tree.nodes.new('ShaderNodeVolumePrincipled')
        vol.inputs['Color'].default_value = (0.6, 0.45, 0.75, 1)
        vol.inputs['Density'].default_value = 0.006
        out = w.node_tree.nodes.get('World Output')
        w.node_tree.links.new(vol.outputs['Volume'], out.inputs['Volume'])
    sun = bpy.data.lights.new('moon', 'SUN')
    sun.energy = 0.35
    sun.color = (0.55, 0.65, 1.0)
    sun.angle = math.radians(3)
    so = bpy.data.objects.new('moon', sun)
    so.rotation_euler = (math.radians(55), 0, math.radians(-30))
    coll('Lights').objects.link(so)


def character_track():
    ch = L['character']
    keys = ch['keys']
    fx = monotone([(k[0], k[1]) for k in keys])
    fy = monotone([(k[0], k[2]) for k in keys])
    return fx, fy


def build_character():
    c = coll('Character')
    a = L['assets']['C01']
    root = bpy.data.objects.new('XiaoHe', None)
    c.objects.link(root)
    body = place('C01', 0, 0, c, label_on=False)
    body.parent = root
    body.location = (0, 0, 0)
    if import_glb('C01', a, c) is not None:
        body.rotation_euler = (0, 0, math.radians(90))  # Tripo 模型正面朝 -Y，转成朝 +X（前进方向）
    fx, fy = character_track()
    heading = -math.pi / 2
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
    for f in range(1, FRAMES + 2, 2):
        t = (f - 1) / FPS
        x, y = fx(t), fy(t)
        dx = fx(t + 0.05) - fx(t - 0.05)
        dy = fy(t + 0.05) - fy(t - 0.05)
        if math.hypot(dx, dy) > 0.01:
            heading = math.atan2(dy, dx)
        root.location = (x, y, deck_z(x))
        root.rotation_euler = (0, 0, heading)
        root.keyframe_insert('location', frame=f)
        root.keyframe_insert('rotation_euler', frame=f)
    return root


def build_camera(target):
    cm = L['camera']
    cd = bpy.data.cameras.new('cam')
    cd.lens = cm['lens']
    cd.sensor_width = 36
    cd.dof.use_dof = True
    cd.dof.focus_object = target
    cd.dof.aperture_fstop = cm['fstop']
    cam = bpy.data.objects.new('Camera', cd)
    coll('Camera').objects.link(cam)
    bpy.context.scene.camera = cam
    cam.rotation_euler = (math.radians(90 - cm['tiltDeg']), 0, 0)
    fx, _ = character_track()
    fin = cm.get('finale')
    intro = cm.get('intro')
    prev = None
    for f in range(1, FRAMES + 2, 2):
        t = (f - 1) / FPS
        x = min(max(fx(t) + cm['offsetX'], cm['xMin']), cm['xMax'])
        # 轻微阻尼，避免镜头跟得太死
        prev = x if prev is None else prev + (x - prev) * 0.35
        ox, oy, oz = 0.0, 0.0, 0.0
        for mv, rev in ((intro, True), (fin, False)):
            if not mv:
                continue
            u = min(max((t - mv['t0']) / (mv['t1'] - mv['t0']), 0), 1)
            k = u * u * (3 - 2 * u)
            k = 1 - k if rev else k  # 开场从远处推近；结尾缓缓拉远，露出整座鼓楼
            ox += k * mv.get('dx', 0)
            oy += k * mv.get('dy', 0)
            oz += k * mv.get('dz', 0)
        cam.location = (prev + ox, cm['y'] + oy, cm['z'] + oz)
        cam.keyframe_insert('location', frame=f)
    return cam


def setup_render(engine='EEVEE'):
    s = bpy.context.scene
    s.render.resolution_x = 1920
    s.render.resolution_y = 1080
    s.render.resolution_percentage = 100
    if engine == 'EEVEE':
        ids = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
        s.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in ids else 'BLENDER_EEVEE'
        for attr, val in (('use_raytracing', True), ('use_shadows', True), ('volumetric_tile_size', '4'), ('taa_render_samples', 64)):
            try:
                setattr(s.eevee, attr, val)
            except Exception:
                pass
    else:
        s.render.engine = 'CYCLES'
        s.cycles.device = 'CPU'
        s.cycles.samples = 24
        s.cycles.use_denoising = True
        s.cycles.max_bounces = 3
    try:
        s.view_settings.view_transform = 'AgX'
        s.view_settings.look = 'AgX - Punchy'
    except Exception:
        pass
    s.view_settings.exposure = 0.6


def setup_bloom():
    """泛光：EEVEE 4.2+ 去掉了内置 Bloom，用合成器 Glare 节点代替。"""
    s = bpy.context.scene
    try:
        if hasattr(s, 'compositing_node_group'):  # Blender 5.x
            tree = bpy.data.node_groups.new('Bloom', 'CompositorNodeTree')
            s.compositing_node_group = tree
            rl = tree.nodes.new('CompositorNodeRLayers')
            gl = tree.nodes.new('CompositorNodeGlare')
            out = tree.nodes.new('NodeGroupOutput')
            tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        else:  # Blender 4.x
            s.use_nodes = True
            tree = s.node_tree
            for n in list(tree.nodes):
                tree.nodes.remove(n)
            rl = tree.nodes.new('CompositorNodeRLayers')
            gl = tree.nodes.new('CompositorNodeGlare')
            out = tree.nodes.new('CompositorNodeComposite')
        for prop, val in (('glare_type', 'BLOOM'), ('quality', 'HIGH'), ('threshold', 1.0), ('size', 7)):
            try:
                setattr(gl, prop, val)
            except Exception:
                pass
        for name, val in (('Type', 'Bloom'), ('Threshold', 1.0), ('Strength', 0.8), ('Size', 0.6)):
            if name in gl.inputs:
                try:
                    gl.inputs[name].default_value = val
                except Exception:
                    pass
        tree.links.new(rl.outputs['Image'], gl.inputs['Image'])
        tree.links.new(gl.outputs['Image'], out.inputs[0])
    except Exception as e:
        print('[bloom] 跳过合成器泛光：', e)


# ---------------------------------------------------------------- 主流程
def build():
    s = reset_scene()
    fog = not PREVIEW and not arg('--no-fog')
    build_ground()
    build_bridge()
    placed = []
    for p in L['placements']:
        place(p['id'], p['x'], p['y'], coll('Street'), rot=p.get('rot', 0), mirror=p.get('mirror', False))
        placed.append((p['id'], p['x'], p['y']))
    build_back_row()
    build_lanterns(placed)
    build_backdrop()
    build_world(fog)
    girl = build_character()
    build_camera(girl)
    for o in coll('_templates').all_objects:
        o.hide_render = True
        o.hide_viewport = True
    return s


def render_topview(path):
    s = bpy.context.scene
    for o in coll('Labels').objects:
        o.hide_render = False
        o.rotation_euler = (0, 0, 0)
        o.location.z = 25
        o.data.size = 2.2
    cd = bpy.data.cameras.new('top')
    cd.type = 'ORTHO'
    cd.ortho_scale = 230
    top = bpy.data.objects.new('TopCam', cd)
    top.location = (70, 10, 120)
    coll('Camera').objects.link(top)
    s.camera = top
    s.render.resolution_x = 2000
    s.render.resolution_y = 700
    sun = bpy.data.lights.new('topsun', 'SUN')
    sun.energy = 3
    so = bpy.data.objects.new('topsun', sun)
    so.rotation_euler = (math.radians(20), 0, 0)
    coll('Lights').objects.link(so)
    s.cycles.samples = 8
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    s = build()
    out = arg('--save')
    if out:
        os.makedirs(os.path.dirname(os.path.join(ROOT, out)), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, out))
    if arg('--animatic'):
        import subprocess
        import tempfile
        setup_render('CYCLES')
        s.cycles.samples = int(arg('--samples', 8))
        s.render.resolution_percentage = int(arg('--percent', 25))
        step = int(arg('--step', 3))
        tmp = tempfile.mkdtemp()
        for i, f in enumerate(range(1, FRAMES + 1, step)):
            s.frame_set(f)
            s.render.filepath = os.path.join(tmp, f'{i:05d}.png')
            bpy.ops.render.render(write_still=True)
        dst = os.path.join(ROOT, arg('--animatic'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS / step), '-i', os.path.join(tmp, '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', dst], check=True)
        print('动态分镜 →', dst)
        return
    if arg('--preview') or arg('--topview'):
        setup_render('CYCLES')
        s.render.resolution_percentage = int(arg('--percent', 50))
        if arg('--preview'):
            d = os.path.join(ROOT, arg('--preview'))
            os.makedirs(d, exist_ok=True)
            frames = [int(v) for v in str(arg('--frames', '60,330,600,780,1170')).split(',')]
            for f in frames:
                s.frame_set(f)
                s.render.filepath = os.path.join(d, f'frame_{f:04d}.png')
                bpy.ops.render.render(write_still=True)
        if arg('--topview'):
            render_topview(os.path.join(ROOT, arg('--topview')))
        return
    setup_render('EEVEE')
    setup_bloom()
    if arg('--render'):
        s.render.image_settings.file_format = 'FFMPEG'
        s.render.ffmpeg.format = 'MPEG4'
        s.render.ffmpeg.codec = 'H264'
        s.render.ffmpeg.constant_rate_factor = 'HIGH'
        s.render.filepath = os.path.join(ROOT, arg('--render'))
        bpy.ops.render.render(animation=True)


if __name__ == '__main__':
    main()
