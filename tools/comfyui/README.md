# 本地混元3D（Hunyuan3D）：图片 → 3D 模型

在你自己的 ComfyUI（RTX 3080 Ti，12GB 显存）上，把 Banana 出的图批量转成 GLB 模型，放进 `assets/models/` 给 Blender 场景用。

## 先说结论：12GB 能做什么

| 环节 | 3080 Ti 12GB | 说明 |
|---|---|---|
| **形状（网格）生成** | ✅ 可以 | ComfyUI 原生支持混元3D 2.1，社区反馈形状生成约需 10GB 显存 |
| 贴图：混元3D 2.1 PBR | ❌ 基本不行 | 社区普遍反馈需要 20GB 以上显存 |
| 贴图：混元3D 2.0（kijai 插件） | ⚠️ 勉强 | 显存很紧，而且要编译组件，Windows 上容易出问题 |

所以建议的分工：**本地负责形状**（不限次数、免费），贴图用下面「贴图」一节里的任一方案。

## 安装（只需做一次）

**1. 更新 ComfyUI 到最新版**
便携版运行 `update\update_comfyui.bat`。旧版本没有混元3D 2.1 的节点，也有一个已修复的 KSampler 报错（`not enough values to unpack`）。

**2. 下载模型**（在 PowerShell 里，从本仓库根目录运行）：

```powershell
# 国外网络
powershell -ExecutionPolicy Bypass -File tools\comfyui\setup_hunyuan3d.ps1 -ComfyDir "D:\ComfyUI_windows_portable\ComfyUI"

# 国内网络：用 ModelScope（或 -Source hf-mirror）
powershell -ExecutionPolicy Bypass -File tools\comfyui\setup_hunyuan3d.ps1 -ComfyDir "D:\ComfyUI_windows_portable\ComfyUI" -Source modelscope

# 顺便下载 2.0 模型作为备选（更省显存）
... -With20
```

`-ComfyDir` 要指向含有 `main.py` 和 `models` 文件夹的目录。脚本支持断点续传，中断了重新运行即可。

脚本下载的文件：

| 文件 | 大小 | 放到 |
|---|---|---|
| `hunyuan_3d_v2.1.safetensors` | 6.86 GB | `ComfyUI/models/checkpoints/` |
| `hunyuan3d-dit-v2_fp16.safetensors`（加 `-With20` 时） | 4.59 GB | `ComfyUI/models/checkpoints/` |

> 如果某个下载源报错：换一个 `-Source` 再试。也可以手动下载后放到上面的目录：
> [Hugging Face 2.1](https://huggingface.co/Comfy-Org/hunyuan3D_2.1_repackaged) · [ModelScope 2.1](https://modelscope.cn/models/Comfy-Org/hunyuan3D_2.1_repackaged) · [Hugging Face 2.0](https://huggingface.co/Comfy-Org/hunyuan3D_2.0_repackaged)

## 先手动试一张

1. 启动 ComfyUI
2. 左侧 **模板（Templates）→ 3D → Hunyuan3D 2.1**（ComfyUI 自带的官方工作流）
3. 拖一张图进 Load Image，点运行，结果在 `ComfyUI/output/mesh/` 下，右侧会有 3D 预览

**出图要求**（和 `docs/3d/asset-list.md` 的 Prompt 一致）：单个物体、完整入画、纯色背景、中性光照。背景越干净，模型越干净。

## 批量转换（推荐）

ComfyUI 开着的情况下，在仓库根目录运行：

```bash
python tools/comfyui/batch_image_to_3d.py --images D:/xiaohe/refs
```

- 图片**按清单文件名命名**，比如 `B04_tavern.png`、`P01_red_lantern.png`，输出就是 `assets/models/B04_tavern.glb`，Blender 脚本会直接认出来
- 已经生成过的会自动跳过，可以随时中断、继续

常用参数：

| 参数 | 作用 |
|---|---|
| `--seeds 3` | 每张图出 3 个不同随机种子的版本（`B04_tavern_s1.glb`…），挑最好的一个改名去掉 `_s1` |
| `--octree 384` | 网格更精细（默认 256，最大 512；越大越慢、越吃显存） |
| `--resolution 2048` | 显存不够时调低（默认 3072） |
| `--rembg` | 先自动抠背景（需 `pip install rembg pillow`） |
| `--ckpt hunyuan3d-dit-v2_fp16.safetensors` | 改用 2.0 模型 |
| `--force` | 已存在的也重新生成 |

工作流本体是 `hunyuan3d_v2.1_api.json`，参数和官方模板一致：30 步、CFG 5、euler，octree 256。

**显存不足（out of memory）时**，依次尝试：`--resolution 2048` → `--octree 192` → `--ckpt hunyuan3d-dit-v2_fp16.safetensors`（需先 `-With20` 下载）。

## 贴图（可选）

ComfyUI 原生的混元3D 只出**白模**（没有颜色）。三个方案：

**方案 A：kijai 插件（混元3D 2.0 贴图，本地免费，但折腾）**

- 安装：`setup_hunyuan3d.ps1 ... -Texture`。脚本会克隆 [ComfyUI-Hunyuan3DWrapper](https://github.com/kijai/ComfyUI-Hunyuan3DWrapper) 并安装依赖
- 贴图需要一个编译过的光栅化组件。插件只带了 **Python 3.12 + torch 2.6 + CUDA 12.6** 的预编译包，环境不匹配就要自己编译：需要 Visual Studio C++ 生成工具和 CUDA Toolkit，步骤见插件 README
- 插件第一次运行会自动从 Hugging Face 下载贴图模型。国内网络在启动 ComfyUI 前设置 `set HF_ENDPOINT=https://hf-mirror.com`
- 用插件自带的示例工作流（`custom_nodes/ComfyUI-Hunyuan3DWrapper/example_workflows/`）。12GB 显存很紧，可能需要降低贴图分辨率或视角数

**方案 B：Tripo 只做主角级的模型**
小禾、城门、鼓楼、石桥这些镜头里显眼的用 Tripo（带贴图）；铺面、民居、道具用本地白模。

**方案 C：在 Blender 里自动上色（我可以加到场景脚本里）**
按面的朝向和高度自动分配颜色，比如朝上的斜面是灰瓦、竖直面是粉墙、细长竖条是红柱，再叠水彩纸纹。对水彩风来说，这样的效果可能比 AI 贴图更统一。白模到位后我可以先做这个试试。

## 已知情况

- 我在云端环境里**无法实测**：没有你的显卡，也连不上 Hugging Face。所以下载链接、显存数据和速度都来自官方模板和社区反馈。批量脚本我用一个模拟的 ComfyUI 服务器测过上传、排队、取结果全流程；安装脚本做过语法检查，也在假的 ComfyUI 目录上跑过「已存在跳过」的逻辑
- 模型朝向：如果某个模型导进 Blender 后是侧面或背面对着镜头，在 `blender/layout.json` 对应的那条里加 `"rot": 90`（或 180 / -90）
- 白模面数通常比较多，Blender 能吃得下；需要的话我可以在脚本里加自动减面
- 混元3D 使用腾讯混元社区许可证，商用前请看一下许可条款（尤其是使用地区的限制）

## 文件

| 文件 | 作用 |
|---|---|
| `setup_hunyuan3d.ps1` | 下载模型、可选安装贴图插件 |
| `hunyuan3d_v2.1_api.json` | 混元3D 2.1 图片转 3D 工作流（API 格式，批量脚本用） |
| `batch_image_to_3d.py` | 批量把图片文件夹送进 ComfyUI，GLB 按文件名放进 `assets/models/` |
