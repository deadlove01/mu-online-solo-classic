// Renders shop item icons (web/shop_icons/<section>_<index>.png) from the client's
// BMD models and OZJ/OZT textures with a small software rasterizer.
//
// Usage: NODE_PATH=<dir containing jpeg-js> node tools/shop-icons/render.cjs [--sheet]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jpeg = require('jpeg-js');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'src', 'client', 'Client', 'Data');
const CATALOG = path.join(ROOT, 'src', 'server', 'Data', 'WebShop.txt');
const OUT = path.join(ROOT, 'web', 'shop_icons');
const SIZE = 96;
const SS = 3; // supersampling factor

const dirCache = {};
function findFile(dir, name) {
  if (!dirCache[dir]) {
    dirCache[dir] = {};
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) dirCache[dir][f.toLowerCase()] = path.join(dir, f);
  }
  return dirCache[dir][name.toLowerCase()] || null;
}

const pad2 = (n) => String(n).padStart(2, '0');

// Maps an item (section, index) to its BMD model, mirroring the client's model loading
function modelFor(sec, idx) {
  const item = path.join(DATA, 'Item');
  const player = path.join(DATA, 'Player');
  if (sec === 0) return [item, `Sword${pad2(idx + 1)}.bmd`];
  if (sec === 4) {
    if (idx <= 6) return [item, `Bow${pad2(idx + 1)}.bmd`];
    if (idx >= 8 && idx <= 14) return [item, `CrossBow${pad2(idx - 7)}.bmd`];
    if (idx === 16) return [item, 'CrossBow17.bmd'];
    return [item, `Bow${pad2(idx + 1)}.bmd`];
  }
  const parts = { 7: 'HelmMale', 8: 'ArmorMale', 9: 'PantMale', 10: 'GloveMale', 11: 'BootMale' };
  if (parts[sec]) return [player, `${parts[sec]}${pad2(idx + 1)}.bmd`];
  if (sec === 12) return [item, `Wing${pad2(idx + 1)}.bmd`];
  if (sec === 13) return [player, `Helper${pad2(idx + 1)}.bmd`];
  if (sec === 14) {
    if (idx === 16) return [item, 'Jewel03.bmd'];
    if (idx === 22) return [item, 'jewel22.bmd'];
  }
  return null;
}

// Per-section view rotation in degrees (x, y, z) applied to the model
const VIEWS = {
  0: [-90, 0, 135], 4: [-90, 0, 0], 7: [-90, 0, 0], 8: [-90, 0, 0], 9: [-90, 0, 0], 10: [-90, 0, 0], 11: [-90, 0, 0],
  12: [-90, 0, 0], 13: [90, 0, 0], 14: [90, 0, 0],
};

function decryptBmd(buf) {
  if (buf.toString('latin1', 0, 3) !== 'BMD') throw new Error('not a BMD');
  const ver = buf[3];
  if (ver === 0x0a) return buf;
  if (ver !== 0x0c) throw new Error('unsupported BMD version ' + ver);
  const size = buf.readInt32LE(4);
  const key = [0xD1, 0x73, 0x52, 0xF6, 0xD2, 0x9A, 0xCB, 0x27, 0x3E, 0xAF, 0x59, 0x31, 0x37, 0xB3, 0xE7, 0xA2];
  const out = Buffer.alloc(size + 4);
  buf.copy(out, 0, 0, 4);
  let k = 0x5E;
  for (let i = 0; i < size; i++) {
    const src = buf[8 + i];
    out[4 + i] = ((src ^ key[i & 15]) - k) & 0xff;
    k = (src + 0x3D) & 0xff;
  }
  return out;
}

function angleMatrix(a) {
  const sy = Math.sin(a[2]), cy = Math.cos(a[2]);
  const sp = Math.sin(a[1]), cp = Math.cos(a[1]);
  const sr = Math.sin(a[0]), cr = Math.cos(a[0]);
  return [
    [cp * cy, sr * sp * cy + cr * -sy, cr * sp * cy + -sr * -sy],
    [cp * sy, sr * sp * sy + cr * cy, cr * sp * sy + -sr * cy],
    [-sp, sr * cp, cr * cp],
  ];
}

