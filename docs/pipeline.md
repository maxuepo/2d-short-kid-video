# 制作流程：分镜 → 分层 → 拆件 → 光影 → 出片

本项目已经可以**零素材**渲染出一条 36 秒的成片（全部程序化绘制）。这份文档说明它的结构，以及如何逐步把程序化画面替换成 AI 生成或手绘的高质量素材。

## 1. 分镜 / 时间线

| 时间 | 镜头 | 角色动作 | 画面重点 | 字幕 | 建议音效 |
|---|---|---|---|---|---|
| 0.0–4.6 | 城门（相机静止） | 小禾站在长乐门门洞里，起步 | 片名「元宵灯夜 · 小禾进城」淡入淡出 | 元宵夜，小禾跑进了长乐门。 | 远处人声、风铃 |
| 4.6–10 | 跟拍向右 | 加速奔跑 | 灯笼街、幌子、灯笼串、柜台货品 | 街上挂满了暖暖的灯笼，一盏又一盏。 | 脚步声（石板）、叫卖声 |
| 10–14.6 | 跟拍 | 跑过铁匠铺 | 红缨枪兵器架、炉火火星 | 铁匠铺前，红缨枪排排站好。 | 打铁「叮当」 |
| 14.6–20 | 上桥，桥顶驻足 | 抬头看烟花 | 石拱桥、运河倒影、烟花最密集（13.5–23 秒） | 站上石拱桥——哇，烟花开满天！ | 烟花升空 + 爆裂 |
| 20–27 | 跟拍 | 下桥奔跑 | 打铁花：铁水飞溅成金雨 | 看，打铁花！像下了一场金色的雨。 | 铁花「哗——」、人群惊呼 |
| 27–31 | 跟拍减速 | 跑向鼓楼 | 鼓楼进入画面 | 灯火一路，把小禾送到了鼓楼前。 | 配乐渐强 |
| 31–36 | 相机停在长卷尽头 | 停步、抬头挥手、小跳 | 鼓面随鼓点发光、声波圈（31.4 秒起，每 0.9 秒一下） | 咚——咚——新年快乐！ | 大鼓（对齐 31.4 + 0.9n 秒） |

走位关键帧在 `src/main.js` 的 `girlPath`，字幕在 `KV.SUBTITLES`，改这两处就能重新剪辑节奏。

## 2. 图层规格（视差系数 → 成品尺寸）

相机在主层上从 x=0 移动到 x=5280（主层宽 7200 − 画面宽 1920）。某层的视差系数为 *f* 时，它需要的宽度是：

```
宽度 = 1920 + 5280 × f        高度统一 1080
```

| 文件名（放在 `assets/layers/`） | 层 | 视差系数 | 成品尺寸 | 透明背景 | 程序化版本位置 |
|---|---|---|---|---|---|
| `sky.png` | 夜空渐变 + 星 | 0 | 1920×1080 | 否 | `layers.js › sky()` |
| `clouds.png` | 月亮 + 云 | 0.04 | 2132×1080 | 是 | `clouds()` |
| —（程序化） | 烟花 | 0.06 | — | — | `fx.js › FX.fireworks` |
| `mountains.png` | 远山 + 宝塔 | 0.10 | 2448×1080 | 是 | `mountains()` |
| —（程序化） | 孔明灯 | 0.15 | — | — | `FX.skyLanterns` |
| `city_far.png` | 远城天际线 | 0.28 | 3399×1080 | 是 | `city(… cityFar …)` |
| `city_mid.png` | 中城屋顶楼阁 | 0.55 | 4824×1080 | 是 | `city(… cityMid …)` |
| `street.png` | 主街（城门→铺面→运河→鼓楼） | 1.00 | 7200×1080 | 是（天空部分透明） | `street()` |
| `foreground.png` | 前景灯笼串、灯杆、人群 | 1.35 | 9048×1080 | 是（建议预先模糊） | `foreground()` |

**规则**

- 文件存在就自动替换，不存在就用程序化版本，可以一层一层地换
- 主层 `street.png` 的建筑底边要对齐 **y=900**，角色行走线是 **y=965**。运河在 **x=3330~4070**，石拱桥（**x=3250~4150**）、水面波光、灯笼和角色仍由程序叠加在上面，所以主层图里**不要画桥和灯笼**
- 层与层之间的暖色雾由程序叠加，图层本身不用画太多雾
- 移轴景深：远景层和前景层建议预先模糊（远景 1~3px，前景 6~10px），主层保持清晰

