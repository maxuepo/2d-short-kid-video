#!/usr/bin/env python3
"""批量把图片送进本地 ComfyUI 的混元3D 工作流，生成 GLB 并按文件名放进 assets/models/。

前提：ComfyUI 已启动（默认 http://127.0.0.1:8188），且已放好 hunyuan_3d_v2.1.safetensors。

用法（仓库根目录）：
    python tools/comfyui/batch_image_to_3d.py --images D:/xiaohe/refs
    # 图片按清单命名，例如 B04_tavern.png → 输出 assets/models/B04_tavern.glb
    # 常用参数：
    #   --octree 384        更细的网格（更慢、更吃显存；12GB 显卡建议 256~384）
    #   --resolution 2048   显存不够时调低
    #   --seeds 3           每张图出 3 个不同随机种子的版本，挑最好的（输出 B04_tavern_s1.glb …）
    #   --rembg             先自动抠掉背景（需要 pip install rembg）
    #   --ckpt hunyuan3d-dit-v2_fp16.safetensors   改用 2.0 模型
    #   --force             已存在的 GLB 也重新生成

只用 Python 标准库（rembg 可选），不需要额外安装。
"""
import argparse
import copy
import io
import json
import mimetypes
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
IMAGE_EXT = ('.png', '.jpg', '.jpeg', '.webp')


