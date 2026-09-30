// generate-icons.js - Generates luxury Deep Ocean Blue icons with crisp 365 digits
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create rich SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="45%" stop-color="#0a2558" />
      <stop offset="100%" stop-color="#020617" />
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
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
    <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- iOS squircle background -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />

  <!-- Subtle ambient glow circle -->
  <circle cx="256" cy="180" r="180" fill="#38bdf8" opacity="0.15" filter="blur(40px)" />

  <!-- Calendar Page Body -->
  <g filter="url(#cardShadow)">
    <!-- Base stand subtle depth -->
    <path d="M 80 415 L 432 415 L 448 442 L 64 442 Z" fill="#030b1c" opacity="0.75" />
    
    <!-- White Calendar Page -->
    <rect x="76" y="105" width="360" height="315" rx="26" fill="url(#cardGrad)" />
    
    <!-- Ocean Blue Top Header -->
    <path d="M 76 131 Q 76 105 102 105 L 410 105 Q 436 105 436 131 L 436 182 L 76 182 Z" fill="url(#oceanGrad)" />
  </g>

  <!-- Spiral Binder Rings -->
  <g>
    <rect x="122" y="80" width="18" height="52" rx="9" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
    <circle cx="131" cy="106" r="5" fill="#0a2558" opacity="0.6" />

    <rect x="202" y="80" width="18" height="52" rx="9" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
    <circle cx="211" cy="106" r="5" fill="#0a2558" opacity="0.6" />

    <rect x="292" y="80" width="18" height="52" rx="9" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
    <circle cx="301" cy="106" r="5" fill="#0a2558" opacity="0.6" />

    <rect x="372" y="80" width="18" height="52" rx="9" fill="url(#ringGrad)" stroke="#0b172a" stroke-width="1.5" />
    <circle cx="381" cy="106" r="5" fill="#0a2558" opacity="0.6" />
  </g>

  <!-- Header text -->
  <text x="256" y="156" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="20" font-weight="800" letter-spacing="4">ĐỘNG LỰC</text>

  <!-- Giant Bold 365 Numbers in Royal Navy (Optically Centered) -->
  <text x="256" y="315" text-anchor="middle" fill="#0a2558" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-size="124" font-weight="900" letter-spacing="0">365</text>
  
  <!-- Sub-label -->
  <text x="256" y="362" text-anchor="middle" fill="#0284c7" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-size="16" font-weight="800" letter-spacing="5">MỖI NGÀY</text>

  <!-- Accent dot & lines -->
  <circle cx="256" cy="392" r="5" fill="url(#goldGrad)" />
  <line x1="160" y1="392" x2="236" y2="392" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" opacity="0.4" />
  <line x1="276" y1="392" x2="352" y2="392" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" opacity="0.4" />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created vibrant icon.svg');

