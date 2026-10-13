# 项目交接说明 · 元宵灯夜 / 小禾进城

> 写给在本地继续做这个项目的你（以及本地的 Claude Code）。最后更新：2026-10-13。
> 代码在分支 `claude/gallant-archimedes-ljatpu`。本地拉取：`git fetch origin && git checkout claude/gallant-archimedes-ljatpu`

## 1. 项目是什么

一条约 40 秒的儿童短片：元宵夜，明代小姑娘「小禾」从城门跑进城，经过灯笼街、铁匠铺兵器架，登上运河石拱桥看烟花，穿过打铁花的金雨，最后在鼓楼前挥手说「新年快乐」。

画风目标：**水彩风 + HD-2D 光影**（《八方旅人》式体积光、景深，吉卜力式手绘质感），横版卷轴镜头。

## 2. 三条技术路线与现状

我们先后试了三条路，**现在的主线是第 ③ 条（3D）**，前两条已经完成，可以作为备份或分镜参考。

| 路线 | 做法 | 状态 | 入口 |
|---|---|---|---|
| ① 2D 程序化 | 浏览器 Canvas 画出全部场景、角色、特效 | ✅ 完成，可出 36 秒成片 | `index.html`、`src/` |
| ② 单图模式 | 一张 AI 场景图 + 镜头推进 + 动态灯光、烟花、水波、角色 | ✅ 完成，可出 20 秒镜头 | `index.html?mode=still`、`src/still.js` |
| **③ 3D 横版** | Banana 出图 → 混元3D/Tripo 转模型 → Blender 搭街道 → 相机横向跟拍渲染 | 🟡 **进行中**：灰模场景完成，等真模型 | `blender/`、`tools/comfyui/` |

**3D 路线的详细进度：**

| 环节 | 状态 | 说明 |
|---|---|---|
| 素材清单（30 个模型 + Prompt） | ✅ 完成 | `docs/3d/asset-list.md` |
| Blender 灰模场景（整条街、相机、走位、灯光） | ✅ 完成并渲染验证 | `blender/build_scene.py` + `blender/layout.json` |
| GLB 模型自动导入、缩放、落地、朝向 | ✅ 已用测试模型验证 | 放进 `assets/models/` 即自动替换灰模 |
| 本地混元3D 工具（下载、工作流、批量转换） | 🟡 写完，**未在真机上跑过** | `tools/comfyui/` |
| 白模自动上色（水彩风材质） | 🟡 写完，**未渲染验证** | `build_scene.py` 里的 `autocolor_material()` |
| 水彩风统一材质（给带贴图的模型） | ⬜ 未开始 | |
| 中文招牌、幌子贴图 | ⬜ 未开始 | |
| 小禾绑骨 + 动作（跑、站、抬头、挥手） | ⬜ 未开始 | 计划用 Tripo 自动绑骨或 Mixamo |
| 烟花、打铁花、孔明灯（3D 粒子） | ⬜ 未开始 | 2D 版 `src/fx.js` 里的算法可以参考 |
| 远景背景板 `far_city.png` | ⬜ 等出图 | Prompt 在 `docs/3d/asset-list.md` 第五节 |
| EEVEE 正式渲染 | ⬜ 未在真机验证 | 云端只用 Cycles CPU 渲过低清预览 |
| 配乐、音效 | ⬜ 未开始 | 时间点见 `docs/pipeline.md` |

## 3. 本地环境

