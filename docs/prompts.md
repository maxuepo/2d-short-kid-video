# AI 绘图 Prompt 包 · 元宵灯夜 / 小禾进城

> 目标画风：《八方旅人》HD-2D 式体积光与景深 × 吉卜力手绘水粉水彩。
> 用法：先用 **§1 全景概念图** 定调，再用 **§2 分层 Prompt** 逐层出图（便于视差滚动），**§3 角色** 与 **§4 道具/特效** 单独出图（便于拆件与骨骼绑定）。
> 出好的图按 [`pipeline.md`](pipeline.md) 的尺寸放入 `assets/layers/`，项目会自动替换程序化图层。

---

## 0. 通用风格锚点（每条 Prompt 末尾都可追加）

**英文风格尾缀**

```
Studio Ghibli warm hand-painted gouache and watercolor texture, Octopath Traveler HD-2D volumetric lighting,
warm orange lantern glow against deep indigo night, soft bloom, atmospheric haze, subtle tilt-shift depth of field,
clean readable silhouettes, children's picture-book warmth
```

**通用负面提示词（SD / SDXL / Flux 的 negative；MJ 用 `--no`）**

```
photorealistic, 3d render, harsh neon, cyberpunk, modern buildings, cars, power lines, text, watermark, signature,
logo, blurry face, extra fingers, deformed hands, japanese torii, korean hanok, cluttered composition, oversaturated
```

MJ 写法示例：`--no text, watermark, modern buildings, neon`

---

## 1. 核心横版长卷全景（概念设计 / 背景通景）

### 中文描述

> 2.5D 横版卷轴游戏场景概念图，明代繁华城池夜市，融合《八方旅人》的 HD-2D 体积光与吉卜力工作室手绘水粉水彩风格。
> 画面自左向右展开：左侧为巍峨古朴的城门瓮城，沿街挂满摇曳的暖橙色羊角灯与红灯笼；街边是明代青砖黛瓦的木构铺面与铁匠铺兵器架（插着红缨枪、雁翎刀）；中央一座石拱桥跨越穿城运河，桥下波光粼粼，倒映灯火与孔明灯；夜空绽放温暖璀璨的民俗烟火与打铁花；画面右侧远处矗立雄伟的明代鼓楼。
> 暖调光影，空气中弥漫温暖的烟火雾气，移轴景深（Tilt-shift），动态光影对比，电影级横版长构图。

### Midjourney（v6.1）

```
2.5D side-scrolling panoramic game scene, bustling Ming Dynasty city avenue at night during the Lantern Festival,
Octopath Traveler HD-2D aesthetic blended with Studio Ghibli warm hand-painted watercolor art style.
From left to right: a majestic ancient city gate fortress with a two-tier gate tower, a cobblestone main street lined
with glowing orange horn lanterns and red paper lanterns and wooden shopfronts with hanging cloth shop banners,
a blacksmith's weapon rack with red-tasseled spears and curved sabers, an arched stone bridge over a calm inner-city
canal with shimmering reflections and floating sky lanterns, folk fireworks and showers of molten-iron sparks lighting
the warm night sky, ending at a grand Ming Dynasty Drum Tower on the right.
Cinematic volumetric warm lighting, cozy atmospheric haze, subtle tilt-shift depth of field, ultra-detailed
--ar 21:9 --style raw --v 6.1 --no text, watermark, modern buildings
```

> 想要更长的卷轴：先出 21:9，再用 MJ 的 **Pan → / ←** 向两侧扩展 2~3 次，最后拼接成约 6.7:1 的长卷（对应主层 7200×1080）。

### DALL·E / GPT 图像 / 不支持参数的模型

把 `--ar` 等参数删掉，改写为文字：`… ultra-wide 21:9 horizontal panorama, no text, no watermark.`

### SDXL / Flux（ComfyUI / WebUI）