// 2. High Quality PNG Generator
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

  // Digits bitmap pattern for '3', '6', '5' (7 wide x 11 high)
  const DIGITS = {
    '3': [
      '0111110',
      '1100011',
      '0000011',
      '0000011',
      '0011110',
      '0000011',
      '0000011',
      '0000011',
      '0000011',
      '1100011',
      '0111110'
    ],
    '6': [
      '0011110',
      '0110000',
      '1100000',
      '1100000',
      '1111110',
      '1100011',
      '1100011',
      '1100011',
      '1100011',
      '0110011',
      '0011110'
    ],
    '5': [
      '1111111',
      '1100000',
      '1100000',
      '1100000',
      '1111110',
      '0000011',
      '0000011',
      '0000011',
      '0000011',
      '1100011',
      '0111110'
    ]
  };

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // filter type: 0

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const nx = x / size;
      const ny = y / size;

      // Background: Deep Ocean Gradient with radiant top-left
      // Dist from (0.3, 0.2)
      const distLight = Math.hypot(nx - 0.35, ny - 0.2);
      let r = Math.max(3, Math.floor(2 + (1 - distLight) * 20));
      let g = Math.max(8, Math.floor(15 + (1 - distLight) * 90));
      let b = Math.max(24, Math.floor(45 + (1 - distLight) * 160));
      let a = 255;

      // Calendar card dimensions
      const cardLeft = 0.15;
      const cardRight = 0.85;
      const cardTop = 0.20;
      const cardBottom = 0.82;
      const headerBottom = 0.35;

      // Drop shadow around card
      if (nx >= cardLeft - 0.04 && nx <= cardRight + 0.04 && ny >= cardTop && ny <= cardBottom + 0.05) {
        r = Math.floor(r * 0.45);
        g = Math.floor(g * 0.45);
        b = Math.floor(b * 0.45);
      }

      // Inside Calendar card
      if (nx >= cardLeft && nx <= cardRight && ny >= cardTop && ny <= cardBottom) {
        if (ny <= headerBottom) {
          // Ocean Sapphire Header with slight gradient
          const headerFrac = (ny - cardTop) / (headerBottom - cardTop);
          r = Math.floor(56 - headerFrac * 40);
          g = Math.floor(189 - headerFrac * 60);
          b = Math.floor(248 - headerFrac * 50);
        } else {
          // Clean, luminous pure ice white page (NO black hole!)
          const pageFrac = (ny - headerBottom) / (cardBottom - headerBottom);
          r = Math.floor(255 - pageFrac * 8);
          g = Math.floor(255 - pageFrac * 5);
          b = 255;

          // Render "3 6 5" digits sharply in deep sapphire navy - perfectly centered
          const digitW = 0.15;
          const digitH = 0.24;
          const digitY = 0.43;
          const digitSpacing = 0.04;
          // Total width: 3 * 0.15 + 2 * 0.04 = 0.53
          // Perfectly centered at 0.50: startX = 0.50 - (0.53 / 2) = 0.235
          // Left margin to card (0.15): 0.235 - 0.15 = 0.085
          // Right margin to card (0.85): 0.85 - (0.235 + 0.53) = 0.085
          // Margin to canvas border: 0.235 on left, 0.235 on right (100% equal!)
          const startX = 0.235;

          const digitsArr = ['3', '6', '5'];
          for (let d = 0; d < 3; d++) {
            const dx = startX + d * (digitW + digitSpacing);
            if (nx >= dx && nx < dx + digitW && ny >= digitY && ny < digitY + digitH) {
              const u = Math.floor(((nx - dx) / digitW) * 7);
              const v = Math.floor(((ny - digitY) / digitH) * 11);
              const char = digitsArr[d];
              if (DIGITS[char][v] && DIGITS[char][v][u] === '1') {
                // Deep royal navy ink (#0a2558)
                r = 10;
                g = 37;
                b = 88;
              }
            }
          }

          // Subtle cyan-gold accent bar at bottom of calendar
          if (ny >= 0.72 && ny <= 0.74 && nx >= 0.35 && nx <= 0.65) {
            r = 2;
            g = 132;
            b = 199;
          }
        }
      }

      // Spiral binder rings (4 silver metallic clips at the top)
      const ringPositions = [0.26, 0.42, 0.58, 0.74];
      for (const rx of ringPositions) {
        if (Math.abs(nx - rx) < 0.024 && ny >= 0.15 && ny <= 0.24) {
          // Silver-white metallic highlight
          r = 241;
          g = 245;
          b = 249;
        } else if (Math.abs(nx - rx) < 0.028 && ny >= 0.14 && ny <= 0.25) {
          // Ring shadow/stroke
          r = 15;
          g = 23;
          b = 42;
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
  console.log(`Created luxury PNG: ${filename} (${size}x${size})`);
}

createPng(192, path.join(iconsDir, 'icon-192.png'));
createPng(512, path.join(iconsDir, 'icon-512.png'));
createPng(180, path.join(iconsDir, 'apple-touch-icon.png'));
console.log('All icons generated successfully!');