function parseBmd(raw) {
  const b = decryptBmd(raw);
  const nMesh = b.readInt16LE(0x24), nBone = b.readInt16LE(0x26), nAct = b.readInt16LE(0x28);
  let c = 0x2a;
  const meshes = [];
  for (let m = 0; m < nMesh; m++) {
    const nV = b.readInt16LE(c), nN = b.readInt16LE(c + 2), nT = b.readInt16LE(c + 4), nF = b.readInt16LE(c + 6);
    c += 10;
    const verts = [];
    for (let i = 0; i < nV; i++, c += 16) {
      verts.push({ node: b.readInt16LE(c), p: [b.readFloatLE(c + 4), b.readFloatLE(c + 8), b.readFloatLE(c + 12)] });
    }
    c += nN * 20;
    const uvs = [];
    for (let i = 0; i < nT; i++, c += 8) uvs.push([b.readFloatLE(c), b.readFloatLE(c + 4)]);
    const tris = [];
    for (let i = 0; i < nF; i++, c += 64) {
      const poly = b[c];
      const v = [0, 1, 2, 3].map((k) => b.readInt16LE(c + 2 + k * 2));
      const t = [0, 1, 2, 3].map((k) => b.readInt16LE(c + 18 + k * 2));
      tris.push({ poly, v, t });
    }
    const tex = b.toString('latin1', c, c + 32).split('\0')[0];
    c += 32;
    meshes.push({ verts, uvs, tris, tex });
  }
  const keys = [];
  for (let a = 0; a < nAct; a++) {
    const n = b.readInt16LE(c);
    const lock = b[c + 2];
    c += 3;
    if (lock) c += n * 12;
    keys.push(n);
  }
  const bones = [];
  for (let i = 0; i < nBone; i++) {
    const dummy = b[c++];
    if (dummy) { bones.push(null); continue; }
    c += 32;
    const parent = b.readInt16LE(c);
    c += 2;
    let pos = [0, 0, 0], rot = [0, 0, 0];
    for (let a = 0; a < nAct; a++) {
      const n = keys[a];
      if (a === 0 && n > 0) {
        pos = [b.readFloatLE(c), b.readFloatLE(c + 4), b.readFloatLE(c + 8)];
        rot = [b.readFloatLE(c + n * 12), b.readFloatLE(c + n * 12 + 4), b.readFloatLE(c + n * 12 + 8)];
      }
      c += n * 24;
    }
    bones.push({ parent, pos, rot });
  }
  // World matrices for the first frame of the first action
  const world = [];
  for (let i = 0; i < nBone; i++) {
    const bn = bones[i];
    if (!bn) { world.push({ r: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [0, 0, 0] }); continue; }
    const r = angleMatrix(bn.rot);
    if (bn.parent >= 0 && bn.parent < i && world[bn.parent]) {
      const P = world[bn.parent];
      const R = [0, 1, 2].map((y) => [0, 1, 2].map((x) => P.r[y][0] * r[0][x] + P.r[y][1] * r[1][x] + P.r[y][2] * r[2][x]));
      const t = [0, 1, 2].map((y) => P.r[y][0] * bn.pos[0] + P.r[y][1] * bn.pos[1] + P.r[y][2] * bn.pos[2] + P.t[y]);
      world.push({ r: R, t });
    } else {
      world.push({ r, t: bn.pos });
    }
  }
  return { meshes, world };
}

function loadTga(buf) {
  const idLen = buf[0], type = buf[2], w = buf.readUInt16LE(12), h = buf.readUInt16LE(14), bpp = buf[16], desc = buf[17];
  const bytes = bpp >> 3;
  const out = Buffer.alloc(w * h * 4);
  let p = 18 + idLen;
  const px = [];
  const readPixel = () => {
    const o = [buf[p + 2], buf[p + 1], buf[p], bytes === 4 ? buf[p + 3] : 255];
    p += bytes;
    return o;
  };
  if (type === 2) { for (let i = 0; i < w * h; i++) px.push(readPixel()); }
  else if (type === 10) {
    while (px.length < w * h) {
      const h8 = buf[p++];
      const n = (h8 & 0x7f) + 1;
      if (h8 & 0x80) { const v = readPixel(); for (let i = 0; i < n; i++) px.push(v); }
      else for (let i = 0; i < n; i++) px.push(readPixel());
    }
  } else throw new Error('unsupported TGA type ' + type);
  const topDown = (desc & 0x20) !== 0;
  for (let y = 0; y < h; y++) {
    const sy = topDown ? y : h - 1 - y;
    for (let x = 0; x < w; x++) out.set(px[sy * w + x], (y * w + x) * 4);
  }
  return { w, h, data: out };
}

