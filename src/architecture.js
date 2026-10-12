// 明代建筑与道具的程序化绘制：屋顶、铺面、城门、鼓楼、石拱桥、柳树、兵器架、铁花棚
(function () {
  const KV = window.KV;
  const A = (KV.arch = {});

  // 翘角坡屋顶。y = 檐口线，w = 檐口跨度，h = 屋顶高度
  A.roofPath = function (ctx, cx, y, w, h, o) {
    const half = w / 2;
    const rh = half * (o.ridge || 0.62);
    const tip = o.tip != null ? o.tip : Math.min(22, h * 0.3);
    ctx.beginPath();
    ctx.moveTo(cx - half - 4, y - tip);
    ctx.quadraticCurveTo(cx - half + w * 0.08, y + 5, cx - half + w * 0.2, y + 3);
    ctx.lineTo(cx + half - w * 0.2, y + 3);
    ctx.quadraticCurveTo(cx + half - w * 0.08, y + 5, cx + half + 4, y - tip);
    ctx.quadraticCurveTo(cx + rh + 4, y - h * 0.3, cx + rh, y - h);
    ctx.lineTo(cx - rh, y - h);
    ctx.quadraticCurveTo(cx - rh - 4, y - h * 0.3, cx - half - 4, y - tip);
    ctx.closePath();
    return { half, rh, tip };
  };

  // 沿檐口曲线等距取点（用于瓦当）
  A.eavePoints = function (cx, y, w, tip, step) {
    step = step || 9;
    const half = w / 2;
    const q = (p0, p1, p2, t) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    const raw = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      raw.push([q(cx - half - 4, cx - half + w * 0.08, cx - half + w * 0.2, t), q(y - tip, y + 5, y + 3, t)]);
    }
    for (let x = cx - half + w * 0.2; x <= cx + half - w * 0.2; x += 4) raw.push([x, y + 3]);
    for (let i = 20; i >= 0; i--) {
      const t = i / 20;
      raw.push([q(cx + half + 4, cx + half - w * 0.08, cx + half - w * 0.2, t), q(y - tip, y + 5, y + 3, t)]);
    }
    const out = [raw[0]];
    let acc = 0;
    for (let i = 1; i < raw.length; i++) {
      acc += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
      if (acc >= step) {
        out.push(raw[i]);
        acc = 0;
      }
    }
    return out;
  };

  A.roof = function (ctx, cx, y, w, h, o) {
    o = o || {};
    ctx.save();
    const { half, rh, tip } = A.roofPath(ctx, cx, y, w, h, o);
    if (o.color) {
      ctx.fillStyle = o.color;
    } else {
      const g = ctx.createLinearGradient(0, y - h, 0, y + 4);
      g.addColorStop(0, '#272a42');
      g.addColorStop(0.65, '#373852');
      g.addColorStop(1, '#5c4658');
      ctx.fillStyle = g;
    }
    ctx.fill();
    if (o.simple) {
      ctx.restore();
      return;
    }
    // 筒瓦瓦垄：暗槽 + 亮脊，表现圆筒瓦的体积
    ctx.clip();
    for (let x = cx - half - 12; x <= cx + half + 12; x += 9) {
      const k = (x - cx) / half;
      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.quadraticCurveTo(x - k * 4, y - h * 0.45, cx + k * rh, y - h);
      ctx.strokeStyle = 'rgba(10,10,26,0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 3.5, y + 6);
      ctx.quadraticCurveTo(x + 3.5 - k * 4, y - h * 0.45, cx + k * rh + 3.5 * (rh / half), y - h);
      ctx.strokeStyle = 'rgba(150,150,190,0.28)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    // 屋面上的水彩斑驳
    const hr = KV.rng(Math.floor(cx * 7 + y));
    for (let i = 0; i < 5; i++) {
      const px = cx + (hr() - 0.5) * w * 0.8;
      const py = y - hr() * h;
      KV.glow(ctx, px, py, 20 + hr() * 40, hr() < 0.5 ? '120,110,160' : '20,15,40', 0.18);
    }
    // 檐下暖光
    const ug = ctx.createLinearGradient(0, y - 18, 0, y + 5);
    ug.addColorStop(0, 'rgba(255,170,100,0)');
    ug.addColorStop(1, 'rgba(255,170,100,0.35)');
    ctx.fillStyle = ug;
    ctx.fillRect(cx - half - 10, y - 18, w + 20, 24);
    ctx.restore();
    // 檐口瓦当：沿檐线排列的圆形瓦头
    const pts = A.eavePoints(cx, y, w, tip);
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      ctx.fillStyle = '#2c2c46';
      ctx.beginPath();
      ctx.arc(px, py + 1.5, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,190,130,0.55)';
      ctx.beginPath();
      ctx.arc(px, py + 2.4, 2, 0, Math.PI);
      ctx.fill();
    }
    // 正脊与鸱吻
    ctx.fillStyle = o.ridgeColor || '#1d1d31';
    ctx.fillRect(cx - rh - 6, y - h - 7, 2 * rh + 12, 9);
    ctx.fillStyle = 'rgba(160,150,200,0.35)';
    ctx.fillRect(cx - rh - 6, y - h - 7, 2 * rh + 12, 2);
    for (const s of [-1, 1]) {
      const ex = cx + s * (rh + 6);
      ctx.beginPath();
      ctx.moveTo(ex, y - h - 7);
      ctx.quadraticCurveTo(ex + s * 9, y - h - 10, ex + s * 7, y - h - 24);
      ctx.quadraticCurveTo(ex - s * 2, y - h - 15, ex - s * 5, y - h + 2);
      ctx.closePath();
      ctx.fill();
    }
    // 檐口轮廓光
    ctx.strokeStyle = o.eaveLight || 'rgba(255,186,115,0.6)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - half - 4, y - tip);
    ctx.quadraticCurveTo(cx - half + w * 0.08, y + 5, cx - half + w * 0.2, y + 3);
    ctx.lineTo(cx + half - w * 0.2, y + 3);
    ctx.quadraticCurveTo(cx + half - w * 0.08, y + 5, cx + half + 4, y - tip);
    ctx.stroke();
  };

  A.bricks = function (ctx, x, y, w, h, bw, bh, color) {
    ctx.save();
    ctx.strokeStyle = color || 'rgba(20,10,20,0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let row = 0;
    for (let yy = y; yy < y + h; yy += bh, row++) {
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      const off = row % 2 ? bw / 2 : 0;
      for (let xx = x + off; xx < x + w; xx += bw) {
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, Math.min(yy + bh, y + h));
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  A.column = function (ctx, x, top, bottom, w, color) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    const c = color || ['#5e1d17', '#a8392b', '#4a1712'];
    g.addColorStop(0, c[0]);
    g.addColorStop(0.45, c[1]);
    g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    ctx.fillRect(x, top, w, bottom - top);
  };

  // 发光格窗
  A.lattice = function (ctx, x, y, w, h, warm) {
    const g = ctx.createRadialGradient(x + w / 2, y + h * 0.6, 2, x + w / 2, y + h * 0.6, Math.max(w, h) * 0.8);
    g.addColorStop(0, warm ? '#ffe2a6' : '#f0c890');
    g.addColorStop(1, warm ? '#e08a45' : '#9a6a52');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // 窗棂：方格内再套小方框（灯笼锦）
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const s = 15;
    const nx = Math.max(1, Math.round(w / s));
    const ny = Math.max(1, Math.round(h / s));
    const cw = w / nx;
    const ch = h / ny;
    ctx.strokeStyle = 'rgba(70,32,20,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < nx; i++) {
      ctx.moveTo(x + i * cw, y);
      ctx.lineTo(x + i * cw, y + h);
    }
    for (let j = 1; j < ny; j++) {
      ctx.moveTo(x, y + j * ch);
      ctx.lineTo(x + w, y + j * ch);
    }
    ctx.stroke();
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) ctx.rect(x + i * cw + 4, y + j * ch + 4, cw - 8, ch - 8);
    ctx.stroke();
    // 窗纸上的人影/盆景剪影，偶尔出现
    if (warm && (Math.floor(x * 13 + y) % 5 === 0)) {
      ctx.fillStyle = 'rgba(120,60,40,0.35)';
      ctx.beginPath();
      ctx.arc(x + w * 0.4, y + h * 0.5, Math.min(w, h) * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + w * 0.4 - Math.min(w, h) * 0.18, y + h * 0.6, Math.min(w, h) * 0.36, h * 0.4);
    }
    ctx.restore();
    ctx.strokeStyle = '#3a1c14';
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,200,140,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  };

  // 彩画额枋：青绿底 + 两端旋子花 + 中间枋心
  A.paintedBeam = function (ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#3f7c80');
    g.addColorStop(1, '#25505a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#d9b25a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    const r = h * 0.36;
    for (const cx of [x + h * 0.8, x + w - h * 0.8]) {
      ctx.fillStyle = '#2b4c86';
      ctx.beginPath();
      ctx.arc(cx, y + h / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8c56a';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r * 0.62, y + h / 2 + Math.sin(a) * r * 0.62, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (w > h * 5) {
      const mx = x + h * 1.8;
      const mw = w - h * 3.6;
      ctx.fillStyle = '#4f8f86';
      ctx.beginPath();
      ctx.moveTo(mx, y + h / 2);
      ctx.lineTo(mx + h * 0.4, y + 2.5);
      ctx.lineTo(mx + mw - h * 0.4, y + 2.5);
      ctx.lineTo(mx + mw, y + h / 2);
      ctx.lineTo(mx + mw - h * 0.4, y + h - 2.5);
      ctx.lineTo(mx + h * 0.4, y + h - 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };

  // 斗拱：檐下一排小斗与拱臂
  A.brackets = function (ctx, x0, x1, y, h) {
    ctx.fillStyle = 'rgba(15,10,25,0.55)';
    ctx.fillRect(x0, y, x1 - x0, h);
    for (let x = x0 + 10; x < x1 - 8; x += 24) {
      ctx.fillStyle = '#8f3026';
      ctx.beginPath();
      ctx.moveTo(x - 10, y + h * 0.45);
      ctx.quadraticCurveTo(x - 10, y + h * 0.85, x - 6, y + h * 0.85);
      ctx.lineTo(x + 6, y + h * 0.85);
      ctx.quadraticCurveTo(x + 10, y + h * 0.85, x + 10, y + h * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3d7570';
      ctx.fillRect(x - 4, y + h * 0.1, 8, h * 0.38);
      ctx.fillRect(x - 3, y + h * 0.82, 6, h * 0.18);
      ctx.fillStyle = 'rgba(255,200,120,0.5)';
      ctx.fillRect(x - 10, y + h * 0.45, 20, 1);
    }
  };

  // 柱础
  A.columnBase = function (ctx, cx, base, w) {
    ctx.fillStyle = '#8a7a74';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.8, base);
    ctx.quadraticCurveTo(cx - w * 0.9, base - 9, cx - w * 0.55, base - 10);
    ctx.lineTo(cx + w * 0.55, base - 10);
    ctx.quadraticCurveTo(cx + w * 0.9, base - 9, cx + w * 0.8, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,210,160,0.35)';
    ctx.fillRect(cx - w * 0.55, base - 10, w * 1.1, 2);
  };

  // 墙面水彩肌理
  A.plaster = function (ctx, x, y, w, h, seed) {
    const r = KV.rng(seed);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let i = 0; i < Math.ceil((w * h) / 9000); i++) {
      const px = x + r() * w;
      const py = y + r() * h;
      KV.glow(ctx, px, py, 20 + r() * 50, r() < 0.55 ? '60,30,40' : '255,220,170', 0.12 + r() * 0.08);
    }
    ctx.restore();
  };

  // 牌匾
  A.plaque = function (ctx, cx, cy, w, h, text) {
    ctx.fillStyle = '#1b2042';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = '#c9a24a';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - w / 2 + 4, cy - h / 2 + 4, w - 8, h - 8);
    ctx.fillStyle = '#f1cf72';
    ctx.font = `bold ${Math.floor(h * 0.56)}px ${KV.FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 1);
  };

  // 幌子：从立面伸出的挑杆与布幡
  A.banner = function (ctx, x, y, dir, text, color) {
    ctx.strokeStyle = '#3a2216';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dir * 62, y - 4);
    ctx.stroke();
    const cx = x + dir * 48;
    const top = y;
    const w = 40;
    const h = 118;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, top);
    ctx.lineTo(cx + w / 2, top);
    ctx.lineTo(cx + w / 2, top + h);
    ctx.lineTo(cx, top + h - 14);
    ctx.lineTo(cx - w / 2, top + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,180,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2 + 4, top + 4, w - 8, h - 24);
    ctx.fillStyle = '#fff3d6';
    ctx.font = `bold 30px ${KV.FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, top + 46);
  };

  // 柜台上的小货品
  A.goods = function (ctx, x, w, y, r) {
    const cols = ['#c8553d', '#e8b04a', '#5d8a7a', '#9a5b8a', '#d98a5b', '#e7d7b0'];
    let xx = x + 8;
    while (xx < x + w - 20) {
      const c = cols[Math.floor(r() * cols.length)];
      const t = r();
      ctx.fillStyle = c;
      if (t < 0.4) {
        const rw = 9 + r() * 7;
        ctx.beginPath();
        ctx.ellipse(xx + rw, y - rw, rw, rw * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
        xx += rw * 2 + 4;
      } else if (t < 0.75) {
        const bw = 16 + r() * 18;
        const bh = 10 + r() * 22;
        ctx.fillRect(xx, y - bh, bw, bh);
        ctx.fillStyle = 'rgba(255,240,200,0.3)';
        ctx.fillRect(xx, y - bh, bw, 3);
        xx += bw + 4;
      } else {
        // 糖人/风车之类的小串
        ctx.strokeStyle = '#7a4a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xx + 4, y);
        ctx.lineTo(xx + 4, y - 40);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(xx + 4, y - 44, 8, 0, Math.PI * 2);
        ctx.fill();
        xx += 16;
      }
    }
  };

  // 掌柜剪影
  A.person = function (ctx, x, y, s, col) {
    ctx.fillStyle = col || 'rgba(60,30,30,0.85)';
    ctx.beginPath();
    ctx.arc(x, y - 52 * s, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 20 * s, y);
    ctx.quadraticCurveTo(x - 18 * s, y - 38 * s, x, y - 40 * s);
    ctx.quadraticCurveTo(x + 18 * s, y - 38 * s, x + 20 * s, y);
    ctx.closePath();
    ctx.fill();
  };

  // 铺面立面（不含屋顶，屋顶统一后画以便互相搭接）
  A.shopFacade = function (ctx, s, r) {
    const base = KV.STREET_TOP;
    const { x, w, wallTop, two, doorTop } = s;
    const wg = ctx.createLinearGradient(0, wallTop, 0, base);
    wg.addColorStop(0, '#463a52');
    wg.addColorStop(0.55, '#8c6658');
    wg.addColorStop(1, '#c58f62');
    ctx.fillStyle = wg;
    ctx.fillRect(x, wallTop, w, base - wallTop);
    A.plaster(ctx, x, wallTop, w, base - wallTop, Math.floor(x));
    // 底层敞开铺面：室内暖光
    const ig = ctx.createLinearGradient(0, doorTop, 0, base);
    ig.addColorStop(0, s.blacksmith ? '#ff8a3a' : '#ffcc7a');
    ig.addColorStop(1, s.blacksmith ? '#7a2a14' : '#a5522c');
    ctx.fillStyle = ig;
    ctx.fillRect(x + 14, doorTop, w - 28, base - doorTop);
    if (s.blacksmith) {
      // 炉火与铁砧
      KV.glow(ctx, x + w * 0.3, base - 50, 110, '255,120,40', 0.55);
      ctx.fillStyle = '#2a1a18';
      ctx.fillRect(x + w * 0.55, base - 46, 54, 16);
      ctx.fillRect(x + w * 0.55 + 18, base - 32, 18, 32);
      A.person(ctx, x + w * 0.72, base - 4, 1.15, 'rgba(40,18,14,0.9)');
    } else {
      if (r() < 0.6) A.person(ctx, x + w * (0.3 + r() * 0.4), base - 32, 0.95);
      // 柜台
      ctx.fillStyle = '#4a2a1c';
      ctx.fillRect(x + 14, base - 40, w - 28, 40);
      ctx.fillStyle = 'rgba(255,200,140,0.35)';
      ctx.fillRect(x + 14, base - 40, w - 28, 3);
      A.goods(ctx, x + 16, w - 32, base - 40, r);
    }
    // 门帘（半幅布帘，带波浪下摆）
    ctx.fillStyle = s.bannerColor || '#3b3f7a';
    ctx.beginPath();
    ctx.moveTo(x + 14, doorTop);
    ctx.lineTo(x + w - 14, doorTop);
    ctx.lineTo(x + w - 14, doorTop + 24);
    for (let xx = x + w - 14; xx > x + 14; xx -= 18) ctx.quadraticCurveTo(xx - 9, doorTop + 32, Math.max(x + 14, xx - 18), doorTop + 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,190,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 14, doorTop + 6);
    ctx.lineTo(x + w - 14, doorTop + 6);
    ctx.stroke();
    // 门额：彩画额枋
    A.paintedBeam(ctx, x, doorTop - 16, w, 16);
    // 檐下斗拱
    A.brackets(ctx, x, x + w, wallTop + 2, 16);
    // 立柱 + 柱础
    A.column(ctx, x + 2, wallTop, base, 12);
    A.column(ctx, x + w - 14, wallTop, base, 12);
    A.columnBase(ctx, x + 8, base, 10);
    A.columnBase(ctx, x + w - 8, base, 10);
    if (two) {
      // 二层格窗
      const wy = wallTop + 26;
      const wh = doorTop - 70 - wy;
      const n = w > 300 ? 3 : 2;
      const ww = (w - 40 - (n - 1) * 14) / n;
      for (let i = 0; i < n; i++) A.lattice(ctx, x + 20 + i * (ww + 14), wy, ww, wh, r() < 0.7);
      // 腰檐
      A.roof(ctx, x + w / 2, doorTop - 30, w + 26, 30, { tip: 8, ridge: 0.9 });
    } else {
      const wy = wallTop + 24;
      const wh = doorTop - 34 - wy;
      if (wh > 24) {
        A.lattice(ctx, x + 22, wy, w * 0.22, wh, true);
        A.lattice(ctx, x + w - 22 - w * 0.22, wy, w * 0.22, wh, true);
      }
    }
    A.plaque(ctx, x + w / 2, doorTop - (two ? 8 : 28), Math.min(w * 0.42, 128), two ? 30 : 34, s.name);
  };

  // 城门（瓮城门楼）
  A.gate = function (ctx) {
    const base = 900;
    const top = 390;
    ctx.beginPath();
    ctx.moveTo(-80, base);
    ctx.lineTo(900, base);
    ctx.lineTo(872, top);
    ctx.lineTo(-80, top);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, '#3e3248');
    g.addColorStop(1, '#6e5048');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    A.bricks(ctx, -80, top, 990, base - top, 46, 20, 'rgba(20,10,25,0.3)');
    ctx.restore();
    // 门洞
    ctx.beginPath();
    ctx.moveTo(300, base);
    ctx.lineTo(300, 650);
    ctx.arc(430, 650, 130, Math.PI, 0);
    ctx.lineTo(560, base);
    ctx.closePath();
    const ag = ctx.createLinearGradient(0, 520, 0, base);
    ag.addColorStop(0, '#0b1028');
    ag.addColorStop(1, '#22213e');
    ctx.fillStyle = ag;
    ctx.fill();
    ctx.strokeStyle = '#8a7068';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(293, base);
    ctx.lineTo(293, 650);
    ctx.arc(430, 650, 137, Math.PI, 0);
    ctx.lineTo(567, base);
    ctx.stroke();
    // 垛口
    ctx.fillStyle = '#3a2e44';
    for (let x = -80; x < 872; x += 44) ctx.fillRect(x, top - 26, 26, 28);
    A.plaque(ctx, 430, 468, 168, 56, '长乐门');
    // 门楼一层
    ctx.fillStyle = '#5a3a3a';
    ctx.fillRect(90, top - 30, 680, 30);
    for (let x = 120; x <= 740; x += 77.5) A.column(ctx, x - 7, 262, top - 28, 14);
    for (let x = 127; x < 733; x += 77.5) A.lattice(ctx, x + 6, 282, 63, 70, true);
    A.roof(ctx, 430, 270, 840, 82, { tip: 22 });
    // 门楼二层
    ctx.fillStyle = '#4a2e2e';
    ctx.fillRect(210, 150, 440, 42);
    for (let x = 220; x <= 640; x += 70) A.column(ctx, x - 6, 140, 192, 12);
    for (let x = 226; x < 634; x += 70) A.lattice(ctx, x + 6, 150, 52, 34, true);
    A.roof(ctx, 430, 142, 620, 110, { tip: 26 });
  };

  // 鼓楼
  A.drumTower = function (ctx, cx) {
    const base = 900;
    const top = 610;
    ctx.beginPath();
    ctx.moveTo(cx - 430, base);
    ctx.lineTo(cx + 430, base);
    ctx.lineTo(cx + 400, top);
    ctx.lineTo(cx - 400, top);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, '#5a4054');
    g.addColorStop(1, '#7c5850');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    A.bricks(ctx, cx - 440, top, 880, base - top, 44, 19, 'rgba(25,10,25,0.3)');
    ctx.restore();
    // 券洞：透出城那头的灯火
    ctx.beginPath();
    ctx.moveTo(cx - 82, base);
    ctx.lineTo(cx - 82, 765);
    ctx.arc(cx, 765, 82, Math.PI, 0);
    ctx.lineTo(cx + 82, base);
    ctx.closePath();
    const ag = ctx.createLinearGradient(0, 683, 0, base);
    ag.addColorStop(0, '#ffcf86');
    ag.addColorStop(1, '#a24e2c');
    ctx.fillStyle = ag;
    ctx.fill();
    // 平座栏杆
    ctx.fillStyle = '#4a2e30';
    ctx.fillRect(cx - 405, top - 22, 810, 22);
    ctx.strokeStyle = 'rgba(255,200,140,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 405, top - 22, 810, 22);
    // 一层殿身
    for (let i = 0; i < 10; i++) A.lattice(ctx, cx - 335 + i * 68 + 8, 490, 52, 96, true);
    for (let i = 0; i <= 10; i++) A.column(ctx, cx - 340 + i * 68 - 7, 470, top - 22, 14);
    A.roof(ctx, cx, 472, 880, 104, { tip: 26 });
    // 二层：大鼓
    ctx.fillStyle = '#3c2228';
    ctx.fillRect(cx - 250, 280, 500, 92);
    KV.glow(ctx, cx, 330, 160, '255,170,90', 0.45);
    ctx.fillStyle = '#9e2a24';
    ctx.beginPath();
    ctx.ellipse(cx, 330, 50, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2b44e';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#f4d48a';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 42, 330 + Math.sin(a) * 37, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i <= 8; i++) {
      if (i === 4) continue;
      A.column(ctx, cx - 240 + i * 60 - 6, 280, 372, 12);
    }
    ctx.fillStyle = '#4a2e30';
    ctx.fillRect(cx - 260, 360, 520, 14);
    A.plaque(ctx, cx, 404, 150, 48, '鼓 楼');
    A.roof(ctx, cx, 282, 680, 142, { tip: 30 });
  };

  // 石拱桥（桥身 + 后侧栏杆），在世界坐标下绘制
  A.bridgeBody = function (ctx) {
    const { x0, x1 } = KV.BRIDGE;
    const cx = (x0 + x1) / 2;
    const R = 175;
    const ay = 1015;
    // 后侧栏杆（略高、偏暗，表现纵深）
    A.railing(ctx, -14, 0.65);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, 1080);
    for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, KV.walkY(x) + 2);
    ctx.lineTo(x1, 1080);
    ctx.lineTo(cx + R, 1080);
    ctx.lineTo(cx + R, ay);
    ctx.arc(cx, ay, R, 0, Math.PI, true);
    ctx.lineTo(cx - R, 1080);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 800, 0, 1080);
    g.addColorStop(0, '#8a7676');
    g.addColorStop(1, '#3a3044');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    A.bricks(ctx, x0, 790, x1 - x0, 300, 52, 24, 'rgba(25,15,30,0.35)');
    ctx.restore();
    // 拱券
    ctx.strokeStyle = '#9c8780';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, ay, R + 9, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,25,35,0.6)';
    ctx.lineWidth = 2;
    for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += Math.PI / 14) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R, ay + Math.sin(a) * R);
      ctx.lineTo(cx + Math.cos(a) * (R + 18), ay + Math.sin(a) * (R + 18));
      ctx.stroke();
    }
    // 桥面边沿高光
    ctx.strokeStyle = 'rgba(255,200,150,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 10) ctx[x === x0 ? 'moveTo' : 'lineTo'](x, KV.walkY(x) + 3);
    ctx.stroke();
  };

  // 桥栏杆。dy：相对行走线偏移；shade：明暗
  A.railing = function (ctx, dy, shade) {
    const { x0, x1 } = KV.BRIDGE;
    const H = 46;
    const c = (v) => Math.round(v * shade);
    const stone = `rgb(${c(176)},${c(156)},${c(150)})`;
    const dark = `rgba(${c(60)},${c(40)},${c(50)},0.9)`;
    ctx.save();
    ctx.lineJoin = 'round';
    // 栏板
    ctx.beginPath();
    for (let x = x0 + 20; x <= x1 - 20; x += 8) ctx[x === x0 + 20 ? 'moveTo' : 'lineTo'](x, KV.walkY(x) + dy - H + 10);
    for (let x = x1 - 20; x >= x0 + 20; x -= 8) ctx.lineTo(x, KV.walkY(x) + dy - 6);
    ctx.closePath();
    ctx.fillStyle = `rgba(${c(150)},${c(128)},${c(126)},0.95)`;
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 扶手
    ctx.strokeStyle = stone;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let x = x0 + 20; x <= x1 - 20; x += 8) ctx[x === x0 + 20 ? 'moveTo' : 'lineTo'](x, KV.walkY(x) + dy - H + 6);
    ctx.stroke();
    // 望柱 + 栏板雕饰
    for (let x = x0 + 20; x <= x1 - 20; x += 64) {
      const y = KV.walkY(x) + dy;
      ctx.fillStyle = stone;
      ctx.fillRect(x - 6, y - H - 6, 12, H + 4);
      ctx.beginPath();
      ctx.arc(x, y - H - 9, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 6, y - H - 6, 12, H + 4);
      if (x + 64 <= x1 - 20) {
        const mx = x + 32;
        const my = KV.walkY(mx) + dy - H / 2 - 2;
        ctx.strokeStyle = `rgba(${c(255)},${c(220)},${c(190)},0.35)`;
        ctx.strokeRect(mx - 18, my - 9, 36, 18);
      }
    }
    ctx.restore();
  };

  // 柳树
  A.willow = function (ctx, x, base, h, r) {
    ctx.fillStyle = '#251a1c';
    ctx.beginPath();
    ctx.moveTo(x - 16, base);
    ctx.quadraticCurveTo(x - 4, base - h * 0.35, x + 8, base - h * 0.6);
    ctx.lineTo(x + 16, base - h * 0.58);
    ctx.quadraticCurveTo(x + 8, base - h * 0.3, x + 16, base);
    ctx.closePath();
    ctx.fill();
    const cy = base - h * 0.62;
    ctx.lineCap = 'round';
    for (let i = 0; i < 170; i++) {
      const a = r() * Math.PI;
      const sx = x + 8 + Math.cos(a) * h * 0.42 * (0.3 + r() * 0.7);
      const sy = cy - Math.sin(a) * h * 0.28 * (0.3 + r() * 0.7);
      const len = h * (0.25 + r() * 0.4);
      const lit = r() < 0.3;
      ctx.strokeStyle = lit ? `rgba(170,170,90,${0.5 + r() * 0.3})` : `rgba(${28 + r() * 20},${55 + r() * 25},${48 + r() * 15},0.85)`;
      ctx.lineWidth = 1.2 + r() * 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + (r() - 0.5) * 30, sy + len * 0.5, sx + (r() - 0.5) * 18, sy + len);
      ctx.stroke();
    }
  };

  // 兵器架：红缨枪 + 雁翎刀
  A.weaponRack = function (ctx, x0, x1, base) {
    const wood = '#4a2c1c';
    ctx.fillStyle = wood;
    ctx.fillRect(x0, base - 230, 12, 230);
    ctx.fillRect(x1 - 12, base - 230, 12, 230);
    ctx.fillRect(x0 - 6, base - 236, x1 - x0 + 12, 10);
    ctx.fillRect(x0, base - 70, x1 - x0, 9);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = x0 + 26 + (i * (x1 - x0 - 52)) / (n - 1);
      const lean = (i - 2) * 1.5;
      const top = base - 300 - (i % 2) * 14;
      ctx.strokeStyle = '#6a3f22';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, base - 6);
      ctx.lineTo(x + lean, top);
      ctx.stroke();
      // 枪头
      const hx = x + lean;
      const g = ctx.createLinearGradient(hx - 7, 0, hx + 7, 0);
      g.addColorStop(0, '#8a96a8');
      g.addColorStop(0.5, '#f4f7ff');
      g.addColorStop(1, '#6c7688');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(hx, top - 34);
      ctx.lineTo(hx + 7, top - 8);
      ctx.lineTo(hx, top);
      ctx.lineTo(hx - 7, top - 8);
      ctx.closePath();
      ctx.fill();
      // 红缨：细密的丝穗从金箍处垂下散开
      const tr = KV.rng(i * 17 + 5);
      ctx.lineCap = 'round';
      for (let k = 0; k < 26; k++) {
        const u = (k / 25 - 0.5) * 2;
        const len = 20 + tr() * 10 - Math.abs(u) * 5;
        const ex = hx + u * 9 + (tr() - 0.5) * 3;
        ctx.strokeStyle = ['#c8202c', '#e0343a', '#a3141f', '#f04a48'][k % 4];
        ctx.lineWidth = 0.9 + tr() * 0.6;
        ctx.beginPath();
        ctx.moveTo(hx + u * 2, top + 2);
        ctx.bezierCurveTo(hx + u * 6, top + 6, ex, top + len * 0.6, ex - 1.5, top + len);
        ctx.stroke();
      }
      ctx.fillStyle = '#d9b25a';
      ctx.fillRect(hx - 3.5, top - 1, 7, 4);
    }
    // 雁翎刀（斜靠）
    for (const [bx, by, ang] of [
      [x0 + 40, base - 64, -1.15],
      [x1 - 40, base - 64, -2.0],
    ]) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, -6, 0, 6);
      g.addColorStop(0, '#f2f5ff');
      g.addColorStop(1, '#7a8494');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(70, -8, 118, -2);
      ctx.lineTo(108, 6);
      ctx.quadraticCurveTo(60, 4, 0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(-6, -9, 6, 18);
      ctx.fillStyle = '#5a1a1a';
      ctx.fillRect(-36, -4, 30, 8);
      ctx.restore();
    }
  };

  // 打铁花表演场：矮墙 + 花棚 + 表演者剪影
  A.ironFlowerStage = function (ctx, x0, x1) {
    const base = KV.STREET_TOP;
    const wg = ctx.createLinearGradient(0, 780, 0, base);
    wg.addColorStop(0, '#5a4658');
    wg.addColorStop(1, '#a8785c');
    ctx.fillStyle = wg;
    ctx.fillRect(x0 - 60, 790, x1 - x0 + 120, base - 790);
    A.roof(ctx, (x0 + x1) / 2, 794, x1 - x0 + 140, 26, { tip: 6, ridge: 0.97 });
    // 花棚木架
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (const x of [x0, x0 + 110, x1 - 110, x1]) {
      ctx.moveTo(x, base);
      ctx.lineTo(x, 600);
    }
    ctx.moveTo(x0 - 10, 604);
    ctx.lineTo(x1 + 10, 604);
    ctx.moveTo(x0, 700);
    ctx.lineTo(x1, 700);
    ctx.moveTo(x0, 700);
    ctx.lineTo(x0 + 110, 604);
    ctx.moveTo(x1, 700);
    ctx.lineTo(x1 - 110, 604);
    ctx.stroke();
    // 松枝顶棚
    const r = KV.rng(808);
    for (let i = 0; i < 90; i++) {
      const x = x0 - 20 + r() * (x1 - x0 + 40);
      const y = 590 + r() * 22;
      ctx.fillStyle = r() < 0.25 ? 'rgba(130,140,80,0.8)' : `rgba(${25 + r() * 15},${50 + r() * 20},${40 + r() * 10},0.95)`;
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + r() * 12, 6 + r() * 5, (r() - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // 鞭炮串
    for (let x = x0 + 30; x < x1 - 20; x += 46) {
      ctx.strokeStyle = '#5a2a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 610);
      ctx.lineTo(x, 680);
      ctx.stroke();
      ctx.fillStyle = '#d12f2a';
      for (let y = 614; y < 680; y += 8) ctx.fillRect(x - 5, y, 10, 5);
    }
    // 表演者剪影（手持木棒）
    for (const [px, dir] of [
      [x0 + 95, 1],
      [x1 - 95, -1],
    ]) {
      ctx.fillStyle = '#1d1418';
      ctx.beginPath();
      ctx.arc(px, base - 128, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - 18, base);
      ctx.lineTo(px - 14, base - 112);
      ctx.quadraticCurveTo(px, base - 120, px + 14, base - 112);
      ctx.lineTo(px + 18, base);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1d1418';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(px + dir * 6, base - 100);
      ctx.lineTo(px + dir * 34, base - 150);
      ctx.stroke();
      ctx.strokeStyle = '#4a2c1c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px + dir * 30, base - 140);
      ctx.lineTo(px + dir * 60, base - 196);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,170,90,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, base - 128, 13, -Math.PI / 2 - dir * 0.2, Math.PI / 2 - dir * 0.2, dir < 0);
      ctx.stroke();
    }
  };

  // 远景「屋顶之海」：多排错落的坡屋顶、楼阁、宝塔和树冠，后排更淡（空气透视）
  A.roofSea = function (ctx, width, base, o, r) {
    for (let row = o.rows - 1; row >= 0; row--) {
      const b = base - row * o.rowGap;
      const f = row / Math.max(1, o.rows - 1);
      const wall = KV.mix(o.wall, o.haze, f * 0.55);
      const roof = KV.mix(o.roof, o.haze, f * 0.5);
      const light = 0.9 - f * 0.45;
      let x = -80 + r() * 60;
      while (x < width + 80) {
        const w = o.wMin + r() * (o.wMax - o.wMin);
        const kind = r();
        if (kind < o.tree) {
          // 树冠
          ctx.fillStyle = KV.mix(o.treeCol, o.haze, f * 0.5);
          const tr = w * 0.32;
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(x + w * 0.2 + r() * w * 0.6, b - o.wallMax * 0.6 - r() * tr * 0.8, tr * (0.5 + r() * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillRect(x + w * 0.2, b - o.wallMax * 0.6, w * 0.6, o.wallMax * 0.6 + 60);
          x += w * 0.6;
          continue;
        }
        const h = o.wallMin + r() * (o.wallMax - o.wallMin);
        const top = b - h;
        ctx.fillStyle = wall;
        ctx.fillRect(x, top, w, h + 80);
        // 檐下一排窗光 / 门光
        if (r() < o.windows) {
          const n = Math.max(1, Math.floor(w / 26));
          for (let i = 0; i < n; i++) {
            if (r() < 0.35) continue;
            ctx.fillStyle = `rgba(255,${175 + r() * 45},${95 + r() * 40},${light * (0.6 + r() * 0.4)})`;
            ctx.fillRect(x + 8 + i * ((w - 16) / n), top + h * 0.22, (w - 16) / n - 6, h * 0.36);
          }
        }
        let rt = top;
        A.roof(ctx, x + w / 2, rt + 3, w + o.over, o.roofH, { simple: true, color: roof, tip: o.roofH * 0.3 });
        // 楼阁：再叠一到两层
        if (kind > 1 - o.tower) {
          const levels = 1 + Math.floor(r() * 2);
          let lw = w * 0.7;
          for (let k = 0; k < levels; k++) {
            const lh = o.wallMin * 0.8;
            rt = rt - o.roofH * 0.7 - lh + 6;
            ctx.fillStyle = wall;
            ctx.fillRect(x + w / 2 - lw * 0.4, rt, lw * 0.8, lh + o.roofH * 0.7);
            ctx.fillStyle = `rgba(255,190,110,${light * 0.85})`;
            ctx.fillRect(x + w / 2 - lw * 0.3, rt + lh * 0.25, lw * 0.6, lh * 0.4);
            A.roof(ctx, x + w / 2, rt + 3, lw + o.over * 0.7, o.roofH * 0.9, { simple: true, color: roof, tip: o.roofH * 0.3 });
            lw *= 0.78;
          }
        } else if (kind > 1 - o.tower - o.pagoda) {
          // 宝塔
          let py = rt - o.roofH * 0.6;
          let pw = w * 0.42;
          for (let k = 0; k < 6; k++) {
            const lh = o.roofH * 0.75;
            ctx.fillStyle = wall;
            ctx.fillRect(x + w / 2 - pw * 0.3, py - lh, pw * 0.6, lh + 4);
            ctx.fillStyle = `rgba(255,190,110,${light * 0.85})`;
            ctx.fillRect(x + w / 2 - 2.5, py - lh * 0.7, 5, lh * 0.35);
            A.roof(ctx, x + w / 2, py - lh + 3, pw + 10, o.roofH * 0.45, { simple: true, color: roof, tip: o.roofH * 0.2 });
            py -= lh + o.roofH * 0.25;
            pw *= 0.88;
          }
        }
        // 屋檐下的小灯笼
        if (r() < o.lanterns) {
          for (const fx of [0.2, 0.8]) {
            const lx = x + w * fx;
            const ly = top + 10;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            KV.glow(ctx, lx, ly, o.roofH * 0.7, '255,140,60', 0.45 * light);
            ctx.restore();
            ctx.fillStyle = `rgba(230,70,40,${light})`;
            ctx.beginPath();
            ctx.ellipse(lx, ly, o.roofH * 0.1, o.roofH * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        x += w * (0.72 + r() * 0.25);
      }
    }
  };

  // 远景天际线（简化屋顶剪影）
  A.skyline = function (ctx, width, base, o, r) {
    let x = -60;
    while (x < width + 60) {
      const w = o.wMin + r() * (o.wMax - o.wMin);
      const h = o.hMin + r() * (o.hMax - o.hMin);
      const top = base - h;
      ctx.fillStyle = o.wall;
      ctx.fillRect(x, top, w, h + 200);
      if (o.windows) {
        const rows = Math.floor(h / 40);
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < Math.floor(w / 26); i++) {
            if (r() < o.windows) {
              ctx.fillStyle = `rgba(255,${170 + r() * 50},${90 + r() * 40},${0.55 + r() * 0.4})`;
              ctx.fillRect(x + 8 + i * 26, top + 16 + j * 40, o.winW || 9, o.winH || 12);
            }
          }
        }
      }
      A.roof(ctx, x + w / 2, top + 3, w + o.over, Math.min(h * 0.5, o.roofH), { simple: true, color: o.roof, tip: o.roofH * 0.22 });
      if (r() < o.tower) {
        // 楼阁/塔
        const tw = w * 0.55;
        const tcx = x + w / 2;
        let ty = top - o.roofH * 0.6;
        const levels = 2 + Math.floor(r() * 3);
        for (let k = 0; k < levels; k++) {
          const lw = tw * (1 - k * 0.14);
          ctx.fillStyle = o.wall;
          ctx.fillRect(tcx - lw * 0.38, ty - o.roofH * 0.9, lw * 0.76, o.roofH * 0.9 + 4);
          if (o.windows) {
            ctx.fillStyle = 'rgba(255,190,110,0.8)';
            ctx.fillRect(tcx - lw * 0.2, ty - o.roofH * 0.6, lw * 0.4, o.roofH * 0.28);
          }
          A.roof(ctx, tcx, ty - o.roofH * 0.9 + 3, lw + o.over * 0.6, o.roofH * 0.55, { simple: true, color: o.roof, tip: o.roofH * 0.25 });
          ty -= o.roofH * 1.3;
        }
      }
      x += w * (0.75 + r() * 0.3);
    }
  };
})();