## 3. 角色拆件与骨骼

`src/girl.js` 里的程序化角色就是一套完整的 cut-out 骨骼，可以直接当作拆件绑骨的参考。

### 3.1 骨骼层级（单位：程序中的像素，原点在髋部）

```
hip (0,0)
├── thigh_far   长 30 ─ knee ─ shin_far 长 29 ─ ankle ─ shoe_far
├── thigh_near  长 30 ─ knee ─ shin_near 长 29 ─ ankle ─ shoe_near
├── skirt       （随两膝位置变形 + 后摆飘动）
└── spine（整体前倾 0~0.14 rad）
    ├── torso_jacket / belt / jade_pendant（随跑动摆荡）/ sash_tail ×2
    ├── shoulder (1,-40)
    │   ├── upper_arm_far  长 20 ─ elbow ─ forearm_far 长 18 + sleeve_far ─ wrist ─ hand_far
    │   └── upper_arm_near 长 20 ─ elbow ─ forearm_near 长 18 + sleeve_near ─ wrist ─ hand_near
    └── neck (3,-47) ─ head（Q 版：头约占身高 40%）
        ├── hair_long（脑后垂发）, ribbon ×2（飘带）, bun_back
        ├── face, eye（含眨眼、弯笑眼）, brow, blush, nose, mouth（表情可替换）
        └── side_lock（鬓发）, bangs, bun_front, bow, flowers
```

### 3.2 部件清单（PSD 图层命名建议）

| 图层名 | 轴心（旋转中心） | 备注 |
|---|---|---|
| `head` / `hair_back` / `bangs` / `bun_front` / `bun_back` | 颈部 | 头发可单独加二级骨骼做摆动 |
| `ribbon_1` / `ribbon_2` | 发髻根部 | 用 2~3 节骨骼或网格变形做飘带 |
| `eye_*` / `mouth_*` | — | 做成可切换的帧（睁眼/眨眼/弯眼笑；A I U E O 口型） |
| `torso_jacket` / `belt` | 髋部 | |
| `sash_1` / `sash_2` | 腰带结 | 跑动时向后飘，静止时下垂 |
| `upper_arm_L/R` | 肩 | |
| `sleeve_L/R`（含前臂） | 肘 | 广袖下垂部分可用网格变形 |
| `hand_L/R` | 腕 | |
| `skirt` | 髋部 | 建议网格（Mesh）蒙皮到两条大腿骨 |
| `thigh_L/R` / `shin_L/R` | 髋 / 膝 | 大部分被裙子盖住 |
| `shoe_L/R` | 踝 | |

### 3.3 跑步循环参数（可直接搬到 Spine / DragonBones / Godot）

- 一个完整步态周期前进 **150 px**（角色在画面中按 1.2 倍绘制），所以腿部相位 = 位移 / 150 × 2π，脚不会打滑
- 大腿摆角 `0.1 + 0.62·sin φ`（向前为正），两腿相差 π
- 膝弯 `0.05 + 0.2 + 1.15·max(0, cos(φ − 0.35))`：摆动腿屈膝，支撑腿伸直
- 手臂与对侧腿反向摆动，幅度 0.85 rad
- 自动贴地：每帧取两只脚中更低的那只，把髋部往下放到脚刚好着地，起伏感就自然出来了

### 3.4 用 AI 生成/画师绘制的序列帧替换角色

程序化角色有上限。想要真正好看的角色，最省事的办法是准备一套**序列帧 PNG**，项目会自动换上：

1. 用 `docs/prompts.md` §3 先出一张满意的角色设定图（或请画师画），锁定形象
2. 用同一角色出 8 帧跑步循环 + 站立 + 抬头 + 挥手（MJ `--cref`/`--oref`，SD 用 IP-Adapter + OpenPose 控制姿势）
3. 抠成透明 PNG，统一画布尺寸，脚底对齐同一位置
4. 放进 `assets/character/`，复制 `manifest.example.js` 为 `manifest.js` 并填文件名

跑步帧会按角色实际位移自动换帧，脚不会打滑；桥上会切到 `lookUp`，结尾切到 `wave`。