function stripAppSegments(buf) {
  // jpeg-js chokes on some Photoshop APPn blocks; drop everything except JFIF
  const parts = [buf.subarray(0, 2)];
  let p = 2;
  while (p + 4 <= buf.length && buf[p] === 0xff) {
    const marker = buf[p + 1];
    if (marker === 0xda) break;
    const len = buf.readUInt16BE(p + 2);
    if (!(marker >= 0xe1 && marker <= 0xef)) parts.push(buf.subarray(p, p + 2 + len));
    p += 2 + len;
  }
  parts.push(buf.subarray(p));
  return Buffer.concat(parts);
}

const texCache = {};
function loadTexture(dirs, name) {
  const stem = name.replace(/\.[^.]*$/, '');
  const key = dirs.join('|') + stem.toLowerCase();
  if (key in texCache) return texCache[key];
  let tex = null;
  for (const dir of dirs) {
    const j = findFile(dir, stem + '.ozj');
    const t = findFile(dir, stem + '.ozt');
    try {
      if (j) {
        const buf = fs.readFileSync(j);
        let img = null;
        for (let off = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), 24); off >= 0 && !img; off = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), off + 1)) {
          try { img = jpeg.decode(buf.subarray(off), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 }); } catch (e) { /* try next SOI */ }
        }
        if (!img) throw new Error('no decodable JPEG');
        tex = { w: img.width, h: img.height, data: Buffer.from(img.data) };
      } else if (t) {
        tex = loadTga(fs.readFileSync(t).subarray(4));
      }
    } catch (e) { console.warn('  texture failed', stem, e.message); }
    if (tex) break;
  }
  texCache[key] = tex;
  return tex;
}

function rotate(p, rot) {
  const [rx, ry, rz] = rot.map((d) => (d * Math.PI) / 180);
  let [x, y, z] = p;
  let t = y * Math.cos(rx) - z * Math.sin(rx); z = y * Math.sin(rx) + z * Math.cos(rx); y = t;
  t = x * Math.cos(ry) + z * Math.sin(ry); z = -x * Math.sin(ry) + z * Math.cos(ry); x = t;
  t = x * Math.cos(rz) - y * Math.sin(rz); y = x * Math.sin(rz) + y * Math.cos(rz); x = t;
  return [x, y, z];
}

