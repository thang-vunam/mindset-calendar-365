// build-quotes.js - Assembles 365 100% Unique Quotes for Mindset 365
const fs = require('fs');
const path = require('path');

const noidau = require('./data/pools/noidau.js');
const hanhdong = require('./data/pools/hanhdong.js');
const taichinh = require('./data/pools/taichinh.js');
const khackhy = require('./data/pools/khackhy.js');
const tuonglai = require('./data/pools/tuonglai.js');

console.log(`Pool counts:`);
console.log(`- Nhắc nhớ nỗi đau: ${noidau.length}`);
console.log(`- Thúc đẩy hành động: ${hanhdong.length}`);
console.log(`- Kỷ luật tài chính: ${taichinh.length}`);
console.log(`- Tư duy Khắc kỷ: ${khackhy.length}`);
console.log(`- Niềm tin tương lai: ${tuonglai.length}`);

if (noidau.length !== 73 || hanhdong.length !== 73 || taichinh.length !== 73 || khackhy.length !== 73 || tuonglai.length !== 73) {
  throw new Error(`Mỗi nhóm phải có chính xác 73 câu (73 * 5 = 365)! Hiện tại: ${noidau.length}, ${hanhdong.length}, ${taichinh.length}, ${khackhy.length}, ${tuonglai.length}`);
}

const pools = [noidau, hanhdong, taichinh, khackhy, tuonglai];
const quotes = [];

const headlineSet = new Set();
const quoteSet = new Set();

for (let round = 0; round < 73; round++) {
  for (let catIdx = 0; catIdx < 5; catIdx++) {
    const day = round * 5 + catIdx + 1;
    const item = pools[catIdx][round];
    
    // Check duplicates
    const h = item.headline.trim();
    const q = item.quote.trim();
    
    if (headlineSet.has(h)) {
      console.warn(`[CẢNH BÁO TRÙNG TIÊU ĐỀ] "${h}" tại Day ${day}`);
    }
    if (quoteSet.has(q)) {
      console.warn(`[CẢNH BÁO TRÙNG NỘI DUNG] "${q.substring(0, 30)}..." tại Day ${day}`);
    }
    
    headlineSet.add(h);
    quoteSet.add(q);
    
    quotes.push({
      id: day,
      day: day,
      headline: item.headline,
      quote: item.quote,
      author: item.author,
      category: item.category
    });
  }
}

console.log(`\nTổng số quotes: ${quotes.length}`);
console.log(`Số tiêu đề độc bản: ${headlineSet.size} / 365`);
console.log(`Số nội dung độc bản: ${quoteSet.size} / 365`);

const outputPath = path.join(__dirname, 'quotes.json');
fs.writeFileSync(outputPath, JSON.stringify(quotes, null, 2), 'utf-8');
console.log(`Đã xuất thành công 365 câu trích dẫn ĐỘC BẢN 100% vào: ${outputPath}`);