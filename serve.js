// serve.js - Lightweight static server with MIME types and live local network IP display for iPhone testing
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];
  if (cleanUrl === '/') cleanUrl = '/index.html';

  const filePath = path.join(__dirname, cleanUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404: Tệp không tồn tại');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500: Lỗi máy chủ: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.json' || ext === '.js' ? 'no-cache' : 'max-age=3600'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🌟 LỊCH ĐỂ BÀN 365 - DAILY MINDSET FUEL (PWA) 🌟  `);
  console.log(`======================================================`);
  console.log(`- Trên máy tính (Local):      http://localhost:${PORT}`);
  
  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    console.log(`- Mở trên iPhone (cùng Wifi): http://${localIps[0]}:${PORT}`);
  }
  console.log(`\n💡 Hướng dẫn cài trên iPhone Safari:`);
  console.log(`  1. Mở link trên Safari.`);
  console.log(`  2. Bấm nút Chia sẻ (Share icon ở thanh dưới Safari).`);
  console.log(`  3. Chọn "Thêm vào MH chính" ("Add to Home Screen").`);
  console.log(`  4. Trải nghiệm app toàn màn hình độc lập không thanh địa chỉ!`);
  console.log(`======================================================\n`);
});
