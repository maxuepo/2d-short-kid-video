// 主角「小禾」：明代袄裙 + 双丫髻，程序化 2D 骨骼（髋-膝-踝 / 肩-肘-腕 / 颈-头）
// 每个部件都是独立的绘制函数，对应后续拆件绑骨时的图层命名（见 docs/pipeline.md）
(function () {
  const KV = window.KV;
  const C = {
    line: '#3b2420',
    skin: '#ffe2cc',
    blush: 'rgba(255,110,110,0.42)',
    hair: '#2a1c1f',
    hairHi: 'rgba(160,110,110,0.55)',
    jacket: '#f7cbb6',
    jacketShade: '#d9a594',
    collar: '#b8323a',
    skirt: '#3f8a8c',
    skirtShade: '#2c6669',
    skirtBand: '#e3b65a',
    belt: '#d6373b',
    pants: '#f3e6d0',
    pantsShade: '#d8c6ae',
    shoe: '#c0303a',
    shoeShade: '#8e222b',
    shoeDeco: '#ffd66b',
  };
  const TH = 40; // 大腿
  const SH = 38; // 小腿
  const UA = 27; // 上臂
  const FA = 25; // 前臂
  const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L]; // a：从竖直向下起算、向前为正

  function seg(ctx, ax, ay, bx, by, w, col, cap) {
    ctx.lineCap = cap || 'round';
    ctx.strokeStyle = C.line;
    ctx.lineWidth = w + 4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  function fillStroke(ctx, fill) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  function legFK(phi, g) {
    const a = g * (0.1 + 0.62 * Math.sin(phi));
    const bend = 0.05 + g * (0.15 + 1.15 * Math.max(0, Math.cos(phi - 0.35)));
    const b = a - bend;
    const k = dir(a, TH);
    const s = dir(b, SH);
    return { a, b, kx: k[0], ky: k[1], ax: k[0] + s[0], ay: k[1] + s[1] };
  }

  function drawLeg(ctx, L, far) {
    seg(ctx, 0, 0, L.kx, L.ky, 13, far ? C.pantsShade : C.pants);
    seg(ctx, L.kx, L.ky, L.ax, L.ay, 11, far ? C.pantsShade : C.pants);
    ctx.save();
    ctx.translate(L.ax, L.ay);
    ctx.rotate(-L.b);
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.quadraticCurveTo(-8, 7, 2, 7);
    ctx.lineTo(15, 7);
    ctx.quadraticCurveTo(20, 5, 15, -0.5);
    ctx.quadraticCurveTo(6, -4, -6, -2);
    ctx.closePath();
    fillStroke(ctx, far ? C.shoeShade : C.shoe);
    ctx.fillStyle = C.shoeDeco;
    ctx.beginPath();
    ctx.arc(9, 2.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 马面裙：裙摆随步幅张开，后摆随风飘
  function drawSkirt(ctx, N, F, g, t) {
    const top = -14;
    const hemY = Math.max(N.ky, F.ky) + 15;
    const front = Math.max(N.kx, F.kx, 6) + 13;
    const back = Math.min(N.kx, F.kx, -6) - 13 - g * 10;
    const fl = Math.sin(t * 11) * 3 * g;
    ctx.beginPath();
    ctx.moveTo(-17, top);
    ctx.quadraticCurveTo(back - 3, top + 22, back + fl, hemY - 2 + fl);
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const x = back + ((front - back) * i) / n;
      ctx.quadraticCurveTo(x - (front - back) / n / 2, hemY + 5, x, hemY + (i === n ? 0 : 1));
    }
    ctx.quadraticCurveTo(front + 3, top + 20, 16, top);
    ctx.closePath();
    const sg = ctx.createLinearGradient(back, 0, front, 0);
    sg.addColorStop(0, C.skirtShade);
    sg.addColorStop(0.6, C.skirt);
    sg.addColorStop(1, C.skirtShade);
    ctx.save();
    fillStroke(ctx, sg);
    ctx.clip();
    ctx.strokeStyle = 'rgba(20,60,60,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 7; i++) {
      const u = i / 7;
      ctx.beginPath();
      ctx.moveTo(KV.lerp(-15, 14, u), top);
      ctx.lineTo(KV.lerp(back, front, u), hemY + 4);
      ctx.stroke();
    }
    ctx.fillStyle = C.skirtBand;
    ctx.fillRect(back - 10, hemY - 9, front - back + 20, 7);
    ctx.fillStyle = '#b8323a';
    for (let x = back; x < front; x += 7) ctx.fillRect(x, hemY - 7, 3, 3);
    ctx.restore();
  }

  function drawSash(ctx, g, t) {
    ctx.lineCap = 'round';
    for (const [o, ph] of [
      [0, 0],
      [6, 1.3],
    ]) {
      const ex = -18 - g * 26 - o;
      const ey = 8 + o + (1 - g) * 22 + Math.sin(t * 9 + ph) * 4 * (0.3 + g);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(-16, -9);
      ctx.bezierCurveTo(-22, -2, ex + 8, ey - 10 + Math.sin(t * 7 + ph) * 4, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = C.belt;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // 交领袄
  function drawTorso(ctx) {
    ctx.beginPath();
    ctx.moveTo(-13, -54);
    ctx.quadraticCurveTo(-21, -28, -25, 14);
    ctx.quadraticCurveTo(0, 20, 24, 14);
    ctx.quadraticCurveTo(18, -28, 12, -54);
    ctx.quadraticCurveTo(0, -58, -13, -54);
    const jg = ctx.createLinearGradient(-21, 0, 21, 0);
    jg.addColorStop(0, C.jacketShade);
    jg.addColorStop(0.55, C.jacket);
    jg.addColorStop(1, C.jacket);
    fillStroke(ctx, jg);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = C.collar;
    ctx.fillRect(-28, 12, 56, 5);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff4e6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, -57);
    ctx.quadraticCurveTo(8, -46, 17, -22);
    ctx.stroke();
    ctx.strokeStyle = C.collar;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, -57);
    ctx.quadraticCurveTo(4, -45, 14, -18);
    ctx.stroke();
    ctx.restore();
    // 腰带
    ctx.beginPath();
    ctx.rect(-20, -14, 40, 10);
    fillStroke(ctx, C.belt);
    ctx.beginPath();
    ctx.ellipse(17, -9, 6, 4, 0.4, 0, Math.PI * 2);
    fillStroke(ctx, C.belt);
  }

  function armPoints(s, e) {
    const sx = 0;
    const sy = -50;
    const u = dir(s, UA);
    const ex = sx + u[0];
    const ey = sy + u[1];
    const f = dir(s + e, FA);
    return { sx, sy, ex, ey, wx: ex + f[0], wy: ey + f[1], fa: s + e };
  }

  // 广袖手臂
  function drawArm(ctx, s, e, far) {
    const p = armPoints(s, e);
    const col = far ? C.jacketShade : C.jacket;
    const h = dir(p.fa, 6);
    // 手先画，袖口压在手上
    ctx.beginPath();
    ctx.arc(p.wx + h[0] * 0.9, p.wy + h[1] * 0.9, 5.5, 0, Math.PI * 2);
    fillStroke(ctx, C.skin);
    seg(ctx, p.sx, p.sy, p.ex, p.ey, 14, col);
    // 下垂的广袖（袂）
    ctx.beginPath();
    ctx.moveTo(p.ex - 7, p.ey - 2);
    ctx.lineTo(p.wx + h[0] * 0.2, p.wy + h[1] * 0.2 - 8);
    ctx.quadraticCurveTo(p.wx + 6, p.wy + 22, (p.ex + p.wx) / 2 - 6, (p.ey + p.wy) / 2 + 22);
    ctx.quadraticCurveTo(p.ex - 14, p.ey + 16, p.ex - 7, p.ey - 2);
    ctx.closePath();
    fillStroke(ctx, col);
    seg(ctx, p.ex, p.ey, p.wx, p.wy, 15, col);
    seg(ctx, p.wx - h[0] * 0.5, p.wy - h[1] * 0.5, p.wx, p.wy, 16, C.collar, 'butt');
  }

  function bun(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    fillStroke(ctx, C.hair);
    ctx.strokeStyle = C.hairHi;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.65, -2.4, -1.0);
    ctx.stroke();
  }

  function ribbon(ctx, x, y, ex, ey, t, ph) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + ex) / 2, y + Math.sin(t * 8 + ph) * 6, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#e04848';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  function drawHead(ctx, st) {
    const g = st.gait;
    const t = st.t;
    ctx.save();
    ctx.translate(2, -58);
    ctx.rotate(-st.lookUp * 0.3 + Math.sin(t * 2.2) * 0.02);
    seg(ctx, 0, 6, 1, -6, 9, C.skin);
    const hx = 4;
    const hy = -24;
    // 发带飘带（在头后）
    ribbon(ctx, hx - 16, hy - 24, hx - 44 - g * 16, hy - 6 + Math.sin(t * 7) * 5, t, 0);
    ribbon(ctx, hx - 15, hy - 22, hx - 40 - g * 12, hy + 2 + Math.sin(t * 7 + 1) * 5, t, 1.4);
    bun(ctx, hx - 15, hy - 24, 11);
    // 后脑发型
    ctx.beginPath();
    ctx.ellipse(hx - 5, hy - 1, 21, 22, 0, 0, Math.PI * 2);
    fillStroke(ctx, C.hair);
    // 脸
    ctx.beginPath();
    ctx.ellipse(hx + 5, hy + 2, 19.5, 20.5, 0, 0, Math.PI * 2);
    fillStroke(ctx, C.skin);
    // 刘海
    ctx.beginPath();
    ctx.moveTo(hx - 19, hy + 6);
    ctx.quadraticCurveTo(hx - 20, hy - 24, hx + 6, hy - 22);
    ctx.quadraticCurveTo(hx + 23, hy - 19, hx + 25, hy - 5);
    ctx.lineTo(hx + 21, hy - 8);
    ctx.lineTo(hx + 18, hy - 3);
    ctx.lineTo(hx + 14, hy - 9);
    ctx.lineTo(hx + 9, hy - 5);
    ctx.lineTo(hx + 5, hy - 11);
    ctx.quadraticCurveTo(hx - 4, hy - 9, hx - 7, hy + 6);
    ctx.closePath();
    fillStroke(ctx, C.hair);
    ctx.strokeStyle = C.hairHi;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hx + 1, hy - 4, 15, -2.3, -1.2);
    ctx.stroke();
    // 五官
    const ly = -st.lookUp * 3;
    ctx.fillStyle = '#26181a';
    ctx.beginPath();
    ctx.ellipse(hx + 14, hy + 3 + ly, 3.2, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx + 15, hy + 1.2 + ly, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.hair;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(hx + 14, hy - 2 + ly, 5, -2.3, -0.9);
    ctx.stroke();
    ctx.fillStyle = C.blush;
    ctx.beginPath();
    ctx.ellipse(hx + 10, hy + 11, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx + 24, hy + 5);
    ctx.lineTo(hx + 25, hy + 8);
    ctx.stroke();
    ctx.fillStyle = '#b8484a';
    ctx.beginPath();
    ctx.moveTo(hx + 15, hy + 13);
    ctx.quadraticCurveTo(hx + 19, hy + 13.5, hx + 22, hy + 12);
    ctx.quadraticCurveTo(hx + 19, hy + 19, hx + 15, hy + 13);
    ctx.fill();
    // 前髻 + 花饰
    bun(ctx, hx + 10, hy - 26, 10);
    ctx.fillStyle = '#e04848';
    ctx.fillRect(hx + 2, hy - 20, 16, 4);
    ctx.fillStyle = '#ffb3c4';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(hx + 16 + Math.cos(a) * 3, hy - 31 + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe07a';
    ctx.beginPath();
    ctx.arc(hx + 16, hy - 31, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // st: { x, y, phase, gait, t, lookUp, wave, scale }
  function drawRig(ctx, st) {
    const phi = st.phase;
    const g = st.gait;
    const t = st.t;
    const N = legFK(phi, g);
    const F = legFK(phi + Math.PI, g);
    const hop = st.wave * Math.abs(Math.sin(t * 5)) * 7;
    const hipY = -(Math.max(N.ay, F.ay) + 7) - hop;
    const lean = g * 0.16 - st.lookUp * 0.05;
    // 手臂：跑动时与对侧腿反向摆动；结尾近侧手臂前伸、小臂摆动向鼓楼挥手（不遮挡脸）
    const nearS = KV.lerp(0.1 - g * 0.85 * Math.sin(phi), 1.5, st.wave);
    const nearE = KV.lerp(0.35 + g * 0.9, 0.6 + 0.35 * Math.sin(t * 9), st.wave);
    const farS = 0.1 - g * 0.85 * Math.sin(phi + Math.PI) - st.lookUp * 0.2 - st.wave * 0.3;
    const farE = 0.35 + g * 0.9;

    ctx.save();
    ctx.translate(0, hipY);
    ctx.save();
    ctx.rotate(lean);
    drawArm(ctx, farS, farE, true);
    ctx.restore();
    drawLeg(ctx, F, true);
    drawLeg(ctx, N, false);
    ctx.save();
    ctx.rotate(lean);
    drawSash(ctx, g, t);
    ctx.restore();
    drawSkirt(ctx, N, F, g, t);
    ctx.save();
    ctx.rotate(lean);
    drawTorso(ctx);
    drawHead(ctx, st);
    drawArm(ctx, nearS, nearE, false);
    ctx.restore();
    ctx.restore();
  }

  // 离屏绘制后做边缘光与柔光，再合成到主画面
  const OFF = 420;
  let off = null;
  KV.drawGirl = function (ctx, st) {
    if (!off) off = KV.canvas(OFF, OFF);
    const o = off.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, OFF, OFF);
    o.translate(OFF / 2, OFF - 40);
    o.scale(st.scale, st.scale);
    drawRig(o, st);
    o.setTransform(1, 0, 0, 1, 0, 0);
    // 背光边缘：来自身后灯火的暖色轮廓光
    o.globalCompositeOperation = 'source-atop';
    const rim = o.createLinearGradient(OFF / 2 - 60, 0, OFF / 2 + 30, 0);
    rim.addColorStop(0, 'rgba(255,170,90,0.42)');
    rim.addColorStop(1, 'rgba(255,170,90,0)');
    o.fillStyle = rim;
    o.fillRect(0, 0, OFF, OFF);
    const low = o.createLinearGradient(0, OFF - 140, 0, OFF - 40);
    low.addColorStop(0, 'rgba(40,30,80,0)');
    low.addColorStop(1, 'rgba(40,30,80,0.28)');
    o.fillStyle = low;
    o.fillRect(0, 0, OFF, OFF);
    if (st.tint > 0) {
      o.fillStyle = `rgba(255,200,150,${0.18 * st.tint})`;
      o.fillRect(0, 0, OFF, OFF);
    }
    o.globalCompositeOperation = 'source-over';

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

    const dx = st.x - OFF / 2;
    const dy = st.y - (OFF - 40);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    ctx.filter = 'blur(8px)';
    ctx.drawImage(off, dx, dy);
    ctx.restore();
    ctx.drawImage(off, dx, dy);
  };
})();