def http(server, path, data=None, headers=None, timeout=60):
    req = urllib.request.Request(server + path, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def upload(server, name, payload):
    boundary = uuid.uuid4().hex
    ctype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
    body = io.BytesIO()
    for key, val in (('overwrite', 'true'), ('type', 'input')):
        body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{val}\r\n'.encode())
    body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\nContent-Type: {ctype}\r\n\r\n'.encode())
    body.write(payload)
    body.write(f'\r\n--{boundary}--\r\n'.encode())
    res = json.loads(http(server, '/upload/image', body.getvalue(), {'Content-Type': f'multipart/form-data; boundary={boundary}'}))
    return (res.get('subfolder') + '/' if res.get('subfolder') else '') + res['name']


def remove_background(payload):
    """可选：rembg 抠图后合成到白底（ComfyUI 的 LoadImage 会丢掉透明通道，透明处会变黑）。"""
    from PIL import Image
    from rembg import remove

    cut = Image.open(io.BytesIO(remove(payload))).convert('RGBA')
    bg = Image.new('RGBA', cut.size, (255, 255, 255, 255))
    bg.alpha_composite(cut)
    out = io.BytesIO()
    bg.convert('RGB').save(out, 'PNG')
    return out.getvalue()


def find_node(wf, class_type):
    for nid, node in wf.items():
        if node.get('class_type') == class_type:
            return node
    raise KeyError(f'工作流里没有 {class_type} 节点')


def run_one(server, wf, timeout):
    client_id = uuid.uuid4().hex
    res = json.loads(http(server, '/prompt', json.dumps({'prompt': wf, 'client_id': client_id}).encode(), {'Content-Type': 'application/json'}))
    if res.get('node_errors'):
        raise RuntimeError(f'工作流校验失败：{json.dumps(res["node_errors"], ensure_ascii=False)}')
    pid = res['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(http(server, f'/history/{pid}'))
        if pid in hist:
            item = hist[pid]
            status = item.get('status', {})
            if status.get('status_str') == 'error':
                msgs = [m for m in status.get('messages', []) if m and m[0] == 'execution_error']
                detail = msgs[-1][1].get('exception_message', '') if msgs else ''
                raise RuntimeError(f'ComfyUI 执行出错：{detail.strip() or status}')
            if status.get('completed', True):
                return item.get('outputs', {})
        time.sleep(2)
    raise TimeoutError(f'等待超过 {timeout} 秒')


def glb_files(outputs):
    for node_out in outputs.values():
        for items in node_out.values():
            if isinstance(items, list):
                for it in items:
                    if isinstance(it, dict) and str(it.get('filename', '')).lower().endswith('.glb'):
                        yield it


def main():
    ap = argparse.ArgumentParser(description='批量图片 → 混元3D → GLB')
    ap.add_argument('--images', required=True, help='图片文件夹（文件名即输出模型名，如 B04_tavern.png）')
    ap.add_argument('--out', default=os.path.join(ROOT, 'assets', 'models'), help='GLB 输出目录')
    ap.add_argument('--server', default='http://127.0.0.1:8188')
    ap.add_argument('--workflow', default=os.path.join(HERE, 'hunyuan3d_v2.1_api.json'))
    ap.add_argument('--ckpt', help='检查点文件名（默认用工作流里的 hunyuan_3d_v2.1.safetensors）')
    ap.add_argument('--resolution', type=int, help='EmptyLatentHunyuan3Dv2 分辨率（默认 3072）')
    ap.add_argument('--octree', type=int, help='网格精细度 octree_resolution（默认 256，最大 512）')
    ap.add_argument('--steps', type=int)
    ap.add_argument('--cfg', type=float)
    ap.add_argument('--seed', type=int)
    ap.add_argument('--seeds', type=int, default=1, help='每张图生成几个不同种子的版本')
    ap.add_argument('--rembg', action='store_true', help='先用 rembg 抠背景')
    ap.add_argument('--force', action='store_true', help='覆盖已存在的 GLB')
    ap.add_argument('--timeout', type=int, default=1800, help='单个模型最长等待秒数')
    a = ap.parse_args()

    server = a.server.rstrip('/')
    try:
        http(server, '/system_stats', timeout=10)
    except Exception as e:
        sys.exit(f'连不上 ComfyUI（{server}）：{e}\n请先启动 ComfyUI。')

    base = json.load(open(a.workflow, encoding='utf-8'))
    images = sorted(f for f in os.listdir(a.images) if f.lower().endswith(IMAGE_EXT))
    if not images:
        sys.exit(f'{a.images} 里没有图片')
    os.makedirs(a.out, exist_ok=True)
    print(f'共 {len(images)} 张图，输出到 {a.out}')

    done, failed, errors = [], [], []
    for name in images:
        stem = os.path.splitext(name)[0]
        for k in range(a.seeds):
            out_name = f'{stem}.glb' if a.seeds == 1 else f'{stem}_s{k + 1}.glb'
            dst = os.path.join(a.out, out_name)
            if os.path.exists(dst) and not a.force:
                print(f'  跳过（已存在）：{out_name}')
                continue
            t0 = time.time()
            try:
                payload = open(os.path.join(a.images, name), 'rb').read()
                if a.rembg:
                    payload = remove_background(payload)
                    up_name = upload(server, stem + '_nobg.png', payload)
                else:
                    up_name = upload(server, name, payload)
                wf = copy.deepcopy(base)
                find_node(wf, 'LoadImage')['inputs']['image'] = up_name
                find_node(wf, 'SaveGLB')['inputs']['filename_prefix'] = f'mesh/{stem}'
                ks = find_node(wf, 'KSampler')['inputs']
                if a.seed is not None:
                    ks['seed'] = a.seed + k
                elif a.seeds > 1:
                    ks['seed'] = ks['seed'] + k * 1000
                if a.steps:
                    ks['steps'] = a.steps
                if a.cfg:
                    ks['cfg'] = a.cfg
                if a.ckpt:
                    find_node(wf, 'ImageOnlyCheckpointLoader')['inputs']['ckpt_name'] = a.ckpt
                if a.resolution:
                    find_node(wf, 'EmptyLatentHunyuan3Dv2')['inputs']['resolution'] = a.resolution
                if a.octree:
                    find_node(wf, 'VAEDecodeHunyuan3D')['inputs']['octree_resolution'] = a.octree
                print(f'→ {name}' + (f'（第 {k + 1}/{a.seeds} 个种子）' if a.seeds > 1 else ''), flush=True)
                outputs = run_one(server, wf, a.timeout)
                files = list(glb_files(outputs))
                if not files:
                    raise RuntimeError('没有找到 GLB 输出（检查工作流里的 SaveGLB 节点）')
                f = files[-1]
                q = urllib.parse.urlencode({'filename': f['filename'], 'subfolder': f.get('subfolder', ''), 'type': f.get('type', 'output')})
                data = http(server, f'/view?{q}', timeout=300)
                with open(dst, 'wb') as fh:
                    fh.write(data)
                print(f'  ✓ {out_name}  {len(data) / 1e6:.1f} MB  {time.time() - t0:.0f} 秒')
                done.append(out_name)
            except Exception as e:
                print(f'  ✗ {name}：{e}')
                failed.append(name)
                errors.append(str(e))
    print(f'\n完成 {len(done)} 个，失败 {len(failed)} 个' + (f'：{", ".join(failed)}' if failed else ''))
    if any('out of memory' in x.lower() or 'outofmemory' in x.lower() for x in errors):
        print('显存不足时可加 --resolution 2048 或 --octree 192，或改用 --ckpt hunyuan3d-dit-v2_fp16.safetensors')


if __name__ == '__main__':
    main()