| 机器 | 用途 | 需要安装 |
|---|---|---|
| Mac（M1 Max 64GB） | Blender 搭场景、渲染（EEVEE） | [Blender](https://www.blender.org/download/) 4.2 LTS 或更新（5.x 也可以） |
| Windows（RTX 3080 Ti 12GB） | ComfyUI 本地混元3D 生成白模 | ComfyUI（已更新）、Git、Python |
| 任意 | 2D 版出片（路线 ①②） | Node.js 18+、ffmpeg，`npm install` + `npx playwright install chromium` |

## 4. 接下来按这个顺序做

### 第 1 步：生成 3 个测试素材，打通流程

先只做 **P01 红灯笼、B04 酒肆、C01 小禾** 三个：

1. 用 `docs/3d/asset-list.md` 里对应的 Prompt 在 Banana 出图，保存为 `P01_red_lantern.png`、`B04_tavern.png`、`C01_xiaohe.png`，放进一个文件夹（如 `refs/`）
2. Windows 上下载混元3D 模型（只需一次）：
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\comfyui\setup_hunyuan3d.ps1 -ComfyDir "你的路径\ComfyUI" -Source modelscope
   ```
   ModelScope 不通就换 `-Source hf-mirror` 或 `-Source hf`
3. 启动 ComfyUI，先在「模板 → 3D → Hunyuan3D 2.1」手动试一张，确认能出模型
4. 批量转换：
   ```powershell
   python tools\comfyui\batch_image_to_3d.py --images refs --seeds 2
   ```
   输出在 `assets/models/`，带 `_s1`、`_s2` 后缀，挑好的那个改名去掉后缀
5. 把 `assets/models/` 拷到 Mac 上的仓库里（或提交到 Git）

### 第 2 步：在 Blender 里看效果

```bash
/Applications/Blender.app/Contents/MacOS/Blender -P blender/build_scene.py
```

检查这几件事：
- 模型是否替换了灰模，**正面是否朝向相机**。不对就在 `blender/layout.json` 对应条目加 `"rot": 180`（或 90 / -90）
- 尺寸是否合理。不对就改 `layout.json` 里该资产的 `size`
- **白模自动上色是否正常**（下一节）

### 第 3 步：验证并调整自动上色（最需要先做的技术验证）

没有真模型也能先测，用灰模生成的「假白模」：

```bash
blender -b -P blender/make_test_whitemodels.py -- out/test_models
blender -P blender/build_scene.py -- --models out/test_models
```

可能需要调整的地方：

- **报错**：材质节点的接口名在不同 Blender 版本间可能不同（`ShaderNodeMix` 的输入口、`ShaderNodeAttribute`、`ShaderNodeAmbientOcclusion`）。报错信息会指出哪个节点
- **颜色分层不对**（屋顶涂到墙上之类）：改 `autocolor_material()` 里的阈值，`roof_lo` 是屋顶从多高开始，`smooth(nz, 0.3, 0.5)` 是多陡算斜面
- **颜色不好看**：在 `layout.json` 加 `"autocolor"` 段覆盖调色板，例如 `"autocolor": {"building": {"roof": [[0.2,0.22,0.3],[0.3,0.32,0.4]]}}`
- **铺面暖光太强或没有**：`glowStrength`，以及 AO 节点的 `Distance`
- 不想自动上色：`--autocolor off`；想让所有模型（包括 Tripo 带贴图的）统一风格：`--autocolor all`

### 第 4 步：批量生成剩下的模型

按 `docs/3d/asset-list.md` 总表，⭐ 必做 → 推荐 → 可选。每批生成后跑一次 Blender 看整体效果。显眼的主角级模型（小禾、城门、鼓楼、石桥）如果白模效果不够，可以用 Tripo 生成带贴图的版本。

### 第 5 步：后续开发（可以交给本地 Claude Code）

按优先级：
1. EEVEE 正式渲染测试：`blender -b -P blender/build_scene.py -- --render out/street.mp4`，检查雾、泛光（`setup_bloom()` 对 4.x / 5.x 做了兼容，但没在真机验证）
2. 远景背景板 `assets/backdrop/far_city.png`
3. 小禾绑骨 + 动作：Tripo 自动绑骨或 Mixamo，`build_character()` 现在只做位移和转向
4. 中文招牌、幌子：程序生成文字贴图，挂到铺面正立面
5. 烟花、打铁花、孔明灯：Blender 粒子，或渲染后在合成阶段叠加 2D 版 `src/fx.js` 的效果
6. 配乐和音效，时间点见 `docs/pipeline.md` 第 1 节

## 5. 关键约定（改代码前先看）

**3D 坐标**（`blender/layout.json`）：
- 单位米。X 沿街向右，Y 向画面深处，Z 向上
- 建筑**正立面在 y=0**，朝向 -Y 方向的相机；小禾走在 y=-4；前景道具在 y≈-10
- 运河 x=66~78（沿 Y 方向穿过街道）；石桥 x=59~85，桥顶高 3.4 米，桥上的角色和道具高度自动贴合桥面
- 所有位置、尺寸、走位、镜头参数都在 `layout.json`，**改布局不用动 Python**

**时间线（42 秒，30fps）：**

| 时间 | 内容 |
|---|---|
| 0–4 秒 | 镜头从远处推近城门，小禾从门洞走出 |
| 4–12 秒 | 跑过酒肆、茶馆、铁匠铺 |
| 12–18 秒 | 上石拱桥 |
| 18–21.5 秒 | 桥顶停下看烟花 |
| 21.5–28 秒 | 跑过打铁花 |
| 28–36 秒 | 跑到鼓楼前 |
| 36–42 秒 | 挥手，镜头拉远露出整座鼓楼 |

**模型文件命名**：严格按 `docs/3d/asset-list.md` 总表，例如 `B04_tavern.glb`。脚本靠文件名匹配。

**出图规则**：中性白天光、纯浅灰背景、招牌留空、单个物体完整入画（详见清单第一节）。夜景灯光一律由 Blender 打。

## 6. 已知问题和风险

| 问题 | 影响 | 处理 |
|---|---|---|
| 自动上色未渲染验证 | 可能有节点 API 报错或分层不准 | 按第 3 步先用假白模测 |
| 混元3D 工具未在真机运行 | 下载源、显存可能有问题 | 下载失败换 `-Source`；显存不足加 `--resolution 2048` |
| 12GB 显存做不了混元 2.1 贴图 | 本地只能出白模 | 用自动上色，或者主角级模型用 Tripo |
| ModelScope 下载链接格式没核实 | 可能 404 | 换 `hf-mirror`，或去模型页手动下载 |
| 混元模型朝向不确定 | 可能背对相机 | `layout.json` 里加 `rot` |
| 白模面数大（10~50 万面） | Blender 变慢 | 需要时加减面（Decimate） |
| 混元3D 许可证 | 商用和使用地区有限制 | 发布前看腾讯混元社区许可证 |
| `.ps1` 脚本是 UTF-8 BOM 编码 | 编辑器另存时去掉 BOM 会导致中文乱码 | 保持 BOM |

## 7. 目录速查

```
HANDOFF.md / CLAUDE.md     ← 本文件 / 给 Claude Code 的项目说明
blender/
  layout.json              3D 场景的一切参数（布局、尺寸、走位、镜头、调色板）
  build_scene.py           搭场景、导入模型、自动上色、渲染（含 --preview / --animatic / --topview）
  make_test_whitemodels.py 生成假白模，测试自动上色用
  README.md                Blender 用法
tools/comfyui/             本地混元3D：模型下载脚本、工作流、批量转换脚本、说明
docs/3d/asset-list.md      30 个模型的清单与 Banana Prompt
assets/models/             放 GLB 模型（按清单命名）
assets/backdrop/           放远景背景板 far_city.png
index.html + src/          2D 程序化版和单图模式（路线 ①②）
scripts/                   2D 版出片脚本、灯笼检测脚本
docs/                      2D 版的 Prompt、素材来源、制作流程
out/                       所有渲染输出（不进 Git）
```

## 8. 常用命令

```bash
# ---- 3D（Mac）----
alias blender=/Applications/Blender.app/Contents/MacOS/Blender
blender -P blender/build_scene.py                                   # 打开并搭好场景
blender -b -P blender/build_scene.py -- --render out/street.mp4     # EEVEE 渲染整片
blender -b -P blender/build_scene.py -- --preview out/pv --frames 60,600,1200   # 关键帧预览
blender -b -P blender/build_scene.py -- --animatic out/animatic.mp4 # 低清动态分镜
blender -b -P blender/build_scene.py -- --topview out/top.png       # 俯视布局图

# ---- 本地混元3D（Windows）----
powershell -ExecutionPolicy Bypass -File tools\comfyui\setup_hunyuan3d.ps1 -ComfyDir "...\ComfyUI" -Source modelscope
python tools\comfyui\batch_image_to_3d.py --images refs --seeds 2

# ---- 2D 版（路线 ①②）----
npm install && npx playwright install chromium
npm run render          # 2D 全片
npm run render:still    # 单图模式
```