function render(model, dirs, rot, blackKey) {
  const tris = [];
  for (const mesh of model.meshes) {
    const tex = loadTexture(dirs, mesh.tex);
    const pts = mesh.verts.map((v) => {
      const w = model.world[v.node] || model.world[0];
      const p = [0, 1, 2].map((y) => w.r[y][0] * v.p[0] + w.r[y][1] * v.p[1] + w.r[y][2] * v.p[2] + w.t[y]);
      return rotate(p, rot);
    });
    for (const f of mesh.tris) {
      const idx = f.poly === 4 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]];
      for (const q of idx) tris.push({ p: q.map((k) => pts[f.v[k]]), uv: q.map((k) => mesh.uvs[f.t[k]] || [0, 0]), tex });
    }
  }
  if (!tris.length) throw new Error('no triangles');
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t.p) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  const W = SIZE * SS;
  const span = Math.max(max[0] - min[0], max[1] - min[1]) || 1;
  const scale = (W * 0.9) / span;
  const cx = (min[0] + max[0]) / 2, cy = (min[1] + max[1]) / 2;
  const color = Buffer.alloc(W * W * 4);
  const depth = new Float32Array(W * W).fill(-Infinity);

  for (const t of tris) {
    const s = t.p.map((p) => [(p[0] - cx) * scale + W / 2, W / 2 - (p[1] - cy) * scale, p[2]]);
    const e1 = [t.p[1][0] - t.p[0][0], t.p[1][1] - t.p[0][1], t.p[1][2] - t.p[0][2]];
    const e2 = [t.p[2][0] - t.p[0][0], t.p[2][1] - t.p[0][1], t.p[2][2] - t.p[0][2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const nl = Math.hypot(...n) || 1;
    n = n.map((v) => v / nl);
    const light = 0.55 + 0.45 * Math.abs(n[0] * -0.4 + n[1] * 0.5 + n[2] * 0.75);
    const minX = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0])));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1])));
    const maxY = Math.min(W - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
    const den = (s[1][1] - s[2][1]) * (s[0][0] - s[2][0]) + (s[2][0] - s[1][0]) * (s[0][1] - s[2][1]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const l0 = ((s[1][1] - s[2][1]) * (px - s[2][0]) + (s[2][0] - s[1][0]) * (py - s[2][1])) / den;
        const l1 = ((s[2][1] - s[0][1]) * (px - s[2][0]) + (s[0][0] - s[2][0]) * (py - s[2][1])) / den;
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-4 || l1 < -1e-4 || l2 < -1e-4) continue;
        const z = l0 * s[0][2] + l1 * s[1][2] + l2 * s[2][2];
        if (z <= depth[y * W + x]) continue;
        let r = 200, g = 200, bl = 200, a = 255;
        if (t.tex) {
          const u = l0 * t.uv[0][0] + l1 * t.uv[1][0] + l2 * t.uv[2][0];
          const v = l0 * t.uv[0][1] + l1 * t.uv[1][1] + l2 * t.uv[2][1];
          const tx = ((Math.floor((u - Math.floor(u)) * t.tex.w) % t.tex.w) + t.tex.w) % t.tex.w;
          const ty = ((Math.floor((v - Math.floor(v)) * t.tex.h) % t.tex.h) + t.tex.h) % t.tex.h;
          const o = (ty * t.tex.w + tx) * 4;
          r = t.tex.data[o]; g = t.tex.data[o + 1]; bl = t.tex.data[o + 2]; a = t.tex.data[o + 3];
        }
        if (a < 128) continue;
        if (blackKey && r + g + bl < 36) continue;
        depth[y * W + x] = z;
        const o = (y * W + x) * 4;
        color[o] = Math.min(255, r * light); color[o + 1] = Math.min(255, g * light); color[o + 2] = Math.min(255, bl * light); color[o + 3] = 255;
      }
    }
  }
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const o = ((y * SS + sy) * W + x * SS + sx) * 4;
      const al = color[o + 3];
      r += color[o] * al; g += color[o + 1] * al; b += color[o + 2] * al; a += al;
    }
    const o = (y * SIZE + x) * 4;
    if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
    out[o + 3] = a / (SS * SS);
  }
  return out;
}

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function main() {
  const items = new Map();
  for (const line of fs.readFileSync(CATALOG, 'utf8').split(/\r?\n/)) {
    const f = line.trim().split(/\s+/);
    if (f.length < 10 || line.startsWith('//') || isNaN(+f[0])) continue;
    items.set(`${f[3]}_${f[4]}`, [+f[3], +f[4]]);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const made = [];
  for (const [key, [sec, idx]] of items) {
    const m = modelFor(sec, idx);
    const file = m && findFile(m[0], m[1]);
    if (!file) { console.warn('no model for', key, m && m[1]); continue; }
    try {
      const model = parseBmd(fs.readFileSync(file));
      const dirs = [path.dirname(file), path.join(DATA, 'Item'), path.join(DATA, 'Player')];
      const img = render(model, dirs, VIEWS[sec] || [90, 0, 0], sec === 12);
      fs.writeFileSync(path.join(OUT, key + '.png'), png(SIZE, SIZE, img));
      made.push([key, img]);
      console.log('ok', key, path.basename(file));
    } catch (e) { console.warn('fail', key, path.basename(file), e.message); }
  }
  if (process.argv.includes('--sheet')) {
    const cols = 8, rows = Math.ceil(made.length / cols);
    const sheet = Buffer.alloc(cols * SIZE * rows * SIZE * 4, 0x30);
    made.forEach(([, img], i) => {
      const ox = (i % cols) * SIZE, oy = Math.floor(i / cols) * SIZE;
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const s = (y * SIZE + x) * 4, d = ((oy + y) * cols * SIZE + ox + x) * 4;
        const a = img[s + 3] / 255;
        for (let k = 0; k < 3; k++) sheet[d + k] = img[s + k] * a + 0x30 * (1 - a);
        sheet[d + 3] = 255;
      }
    });
    fs.writeFileSync(path.join(OUT, '..', '_sheet.png'), png(cols * SIZE, rows * SIZE, sheet));
  }
}
main();
