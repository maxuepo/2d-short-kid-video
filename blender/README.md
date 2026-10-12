# 3D 横版场景（Blender）

用 3D 搭整条明代街道（城门 → 铺面 → 运河石桥 → 打铁花 → 鼓楼），相机横向跟拍小禾，直接渲染成视频。HD-2D 的味道来自：略俯视的长焦镜头 + 浅景深 + 暖色灯笼点光 + 体积雾 + 泛光。

- `layout.json`：**所有位置、尺寸、走位、镜头参数都在这里**。改完重新运行脚本即可
- `build_scene.py`：搭建脚本。`assets/models/` 里有 GLB 就用模型，没有就用灰模占位
- 素材清单与 Prompt：[`docs/3d/asset-list.md`](../docs/3d/asset-list.md)

## 在 Mac（M1 Max）上运行

1. 安装 [Blender](https://www.blender.org/download/)（4.2 LTS 或更新，5.x 也可以）
2. 在终端进入仓库根目录：

```bash
# 打开 Blender 并搭好场景（可以直接按空格播放、拖动时间轴看镜头）
/Applications/Blender.app/Contents/MacOS/Blender -P blender/build_scene.py

# 不开界面，搭好后保存 .blend
/Applications/Blender.app/Contents/MacOS/Blender -b -P blender/build_scene.py -- --save out/street.blend

# 不开界面，直接用 EEVEE 渲染整片（1920×1080，30fps，带雾和泛光）→ out/street.mp4
/Applications/Blender.app/Contents/MacOS/Blender -b -P blender/build_scene.py -- --render out/street.mp4
```

> 建议 alias：`alias blender=/Applications/Blender.app/Contents/MacOS/Blender`

## 常用参数

| 参数 | 作用 |
|---|---|
| `--save out/street.blend` | 保存场景文件 |
| `--render out/street.mp4` | EEVEE 渲染整片 |
| `--no-fog` | 关闭体积雾（渲染更快） |
| `--preview out/dir --frames 60,330,600` | Cycles CPU 渲几张关键帧（没有显卡也能跑） |
| `--topview out/top.png` | 俯视布局图（带资产编号） |
| `--animatic out/animatic.mp4 --step 3 --percent 25` | 低清动态分镜，检查节奏用 |

## 模型替换规则

- 文件名按清单放进 `assets/models/`，例如 `assets/models/B04_tavern.glb`
- 脚本会自动：把模型中心对齐、底面落到地上、按 `layout.json` 里的宽度（或 `"fit": "height"` 的按高度）缩放、正立面贴着街道
- Tripo 导出的模型正面默认朝向相机。如果某个模型方向不对，在 `layout.json` 那条 placement 里加 `"rot": 180`（或 90 / -90）
- 同一个模型出现多次时共享网格数据，不会占用额外内存

## 镜头与节奏

- `character.keys`：小禾的走位关键帧 `[秒, x, y]`，桥上的高度自动贴合桥面
- `camera`：焦距、距离、俯角、跟拍偏移、景深光圈；`intro` / `finale` 是开场推近和结尾拉远
- 现在的时间线（42 秒）：0–4 秒从城门洞走出 → 4–12 秒跑过酒肆、茶馆、铁匠铺 → 12–18 秒上桥 → 18–21.5 秒桥顶看烟花 → 21.5–28 秒跑过打铁花 → 28–36 秒到鼓楼 → 36–42 秒挥手、镜头拉远

## 下一步（模型到位后）

1. 水彩风格化材质：统一的卡通明暗 + 描边 + 纸纹，让不同模型画风一致
2. 中文招牌和幌子贴图
3. 小禾绑骨（Tripo 自动绑骨或 Mixamo）+ 跑步 / 抬头 / 挥手动作
4. 烟花、打铁花火星（粒子）与孔明灯
