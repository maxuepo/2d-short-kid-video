# 去哪里找好看的素材

> 先说结论：「明代夜市 × 吉卜力水彩 × HD-2D 光影」这个组合太具体了，**免费素材站上基本找不到风格统一的现成整套**。东拼西凑的免费包画风会打架，反而更难看。
> 效果最好、也最现实的路线，按推荐顺序排：
>
> 1. **AI 出图**：背景分层 + 角色序列帧，用 `docs/prompts.md` 的 Prompt。成本最低，风格最好统一
> 2. **约画师**：主角拆件立绘（可做 Live2D / Spine），背景用 AI 或素材补
> 3. **买付费素材包**：适合想快速出片、不想抽卡的情况
> 4. **免费素材**：适合补道具、特效、音效，不适合当主视觉

出好的图放进 `assets/layers/`（背景）或 `assets/character/`（角色），项目会自动替换程序化画面。尺寸和对齐要求见 [`pipeline.md`](pipeline.md)。

---

## 1. AI 出图工具（最推荐）

| 工具 | 适合做什么 | 说明 |
|---|---|---|
| [Midjourney](https://www.midjourney.com) | 全景概念图、分层背景、角色设定 | 画风最稳。角色一致性用 `--cref`（v6）或 Omni Reference `--oref`（v7） |
| [即梦 AI](https://jimeng.jianying.com) | 国风插画、背景 | 中文 Prompt 友好，有「新中式」等预设风格（以官网为准） |
| [LiblibAI](https://www.liblib.art) | Stable Diffusion 云端出图，国风/水墨 LoRA 很多 | 能在线训练自己角色的 LoRA。注意每个社区模型的授权，公开分享不等于可商用 |
| Stable Diffusion / ComfyUI（本地） | 批量出角色序列帧 | IP-Adapter 锁人物 + ControlNet OpenPose 锁动作，最适合出跑步循环帧 |

**AI 出角色序列帧的小技巧**：先出一张满意的侧面全身图，再用 OpenPose 骨架图逐帧控制姿势（跑步 8 帧、站立、抬头、挥手），最后用 [rembg](https://github.com/danielgatis/rembg) 或 Photoshop「选择主体」抠成透明 PNG。

## 2. 约画师（角色最好看的方案）

| 平台 | 说明 |
|---|---|
| [米画师](https://www.mihuashi.com) | 国内最大的 ACGN 约稿平台，可以直接约「Live2D 拆分立绘」或「Q 版角色 + 动作」，平台担保交易 |
| 画加、站酷、小红书 | 也能找到国风画师，私下约稿注意签约和版权归属 |

约稿时说清楚：**侧面朝右、Q 版比例、明代袄裙 + 双丫髻、需要拆件（PSD 分层）、用于视频发布**。部件清单直接发 `pipeline.md` §3.2 给画师。

## 3. 付费素材（质量稳定）

| 平台 | 搜索词 | 说明 |
|---|---|---|
| [爱给网](https://www.aigei.com) | 国风场景、古风建筑、灯笼、烟花序列帧 | 国内游戏素材站，资源分 CC 免费和付费商用两类，以每个素材页的授权为准 |
| [Unity Asset Store](https://assetstore.unity.com) | `chinese`、`oriental`、`ancient china 2D` | 有不少中式 2D 背景和角色包，图片可导出用在视频里（看包内授权） |
| [CraftPix](https://craftpix.net) | `asian`、`temple`、`pagoda`、`parallax` | 横版视差背景质量不错，大多是付费，有部分免费 |
| 千图网、包图网、站酷海洛 | 国风夜景、元宵灯会、灯笼插画 | 矢量插画很适合吉卜力 / 绘本风，商用需要对应会员授权 |

## 4. 免费素材（补道具、特效）

| 平台 | 内容 | 授权提醒 |
|---|---|---|
| [itch.io「chinese」标签](https://itch.io/game-assets/tag-chinese) | 古风背景、仙侠视觉小说背景、像素古镇 | 每个包授权不同，页面底部看 |
| [LinXueLian 的仙侠背景](https://linxuelian.itch.io/bgres-lanhevilla)（还有 [Maple Inn](https://linxuelian.itch.io/bgres-xxwx-mapleinn)、[Diemeng Hall](https://linxuelian.itch.io/bgres-diemenghall)） | 有日夜两版的古风场景 | 授权不一（有的 CC BY，有的 CC BY-NC-SA），作者自己也建议**只用于非商业作品** |
| [BBBits](https://bbbits.itch.io/three-kingdoms-forest-tileset) | 三国风像素 Tileset | 像素风，和本片的水彩风不太搭，适合做别的版本 |
| [OpenGameArt](https://opengameart.org) | `parallax background`、`firework`、`spark` | 选 CC0 / CC-BY |
| [Kenney.nl](https://kenney.nl/assets) | 粒子贴图（光点、火花、烟雾） | 全部 CC0 |

> 本项目的烟花、打铁花、孔明灯、灯笼光晕都是程序生成，**特效不需要找素材**。真正值得花钱/花时间的是：**主角** 和 **主街层**。

## 5. 音效与配乐

| 平台 | 搜索词 | 授权提示 |
|---|---|---|
| [Freesound](https://freesound.org) | `firework`、`chinese drum`、`gong`、`crowd festival`、`footsteps stone` | 每条不同，筛选 CC0 / CC-BY |
| [Pixabay 音乐/音效](https://pixabay.com/music/) | `chinese new year`、`guzheng`、`festival` | Pixabay Content License，可用于视频 |
| 爱给网音效区 | 鞭炮、锣鼓、古筝、街市人声 | 以素材页授权为准 |

## 6. 字体

| 字体 | 授权 | 用途 |
|---|---|---|
| [霞鹜文楷 LXGW WenKai](https://github.com/lxgw/LxgwWenKai) | SIL OFL | 楷体风，很适合儿童字幕。装到系统后项目自动优先使用 |
| 思源宋体 / Noto Serif SC | SIL OFL | 片名、牌匾 |

## 7. 授权速查

| 授权 | 发到 B 站 / YouTube（含收益） | 需要署名 |
|---|---|---|
| CC0 | ✅ | 否 |
| CC-BY | ✅ | **是**，写在片尾或简介 |
| CC-BY-NC | ⚠️ 带广告收益通常算商用 | 是 |
| 付费素材 / 平台会员 | 按购买的授权档位 | 看条款 |
| AI 生成 | 看各平台用户协议（付费会员一般可商用） | 否 |

## 8. 素材登记表（发布前填好）

| 文件 | 来源链接 | 作者 | 授权 | 是否修改 | 署名位置 |
|---|---|---|---|---|---|
| assets/layers/… | | | | | 片尾 / 视频简介 |
