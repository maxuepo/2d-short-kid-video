// 序列帧角色清单示例：复制为 manifest.js 并把图片放进本目录即可替换程序化角色
// 图片要求：透明背景 PNG，角色面朝右，所有帧画布尺寸一致，脚底位置一致
window.KV_CHARACTER = {
  height: 230, // 在 1920×1080 画面中的显示高度（像素），程序化角色约 230
  anchorX: 0.5, // 脚底中心在图中的水平位置（0~1）
  anchorY: 0.98, // 脚底在图中的垂直位置（0~1）
  facing: 'right', // 如果画的是面朝左，填 'left' 会自动镜像
  fps: 8, // idle / lookUp / wave 的播放帧率；run 会按步幅自动同步，不打滑
  run: ['assets/character/run_00.png', 'assets/character/run_01.png', 'assets/character/run_02.png', 'assets/character/run_03.png', 'assets/character/run_04.png', 'assets/character/run_05.png', 'assets/character/run_06.png', 'assets/character/run_07.png'],
  idle: ['assets/character/idle_00.png', 'assets/character/idle_01.png'],
  lookUp: ['assets/character/lookup_00.png'], // 桥上抬头看烟花
  wave: ['assets/character/wave_00.png', 'assets/character/wave_01.png', 'assets/character/wave_02.png'], // 结尾挥手
};
