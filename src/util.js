// 公共常量与工具函数（经典脚本，双击 index.html 即可运行，无需服务器）
(function () {
  const KV = (window.KV = window.KV || {});

  KV.W = 1920; // 画面宽
  KV.H = 1080; // 画面高
  KV.WORLD = 7200; // 主层（角色所在层）世界总宽
  KV.STREET_TOP = 900; // 街道远端 = 建筑立面底部
  KV.WALK = 965; // 角色行走线（街道纵深中部）
  KV.DURATION = 36; // 成片时长（秒）
  KV.FPS = 30;
  KV.FONT = '"STKaiti","KaiTi","Kaiti SC","LXGW WenKai","Noto Serif SC","Songti SC","WenQuanYi Zen Hei",serif';

  KV.BRIDGE = { x0: 3250, x1: 4150, peak: 150 }; // 石拱桥
  KV.CANAL = { x0: 3330, x1: 4070 }; // 穿城运河

  // 视差系数：屏幕位移 = 相机位移 × 系数
  KV.PARALLAX = { sky: 0, clouds: 0.04, fireworks: 0.06, mountains: 0.1, skyLanterns: 0.15, cityFar: 0.28, cityMid: 0.55, street: 1, foreground: 1.35 };
  KV.layerWidth = (f) => Math.ceil(KV.W + (KV.WORLD - KV.W) * f);

  KV.rng = function (seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // 无状态哈希：保证任意时间点渲染结果一致（便于逐帧导出）
  KV.hash = function (a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  KV.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  KV.lerp = (a, b, t) => a + (b - a) * t;
  KV.smooth = function (e0, e1, x) {
    const t = KV.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  KV.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    return c;
  };

  // 角色脚下的地面高度（桥面为平滑拱形）
  KV.walkY = function (x) {
    const b = KV.BRIDGE;
    if (x <= b.x0 || x >= b.x1) return KV.WALK;
    const u = (x - b.x0) / (b.x1 - b.x0);
    return KV.WALK - (b.peak * (1 - Math.cos(2 * Math.PI * u))) / 2;
  };

  // 单调三次插值（Fritsch–Carlson），用于角色走位关键帧，不会过冲倒退
  KV.monotone = function (pts) {
    const n = pts.length;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const d = [];
    const m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
        continue;
      }
      const a = m[i] / d[i];
      const b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const k = 3 / Math.sqrt(s);
        m[i] = k * a * d[i];
        m[i + 1] = k * b * d[i];
      }
    }
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i];
      const t = (x - xs[i]) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  };

  // 柔和径向光晕（调用方自行设置混合模式）
  KV.glow = function (ctx, x, y, r, rgb, a) {
    if (a <= 0.001 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.3, `rgba(${rgb},${a * 0.4})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };

  // 两个 #rrggbb 颜色线性混合
  KV.mix = function (a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const c = (sh) => Math.round(KV.lerp((pa >> sh) & 255, (pb >> sh) & 255, t));
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  };

  // 将画布整体高斯模糊（用于远景/前景的移轴景深）
  KV.blurred = function (src, px) {
    const c = KV.canvas(src.width, src.height);
    const x = c.getContext('2d');
    x.filter = `blur(${px}px)`;
    x.drawImage(src, 0, 0);
    return c;
  };
})();
