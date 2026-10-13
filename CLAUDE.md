# CLAUDE.md

儿童短片《元宵灯夜 · 小禾进城》：明代街道夜景，水彩风 + HD-2D 光影，横版卷轴镜头。**完整背景、进度和下一步见 `HANDOFF.md`，开始工作前先读它。**

## 当前主线：3D 路线（`blender/`）

- `blender/layout.json` 是唯一的场景数据源：布局、资产尺寸、走位关键帧、镜头、调色板。改布局只改它，不改 Python
- `blender/build_scene.py` 读 layout 搭场景；`assets/models/<文件名>.glb` 存在就导入并替换灰模，没贴图的模型会自动上水彩色（`autocolor_material()`）
- 坐标：米；X 沿街向右，Y 向画面深处，Z 向上；建筑正立面在 y=0 朝向 -Y 的相机；角色走在 y=-4
- 要兼容 Blender 4.2 LTS 和 5.x：引擎名（`BLENDER_EEVEE_NEXT` / `BLENDER_EEVEE`）、合成器（`scene.node_tree` / `scene.compositing_node_group`）都已分别处理，新增代码保持这种写法
- 脚本里先 `import bpy` 再 `import bmesh`（独立 bpy 模块要求的顺序）
- 验证改动：`blender -b -P blender/build_scene.py -- --preview out/pv --frames 60,600,1200`，没显卡的机器用的是 Cycles CPU
- 没有真模型时，用 `blender -b -P blender/make_test_whitemodels.py -- out/test_models` 生成假白模，再 `--models out/test_models` 测自动上色

## 本地混元3D（`tools/comfyui/`）

- Windows + ComfyUI + RTX 3080 Ti 12GB；只做形状（白模），贴图在 12GB 上不可行
- `hunyuan3d_v2.1_api.json` 的参数与 ComfyUI 官方 Hunyuan3D 2.1 模板一致；`batch_image_to_3d.py` 只用标准库
- `setup_hunyuan3d.ps1` 必须保持 UTF-8 **带 BOM**（Windows PowerShell 5.1 读中文需要）

## 其他

- `index.html` + `src/`：2D 程序化版与单图模式（已完成，作备份），出片用 `scripts/render-video.mjs`
- 文档和界面文字用中文；渲染输出放 `out/`（不进 Git）
- 模型文件名严格按 `docs/3d/asset-list.md` 总表
