// 单图模式：把一张 AI 生成的静态场景做成镜头
// 镜头缓慢推进 + 灯笼呼吸光晕 + 天空烟花与孔明灯 + 运河波光 + 雾气流动 + 小禾跑入画面、抬头看烟花、挥手
// 用法：index.html?mode=still（默认场景 assets/scenes/bridge-night.js），或 ?mode=still&scene=xxx 加载 assets/scenes/xxx.js
(function () {
  const KV = window.KV;
  const W = KV.W;
  const H = KV.H;
  const S = (KV.still = {});
  const DURATION = 20;

  let cfg = null;
  let img = null;
  let fireworks = null;
  let skyPath = null;
  let waterPath = null;
  let girlPath = null;

  const SUBS = [
    [1.4, 6.2, '运河边，小禾停下了脚步。'],
    [7.6, 13.4, '抬头一看——满天都是烟花！'],
    [14.4, 18.6, '新年快乐！'],
  ];

  function loadScript(src) {
    return new Promise((res) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => res(true);
      s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  }

  function poly(points) {
    const p = new Path2D();
    points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    return p;
  }

  S.init = async function (name) {
    if (name || !window.KV_SCENE) await loadScript(`assets/scenes/${name || 'bridge-night'}.js`);
    cfg = window.KV_SCENE;
    img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`找不到场景图片 ${cfg.image}`));
      i.src = cfg.image;
    });
    const [iw, ih] = cfg.size;
    skyPath = poly(cfg.sky);
    waterPath = poly(cfg.water);
    // 烟花只在天空区域，尺寸按图片比例缩小一点
    fireworks = KV.fx.makeFireworks({ seed: 5, t0: 0.6, t1: DURATION - 1, dense: [7, 14], x: [iw * 0.48, iw * 0.83], y: [ih * 0.06, ih * 0.23], scale: 0.8 });
    girlPath = KV.monotone([
      [0, -180],
      [1, -150],
      [6.4, iw * 0.42],
      [7.4, iw * 0.43],
      [DURATION, iw * 0.432],
    ]);
    KV.DURATION = DURATION;
    KV.renderAt = S.renderAt;
  };

  // 镜头：从全景缓慢推进到桥洞方向，始终保证画面被图片铺满
  function camera(t) {
    const [iw, ih] = cfg.size;
    const s0 = Math.max(W / iw, H / ih);
    const e = KV.smooth(0, DURATION, t);
    const z = 1 + 0.18 * e;
    const s = s0 * z;
    const hw = W / 2 / s;
    const hh = H / 2 / s;
    const fx = KV.clamp(KV.lerp(iw / 2, iw * 0.515, e), hw, iw - hw);
    const fy = KV.clamp(KV.lerp(ih / 2, ih * 0.575, e), hh, ih - hh);
    return { s, fx, fy };
  }

  function girlState(t) {
    const x = girlPath(t);
    const v = (girlPath(t + 0.05) - girlPath(t - 0.05)) / 0.1;
    const scale = 1.45;
    return {
      t,
      x,
      y: cfg.walkY,
      v,
      gait: KV.clamp(v / (192 * scale), 0, 1),
      phase: (x / (125 * scale)) * Math.PI * 2,
      lookUp: KV.smooth(7.2, 8.2, t) * (1 - KV.smooth(13.6, 14.4, t)),
      wave: KV.smooth(14, 14.8, t),
      happy: KV.smooth(14, 14.8, t),
      scale,
      tint: 0,
    };
  }

  function lights(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    cfg.lights.forEach(([x, y, r, sky], i) => {
      const fl = 0.75 + 0.25 * Math.sin(t * (2.2 + (i % 5) * 0.37) + i * 1.7) * Math.sin(t * 5.3 + i);
      if (sky) {
        KV.glow(ctx, x, y, r * 5, '255,180,90', 0.22 * fl);
      } else {
        KV.glow(ctx, x, y, r * 4.5, '255,140,60', 0.2 * fl);
        KV.glow(ctx, x, y, r * 1.5, '255,215,150', 0.22 * fl);
      }
    });
    ctx.restore();
  }

  // 新放飞的孔明灯，从屋顶后缓缓升起
  function skyLanterns(ctx, t) {
    const [iw, ih] = cfg.size;
    ctx.save();
    ctx.clip(skyPath);
    for (let i = 0; i < 14; i++) {
      const ph = KV.hash(i, 3);
      const sp = 14 + KV.hash(i, 5) * 16;
      const y = ih * 0.42 - ((t * sp + ph * 600) % 600);
      const x = iw * (0.36 + KV.hash(i, 7) * 0.6) + Math.sin(t * 0.5 + ph * 6) * 14;
      const s = 0.5 + KV.hash(i, 9) * 0.6;
      ctx.globalCompositeOperation = 'lighter';
      KV.glow(ctx, x, y, 26 * s, '255,170,80', 0.4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffd286';
      ctx.beginPath();
      ctx.moveTo(x - 6 * s, y - 8 * s);
      ctx.lineTo(x + 6 * s, y - 8 * s);
      ctx.lineTo(x + 4.5 * s, y + 7 * s);
      ctx.lineTo(x - 4.5 * s, y + 7 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function water(ctx, t) {
    const xs = cfg.water.map((p) => p[0]);
    const ys = cfg.water.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const bursts = [];
    for (const fw of fireworks) {
      const dt = t - fw.t0 - 1;
      if (dt >= 0 && dt < fw.life) bursts.push({ x: fw.x, rgb: fw.pal[0], a: Math.pow(1 - dt / fw.life, 1.2) });
    }
    ctx.save();
    ctx.clip(waterPath);
    ctx.globalCompositeOperation = 'lighter';
    let row = 0;
    for (let y = y0; y < y1; y += 6, row++) {
      const depth = (y - y0) / (y1 - y0);
      for (let x = x0; x < x1; x += 20) {
        const hx = KV.hash(row, x);
        const xx = x + Math.sin(t * 1.5 + row * 0.8 + hx * 6) * 9;
        let a = 0.025 + 0.05 * Math.max(0, Math.sin(t * 2.1 + hx * 12));
        let rgb = '255,190,140';
        for (const b of bursts) {
          const d = (xx - b.x) / (40 + depth * 40);
          const k = Math.exp(-d * d) * b.a * 0.7;
          if (k > a) {
            a = k;
            rgb = b.rgb;
          }
        }
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.fillRect(xx, y, 4 + hx * 12 * (0.6 + depth), 1.2 + depth * 0.8);
      }
    }
    ctx.restore();
  }

  // 运河上缓缓流动的紫色雾气
  function mist(ctx, t) {
    const [iw, ih] = cfg.size;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const cx = ((t * (12 + i * 5) + i * 520) % (iw + 800)) - 400;
      const cy = ih * (0.5 + i * 0.07);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.22);
      KV.glow(ctx, 0, 0, 520, i % 2 ? '170,120,200' : '210,140,190', 0.1);
      ctx.restore();
    }
    ctx.restore();
  }

  S.renderAt = function (t) {
    const ctx = KV.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const cam = camera(t);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.fx, -cam.fy);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0);
    // 天空：烟花与孔明灯只画在天空区域，不会盖住屋顶
    ctx.save();
    ctx.clip(skyPath);
    const flash = KV.fx.fireworks(ctx, t, fireworks);
    ctx.restore();
    skyLanterns(ctx, t);
    lights(ctx, t);
    water(ctx, t);
    mist(ctx, t);
    const st = girlState(t);
    st.tint = flash;
    if (st.x > -120) KV.drawGirl(ctx, st);
    ctx.restore();

    // 烟花闪光与暗角
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,190,140,${0.05 * flash})`;
      ctx.fillRect(0, 0, W, H);
    }
    const v = ctx.createRadialGradient(W / 2, H * 0.55, 420, W / 2, H * 0.55, 1250);
    v.addColorStop(0, 'rgba(10,5,20,0)');
    v.addColorStop(1, 'rgba(10,5,20,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    if (KV.options.subs) {
      for (const [a, b, s] of SUBS) {
        if (t < a || t > b) continue;
        const al = KV.smooth(a, a + 0.35, t) * (1 - KV.smooth(b - 0.35, b, t));
        KV.drawText(ctx, s, W / 2, H - 46, 44, al);
      }
    }
    const black = 1 - KV.smooth(0, 1.2, t) + KV.smooth(DURATION - 1.4, DURATION, t);
    if (black > 0) {
      ctx.fillStyle = `rgba(0,0,0,${KV.clamp(black, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }
  };
})();
