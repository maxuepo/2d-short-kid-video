// 动态特效：灯笼摇曳与光晕、烟花、打铁花、孔明灯、水面波光。全部是 t 的纯函数，可任意跳帧
(function () {
  const KV = window.KV;
  const FX = (KV.fx = {});
  const TAU = Math.PI * 2;

  // ---------- 灯笼 ----------
  const KIND = {
    red: { body: '#d93a2c', core: '#ffd27a', glow: '255,140,60' },
    big: { body: '#d02c22', core: '#ffd890', glow: '255,130,55' },
    amber: { body: '#f2a03c', core: '#fff1c4', glow: '255,185,90' },
  };

  function lanternPose(L, t) {
    const a = Math.sin(t * 1.4 + L.seed * TAU) * 0.06 * Math.min(1.4, L.len / 30);
    return { a, bx: L.x - L.len * Math.sin(a), by: L.y + L.len * Math.cos(a) };
  }

  FX.lanternBody = function (ctx, L, t) {
    const k = KIND[L.kind];
    const { a } = lanternPose(L, t);
    const r = L.r;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(a);
    ctx.strokeStyle = '#2a1812';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, L.len - r * 1.1);
    ctx.stroke();
    ctx.translate(0, L.len);
    const g = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r * 1.15);
    g.addColorStop(0, k.core);
    g.addColorStop(0.55, k.body);
    g.addColorStop(1, '#6a1a14');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 1.12, 0, 0, TAU);
    ctx.fill();
    if (!L.small) {
      ctx.strokeStyle = 'rgba(110,30,20,0.45)';
      ctx.lineWidth = 1.2;
      for (const s of [-0.55, 0, 0.55]) {
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.abs(s) * r + 0.5, r * 1.1, 0, -Math.PI / 2, Math.PI / 2, s < 0);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#4a2812';
    ctx.fillRect(-r * 0.5, -r * 1.22, r, r * 0.24);
    ctx.fillRect(-r * 0.5, r * 1.0, r, r * 0.24);
    ctx.strokeStyle = '#c82a22';
    ctx.lineWidth = L.small ? 1 : 2;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * r * 0.12, r * 1.2);
      ctx.lineTo(i * r * 0.16, r * 1.2 + r * 0.9);
    }
    ctx.stroke();
    ctx.restore();
  };

  FX.lanternGlow = function (ctx, L, t, pools) {
    const k = KIND[L.kind];
    const { bx, by } = lanternPose(L, t);
    const fl = 0.86 + 0.14 * Math.sin(t * 7 + L.seed * 20) * Math.sin(t * 3.1 + L.seed * 9);
    KV.glow(ctx, bx, by, L.r * (L.small ? 5 : 6.5), k.glow, 0.3 * fl);
    KV.glow(ctx, bx, by, L.r * 1.8, '255,225,160', 0.35 * fl);
    if (pools && !L.small) {
      ctx.save();
      ctx.translate(bx, KV.STREET_TOP + 34);
      ctx.scale(1, 0.22);
      KV.glow(ctx, 0, 0, L.r * 9, k.glow, 0.16 * fl);
      ctx.restore();
    }
  };

  FX.garlandRopes = function (ctx, garlands) {
    ctx.strokeStyle = 'rgba(40,20,20,0.9)';
    ctx.lineWidth = 2;
    for (const g of garlands) {
      ctx.beginPath();
      ctx.moveTo(g.x0, g.y0);
      ctx.quadraticCurveTo((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2 + g.sag * 2, g.x1, g.y1);
      ctx.stroke();
    }
  };

  // ---------- 烟花 ----------
  const PALETTES = [
    ['255,214,120', '255,150,60'],
    ['255,120,90', '255,205,150'],
    ['255,160,200', '255,232,205'],
    ['255,244,210', '255,190,90'],
    ['150,215,255', '255,240,220'],
    ['255,200,90', '255,90,60'],
  ];
  const RISE = 1.0;
  // 生成一份烟花排期。o: { seed, t0, t1, dense:[起,止], x:[min,max], y:[min,max], scale }
  FX.makeFireworks = function (o) {
    const r = KV.rng(o.seed);
    const list = [];
    const k = o.scale || 1;
    let t = o.t0;
    while (t < o.t1) {
      const dense = t > o.dense[0] && t < o.dense[1];
      const type = r() < 0.3 ? 'willow' : r() < 0.7 ? 'peony' : 'ring';
      list.push({
        t0: t,
        x: o.x[0] + r() * (o.x[1] - o.x[0]),
        y: o.y[0] + r() * (o.y[1] - o.y[0]),
        type,
        pal: PALETTES[Math.floor(r() * PALETTES.length)],
        n: type === 'ring' ? 60 : 80 + Math.floor(r() * 40),
        v: (230 + r() * 150) * k,
        life: type === 'willow' ? 2.8 : 1.9,
        seed: Math.floor(r() * 1e9),
      });
      t += dense ? 0.3 + r() * 0.35 : 0.9 + r() * 1.1;
    }
    return list;
  };
  const FIREWORKS = FX.makeFireworks({ seed: 77, t0: 2, t1: 34, dense: [13.5, 23], x: [220, 2120], y: [150, 380] });
  FX.FIREWORKS = FIREWORKS;

  function fwPos(fw, i, dt) {
    const h1 = KV.hash(fw.seed, i);
    const h2 = KV.hash(fw.seed, i + 1000);
    const ang = (i / fw.n) * TAU + h1 * 0.12;
    let sp = fw.v;
    if (fw.type === 'peony') sp *= 0.35 + 0.65 * Math.sqrt(h2);
    else if (fw.type === 'willow') sp *= 0.6 + 0.4 * h2;
    const k = fw.type === 'willow' ? 1.3 : 2.0;
    const grav = fw.type === 'willow' ? 75 : 40;
    const d = (sp * (1 - Math.exp(-k * dt))) / k;
    return [fw.x + Math.cos(ang) * d, fw.y + Math.sin(ang) * d * 0.92 + 0.5 * grav * dt * dt];
  }

  // 返回本帧天空闪光强度（用于整体打光）
  FX.fireworks = function (ctx, t, list) {
    let flash = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const fw of list || FIREWORKS) {
      const age = t - fw.t0;
      if (age < 0 || age > RISE + fw.life) continue;
      if (age < RISE) {
        const u = age / RISE;
        const p = 1 - Math.pow(1 - u, 2.2);
        const y = KV.lerp(980, fw.y, p);
        const x = fw.x + Math.sin(u * 9 + fw.seed) * 3;
        const g = ctx.createLinearGradient(x, y, x, y + 70);
        g.addColorStop(0, `rgba(${fw.pal[0]},0.9)`);
        g.addColorStop(1, `rgba(${fw.pal[0]},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 70);
        ctx.stroke();
        KV.glow(ctx, x, y, 16, '255,230,180', 0.8);
        continue;
      }
      const dt = age - RISE;
      if (dt < 0.5) {
        const f = 1 - dt / 0.5;
        KV.glow(ctx, fw.x, fw.y, 360, fw.pal[0], 0.3 * f);
        flash += f * 0.5;
      }
      const fade = Math.pow(Math.max(0, 1 - dt / fw.life), 1.4);
      const trail = fw.type === 'willow' ? 9 : 5;
      for (let i = 0; i < fw.n; i++) {
        const col = KV.hash(fw.seed, i + 3000) < 0.6 ? fw.pal[0] : fw.pal[1];
        const hot = dt < 0.15 ? '255,248,230' : col;
        let tw = 1;
        if (fw.type === 'willow' && dt > fw.life * 0.55) tw = 0.5 + 0.5 * Math.sin(t * 40 + i * 1.7);
        let prev = fwPos(fw, i, dt);
        for (let j = 1; j <= trail; j++) {
          const tt = dt - j * 0.055;
          if (tt < 0) break;
          const p = fwPos(fw, i, tt);
          const a = fade * tw * (1 - j / (trail + 1));
          ctx.strokeStyle = `rgba(${j === 1 ? hot : col},${a})`;
          ctx.lineWidth = 2.8 - j * 0.22;
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(p[0], p[1]);
          ctx.stroke();
          prev = p;
        }
      }
    }
    ctx.restore();
    return Math.min(1, flash);
  };

  // 当前正在盛放的烟花（用于水面倒影）
  FX.activeBursts = function (t) {
    const out = [];
    for (const fw of FIREWORKS) {
      const dt = t - fw.t0 - RISE;
      if (dt >= 0 && dt < fw.life) out.push({ x: fw.x, y: fw.y, rgb: fw.pal[0], a: Math.pow(1 - dt / fw.life, 1.2) });
    }
    return out;
  };

  // ---------- 打铁花 ----------
  const IRON = { period: 0.7, origins: [4700, 4722], oy: 705 }; // 两位表演者木棒的击打点
  function ironPos(ox, oy, ang, sp, tau) {
    const k = 1.1;
    const d = (sp * (1 - Math.exp(-k * tau))) / k;
    return [ox + Math.cos(ang) * d, oy + Math.sin(ang) * d + 0.5 * 980 * tau * tau];
  }
  FX.ironFlower = function (ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const kNow = Math.floor(t / IRON.period);
    let light = 0;
    for (let k = kNow - 3; k <= kNow; k++) {
      if (k < 0) continue;
      const tk = k * IRON.period + KV.hash(k, 7) * 0.15;
      const dt = t - tk;
      if (dt < 0 || dt > 2.1) continue;
      const ox = IRON.origins[k % 2];
      const oy = IRON.oy;
      if (dt < 0.35) light = Math.max(light, 1 - dt / 0.35);
      for (let i = 0; i < 120; i++) {
        const s = k * 211 + i;
        const ang = -Math.PI / 2 + (KV.hash(s, 3) - 0.5) * 2.0;
        const sp = 300 + KV.hash(s, 9) * 560;
        const life = 0.9 + KV.hash(s, 17) * 1.1;
        if (dt > life) continue;
        const p1 = ironPos(ox, oy, ang, sp, dt);
        if (p1[1] > KV.WALK) continue;
        const p0 = ironPos(ox, oy, ang, sp, Math.max(0, dt - 0.06));
        const u = dt / life;
        const col = u < 0.06 ? '255,245,200' : u < 0.55 ? '255,196,90' : '255,130,50';
        ctx.strokeStyle = `rgba(${col},${(1 - u) * 0.95})`;
        ctx.lineWidth = 2.6 * (1 - u * 0.5);
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.stroke();
      }
    }
    const mid = (IRON.origins[0] + IRON.origins[1]) / 2;
    KV.glow(ctx, mid, 690, 420, '255,160,70', 0.12 + 0.3 * light);
    ctx.restore();
  };

  // 铁匠铺炉火火星
  FX.forge = function (ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const f = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 4.3);
    KV.glow(ctx, 2355, 850, 160, '255,120,40', 0.35 * f);
    const k = Math.floor(t / 0.6);
    const dt = t - k * 0.6;
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + (KV.hash(k * 31 + i, 1) - 0.5) * 2.2;
      const sp = 120 + KV.hash(k * 31 + i, 2) * 160;
      const x = 2470 + Math.cos(a) * sp * dt;
      const y = 852 + Math.sin(a) * sp * dt + 300 * dt * dt;
      KV.glow(ctx, x, y, 5, '255,200,100', Math.max(0, 1 - dt / 0.6));
    }
    ctx.restore();
  };

  // 鼓楼鼓声：鼓面随节拍发亮，并扩散出声波圈
  FX.drumBeat = function (ctx, t, start) {
    if (t < start) return;
    const period = 0.9;
    const dt = (t - start) % period;
    const x = 6675;
    const y = 330;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    KV.glow(ctx, x, y, 200, '255,170,80', 0.5 * Math.exp(-dt * 4));
    for (let k = 0; k < 2; k++) {
      const u = (dt + k * period) / (period * 2);
      ctx.strokeStyle = `rgba(255,214,150,${0.5 * (1 - u)})`;
      ctx.lineWidth = 4 * (1 - u) + 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 60 + u * 260, 52 + u * 220, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  // ---------- 孔明灯 ----------
  const SKY_LANTERNS = (function () {
    const r = KV.rng(55);
    const w = KV.layerWidth(KV.PARALLAX.skyLanterns);
    return Array.from({ length: 34 }, () => ({ x: r() * w, ph: r(), sp: 16 + r() * 22, s: 0.5 + r() * 0.8 }));
  })();
  FX.skyLanterns = function (ctx, t) {
    ctx.save();
    for (const L of SKY_LANTERNS) {
      const y = 980 - ((t * L.sp + L.ph * 1300) % 1300);
      const x = L.x + Math.sin(t * 0.4 + L.ph * 6) * 22;
      const s = L.s * (0.7 + (y / 1000) * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      KV.glow(ctx, x, y, 34 * s, '255,170,80', 0.35);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffcf7a';
      ctx.beginPath();
      ctx.moveTo(x - 7 * s, y - 9 * s);
      ctx.lineTo(x + 7 * s, y - 9 * s);
      ctx.lineTo(x + 5 * s, y + 8 * s);
      ctx.lineTo(x - 5 * s, y + 8 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------- 水面波光 ----------
  FX.water = function (ctx, t, cam) {
    const { x0, x1 } = KV.CANAL;
    const sources = [];
    for (const L of KV.lanterns) if (L.x > x0 - 60 && L.x < x1 + 60) sources.push({ x: L.x, rgb: '255,180,90', a: 0.55 });
    for (const b of FX.activeBursts(t)) {
      const wx = b.x - cam * KV.PARALLAX.fireworks + cam; // 烟花屏幕位置映射到世界坐标
      if (wx > x0 && wx < x1) sources.push({ x: wx, rgb: b.rgb, a: b.a * 0.8 });
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + 16, 880, x1 - x0 - 32, KV.H - 880);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    let row = 0;
    for (let y = 884; y < KV.H; y += 7, row++) {
      const depth = (y - 880) / 200;
      for (let x = x0; x < x1; x += 22) {
        const hx = KV.hash(row, x);
        const xx = x + Math.sin(t * 1.6 + row * 0.9 + hx * 6) * 10;
        let a = 0.05 + 0.06 * Math.max(0, Math.sin(t * 2.3 + hx * 12));
        let rgb = '255,190,130';
        for (const s of sources) {
          const d = (xx - s.x) / (24 + depth * 30);
          const k = Math.exp(-d * d) * s.a;
          if (k > a) {
            a = k;
            rgb = s.rgb;
          }
        }
        ctx.fillStyle = `rgba(${rgb},${a * (0.6 + 0.4 * Math.sin(t * 5 + hx * 30))})`;
        ctx.fillRect(xx, y, 8 + hx * 14, 2);
      }
    }
    ctx.restore();
  };
})();
