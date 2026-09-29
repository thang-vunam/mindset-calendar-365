// scripts/send-daily-push.js - Automated daily broadcaster for GitHub Actions
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BJ6fr2VtgNn6m1N3pOXT0qgrL6fg-IxXI2AUbNcuiBuvhycdGESIA15DtpZ8Yc9Xh8r1TfOMZTB09jffUyJQOyM',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'https://dong-luc-365.vercel.app'
};

const localKeysPath = path.join(__dirname, '..', 'api', 'vapid-keys.json');
if (fs.existsSync(localKeysPath)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(localKeysPath, 'utf-8'));
    vapidKeys = { ...vapidKeys, ...loaded };
  } catch (e) {}
}

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

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

const payload = JSON.stringify({
  title: quoteItem.headline,
  body: `"${quoteItem.quote}"\n— ${quoteItem.author}`,
  url: './index.html',
  day: day
});

console.log(`Sending Daily Mindset Notification: Day ${day}`);
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

// Filter subscribers matching current hour if scheduled
const currentHourStr = String(vnTime.getHours()).padStart(2, '0');
const isForce = process.argv.includes('--force');
const targetSubs = isForce ? subscriptions : subscriptions.filter(sub => {
  const s = sub.settings;
  if (!s) return true; // default 06:00 & 14:00
  const match1 = s.enabled1 !== false && (s.time1 || '06:00').startsWith(currentHourStr);
  const match2 = s.enabled2 !== false && (s.time2 || '14:00').startsWith(currentHourStr);
  return match1 || match2;
});

console.log(`Broadcasting to ${targetSubs.length}/${subscriptions.length} subscribed devices for hour ${currentHourStr}:00...`);

Promise.allSettled(
  targetSubs.map(sub => webpush.sendNotification(sub, payload))
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
