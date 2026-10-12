// 主角「小禾」：明代袄裙 + 双丫髻，绘本风 Q 版比例（大头、大眼、短腿）
// 程序化 2D 骨骼：髋-膝-踝 / 肩-肘-腕 / 颈-头。每个部件是独立函数，对应拆件绑骨的图层（见 docs/pipeline.md）
// 若 assets/character/manifest.js 提供了序列帧（AI 生成或手绘），则改用贴图绘制，见文件末尾
(function () {
  const KV = window.KV;
  const TAU = Math.PI * 2;
  const P = {
    line: 'rgba(96,44,42,0.9)',
    skin: '#ffeadb',
    skinShade: '#f6c6b0',
    skinLine: 'rgba(170,96,80,0.9)',
    hair: '#2a1a1d',
    hairTop: '#4a3032',
    hairHi: 'rgba(205,160,160,0.6)',
    jacket: '#f2b3cb', // 藕荷粉
    jacketShade: '#d48aa8',
    jacketDeep: '#b46d8d',
    collar: '#c3343d',
    gold: '#eac46c',
    skirt: '#4f9d96',
    skirtLight: '#7cc4b6',
    skirtShade: '#2e6b6a',
    belt: '#d33b41',
    jade: '#8fd3ae',
    pants: '#fff6ec',
    pantsShade: '#e8d8c8',
    shoe: '#d03b45',
    shoeShade: '#9e2834',
    ribbon: '#e5484e',
    flower: '#ffb9ca',
  };
  const TH = 30; // 大腿
  const SH = 29; // 小腿
  const UA = 20; // 上臂
  const FA = 18; // 前臂
  const SHOULDER = [1, -40];
  const NECK = [3, -47];
  const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L]; // a：从竖直向下起算、向前为正

  function paint(ctx, fill, line, lw) {
    ctx.fillStyle = fill;
    ctx.fill();
    if (line !== false) {
      ctx.strokeStyle = line || P.line;
      ctx.lineWidth = lw || 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  // 带细描边的圆头肢体
  function limb(ctx, ax, ay, bx, by, w, col, cap) {
    ctx.lineCap = cap || 'round';
    ctx.strokeStyle = P.line;
    ctx.lineWidth = w + 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
  }

  function legFK(phi, g) {
    const a = g * (0.1 + 0.62 * Math.sin(phi));
    const bend = 0.05 + g * (0.2 + 1.15 * Math.max(0, Math.cos(phi - 0.35)));
    const b = a - bend;
    const k = dir(a, TH);
    const s = dir(b, SH);
    return { a, b, kx: k[0], ky: k[1], ax: k[0] + s[0], ay: k[1] + s[1] };
  }

  // ---------- 腿与云头鞋 ----------
  function drawLeg(ctx, L, far) {
    const c = far ? P.pantsShade : P.pants;
    limb(ctx, 0, 0, L.kx, L.ky, 11, c);
    limb(ctx, L.kx, L.ky, L.ax, L.ay, 9, c);
    ctx.save();
    ctx.translate(L.ax, L.ay);
    ctx.rotate(-L.b);
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.quadraticCurveTo(-7, 6, 0, 6.5);
    ctx.lineTo(13, 6.5);
    ctx.quadraticCurveTo(19, 6, 19, 1.5);
    ctx.quadraticCurveTo(21, -2.5, 17.5, -2.5); // 上翘的云头
    ctx.quadraticCurveTo(15.5, 1.5, 12, 0);
    ctx.quadraticCurveTo(5, -4, -5, -2);
    ctx.closePath();
    paint(ctx, far ? P.shoeShade : P.shoe);
    ctx.strokeStyle = 'rgba(255,240,220,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 5.2);
    ctx.lineTo(14, 5.2);
    ctx.stroke();
    ctx.fillStyle = P.gold;
    ctx.beginPath();
    ctx.arc(8, 1.8, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------- 马面裙 ----------
  function drawSkirt(ctx, N, F, g, t) {
    const top = -12;
    const hemY = Math.max(N.ky, F.ky) + 13;
    const front = Math.max(N.kx, F.kx, 5) + 12;
    const back = Math.min(N.kx, F.kx, -5) - 12 - g * 9;
    const fl = Math.sin(t * 11) * 2.5 * g;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-16, top);
      ctx.bezierCurveTo(-20, top + 14, back - 4, hemY - 16, back + fl, hemY - 1 + fl);
      const n = 7;
      for (let i = 1; i <= n; i++) {
        const x = back + ((front - back) * i) / n;
        ctx.quadraticCurveTo(x - (front - back) / n / 2, hemY + 4, x, hemY + (i === n ? 0 : 0.5));
      }
      ctx.bezierCurveTo(front + 2, hemY - 14, 19, top + 12, 16, top);
      ctx.closePath();
    };
    path();
    const sg = ctx.createLinearGradient(back, 0, front, 0);
    sg.addColorStop(0, P.skirtShade);
    sg.addColorStop(0.55, P.skirt);
    sg.addColorStop(0.85, P.skirtLight);
    sg.addColorStop(1, P.skirt);
    paint(ctx, sg);
    ctx.save();
    path();
    ctx.clip();
    // 褶裥：明暗相间的竖条
    const n = 9;
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 0.5) / n;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(10,50,50,0.16)';
      ctx.beginPath();
      ctx.moveTo(KV.lerp(-16, 16, u0), top);
      ctx.lineTo(KV.lerp(-16, 16, u1), top);
      ctx.lineTo(KV.lerp(back, front, u1), hemY + 6);
      ctx.lineTo(KV.lerp(back, front, u0), hemY + 6);
      ctx.closePath();
      ctx.fill();
    }
    // 裙襕：金色织带 + 卷草纹
    ctx.fillStyle = P.gold;
    ctx.fillRect(back - 12, hemY - 9, front - back + 24, 7);
    ctx.strokeStyle = '#b5523c';
    ctx.lineWidth = 1;
    for (let x = back - 8; x < front + 8; x += 6) {
      ctx.beginPath();
      ctx.arc(x, hemY - 5.5, 2.2, Math.PI, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(back - 12, hemY - 9, front - back + 24, 1.5);
    ctx.restore();
  }

  // ---------- 腰带后摆的飘带 ----------
  function drawSash(ctx, g, t) {
    ctx.lineCap = 'round';
    for (const [o, ph] of [
      [0, 0],
      [5, 1.3],
    ]) {
      const ex = -16 - g * 24 - o;
      const ey = 6 + o + (1 - g) * 20 + Math.sin(t * 9 + ph) * 4 * (0.3 + g);
      ctx.beginPath();
      ctx.moveTo(-15, -8);
      ctx.bezierCurveTo(-21, -1, ex + 8, ey - 10 + Math.sin(t * 7 + ph) * 4, ex, ey);
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 5.5;
      ctx.stroke();
      ctx.strokeStyle = P.belt;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // ---------- 交领短袄 + 腰带 + 玉佩 ----------
  function drawTorso(ctx, g, t) {
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-13, -44);
      ctx.quadraticCurveTo(-20, -22, -24, 7);
      ctx.quadraticCurveTo(-1, 12, 24, 6);
      ctx.quadraticCurveTo(19, -22, 14, -44);
      ctx.quadraticCurveTo(1, -49, -13, -44);
      ctx.closePath();
    };
    body();
    const jg = ctx.createLinearGradient(-21, 0, 22, 0);
    jg.addColorStop(0, P.jacketShade);
    jg.addColorStop(0.45, P.jacket);
    jg.addColorStop(1, P.jacket);
    paint(ctx, jg);
    ctx.save();
    body();
    ctx.clip();
    // 背部阴影
    ctx.fillStyle = 'rgba(160,90,125,0.35)';
    ctx.beginPath();
    ctx.ellipse(-14, -14, 9, 32, 0.1, 0, TAU);
    ctx.fill();
    // 下摆镶边
    ctx.strokeStyle = P.collar;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-24, 7);
    ctx.quadraticCurveTo(-1, 12, 24, 6);
    ctx.stroke();
    ctx.strokeStyle = P.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-24, 2.6);
    ctx.quadraticCurveTo(-1, 7.6, 24, 1.6);
    ctx.stroke();
    // 胸前小团花
    ctx.fillStyle = 'rgba(255,236,245,0.85)';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.arc(4 + Math.cos(a) * 2.6, -25 + Math.sin(a) * 2.6, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = P.gold;
    ctx.beginPath();
    ctx.arc(4, -25, 1.3, 0, TAU);
    ctx.fill();
    // 交领：白色衬领 + 红色领缘 + 金线
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fffaf2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -47);
    ctx.quadraticCurveTo(9, -36, 17, -12);
    ctx.stroke();
    ctx.strokeStyle = P.collar;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-5, -47);
    ctx.quadraticCurveTo(5, -35, 13, -10);
    ctx.stroke();
    ctx.strokeStyle = P.gold;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-2.4, -48);
    ctx.quadraticCurveTo(7.6, -36, 15.6, -11);
    ctx.stroke();
    ctx.restore();
    // 腰带
    ctx.beginPath();
    ctx.roundRect(-23, -13, 47, 9, 3);
    paint(ctx, P.belt);
    ctx.strokeStyle = P.gold;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-22, -11);
    ctx.lineTo(23, -11);
    ctx.moveTo(-22, -6);
    ctx.lineTo(23, -6);
    ctx.stroke();
    // 蝴蝶结
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(19 + s * 4, -9, 4.5, 3, s * 0.5, 0, TAU);
      paint(ctx, P.belt);
    }
    ctx.beginPath();
    ctx.arc(19, -9, 2, 0, TAU);
    paint(ctx, P.belt);
    // 玉佩与流苏，随跑动摆荡
    const sw = Math.sin(t * 9) * 0.35 * g + g * 0.25;
    ctx.save();
    ctx.translate(19, -6);
    ctx.rotate(sw);
    ctx.strokeStyle = P.belt;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 15, 3.6, 0, TAU);
    paint(ctx, P.jade, 'rgba(40,90,70,0.9)', 1);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-1.2, 13.8, 1.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = P.belt;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * 0.7, 18.5);
      ctx.lineTo(i * 1.3, 27);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 广袖手臂 ----------
  function drawArm(ctx, s, e, far) {
    const [sx, sy] = SHOULDER;
    const u = dir(s, UA);
    const ex = sx + u[0];
    const ey = sy + u[1];
    const fa = s + e;
    const f = dir(fa, FA);
    const wx = ex + f[0];
    const wy = ey + f[1];
    const h = dir(fa, 5);
    const col = far ? P.jacketShade : P.jacket;
    const deep = far ? P.jacketDeep : P.jacketShade;
    // 手
    ctx.beginPath();
    ctx.arc(wx + h[0], wy + h[1], 4.6, 0, TAU);
    paint(ctx, far ? P.skinShade : P.skin, P.skinLine, 1.3);
    // 下垂的袖袂
    ctx.beginPath();
    ctx.moveTo(ex - 5, ey - 3);
    ctx.lineTo(wx, wy - 6);
    ctx.quadraticCurveTo(wx + 5, wy + 17, (ex + wx) / 2 - 4, (ey + wy) / 2 + 17);
    ctx.quadraticCurveTo(ex - 12, ey + 13, ex - 5, ey - 3);
    ctx.closePath();
    const dg = ctx.createLinearGradient(0, Math.min(ey, wy) - 6, 0, Math.max(ey, wy) + 18);
    dg.addColorStop(0, col);
    dg.addColorStop(1, deep);
    paint(ctx, dg);
    limb(ctx, sx, sy, ex, ey, 12, col);
    limb(ctx, ex, ey, wx, wy, 13, col);
    // 袖口红边
    limb(ctx, wx - h[0] * 0.7, wy - h[1] * 0.7, wx, wy, 14, P.collar, 'butt');
  }

  // ---------- 头部 ----------
  function bun(ctx, x, y, r, t, ph) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
    g.addColorStop(0, P.hairTop);
    g.addColorStop(1, P.hair);
    paint(ctx, g);
    // 盘发纹理
    ctx.strokeStyle = P.hairHi;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, -2.6, 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, r * 0.3, 2.4, 5.4);
    ctx.stroke();
    // 发带缠绕
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = P.ribbon;
    ctx.fillRect(x - r, y + r * 0.45, r * 2, r * 0.32);
    ctx.restore();
  }

  function ribbonTail(ctx, x, y, ex, ey, t, ph) {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 8, y + 4 + Math.sin(t * 8 + ph) * 4, ex + 8, ey - 6 + Math.sin(t * 9 + ph) * 5, ex, ey);
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 5.5;
    ctx.stroke();
    ctx.strokeStyle = P.ribbon;
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }

  function bow(ctx, x, y) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 4, y, 4.5, 3, s * 0.35, 0, TAU);
      paint(ctx, P.ribbon);
    }
    ctx.beginPath();
    ctx.arc(x, y, 1.9, 0, TAU);
    paint(ctx, P.ribbon);
  }

  function drawHead(ctx, st) {
    const g = st.gait;
    const t = st.t;
    const sway = Math.sin(t * 8) * 3 * g;
    ctx.save();
    ctx.translate(NECK[0], NECK[1]);
    ctx.rotate(-st.lookUp * 0.28 + Math.sin(t * 2.2) * 0.02);
    limb(ctx, 0, 6, 1, -6, 8, P.skinShade);
    const hx = 6;
    const hy = -30;

    // 1) 脑后垂发（随跑动后飘）
    ctx.beginPath();
    ctx.moveTo(hx - 20, hy - 10);
    ctx.bezierCurveTo(hx - 34, hy + 10, hx - 34 - g * 10 + sway, hy + 34, hx - 30 - g * 14 + sway, hy + 52);
    ctx.quadraticCurveTo(hx - 22 - g * 8, hy + 46, hx - 18, hy + 40);
    ctx.quadraticCurveTo(hx - 14, hy + 20, hx - 6, hy + 10);
    ctx.closePath();
    paint(ctx, P.hair);
    // 2) 后发带飘尾 + 后髻
    ribbonTail(ctx, hx - 20, hy - 22, hx - 46 - g * 16, hy - 4 + Math.sin(t * 7) * 4, t, 0);
    ribbonTail(ctx, hx - 19, hy - 20, hx - 40 - g * 12, hy + 6 + Math.sin(t * 7 + 1) * 4, t, 1.4);
    bun(ctx, hx - 15, hy - 26, 12.5, t, 0);
    // 3) 后脑
    ctx.beginPath();
    ctx.ellipse(hx - 4, hy - 1, 28, 29, 0, 0, TAU);
    const hg = ctx.createLinearGradient(0, hy - 30, 0, hy + 28);
    hg.addColorStop(0, P.hairTop);
    hg.addColorStop(1, P.hair);
    paint(ctx, hg);
    // 4) 脸
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy - 18);
    ctx.bezierCurveTo(hx + 8, hy - 30, hx + 28, hy - 16, hx + 28, hy + 2);
    ctx.bezierCurveTo(hx + 29, hy + 14, hx + 24, hy + 26, hx + 12, hy + 27);
    ctx.bezierCurveTo(hx + 2, hy + 28, hx - 8, hy + 24, hx - 12, hy + 14);
    ctx.closePath();
    const fg = ctx.createRadialGradient(hx + 15, hy + 3, 4, hx + 8, hy + 4, 34);
    fg.addColorStop(0, P.skin);
    fg.addColorStop(0.75, P.skin);
    fg.addColorStop(1, P.skinShade);
    paint(ctx, fg, P.skinLine, 1.4);
    // 腮红
    const bl = ctx.createRadialGradient(hx + 12, hy + 14, 0, hx + 12, hy + 14, 8);
    bl.addColorStop(0, 'rgba(255,120,130,0.55)');
    bl.addColorStop(1, 'rgba(255,120,130,0)');
    ctx.fillStyle = bl;
    ctx.fillRect(hx + 2, hy + 6, 20, 16);
    // 5) 眼睛（含眨眼）
    const ly = -st.lookUp * 2.2;
    const ex = hx + 16;
    const ey = hy + 4;
    const blink = (t + 0.7) % 3.3 < 0.13;
    if (blink || st.happy > 0.5) {
      ctx.strokeStyle = '#2a1612';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (blink) {
        ctx.moveTo(ex - 6, ey + 1);
        ctx.quadraticCurveTo(ex, ey + 4, ex + 6, ey);
      } else {
        // 弯弯笑眼
        ctx.moveTo(ex - 6, ey + 2);
        ctx.quadraticCurveTo(ex, ey - 5, ex + 6, ey + 2);
      }
      ctx.stroke();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 6.4, 8.4, 0, 0, TAU);
      ctx.fillStyle = '#fffaf5';
      ctx.fill();
      ctx.clip();
      const ig = ctx.createLinearGradient(0, ey - 8 + ly, 0, ey + 8 + ly);
      ig.addColorStop(0, '#1e0e0a');
      ig.addColorStop(0.55, '#5a2c1c');
      ig.addColorStop(1, '#c27a44');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(ex + 1.6, ey + 0.8 + ly, 5.2, 7.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#140806';
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey + 0.6 + ly, 2.5, 3.6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 0.6, ey - 2.6 + ly, 2.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + 3.4, ey + 4.4 + ly, 1.1, 0, TAU);
      ctx.fill();
      // 上眼线 + 睫毛
      ctx.strokeStyle = '#2a1612';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - 6.5, ey - 4);
      ctx.quadraticCurveTo(ex, ey - 10.5, ex + 7, ey - 5);
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ex - 6.2, ey - 4);
      ctx.lineTo(ex - 9.5, ey - 6.5);
      ctx.moveTo(ex - 4.5, ey - 6.5);
      ctx.lineTo(ex - 6.8, ey - 9.5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,80,60,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex - 2, ey + 8.6);
      ctx.quadraticCurveTo(ex + 2, ey + 9.4, ex + 5, ey + 7);
      ctx.stroke();
    }
    // 眉毛
    ctx.strokeStyle = P.hairTop;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(ex + 1, ey - 8 + ly * 0.5, 7, -2.3, -1.0);
    ctx.stroke();
    // 鼻、嘴
    ctx.strokeStyle = P.skinLine;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(hx + 28.6, hy + 8);
    ctx.lineTo(hx + 27.4, hy + 10.5);
    ctx.stroke();
    const open = 1 + st.happy * 0.8;
    ctx.beginPath();
    ctx.moveTo(hx + 18, hy + 17);
    ctx.quadraticCurveTo(hx + 22, hy + 18.6, hx + 25.6, hy + 16.2);
    ctx.quadraticCurveTo(hx + 23.5, hy + 17 + 5.5 * open, hx + 18, hy + 17);
    paint(ctx, '#a8363c', 'rgba(120,30,35,0.9)', 1);
    ctx.fillStyle = '#ff8f9a';
    ctx.beginPath();
    ctx.ellipse(hx + 21.8, hy + 18.8 + 1.5 * open, 2.4, 1.3 * open, 0, 0, TAU);
    ctx.fill();
    // 6) 鬓发（盖住脸后缘与耳朵）
    ctx.beginPath();
    ctx.moveTo(hx - 16, hy - 18);
    ctx.lineTo(hx - 3, hy - 15);
    ctx.quadraticCurveTo(hx + 2, hy - 2, hx - 1, hy + 18);
    ctx.quadraticCurveTo(hx + 1, hy + 26, hx - 4, hy + 30 + sway * 0.5);
    ctx.quadraticCurveTo(hx - 6, hy + 22, hx - 9, hy + 18);
    ctx.quadraticCurveTo(hx - 14, hy + 4, hx - 20, hy - 6);
    ctx.closePath();
    paint(ctx, P.hair);
    // 7) 刘海
    ctx.beginPath();
    ctx.moveTo(hx - 16, hy - 18);
    ctx.bezierCurveTo(hx - 8, hy - 34, hx + 20, hy - 32, hx + 29, hy - 8);
    ctx.lineTo(hx + 26, hy - 6.5);
    ctx.quadraticCurveTo(hx + 25, hy - 2, hx + 23, hy - 1);
    ctx.quadraticCurveTo(hx + 22, hy - 8, hx + 18, hy - 11);
    ctx.quadraticCurveTo(hx + 16, hy - 5, hx + 12, hy - 3);
    ctx.quadraticCurveTo(hx + 12, hy - 10, hx + 7, hy - 13);
    ctx.quadraticCurveTo(hx + 5, hy - 7, hx + 1, hy - 5);
    ctx.quadraticCurveTo(hx + 1, hy - 12, hx - 4, hy - 15);
    ctx.quadraticCurveTo(hx - 10, hy - 14, hx - 16, hy - 18);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, hy - 32, 0, hy);
    bg.addColorStop(0, P.hairTop);
    bg.addColorStop(1, P.hair);
    paint(ctx, bg);
    // 发丝高光（天使环）
    ctx.strokeStyle = P.hairHi;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(hx + 2, hy - 2, 24, -2.55, -1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx + 2, hy - 2, 24, -1.55, -1.05);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(205,160,160,0.35)';
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy - 26);
    ctx.quadraticCurveTo(hx + 14, hy - 20, hx + 17, hy - 11);
    ctx.moveTo(hx - 2, hy - 26);
    ctx.quadraticCurveTo(hx + 4, hy - 20, hx + 6, hy - 13);
    ctx.stroke();
    // 8) 前髻 + 蝴蝶结 + 绒花
    bun(ctx, hx + 9, hy - 31, 12, t, 1);
    bow(ctx, hx - 1, hy - 23);
    for (const [fx, fy, fr] of [
      [hx + 18, hy - 36, 2.6],
      [hx + 20, hy - 29, 2],
    ]) {
      ctx.fillStyle = P.flower;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.3;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * fr * 1.2, fy + Math.sin(a) * fr * 1.2, fr, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe07a';
      ctx.beginPath();
      ctx.arc(fx, fy, fr * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // st: { x, y, phase, gait, t, lookUp, wave, happy, scale }
  function drawRig(ctx, st) {
    const phi = st.phase;
    const g = st.gait;
    const t = st.t;
    const N = legFK(phi, g);
    const F = legFK(phi + Math.PI, g);
    const hop = st.wave * Math.abs(Math.sin(t * 5)) * 6;
    const hipY = -(Math.max(N.ay, F.ay) + 6.5) - hop;
    const lean = g * 0.14 - st.lookUp * 0.05;
    // 手臂：跑动时与对侧腿反向摆动；结尾近侧手臂前伸、小臂摆动向鼓楼挥手
    const nearS = KV.lerp(0.1 - g * 0.85 * Math.sin(phi), 1.3, st.wave);
    const nearE = KV.lerp(0.35 + g * 0.9, 1.0 + 0.3 * Math.sin(t * 9), st.wave);
    const farS = 0.1 - g * 0.85 * Math.sin(phi + Math.PI) - st.lookUp * 0.2 - st.wave * 0.3;
    const farE = 0.35 + g * 0.9;

    ctx.save();
    ctx.translate(0, hipY);
    ctx.save();
    ctx.rotate(lean);
    drawArm(ctx, farS, farE, true);
    drawSash(ctx, g, t);
    ctx.restore();
    drawLeg(ctx, F, true);
    drawLeg(ctx, N, false);
    drawSkirt(ctx, N, F, g, t);
    ctx.save();
    ctx.rotate(lean);
    drawTorso(ctx, g, t);
    drawHead(ctx, st);
    drawArm(ctx, nearS, nearE, false);
    ctx.restore();
    ctx.restore();
  }

  // ---------- 可选：序列帧贴图角色 ----------
  // assets/character/manifest.js 示例见 docs/pipeline.md §3.4
  const sprites = { ready: false };
  KV.loadCharacterSprites = function () {
    const m = window.KV_CHARACTER;
    if (!m) return Promise.resolve(false);
    const load = (src) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
      });
    const jobs = [];
    for (const name of ['run', 'idle', 'lookUp', 'wave']) {
      const list = m[name] || [];
      sprites[name] = [];
      list.forEach((src, i) => jobs.push(load(src).then((img) => img && (sprites[name][i] = img))));
    }
    return Promise.all(jobs).then(() => {
      sprites.ready = sprites.run.length > 0;
      sprites.m = m;
      if (sprites.ready) console.log('[character] 使用序列帧角色', m);
      return sprites.ready;
    });
  };

  function drawSprite(ctx, st) {
    const m = sprites.m;
    let set = sprites.run;
    let idx = Math.floor(((st.phase / TAU) % 1) * set.length);
    if (st.wave > 0.5 && sprites.wave.length) {
      set = sprites.wave;
      idx = Math.floor(st.t * (m.fps || 8)) % set.length;
    } else if (st.lookUp > 0.5 && sprites.lookUp.length) {
      set = sprites.lookUp;
      idx = Math.floor(st.t * (m.fps || 8)) % set.length;
    } else if (st.gait < 0.15 && sprites.idle.length) {
      set = sprites.idle;
      idx = Math.floor(st.t * (m.fps || 8)) % set.length;
    }
    const img = set[Math.max(0, idx)] || sprites.run[0];
    const h = m.height || 200;
    const w = (img.width / img.height) * h;
    const ax = m.anchorX != null ? m.anchorX : 0.5; // 脚底中心在图中的相对位置
    const ay = m.anchorY != null ? m.anchorY : 1;
    ctx.save();
    if (m.facing === 'left') {
      ctx.translate(st.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-st.x, 0);
    }
    ctx.drawImage(img, st.x - w * ax, st.y - h * ay, w, h);
    ctx.restore();
  }

  // ---------- 合成：离屏 2× 超采样绘制 → 轮廓光/柔光 → 缩放到主画面 ----------
  const SS = 2;
  const OFF = 440;
  let off = null;
  KV.drawGirl = function (ctx, st) {
    // 脚下影子
    ctx.save();
    ctx.translate(st.x, st.y + 2);
    ctx.scale(1, 0.22);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 44);
    sh.addColorStop(0, 'rgba(15,8,20,0.5)');
    sh.addColorStop(1, 'rgba(15,8,20,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-44, -44, 88, 88);
    ctx.restore();

    if (sprites.ready) {
      drawSprite(ctx, st);
      return;
    }
    if (!off) off = KV.canvas(OFF * SS, OFF * SS);
    const o = off.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, off.width, off.height);
    o.setTransform(SS, 0, 0, SS, 0, 0);
    o.translate(OFF / 2, OFF - 40);
    o.scale(st.scale, st.scale);
    drawRig(o, st);
    o.setTransform(1, 0, 0, 1, 0, 0);
    const W2 = off.width;
    // 背光边缘：来自身后灯火的暖色轮廓光；脚下冷色压暗
    o.globalCompositeOperation = 'source-atop';
    const rim = o.createLinearGradient(W2 / 2 - 60 * SS, 0, W2 / 2 + 20 * SS, 0);
    rim.addColorStop(0, 'rgba(255,170,90,0.38)');
    rim.addColorStop(1, 'rgba(255,170,90,0)');
    o.fillStyle = rim;
    o.fillRect(0, 0, W2, W2);
    const low = o.createLinearGradient(0, (OFF - 120) * SS, 0, (OFF - 40) * SS);
    low.addColorStop(0, 'rgba(40,30,80,0)');
    low.addColorStop(1, 'rgba(40,30,80,0.22)');
    o.fillStyle = low;
    o.fillRect(0, 0, W2, W2);
    if (st.tint > 0) {
      o.fillStyle = `rgba(255,200,150,${0.16 * st.tint})`;
      o.fillRect(0, 0, W2, W2);
    }
    o.globalCompositeOperation = 'source-over';

    const dx = st.x - OFF / 2;
    const dy = st.y - (OFF - 40);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14;
    ctx.filter = 'blur(8px)';
    ctx.drawImage(off, dx, dy, OFF, OFF);
    ctx.restore();
    ctx.save();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, dx, dy, OFF, OFF);
    ctx.restore();
  };
})();
