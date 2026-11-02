const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator for pure Node.js without canvas/sharp
function createPNG(width, height, pixelFn) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  typeBuf.copy(buf, 4);
  data.copy(buf, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// CRC-32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// 1. App Icon (64x64): Sleek Discord Blurple Shield with glass liquid gradient & lightning bolt
const appIcon = createPNG(64, 64, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded squircle (Discord style)
  const radius = 26;
  const k = Math.pow(Math.abs(dx) / radius, 3.5) + Math.pow(Math.abs(dy) / radius, 3.5);

  if (k <= 1.0) {
    // Glass gradient background: Blurple #5865F2 with specular highlight
    const highlight = Math.max(0, 1 - (y / 40));
    const r = Math.min(255, Math.round(88 + highlight * 70));
    const g = Math.min(255, Math.round(101 + highlight * 65));
    const b = Math.min(255, Math.round(242 + highlight * 13));

    // Simple lightning bolt in center
    const isLightning = (
      (x >= 30 && x <= 38 && y >= 16 && y <= 32 && (x + y * 0.3 > 35)) ||
      (x >= 24 && x <= 34 && y >= 30 && y <= 48 && (x + y * 0.4 < 46))
    );

    if (isLightning) {
      return [255, 255, 255, 255];
    }

    // Border highlight
    if (k > 0.9) {
      return [255, 255, 255, 180];
    }

    return [r, g, b, 240];
  }

  // Soft shadow
  if (k <= 1.15) {
    const alpha = Math.round((1.15 - k) / 0.15 * 80);
    return [20, 20, 30, alpha];
  }

  return [0, 0, 0, 0];
});

fs.writeFileSync(path.join(assetsDir, 'icon.png'), appIcon);

// 2. Tray Active Icon (32x32): Discord Blurple with bright emerald green glow dot
const trayActive = createPNG(32, 32, (x, y, w, h) => {
  const cx = 16, cy = 16;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Main pill
  if (dist <= 13) {
    // Green indicator on top right
    const gdx = x - 23, gdy = y - 9;
    const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
    if (gdist <= 5) {
      return [35, 165, 90, 255]; // Discord Green
    }
    if (gdist <= 6.5) {
      return [255, 255, 255, 200];
    }

    // Shield body
    return [88, 101, 242, 230];
  }
  return [0, 0, 0, 0];
});

fs.writeFileSync(path.join(assetsDir, 'tray-active.png'), trayActive);

// 3. Tray Idle Icon (32x32): Subtle glass grey
const trayIdle = createPNG(32, 32, (x, y, w, h) => {
  const cx = 16, cy = 16;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= 13) {
    return [130, 135, 145, 210];
  }
  return [0, 0, 0, 0];
});

fs.writeFileSync(path.join(assetsDir, 'tray-idle.png'), trayIdle);

console.log('Icons generated successfully in assets/');
