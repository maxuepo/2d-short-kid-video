// 时间线、镜头与逐帧合成
(function () {
  const KV = window.KV;
  const W = KV.W;
  const H = KV.H;
  const P = KV.PARALLAX;
  const STRIDE = 150; // 一个完整步态周期的前进距离（像素）

  // 角色走位关键帧 [秒, 世界坐标 x]
  const girlPath = KV.monotone([
    [0, 380], // 站在长乐门门洞里
    [1, 392],
    [10, 2400], // 跑过灯笼街，经过铁匠铺兵器架
    [16, 3700], // 登上石拱桥顶
    [19.5, 3725], // 桥上驻足看烟花
    [26, 5000], // 跑过打铁花
    [31, 6050], // 到达鼓楼
    [36, 6062],
  ]);

  // 儿童向字幕（可用 ?subs=0 关闭）
  KV.SUBTITLES = [
    [1.0, 5.0, '元宵夜，小禾跑进了长乐门。'],
    [5.8, 9.8, '街上挂满了暖暖的灯笼，一盏又一盏。'],
    [10.2, 14.6, '铁匠铺前，红缨枪排排站好。'],
    [15.6, 20.2, '站上石拱桥——哇，烟花开满天！'],
    [21.0, 26.0, '看，打铁花！像下了一场金色的雨。'],
    [27.0, 31.0, '灯火一路，把小禾送到了鼓楼前。'],
    [31.6, 35.4, '咚——咚——新年快乐！'],
  ];

  KV.state = function (t) {
    const x = girlPath(t);
    const v = (girlPath(t + 0.05) - girlPath(t - 0.05)) / 0.1;
    return {
      t,
      x,
      y: KV.walkY(x),
      v,
      gait: KV.clamp(v / 230, 0, 1),
      phase: (x / STRIDE) * Math.PI * 2,
      cam: KV.clamp(x - 0.4 * W, 0, KV.WORLD - W),
      lookUp: KV.smooth(15.6, 16.6, t) * (1 - KV.smooth(19.2, 20, t)) + 0.5 * KV.smooth(31.2, 32, t),
      wave: KV.smooth(31.2, 32, t),
      happy: KV.smooth(31.2, 32, t),
      scale: 1.2,
      tint: 0,
    };
  };

  function layer(ctx, img, f, cam) {
    ctx.drawImage(img, cam * f, 0, W, H, 0, 0, W, H);
  }

  function haze(ctx, y0, y1, rgb, a) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);
    ctx.fillStyle = `rgba(${rgb},${a})`;
    ctx.fillRect(0, y1, W, H - y1);
  }

  function visible(x, cam, pad) {
    return x > cam - pad && x < cam + W + pad;
  }

  function text(ctx, str, x, y, size, alpha, o) {
    o = o || {};
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${o.weight || 'bold'} ${size}px ${KV.FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,150,60,0.6)';
    ctx.shadowBlur = o.glow || 0;
    ctx.strokeStyle = 'rgba(30,14,24,0.85)';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = o.color || '#fff4dc';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  KV.drawText = text;
  KV.options = { subs: true };

  KV.renderAt = function (t) {
    const ctx = KV.ctx;
    const L = KV.layers;
    const st = KV.state(t);
    const cam = st.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';

    // 1. 天空 / 月亮云层 / 烟花
    ctx.drawImage(L.sky, 0, 0);
    layer(ctx, L.clouds, P.clouds, cam);
    ctx.save();
    ctx.translate(-cam * P.fireworks, 0);
    const flash = KV.fx.fireworks(ctx, t);
    ctx.restore();
    // 2. 远山 + 孔明灯
    layer(ctx, L.mountains, P.mountains, cam);
    ctx.save();
    ctx.translate(-cam * P.skyLanterns, 0);
    KV.fx.skyLanterns(ctx, t);
    ctx.restore();
    haze(ctx, 560, 900, '255,150,110', 0.22);
    // 3. 远城 / 中城（逐层加雾，空气透视）
    layer(ctx, L.cityFar, P.cityFar, cam);
    haze(ctx, 700, 920, '240,140,110', 0.2);
    layer(ctx, L.cityMid, P.cityMid, cam);
    haze(ctx, 760, 930, '255,165,110', 0.16);

    // 4. 主街层
    layer(ctx, L.street, P.street, cam);
    ctx.save();
    ctx.translate(-cam, 0);
    if (visible(KV.CANAL.x0, cam, 900)) KV.fx.water(ctx, t, cam);
    if (visible(3700, cam, 600)) ctx.drawImage(L.bridge, 3200, 0);
    if (visible(2400, cam, 300)) KV.fx.forge(ctx, t);
    KV.fx.garlandRopes(ctx, KV.garlands.filter((g) => visible(g.x0, cam, 900)));
    const lan = KV.lanterns.filter((l) => visible(l.x, cam, 120));
    const small = [];
    for (const g of KV.garlands) for (const it of g.items) if (visible(it.x, cam, 60)) small.push(it);
    for (const l of lan) KV.fx.lanternBody(ctx, l, t);
    for (const l of small) KV.fx.lanternBody(ctx, l, t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lan) KV.fx.lanternGlow(ctx, l, t, true);
    for (const l of small) KV.fx.lanternGlow(ctx, l, t, false);
    ctx.restore();
    if (visible(4710, cam, 700)) KV.fx.ironFlower(ctx, t);
    if (visible(6675, cam, 500)) KV.fx.drumBeat(ctx, t, 31.4);
    st.tint = flash;
    KV.drawGirl(ctx, st);
    if (visible(3700, cam, 600)) ctx.drawImage(L.bridgeFront, 3200, 0);
    ctx.restore();

    // 5. 前景（移轴虚化）
    layer(ctx, L.foreground, P.foreground, cam);

    // 6. 氛围：烟火雾气、体积光、烟花闪光、纸纹、暗角
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const drift = Math.sin(t * 0.25) * 120;
    const fog = ctx.createRadialGradient(W * 0.5 + drift, H * 0.78, 50, W * 0.5 + drift, H * 0.78, W * 0.7);
    fog.addColorStop(0, 'rgba(255,160,100,0.14)');
    fog.addColorStop(1, 'rgba(255,160,100,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const bx = ((i * 760 - cam * 0.3) % (W + 800) + W + 800) % (W + 800) - 400;
      const a = 0.035 + 0.02 * Math.sin(t * 0.7 + i * 2);
      const g = ctx.createLinearGradient(bx, 0, bx + 260, H);
      g.addColorStop(0, `rgba(255,200,140,0)`);
      g.addColorStop(0.5, `rgba(255,200,140,${a})`);
      g.addColorStop(1, `rgba(255,200,140,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 160, 0);
      ctx.lineTo(bx + 520, H);
      ctx.lineTo(bx + 260, H);
      ctx.closePath();
      ctx.fill();
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,190,140,${0.06 * flash})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.35;
    ctx.drawImage(L.paper, 0, 0, W, H);
    ctx.restore();
    ctx.drawImage(L.vignette, 0, 0);

    // 7. 片头标题与字幕
    const ta = KV.smooth(0.4, 1.4, t) * (1 - KV.smooth(3.6, 4.6, t));
    if (ta > 0) {
      text(ctx, '元宵灯夜', 1400, 250, 112, ta, { glow: 30, color: '#ffe3a8' });
      text(ctx, '— 小禾进城 —', 1400, 360, 50, ta, { weight: 'normal', glow: 16 });
    }
    if (KV.options.subs) {
      for (const [a, b, s] of KV.SUBTITLES) {
        if (t < a || t > b) continue;
        const al = KV.smooth(a, a + 0.35, t) * (1 - KV.smooth(b - 0.35, b, t));
        text(ctx, s, W / 2, H - 46, 44, al);
      }
    }
    const black = 1 - KV.smooth(0, 1.2, t) + KV.smooth(KV.DURATION - 1.4, KV.DURATION, t);
    if (black > 0) {
      ctx.fillStyle = `rgba(0,0,0,${KV.clamp(black, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }
  };

  // ---------- 启动 ----------
  KV.start = async function () {
    const params = new URLSearchParams(location.search);
    KV.options.subs = params.get('subs') !== '0';
    const canvas = document.getElementById('stage');
    canvas.width = W;
    canvas.height = H;
    KV.ctx = canvas.getContext('2d');
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    if (params.get('mode') === 'still') {
      // 单图模式：一张 AI 生成的静态场景 + 镜头推进 + 动态灯光/烟花/水波 + 角色
      await KV.still.init(params.get('scene'));
    } else {
      KV.build();
      await KV.loadImageLayers();
    }
    await KV.loadCharacterSprites();
    KV.ready = true;
    if (params.get('record') === '1') {
      document.body.classList.add('record');
      KV.renderAt(Number(params.get('t') || 0));
      return;
    }
    let t0 = performance.now() - Number(params.get('t') || 0) * 1000;
    let paused = false;
    let pausedAt = 0;
    const hint = document.getElementById('hint');
    const bar = document.getElementById('bar');
    const now = () => (paused ? pausedAt : ((performance.now() - t0) / 1000) % KV.DURATION);
    const seek = (t) => {
      t = ((t % KV.DURATION) + KV.DURATION) % KV.DURATION;
      t0 = performance.now() - t * 1000;
      pausedAt = t;
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (paused) seek(pausedAt);
        else pausedAt = now();
        paused = !paused;
        e.preventDefault();
      } else if (e.key === 'ArrowRight') seek(now() + 2);
      else if (e.key === 'ArrowLeft') seek(now() - 2);
      else if (e.key === 's' || e.key === 'S') KV.options.subs = !KV.options.subs;
    });
    document.getElementById('progress').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      seek(((e.clientX - r.left) / r.width) * KV.DURATION);
    });
    setTimeout(() => hint.classList.add('hide'), 5000);
    const loop = () => {
      const t = now();
      KV.renderAt(t);
      bar.style.width = `${(t / KV.DURATION) * 100}%`;
      requestAnimationFrame(loop);
    };
    loop();
  };
})();
