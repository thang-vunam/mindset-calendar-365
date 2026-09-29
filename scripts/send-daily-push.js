// scripts/send-daily-push.js - Automated daily broadcaster for GitHub Actions
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const vapidKeys = require('../api/vapid-keys.json');
webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Calculate today's day of year (GMT+7)
const now = new Date();
const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
const vnTime = new Date(utc + (3600000 * 7));
const year = vnTime.getFullYear();
const startOfYear = new Date(year, 0, 1);
const day = Math.min(365, Math.max(1, Math.floor((vnTime - startOfYear) / (1000 * 60 * 60 * 24)) + 1));
const hour = vnTime.getHours();

const quotes = require('../quotes.json');
const quoteItem = quotes[day - 1] || quotes[0];

const greeting = hour < 12 ? '🌅 06:00 Khởi đầu ngày mới' : '⚡ 14:00 Nạp năng lượng chiều';
const payload = JSON.stringify({
  title: `${greeting} - Ngày ${day}/365`,
  body: `"${quoteItem.headline}"\n\n"${quoteItem.quote}"\n— ${quoteItem.author} (${quoteItem.category})`,
  url: './index.html',
  day: day
});

console.log(`Sending Daily Mindset Notification: [${greeting}] Day ${day}`);
console.log(`Headline: "${quoteItem.headline}"`);

const subFile = path.join(__dirname, '..', 'data', 'subscriptions.json');
let subscriptions = [];
if (fs.existsSync(subFile)) {
  try {
    subscriptions = JSON.parse(fs.readFileSync(subFile, 'utf-8'));
  } catch (e) {}
}

if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
  console.log('Chưa có thiết bị nào đăng ký nhận thông báo trong data/subscriptions.json.');
  process.exit(0);
}

console.log(`Broadcasting to ${subscriptions.length} subscribed devices...`);

Promise.allSettled(
  subscriptions.map(sub => webpush.sendNotification(sub, payload))
).then(results => {
  let success = 0;
  let failed = 0;
  results.forEach(r => {
    if (r.status === 'fulfilled') success++;
    else {
      failed++;
      console.warn('Send failure:', r.reason?.statusCode, r.reason?.message);
    }
  });
  console.log(`Done! Success: ${success}, Failed: ${failed}`);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