## 4. HD-2D × 吉卜力光影配方（对应代码）

| 效果 | 做法 | 代码位置 |
|---|---|---|
| 体积光 / 光晕 | 每盏灯笼叠两层径向渐变（大范围暖橙 + 小范围亮芯），用「相加」混合，并带轻微闪烁 | `FX.lanternGlow` |
| 地面光池 | 灯笼下方压扁的径向光，打在石板路上 | `FX.lanternGlow(pools)` |
| 空气透视 | 每两层远景之间叠一层暖色渐变雾，越远越淡、越偏紫 | `main.js › haze()` |
| 移轴景深 | 远景预模糊、前景重度模糊、主层清晰，再给画面上下边压暗 | `KV.blurred` + `vignette()` |
| 角色融入环境 | 角色先画到离屏画布，再叠「背后暖色轮廓光 + 脚下冷色压暗」，外加一层柔光 bloom | `KV.drawGirl` |
| 光束 | 几道斜向的淡暖色光柱，随相机缓慢平移 | `main.js` 第 6 段 |
| 烟花闪光 | 烟花炸开的瞬间点亮天空，同时给角色加一点暖色 | `FX.fireworks` 的返回值 `flash` |
| 水彩纸纹 | 预生成的灰度斑驳 + 颗粒纹理，用 overlay 混合叠在整个画面上 | `paper()` |

## 5. 出片

```bash
npm install                 # 安装 playwright（浏览器另需：npx playwright install chromium）
npm run render              # 1080p30 → out/xiaohe-lantern-night.mp4（约 6 分钟）
npm run render:preview      # 12fps 快速预览
npm run stills              # 关键帧截图 → out/stills/
node scripts/render-video.mjs --start 14 --end 22 --out out/bridge.mp4   # 只渲染一段
node scripts/render-video.mjs --subs 0     # 无字幕版（方便后期另加字幕或配音）
```

渲染是**确定性**的：每一帧都是时间 t 的纯函数，与电脑性能无关，任意时间点都能单独重渲。

### 加配乐与音效（ffmpeg 示例）

```bash
# bgm.mp3 铺底（音量 60%），drum.wav 在 31.4 秒处进入
ffmpeg -i out/xiaohe-lantern-night.mp4 -i bgm.mp3 -i drum.wav \
  -filter_complex "[1:a]volume=0.6,afade=t=out:st=34:d=2[a1];[2:a]adelay=31400|31400[a2];[a1][a2]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest out/xiaohe-final.mp4
```

## 6. 单图模式（一张 AI 场景图 → 一个镜头）

适合透视构图、没法做横向卷轴的图（比如正对石桥的一点透视画面）。

1. 场景图放进 `assets/scenes/`
2. `python3 scripts/detect-lights.py assets/scenes/xxx.png`：自动检测红灯笼和孔明灯，生成 `assets/scenes/xxx.js` 和检查图 `out/xxx-lights.jpg`
3. 打开 `xxx.js` 手动调三项（都是图像像素坐标）：
   - `sky`：天空多边形，烟花和新升起的孔明灯只会画在里面，不会盖住屋顶
   - `water`：水面多边形，用于波光和烟花倒影；没有水就留一个零面积三角形
   - `walkY`：小禾脚底所在的高度（选画面前景的地面）
4. 预览 `index.html?mode=still&scene=xxx`，导出 `npm run render -- --mode still --scene xxx`

镜头时长、字幕和角色走位在 `src/still.js` 顶部修改。几个镜头可以用 ffmpeg 拼接：

```bash
printf "file 'still-bridge-night.mp4'\nfile 'xiaohe-lantern-night.mp4'\n" > out/list.txt
ffmpeg -f concat -safe 0 -i out/list.txt -c copy out/combined.mp4
```

## 7. 推荐迭代顺序

1. 用 `docs/prompts.md` §1 出 3~5 张全景概念图，选定色调
2. 先替换 **远景三层**（`mountains` / `city_far` / `city_mid`），风格提升最明显、对齐要求最低
3. 再替换 **主街** `street.png`（注意 y=900 底边和运河位置）
4. 角色：按 §3 出拆件图，在 Spine / DragonBones / Godot 里绑骨，导出带透明通道的序列帧，或者直接把 `girl.js` 的绘制换成贴图
5. 最后配音效、配乐、配音
