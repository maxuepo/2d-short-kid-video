#!/usr/bin/env python3
"""从一张 AI 生成的夜景图里自动找出灯笼位置，生成单图模式的场景配置。

用法：
    python3 scripts/detect-lights.py assets/scenes/my-scene.png
    → 生成 assets/scenes/my-scene.js 与 out/my-scene-lights.jpg（绿圈标出检测结果，方便检查）

然后打开 index.html?mode=still&scene=my-scene 预览。
sky（烟花可出现的区域）、water（水面波光区域）和 walkY（角色脚底高度）是按画面手动调的多边形/数值，
脚本先给一个默认值（天空 = 画面上方 30%，无水面），请对照检查图修改生成的 .js 文件。

依赖：pip install pillow numpy
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw


def detect(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / (mx + 1e-3)
    H, W = r.shape
    sky_h = int(H * 0.3)
    red = (r > 190) & (g < 120) & (b < 110) & (sat > 0.5)  # 红灯笼
    amber = (r > 235) & (g > 140) & (g < 225) & (b < 140) & (sat > 0.4)  # 孔明灯（只取天空部分）
    amber[sky_h:, :] = False
    mask = red | amber
    lab = np.zeros((H, W), np.int32)
    comps = []
    cur = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        cur += 1
        stack = [(y0, x0)]
        lab[y0, x0] = cur
        pts = []
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur
                    stack.append((ny, nx))
        if len(pts) < 10:
            continue
        p = np.array(pts)
        h, w = np.ptp(p[:, 0]) + 1, np.ptp(p[:, 1]) + 1
        if len(pts) / (w * h) < 0.35 or max(w, h) > 70 or max(w, h) / min(w, h) > 2.6:
            continue  # 排除窗户、布幌等非圆形色块
        cy, cx = p.mean(0)
        is_sky = bool(amber[p[:, 0], p[:, 1]].mean() > 0.5)
        comps.append(dict(x=float(cx), y=float(cy), r=float(max(w, h) / 2), n=len(pts), sky=is_sky))
    comps = [c for c in comps if c['r'] >= 5 or c['sky']]
    comps.sort(key=lambda c: -c['n'])
    out = []
    for c in comps:  # 合并重叠的检测
        if any(math.hypot(c['x'] - o['x'], c['y'] - o['y']) < max(o['r'], c['r']) * 1.1 for o in out):
            continue
        out.append(c)
    return im, out


def main():
    src = sys.argv[1]
    name = os.path.splitext(os.path.basename(src))[0]
    im, lights = detect(src)
    W, H = im.size
    cfg = {
        'image': src.replace(os.sep, '/'),
        'size': [W, H],
        'lights': sorted([[round(c['x']), round(c['y']), round(c['r']), 1 if c['sky'] else 0] for c in lights], key=lambda l: (l[1], l[0])),
        'sky': [[0, 0], [W, 0], [W, round(H * 0.3)], [0, round(H * 0.3)]],
        'water': [[0, 0], [0, 0], [0, 0]],
        'walkY': round(H * 0.93),
    }
    js_path = os.path.join(os.path.dirname(src), name + '.js')
    with open(js_path, 'w') as f:
        f.write('// 单图场景配置（scripts/detect-lights.py 生成）。lights: [x, y, 半径, 是否为孔明灯]；sky / water 为图像坐标多边形\n')
        f.write('window.KV_SCENE = ' + json.dumps(cfg, ensure_ascii=False, separators=(',', ':')) + ';\n')
    os.makedirs('out', exist_ok=True)
    dbg = im.copy()
    d = ImageDraw.Draw(dbg)
    for c in lights:
        d.ellipse([c['x'] - c['r'] - 3, c['y'] - c['r'] - 3, c['x'] + c['r'] + 3, c['y'] + c['r'] + 3], outline=(0, 255, 0), width=2)
    dbg.save(os.path.join('out', name + '-lights.jpg'))
    print(f'{len(lights)} 个灯光 → {js_path}，检查图 → out/{name}-lights.jpg')


if __name__ == '__main__':
    main()