- 尺寸：1536×640（≈ 2.4:1）起步，用 Outpainting 横向扩展
- 采样：DPM++ 2M Karras，28~35 步，CFG 5~6（Flux 用 guidance 3~3.5）
- 正向 Prompt 同 MJ 版，去掉 `--` 参数；负面用 §0

---

## 2. 视差分层背景 Prompt（逐层出图，便于横版滚动）

> 关键：每层单独生成、**只画该层的东西**，其余区域留纯色（便于抠图）或直接用支持透明背景的工具（SD + LayerDiffuse、rembg、Photoshop 选择主体）。
> 每层的成品尺寸与视差系数见 [`pipeline.md` §2](pipeline.md#2-图层规格视差系数--成品尺寸)。

| 层 | 内容 | Prompt（英文，追加 §0 风格尾缀） |
|---|---|---|
| L0 天空 | 渐变夜空 + 星 | `seamless night sky gradient, deep indigo at top fading to warm amber glow at the horizon from city lights, scattered soft stars, no buildings, no clouds --ar 16:9` |
| L1 月与云 | 月亮、积云 | `a large soft full moon and fluffy Ghibli-style cumulus clouds lit warmly from below by city lanterns, isolated on flat dark navy background, horizontal strip --ar 32:9` |
| L2 远山 | 剪影山脉、山顶宝塔 | `distant layered mountain silhouettes in muted purple-blue, a tiny pagoda with lit windows on a hilltop, heavy atmospheric haze, flat simple shapes, horizontal strip --ar 32:9` |
| L3 远城 | 小尺度屋顶天际线 | `far distant Ming dynasty city skyline silhouettes, rows of small curved tiled roofs and a few towers, tiny warm window lights, desaturated purple, misty, horizontal strip, bottom edge flat --ar 32:9` |
| L4 中城 | 较大屋顶、楼阁 | `mid-distance Ming dynasty rooftops and pavilions, curved eaves with upturned corners, some lit lattice windows, soft purple shadows, light haze, horizontal strip, bottom edge flat --ar 32:9` |
| L5 主街 | 城门→铺面→石桥→鼓楼 | 用 §1 全景，但写明 `pure side elevation, flat orthographic front view of facades, street surface occupying the bottom sixth of the image` 以便角色行走 |
| L6 前景 | 近景灯笼串、灯杆、人群剪影 | `foreground silhouettes for parallax: hanging red lantern strings from the top edge, a dark wooden lantern pole, silhouettes of festival crowd heads along the bottom edge, strong bokeh blur, transparent background` |

**主街层（L5）额外要求**：建筑立面底边保持在同一水平线（项目中为 y=900），石桥中心在长卷约 51% 处（x≈3700/7200），城门在最左、鼓楼在最右。

---

## 3. 主角「小禾」设定（明代民间服饰的活泼小旅人）

角色定位：约十岁、开朗好奇的明代小姑娘，穿**对襟/交领袄裙（马面裙）**、梳**双丫髻**，是逛灯会的小探险家。服装端庄得体、儿童绘本向。

### 3.1 全身设定图

**中文**

> 吉卜力手绘水彩画风，明代民间服饰的活泼小姑娘，身穿浅杏色交领短袄、红色腰带、青绿色马面裙（裙摆金色织带），脚穿红色绣花软底鞋，头梳双丫髻并系红色发带，鬓边一朵小粉花。奔跑姿态灵动，神情开朗喜悦。纯白干净背景，全身立绘，线条清晰，适合 2D 拆件与骨骼动画。

**英文**

```
Studio Ghibli style full-body character concept of a cheerful ten-year-old girl in modest Ming Dynasty folk clothing:
apricot cross-collar short jacket with crimson collar trim, red sash belt, teal pleated horse-face skirt with a gold
woven hem band, red embroidered cloth shoes, twin hair buns tied with red ribbons and a small pink flower.
Joyful running pose, expressive friendly face, gentle watercolor gouache texture, crisp clean outlines,
isolated on solid white background, game sprite reference --ar 1:1 --style raw --v 6.1
```

### 3.2 三视图（Turnaround）

```
character turnaround sheet of the same girl (front view, 3/4 view, side view facing right, back view),
consistent outfit and proportions, neutral standing pose with arms slightly away from body, flat even lighting,
clean lineart with soft watercolor fill, white background --ar 16:9
```

### 3.3 拆件图（Parts Sheet，用于骨骼绑定）

```
2D game character parts sheet for skeletal animation (cut-out rig), side view facing right, the same Ming dynasty girl,
each body part separated and laid out with spacing on white background: head with face, back hair, front hair bangs,
two hair buns, two ribbon tails, torso jacket, belt with two sash tails, upper arms, wide drooping sleeves with forearms,
hands, skirt, thighs, shins, shoes, flat lighting, no overlap between parts, clean edges --ar 16:9
```

> 生成后在 Photoshop / Krita 中逐件抠出，部件命名与轴心位置见 [`pipeline.md` §3](pipeline.md#3-角色拆件与骨骼)。

### 3.4 表情与口型

```
expression sheet of the same girl, side and 3/4 view heads: happy smile, open-mouth amazed "wow" looking up,
laughing with closed eyes, surprised, waving hello, lip-sync mouth shapes A I U E O, white background --ar 16:9
```

### 3.5 动作关键帧

```
animation key poses of the same girl, side view facing right, sequence in one row: run cycle contact, down, passing,
up, then stop, look up at fireworks in wonder, waving hello, consistent proportions, white background --ar 21:9
```

### 一致性技巧

- **Midjourney**：v6.x 用 `--cref <角色图URL> --cw 100` 保持人物一致，`--sref <风格图URL>` 保持画风；v7 起角色参考改为 Omni Reference（`--oref`，用 `--ow` 控权重）。所有角色图沿用同一 `--seed`。
- **Stable Diffusion / Flux**：IP-Adapter（FaceID / Plus）锁人物，ControlNet OpenPose 锁动作，若需大量出图可训练一个小 LoRA（15~30 张三视图 + 表情）。
- 出图后统一在 PS 里校色到同一套色板（见 `src/girl.js` 顶部 `C` 色值），比反复抽卡更省时间。

---

## 4. 道具与特效（单独出图，叠加到场景）

| 素材 | Prompt（英文，追加 §0 风格尾缀） | 用途 |
|---|---|---|
| 灯笼合集 | `sprite sheet of traditional Chinese lanterns: round red silk lanterns with gold caps and red tassels, translucent amber horn lanterns, small festival string lanterns, front view, evenly spaced, white background --ar 16:9` | 摇摆 + 叠加光晕 |
| 兵器架 | `wooden weapon display rack outside a Ming dynasty blacksmith shop, red-tasseled spears standing upright, two curved sabers resting crosswise, side view, isolated on white background --ar 1:1` | 主街道具（展示陈列，非战斗） |
| 石拱桥 | `single-arch Chinese stone bridge with carved stone balustrades and lion-head posts, strict side elevation, isolated on white background --ar 21:9` | 桥身/前栏杆分两层 |
| 鼓楼 | `Ming dynasty Drum Tower, brick platform with arched gateway, two-tier red-pillared hall with sweeping tiled roofs, big red drum visible inside, strict front elevation, isolated --ar 4:3` | 结尾地标 |
| 烟花序列 | `sprite sheet animation sequence of a firework burst, 8 frames left to right, warm gold and red peony firework, black background --ar 4:1` | 用「滤色/相加」叠加 |
| 打铁花序列 | `sprite sheet animation sequence of Chinese molten iron sparks performance (da tie hua), golden sparks fountain bursting upward and raining down, 8 frames, black background --ar 4:1` | 相加混合 |
| 孔明灯 | `small glowing sky lanterns floating, several sizes, warm orange light, isolated on black background --ar 3:1` | 远景粒子 |

> 黑底特效素材在合成时用 **Add / Screen（相加/滤色）** 混合，黑色自动消失，无需抠图。
