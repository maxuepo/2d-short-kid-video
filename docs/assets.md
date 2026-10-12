# 免费素材来源与授权清单

> 「免费下载」不等于「随便用」。每个素材都要看它**自己的**授权页，并把来源记进下方的登记表。
> 以下平台和搜索词是找素材的起点。具体作者和素材包会变化，**一切以下载页上写的授权为准**。

## 0. 先看授权：快速判断表

| 授权 | 个人作品 | 发布到 B 站 / YouTube（含收益） | 需要署名 | 备注 |
|---|---|---|---|---|
| CC0 / 公共领域 | ✅ | ✅ | 否（建议致谢） | 最省心 |
| CC-BY 3.0/4.0 | ✅ | ✅ | **是** | 片尾或简介写明作者、标题、链接、授权 |
| CC-BY-SA | ✅ | ✅ | **是** | 改编后的素材本身也要用同样授权 |
| CC-BY-NC | ✅ | ⚠️ 带广告收益通常算商业用途 | 是 | 不想纠结就不用 |
| itch.io 自定义授权 | 看页面 | 看页面 | 看页面 | 常见「可商用、不可转售素材本身」 |
| Pixabay Content License | ✅ | ✅ | 否 | 不可原样转售，不可暗示代言 |
| OFL（字体） | ✅ | ✅ | 否 | 字体可自由嵌入视频 |

## 1. 角色与中式场景

| 平台 | 搜索词 | 说明 |
|---|---|---|
| [itch.io 素材区](https://itch.io/game-assets/free) | `ancient chinese`、`chinese pixel`、`wuxia`、`hanfu`、`three kingdoms sprite`、`asian town tileset` | 很多独立作者免费分享古风行走图、立绘和小镇 Tileset。授权在每个页面底部，各不相同 |
| [OpenGameArt.org](https://opengameart.org) | `chinese`、`asian building`、`lantern`、`pagoda` | 搜索时可按 License 过滤，选 CC0 或 CC-BY |
| [Kenney.nl](https://kenney.nl/assets) | Particle Pack、UI 包 | 全部 CC0，适合做粒子和 UI 底材 |

> 原清单里提到的「B.B.Bits 三国/古代中国 NPC 包」我没法核实。请直接在 itch.io 搜上面的关键词，按页面写的授权使用。

## 2. 横版视差分层背景

- **OpenGameArt**：搜 `parallax background`、`parallax night`、`layered background`，选 CC0 或 CC-BY。常见的分法是远景夜空、中景建筑、近景地面，正好对应本项目的 L0~L6 层
- **itch.io**：搜 `parallax background free`
- 拿到素材后按 [`pipeline.md` §2](pipeline.md#2-图层规格视差系数--成品尺寸) 的尺寸拉伸或拼接，放进 `assets/layers/` 即可自动替换

## 3. 灯笼、火焰、烟花粒子特效

| 平台 | 搜索词 |
|---|---|
| OpenGameArt | `firework`、`explosion sprite sheet`、`flame animation`、`spark` |
| itch.io | `pixel firework`、`lantern sprite`、`fire particle`、`vfx free` |
| Kenney | Particle Pack（CC0，有光点、火花、烟雾贴图） |

黑底序列帧在合成时用 **Add / Screen** 混合即可。本项目中的烟花、打铁花、孔明灯都是程序生成，不需要外部素材也能直接渲染。

## 4. 音效与配乐（视频必备）

| 平台 | 搜索词 | 授权提示 |
|---|---|---|
| [Freesound.org](https://freesound.org) | `firework`、`chinese drum`、`gong`、`crowd festival`、`sparkler`、`footsteps stone` | 每条音效授权不同（CC0 / CC-BY / CC-BY-NC），用筛选器只看 CC0 或 CC-BY |
| [Pixabay 音乐/音效](https://pixabay.com/music/) | `chinese new year`、`guzheng`、`festival` | Pixabay Content License，可用于视频 |
| [YouTube 音频库](https://studio.youtube.com) | `Chinese`、`festive` | 仅限在 YouTube 使用的部分曲目需注意条款 |

## 5. 字体（字幕与牌匾）

| 字体 | 授权 | 说明 |
|---|---|---|
| 霞鹜文楷 LXGW WenKai | SIL OFL | 楷体风，非常适合儿童字幕。安装后本项目会自动优先使用 |
| 思源宋体 / Noto Serif SC | SIL OFL | 牌匾、片名 |
| 站酷系列免费字体 | 见各字体说明 | 片名可选，商用前请确认 |

## 6. 引擎与工具（如需移植为可交互版本）

- **Godot 4**（MIT，免费）：`PointLight2D` 给灯笼打暖光，`Skeleton2D` + `Bone2D` 做骨骼绑定，`GPUParticles2D` 做烟花/打铁花，`ParallaxBackground`（4.3 起推荐 `Parallax2D`）做视差
- **Unity**：2D 光照（`Light 2D`）是 **URP 2D Renderer 自带的免费功能**，不用去 Asset Store 找插件。骨骼用官方免费的 **2D Animation** 包，PSD 拆件导入用 **2D PSD Importer**
- **DragonBones**（免费）/ **Spine**（付费）/ **Live2D Cubism**（有免费版）：专业 2D 骨骼动画工具
- **Krita**（免费）：抠图、拆件、修色

## 7. 素材登记表（发布前填好）

| 文件 | 来源链接 | 作者 | 授权 | 是否修改 | 署名写在哪里 |
|---|---|---|---|---|---|
| assets/layers/… | | | | | 片尾 / 视频简介 |
