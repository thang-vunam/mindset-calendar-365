// generate-icons.js - Generates SVG and standard PNG icons with Deep Ocean Blue theme
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create rich SVG icon with Deep Ocean Blue theme
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f2b5c" />
      <stop offset="50%" stop-color="#060f22" />
      <stop offset="100%" stop-color="#02050c" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f0f9ff" />
    </linearGradient>
    <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#cbd5e1" />
      <stop offset="35%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#64748b" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Calendar Page Body -->
  <g filter="url(#shadow)">
    <!-- Base stand edge -->
    <path d="M 96 420 L 416 420 L 440 450 L 72 450 Z" fill="#0b1b36" opacity="0.9" />
    
    <!-- White Calendar Page -->
    <rect x="88" y="110" width="336" height="310" rx="20" fill="url(#cardGrad)" />
    
    <!-- Ocean Blue Top Header -->
    <path d="M 88 130 Q 88 110 108 110 L 404 110 Q 424 110 424 130 L 424 190 L 88 190 Z" fill="url(#oceanGrad)" />
  </g>

  <!-- Spiral Rings -->
  <rect x="130" y="86" width="16" height="48" rx="8" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
  <circle cx="138" cy="110" r="5" fill="#0f2b5c" opacity="0.5" />
  
  <rect x="202" y="86" width="16" height="48" rx="8" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
  <circle cx="210" cy="110" r="5" fill="#0f2b5c" opacity="0.5" />

  <rect x="294" y="86" width="16" height="48" rx="8" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
  <circle cx="302" cy="110" r="5" fill="#0f2b5c" opacity="0.5" />

  <rect x="366" y="86" width="16" height="48" rx="8" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
  <circle cx="374" cy="110" r="5" fill="#0f2b5c" opacity="0.5" />

  <!-- Calendar Content: "365" and Daily Mindset Fuel -->
  <text x="256" y="162" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="3">MINDSET FUEL</text>

  <text x="256" y="300" text-anchor="middle" fill="#061229" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="96" font-weight="900" letter-spacing="-2">365</text>
  
  <text x="256" y="342" text-anchor="middle" fill="#0284c7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" letter-spacing="4">NGÀY BẢN LĨNH</text>

  <!-- Geometric accent line -->
  <circle cx="256" cy="380" r="5" fill="#38bdf8" />
  <line x1="160" y1="380" x2="236" y2="380" stroke="#bae6fd" stroke-width="2" stroke-linecap="round" />
  <line x1="276" y1="380" x2="352" y2="380" stroke="#bae6fd" stroke-width="2" stroke-linecap="round" />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created icon.svg');

// Generate valid PNG directly using Node.js zlib and CRC32
function createPng(size, filename) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.slice(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowBytes = 1 + size * 4;
  const rawData = Buffer.alloc(size * rowBytes);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0;

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      const nx = x / size;
      const ny = y / size;

      // Dark ocean gradient
      let r = 4 + Math.floor(ny * 8);
      let g = 10 + Math.floor(ny * 15);
      let b = 24 + Math.floor(ny * 30);
      let a = 255;

      const cardLeft = 0.16;
      const cardRight = 0.84;
      const cardTop = 0.22;
      const cardBottom = 0.82;

      if (nx >= cardLeft && nx <= cardRight && ny >= cardTop && ny <= cardBottom) {
        if (ny <= 0.38) {
          // Ocean sapphire header
          r = 2;
          g = 132;
          b = 199;
        } else {
          // Crisp ice white page
          r = 245;
          g = 250;
          b = 255;

          const cx = nx - 0.5;
          const cy = ny - 0.60;
          if (Math.abs(cx) < 0.22 && Math.abs(cy) < 0.12) {
            r = 6;
            g = 18;
            b = 41;
          }
        }
      }

      // Spiral binder rings
      const ringPositions = [0.26, 0.42, 0.58, 0.74];
      for (const rx of ringPositions) {
        if (Math.abs(nx - rx) < 0.025 && ny >= 0.16 && ny <= 0.26) {
          r = 203;
          g = 213;
          b = 225;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filename, pngBuffer);
  console.log(`Created PNG: ${filename} (${size}x${size})`);
}

createPng(192, path.join(iconsDir, 'icon-192.png'));
createPng(512, path.join(iconsDir, 'icon-512.png'));
createPng(180, path.join(iconsDir, 'apple-touch-icon.png'));
