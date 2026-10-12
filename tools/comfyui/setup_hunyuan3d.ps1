<#
  混元3D（Hunyuan3D）本地环境一键准备脚本 —— Windows + ComfyUI

  做的事：
    1. 下载混元3D 2.1 形状模型（6.86 GB）到 ComfyUI\models\checkpoints\
    2. 可选：下载混元3D 2.0 形状模型（4.59 GB，显存更省，作为备选）
    3. 可选：安装 kijai 的 ComfyUI-Hunyuan3DWrapper（用于贴图生成，需要编译组件，见 README）

  用法（在 PowerShell 里，仓库根目录）：
    powershell -ExecutionPolicy Bypass -File tools\comfyui\setup_hunyuan3d.ps1 -ComfyDir "D:\ComfyUI_windows_portable\ComfyUI"
    # 国内网络：-Source modelscope 或 -Source hf-mirror
    powershell -ExecutionPolicy Bypass -File tools\comfyui\setup_hunyuan3d.ps1 -ComfyDir "D:\ComfyUI_windows_portable\ComfyUI" -Source modelscope -With20
    # 同时安装贴图插件
    ... -Texture

  -ComfyDir 指向含有 main.py 和 models 文件夹的那个 ComfyUI 目录。
#>
param(
  [Parameter(Mandatory = $true)][string]$ComfyDir,
  [ValidateSet('hf', 'hf-mirror', 'modelscope')][string]$Source = 'hf',
  [switch]$With20,
  [switch]$Texture
)

$ErrorActionPreference = 'Stop'

function Info($msg) { Write-Host "[混元3D] $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "[混元3D] $msg" -ForegroundColor Yellow }

if (-not (Test-Path (Join-Path $ComfyDir 'main.py'))) {
  throw "找不到 $ComfyDir\main.py，请确认 -ComfyDir 指向 ComfyUI 主目录（便携版是 ComfyUI_windows_portable\ComfyUI）"
}

function Get-Url($repo, $file) {
  switch ($Source) {
    'hf'         { return "https://huggingface.co/$repo/resolve/main/$file" }
    'hf-mirror'  { return "https://hf-mirror.com/$repo/resolve/main/$file" }
    'modelscope' { return "https://modelscope.cn/models/$repo/resolve/master/$file" }
  }
}

function Download($url, $dest, $minBytes) {
  if ((Test-Path $dest) -and ((Get-Item $dest).Length -ge $minBytes)) {
    Info "已存在，跳过：$dest"
    return
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Info "下载 $url"
  Info "  → $dest（支持断点续传，中断后重新运行即可）"
  & curl.exe -L --fail --retry 5 --retry-delay 5 -C - -o $dest $url
  if ($LASTEXITCODE -ne 0) { throw "下载失败：$url（可换 -Source modelscope 或 hf-mirror 再试）" }
  if ((Get-Item $dest).Length -lt $minBytes) { throw "文件大小不对，可能下到了错误页面：$dest" }
}

$ckptDir = Join-Path $ComfyDir 'models\checkpoints'

# 1. 混元3D 2.1（ComfyUI 官方重新打包的单文件版，含 DiT + 图像编码器 + VAE）
Download (Get-Url 'Comfy-Org/hunyuan3D_2.1_repackaged' 'hunyuan_3d_v2.1.safetensors') `
         (Join-Path $ckptDir 'hunyuan_3d_v2.1.safetensors') 6000000000

# 2. 混元3D 2.0（备选，显存占用更低）
if ($With20) {
  Download (Get-Url 'Comfy-Org/hunyuan3D_2.0_repackaged' 'split_files/hunyuan3d-dit-v2_fp16.safetensors') `
           (Join-Path $ckptDir 'hunyuan3d-dit-v2_fp16.safetensors') 4000000000
}

# 3. 贴图插件（kijai/ComfyUI-Hunyuan3DWrapper）
if ($Texture) {
  $nodeDir = Join-Path $ComfyDir 'custom_nodes\ComfyUI-Hunyuan3DWrapper'
  if (-not (Test-Path $nodeDir)) {
    Info '克隆 ComfyUI-Hunyuan3DWrapper'
    & git clone https://github.com/kijai/ComfyUI-Hunyuan3DWrapper $nodeDir
    if ($LASTEXITCODE -ne 0) { throw 'git clone 失败（需要先安装 Git）' }
  }
  # 便携版用自带的 python_embeded，否则用当前 PATH 里的 python
  $py = Join-Path (Split-Path $ComfyDir) 'python_embeded\python.exe'
  if (-not (Test-Path $py)) { $py = 'python' ; Warn '没找到 python_embeded，将使用 PATH 里的 python（请确认它就是 ComfyUI 用的那个环境）' }
  & $py -m pip install -r (Join-Path $nodeDir 'requirements.txt')
  $ver = & $py -c "import sys,torch;print(f'cp{sys.version_info.major}{sys.version_info.minor} torch{torch.__version__} cuda{torch.version.cuda}')"
  Info "Python/torch 环境：$ver"
  $whl = Get-ChildItem (Join-Path $nodeDir 'wheels') -Filter '*.whl' -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -match ($ver.Split(' ')[0]) } | Sort-Object Name -Descending
  if ($ver -match 'cp312' -and $ver -match 'torch2\.6') {
    $pick = $whl | Where-Object { $_.Name -match 'torch260' } | Select-Object -First 1
  } else {
    $pick = $null
  }
  if ($pick) {
    Info "安装预编译光栅化组件：$($pick.Name)"
    & $py -m pip install $pick.FullName
  } else {
    Warn '没有与当前 Python/torch 版本匹配的预编译 custom_rasterizer。'
    Warn '贴图需要自己编译，步骤见 tools\comfyui\README.md 的「贴图（可选）」一节。形状生成不受影响。'
  }
}

Info '完成。接下来：'
Info '  1. 先把 ComfyUI 更新到最新版（便携版运行 update\update_comfyui.bat），旧版本没有混元3D 2.1 节点'
Info '  2. 启动 ComfyUI，在 模板(Templates) → 3D 里打开 “Hunyuan3D 2.1” 试一张图'
Info '  3. 批量转换：python tools\comfyui\batch_image_to_3d.py --images 你的图片文件夹'
