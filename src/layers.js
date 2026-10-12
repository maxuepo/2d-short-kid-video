// 预渲染各视差图层，并生成灯笼等动态元素清单
(function () {
  const KV = window.KV;
  const A = KV.arch;
  const W = KV.W;
  const H = KV.H;

  const SHOP_TYPES = [
    ['茶馆', '茶', '#2f5d7a'],
    ['酒肆', '酒', '#8a2a2a'],
    ['面铺', '面', '#3b3f7a'],
    ['糖人', '糖', '#6a3460'],
    ['药铺', '药', '#3f6b4f'],
    ['布庄', '布', '#2f5d7a'],
    ['花灯', '灯', '#9a2b2b'],
    ['书坊', '书', '#3b3f7a'],
    ['点心', '饼', '#7a4a2a'],
    ['客栈', '栈', '#3f6b4f'],
  ];

  function layoutShops() {
    const r = KV.rng(2024);
    const shops = [];
    const segs = [
      [960, 2250],
      [2600, 3120],
      [4240, 4500],
      [4920, 6160],
    ];
    let k = 0;
    const make = (x, w, extra) => {
      const two = extra && extra.two != null ? extra.two : r() < 0.55;
      const wallTop = KV.STREET_TOP - (two ? 320 + r() * 60 : 225 + r() * 35);
      const t = SHOP_TYPES[k++ % SHOP_TYPES.length];
      return Object.assign({ x, w, two, wallTop, doorTop: KV.STREET_TOP - 165, name: t[0], bannerText: t[1], bannerColor: t[2], banner: r() < 0.65 }, extra || {});
    };
    for (const [a, b] of segs) {
      let x = a;
      while (x < b - 170) {
        let w = 230 + r() * 150;
        if (b - (x + w) < 170) w = b - x;
        shops.push(make(x, w));
        x += w;
      }
    }
    shops.push(make(2250, 350, { blacksmith: true, two: true, name: '铁匠铺', bannerText: '铁', bannerColor: '#5a2a1a', banner: true }));
    shops.sort((a, b) => a.x - b.x);
    return shops;
  }

  function buildLanterns(shops) {
    const r = KV.rng(99);
    const lanterns = [];
    const garlands = [];
    const add = (x, y, len, rad, kind) => lanterns.push({ x, y, len, r: rad, kind, seed: r() });
    shops.forEach((s, i) => {
      const eave = s.two ? s.doorTop - 30 : s.wallTop + 4;
      for (const f of [0.18, 0.82]) add(s.x + s.w * f, eave + 2, 26 + r() * 16, 15 + r() * 4, r() < 0.6 ? 'red' : 'amber');
      if (i % 2 === 0 && shops[i + 1] && Math.abs(shops[i + 1].x - (s.x + s.w)) < 5) {
        const n = shops[i + 1];
        const g = { x0: s.x + s.w * 0.35, y0: s.wallTop + 30, x1: n.x + n.w * 0.65, y1: n.wallTop + 30, sag: 70, items: [] };
        const cnt = 7;
        for (let j = 1; j < cnt; j++) {
          const u = j / cnt;
          const x = KV.lerp(g.x0, g.x1, u);
          const y = KV.lerp(g.y0, g.y1, u) + g.sag * 4 * u * (1 - u);
          g.items.push({ x, y, len: 10, r: 8 + r() * 2, kind: j % 2 ? 'red' : 'amber', seed: r(), small: true });
        }
        garlands.push(g);
      }
    });
    // 城门大红灯笼
    add(330, 560, 40, 28, 'big');
    add(530, 560, 40, 28, 'big');
    for (let x = 160; x <= 700; x += 135) add(x, 272, 30, 16, 'amber');
    // 鼓楼
    for (let x = 6675 - 380; x <= 6675 + 380; x += 95) add(x, 474, 36, 18, 'red');
    add(6675 - 150, 612, 50, 30, 'big');
    add(6675 + 150, 612, 50, 30, 'big');
    // 桥头与桥上
    for (const x of [3284, 3540, 3860, 4116]) add(x, KV.walkY(x) - 60, 22, 13, 'amber');
    // 打铁花场
    add(4540, 700, 30, 16, 'red');
    add(4880, 700, 30, 16, 'red');
    return { lanterns, garlands };
  }

  function street(ctx, shops) {
    const base = KV.STREET_TOP;
    const { x0: cx0, x1: cx1 } = KV.CANAL;
    // 青石板路
    const g = ctx.createLinearGradient(0, base, 0, H);
    g.addColorStop(0, '#6b5250');
    g.addColorStop(0.35, '#4e3c48');
    g.addColorStop(1, '#2a2235');
    ctx.fillStyle = g;
    ctx.fillRect(0, base, cx0, H - base);
    ctx.fillRect(cx1, base, KV.WORLD - cx1, H - base);
    const r = KV.rng(11);
    let y = base + 6;
    let h = 9;
    while (y < H) {
      let x = -r() * h * 2;
      while (x < KV.WORLD) {
        const w = h * (1.6 + r() * 1.5);
        if (!(x + w > cx0 && x < cx1)) {
          const l = 20 + r() * 13 - ((y - base) / 180) * 8;
          ctx.fillStyle = `hsl(${(250 + r() * 70) % 360},${10 + r() * 12}%,${l}%)`;
          ctx.beginPath();
          ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, h * 0.35);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,190,130,0.13)';
          ctx.fillRect(x + 3, y + 2, w - 6, 1.6);
        }
        x += w;
      }
      y += h;
      h *= 1.11;
    }
    // 街沿条石
    ctx.fillStyle = '#7d6560';
    ctx.fillRect(0, base - 6, cx0, 12);
    ctx.fillRect(cx1, base - 6, KV.WORLD - cx1, 12);
    // 运河水体
    const wg = ctx.createLinearGradient(0, 850, 0, H);
    wg.addColorStop(0, 'rgba(60,50,90,0)');
    wg.addColorStop(0.12, '#2a2c52');
    wg.addColorStop(0.5, '#1a1f40');
    wg.addColorStop(1, '#0c1028');
    ctx.fillStyle = wg;
    ctx.fillRect(cx0, 850, cx1 - cx0, H - 850);
    // 驳岸
    for (const [x, d] of [
      [cx0, 1],
      [cx1, -1],
    ]) {
      ctx.fillStyle = '#5a4a52';
      ctx.beginPath();
      ctx.moveTo(x, base - 6);
      ctx.lineTo(x + d * 16, base - 6);
      ctx.lineTo(x + d * 34, H);
      ctx.lineTo(x, H);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      A.bricks(ctx, x - 40, base - 6, 80, H - base + 6, 30, 16);
      ctx.restore();
    }
    // 城门
    A.gate(ctx);
    // 柳树
    const wr = KV.rng(5150);
    A.willow(ctx, 3175, base, 470, wr);
    A.willow(ctx, 4205, base, 430, wr);
    // 铺面：先立面后屋顶，屋顶相互搭接
    const sr = KV.rng(31);
    for (const s of shops) A.shopFacade(ctx, s, sr);
    for (const s of shops) A.roof(ctx, s.x + s.w / 2, s.wallTop + 4, s.w + 46, 74 + (s.w / 380) * 26);
    for (const s of shops) if (s.banner) A.banner(ctx, s.x + s.w - 8, s.doorTop - 10, 1, s.bannerText, s.bannerColor);
    A.weaponRack(ctx, 2440, 2590, base + 14);
    A.ironFlowerStage(ctx, 4560, 4860);
    A.drumTower(ctx, 6675);
  }

  function sky() {
    const c = KV.canvas(W, H);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080b26');
    g.addColorStop(0.35, '#1d1c4a');
    g.addColorStop(0.62, '#4a2f5c');
    g.addColorStop(0.82, '#a85a4a');
    g.addColorStop(1, '#e09a5e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = KV.rng(3);
    for (let i = 0; i < 260; i++) {
      const y = Math.pow(r(), 1.8) * H * 0.55;
      ctx.fillStyle = `rgba(255,${235 + r() * 20},${200 + r() * 55},${0.25 + r() * 0.6 * (1 - y / (H * 0.55))})`;
      ctx.beginPath();
      ctx.arc(r() * W, y, 0.6 + r() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  function clouds() {
    const w = KV.layerWidth(KV.PARALLAX.clouds);
    const c = KV.canvas(w, H);
    const ctx = c.getContext('2d');
    // 月亮
    ctx.globalCompositeOperation = 'lighter';
    KV.glow(ctx, 1560, 170, 260, '255,220,170', 0.22);
    ctx.globalCompositeOperation = 'source-over';
    const mg = ctx.createRadialGradient(1548, 160, 6, 1560, 170, 58);
    mg.addColorStop(0, '#fff8e4');
    mg.addColorStop(1, '#f3d9a8');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(1560, 170, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,170,130,0.25)';
    for (const [dx, dy, rr] of [
      [-18, -10, 12],
      [14, 12, 9],
      [8, -22, 6],
    ]) {
      ctx.beginPath();
      ctx.arc(1560 + dx, 170 + dy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    // 吉卜力式积云：底部被城中灯火映暖
    const r = KV.rng(41);
    const cloudDefs = [
      [260, 230, 520],
      [900, 120, 380],
      [1300, 300, 600],
      [1850, 210, 420],
      [620, 380, 300],
    ];
    for (const [cx, cy, cw] of cloudDefs) {
      const g = ctx.createLinearGradient(0, cy - cw * 0.25, 0, cy + 40);
      g.addColorStop(0, 'rgba(58,56,104,0.85)');
      g.addColorStop(0.7, 'rgba(120,80,120,0.85)');
      g.addColorStop(1, 'rgba(220,140,110,0.85)');
      ctx.fillStyle = g;
      ctx.beginPath();
      const n = 9;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x = cx - cw / 2 + u * cw;
        const rr = cw * (0.07 + 0.11 * Math.sin(Math.PI * u)) * (0.8 + r() * 0.4);
        ctx.moveTo(x + rr, cy - rr * 0.4);
        ctx.arc(x, cy - rr * 0.4, rr, 0, Math.PI * 2);
      }
      ctx.rect(cx - cw / 2, cy - 10, cw, 30);
      ctx.fill();
    }
    return KV.blurred(c, 3);
  }

  function mountains() {
    const w = KV.layerWidth(KV.PARALLAX.mountains);
    const c = KV.canvas(w, H);
    const ctx = c.getContext('2d');
    const r = KV.rng(8);
    const ranges = [
      [640, 120, '#3a3466'],
      [720, 90, '#4a3a6a'],
    ];
    for (const [base, amp, col] of ranges) {
      const p1 = r() * 10;
      const p2 = r() * 10;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= w; x += 8) {
        const y = base - amp * (0.55 * Math.sin(x * 0.0021 + p1) + 0.3 * Math.sin(x * 0.0057 + p2) + 0.15 * Math.sin(x * 0.013));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, H);
      ctx.closePath();
      ctx.fill();
    }
    // 山顶宝塔
    const px = 1650;
    let py = 600;
    for (let k = 0; k < 7; k++) {
      const lw = 60 - k * 6;
      ctx.fillStyle = '#2c2852';
      ctx.fillRect(px - lw * 0.3, py - 26, lw * 0.6, 28);
      ctx.fillStyle = 'rgba(255,190,110,0.85)';
      ctx.fillRect(px - 3, py - 20, 6, 9);
      A.roof(ctx, px, py - 24, lw, 14, { simple: true, color: '#241f46', tip: 5 });
      py -= 36;
    }
    return KV.blurred(c, 2.5);
  }

  function city(f, base, o, seed, blur) {
    const w = KV.layerWidth(f);
    const c = KV.canvas(w, H);
    const ctx = c.getContext('2d');
    A.skyline(ctx, w, base, o, KV.rng(seed));
    return blur ? KV.blurred(c, blur) : c;
  }

  function foreground() {
    const w = KV.layerWidth(KV.PARALLAX.foreground);
    const c = KV.canvas(w, H);
    const ctx = c.getContext('2d');
    const r = KV.rng(123);
    const lantern = (x, y, rad) => {
      ctx.globalCompositeOperation = 'lighter';
      KV.glow(ctx, x, y, rad * 5, '255,150,70', 0.35);
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(x, y - rad * 0.2, 2, x, y, rad * 1.2);
      g.addColorStop(0, '#ffe6a8');
      g.addColorStop(1, '#c8321f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rad, rad * 1.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1410';
      ctx.fillRect(x - rad * 0.45, y - rad * 1.25, rad * 0.9, rad * 0.25);
      ctx.fillRect(x - rad * 0.45, y + rad * 1.02, rad * 0.9, rad * 0.25);
    };
    // 顶部灯笼串
    for (let x0 = 300; x0 < w; x0 += 1250 + r() * 500) {
      const x1 = x0 + 900;
      const sag = 110;
      ctx.strokeStyle = '#1a1018';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, -20);
      ctx.quadraticCurveTo((x0 + x1) / 2, -20 + sag * 2, x1, -20);
      ctx.stroke();
      for (let j = 1; j < 6; j++) {
        const u = j / 6;
        const x = KV.lerp(x0, x1, u);
        const y = -20 + sag * 4 * u * (1 - u);
        ctx.strokeStyle = '#1a1018';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 40);
        ctx.stroke();
        lantern(x, y + 70, 30);
      }
    }
    // 灯杆
    for (let x = 900; x < w; x += 1700 + r() * 900) {
      ctx.fillStyle = '#1d1219';
      ctx.fillRect(x - 13, 380, 26, H - 380);
      ctx.fillRect(x - 13, 392, 96, 14);
      ctx.strokeStyle = 'rgba(255,160,90,0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 13, 410);
      ctx.lineTo(x + 13, H);
      ctx.stroke();
      ctx.strokeStyle = '#1d1219';
      ctx.beginPath();
      ctx.moveTo(x + 70, 406);
      ctx.lineTo(x + 70, 440);
      ctx.stroke();
      lantern(x + 70, 480, 36);
    }
    // 底部观灯人群剪影
    for (let x = 200; x < w; x += 900 + r() * 1400) {
      const n = 2 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const px = x + i * (70 + r() * 40);
        const top = 1040 + r() * 30;
        ctx.fillStyle = '#140c14';
        ctx.beginPath();
        ctx.arc(px, top, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px, top + 70, 70, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,160,90,0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, top, 34, -2.6, -0.6);
        ctx.stroke();
      }
    }
    return KV.blurred(c, 7);
  }

  function paper() {
    const c = KV.canvas(960, 540);
    const x = c.getContext('2d');
    x.fillStyle = '#808080';
    x.fillRect(0, 0, 960, 540);
    const r = KV.rng(5);
    for (let i = 0; i < 260; i++) {
      const px = r() * 960;
      const py = r() * 540;
      const rad = 20 + r() * 90;
      const l = r() < 0.5 ? 255 : 0;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(${l},${l},${l},${0.05 + r() * 0.06})`);
      g.addColorStop(1, `rgba(${l},${l},${l},0)`);
      x.fillStyle = g;
      x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    const id = x.getImageData(0, 0, 960, 540);
    for (let i = 0; i < id.data.length; i += 4) {
      const n = (r() - 0.5) * 26;
      id.data[i] += n;
      id.data[i + 1] += n;
      id.data[i + 2] += n;
    }
    x.putImageData(id, 0, 0);
    return c;
  }

  function vignette() {
    const c = KV.canvas(W, H);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(W / 2, H * 0.55, 420, W / 2, H * 0.55, 1250);
    g.addColorStop(0, 'rgba(10,5,20,0)');
    g.addColorStop(1, 'rgba(10,5,20,0.6)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    // 移轴：顶部、底部略压暗
    const t = x.createLinearGradient(0, 0, 0, H);
    t.addColorStop(0, 'rgba(8,6,24,0.35)');
    t.addColorStop(0.18, 'rgba(8,6,24,0)');
    t.addColorStop(0.88, 'rgba(8,6,24,0)');
    t.addColorStop(1, 'rgba(8,6,24,0.4)');
    x.fillStyle = t;
    x.fillRect(0, 0, W, H);
    return c;
  }

  KV.build = function () {
    const shops = layoutShops();
    const L = {};
    L.sky = sky();
    L.clouds = clouds();
    L.mountains = mountains();
    L.cityFar = city(KV.PARALLAX.cityFar, 880, { wMin: 90, wMax: 190, hMin: 150, hMax: 330, over: 24, roofH: 40, wall: '#2c2752', roof: '#211d42', windows: 0.1, tower: 0.14 }, 21, 2);
    L.cityMid = city(KV.PARALLAX.cityMid, 905, { wMin: 160, wMax: 300, hMin: 200, hMax: 420, over: 36, roofH: 62, wall: '#3c3260', roof: '#2a2448', windows: 0.16, winW: 12, winH: 16, tower: 0.12 }, 22, 1);
    const street_ = KV.canvas(KV.WORLD, H);
    street(street_.getContext('2d'), shops);
    L.street = street_;
    // 石拱桥单独成层：需要压在水面波光之上
    const b = KV.canvas(1000, H);
    const bx = b.getContext('2d');
    bx.translate(-3200, 0);
    A.bridgeBody(bx);
    L.bridge = b;
    const fr = KV.canvas(1000, H);
    const fx = fr.getContext('2d');
    fx.translate(-3200, 0);
    A.railing(fx, 8, 1);
    L.bridgeFront = fr;
    L.foreground = foreground();
    L.paper = paper();
    L.vignette = vignette();
    KV.layers = L;
    KV.shops = shops;
    Object.assign(KV, buildLanterns(shops));
  };

  // 可选：用 AI 生成/手绘的 PNG 替换程序化图层（文件不存在时自动回退）
  KV.IMAGE_LAYERS = {
    sky: 'assets/layers/sky.png',
    clouds: 'assets/layers/clouds.png',
    mountains: 'assets/layers/mountains.png',
    cityFar: 'assets/layers/city_far.png',
    cityMid: 'assets/layers/city_mid.png',
    street: 'assets/layers/street.png',
    foreground: 'assets/layers/foreground.png',
  };
  KV.loadImageLayers = function () {
    const jobs = Object.entries(KV.IMAGE_LAYERS).map(
      ([key, src]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const f = KV.PARALLAX[key];
            const c = KV.canvas(KV.layerWidth(f), H);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            KV.layers[key] = c;
            console.log(`[layers] 使用图片图层 ${src}`);
            resolve(key);
          };
          img.onerror = () => resolve(null);
          img.src = src;
        })
    );
    return Promise.all(jobs);
  };
})();
