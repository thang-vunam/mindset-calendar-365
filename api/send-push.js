// api/send-push.js - Dispatches Web Push notifications to all subscribed devices
const fs = require('fs');
const path = require('path');
const https = require('https');
const webpush = require('web-push');

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BJ6fr2VtgNn6m1N3pOXT0qgrL6fg-IxXI2AUbNcuiBuvhycdGESIA15DtpZ8Yc9Xh8r1TfOMZTB09jffUyJQOyM',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'https://dong-luc-365.vercel.app'
};

const localKeysPath = path.join(__dirname, 'vapid-keys.json');
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = 'thang-vunam';
const REPO = 'mindset-calendar-365';
const FILE_PATH = 'data/subscriptions.json';

function githubRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Mindset-Calendar-App',
        'Accept': 'application/vnd.github.v3+json',
        ...(dataStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(chunks); } catch(e) { parsed = chunks; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
        }
      });
    });
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

function getTodayQuote() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const vnTime = new Date(utc + (3600000 * 7));
  const year = vnTime.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const day = Math.min(365, Math.max(1, Math.floor((vnTime - startOfYear) / (1000 * 60 * 60 * 24)) + 1));

  const quotes = require('../quotes.json');
  const quoteItem = quotes[day - 1] || quotes[0];

  return {
    day,
    title: `"${quoteItem.quote}"`,
    body: `— ${quoteItem.author}`,
    category: quoteItem.category
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. Get subscriptions
    let subscriptions = [];
    try {
      const fileData = await githubRequest('GET', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`);
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      subscriptions = JSON.parse(content);
    } catch (e) {
      const localFile = path.join(__dirname, '..', 'data', 'subscriptions.json');
      if (fs.existsSync(localFile)) {
        subscriptions = JSON.parse(fs.readFileSync(localFile, 'utf-8'));
      }
    }

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        sent: 0,
        message: 'Chưa có thiết bị nào đăng ký nhận thông báo (No subscriptions registered)'
      });
    }

    // 2. Prepare payload
    let customPayload = null;
    if (req.method === 'POST' && req.body) {
      let b = req.body;
      if (typeof b === 'string') try { b = JSON.parse(b); } catch(e) {}
      if (b.title || b.body) customPayload = b;
    }

    const todayInfo = getTodayQuote();
    const payload = JSON.stringify({
      title: customPayload?.title || todayInfo.title,
      body: customPayload?.body || todayInfo.body,
      url: './index.html',
      day: todayInfo.day,
      category: todayInfo.category
    });

    // 3. Send to all devices
    const results = await Promise.allSettled(
      subscriptions.map(sub => webpush.sendNotification(sub, payload))
    );

    let successCount = 0;
    let failedCount = 0;
    const deadEndpoints = [];

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        successCount++;
      } else {
        failedCount++;
        const statusCode = r.reason?.statusCode;
        // 404 or 410 Gone means user unsubscribed or expired
        if (statusCode === 404 || statusCode === 410) {
          deadEndpoints.push(subscriptions[idx].endpoint);
        }
      }
    });

    return res.status(200).json({
      success: true,
      sent: successCount,
      failed: failedCount,
      total: subscriptions.length,
      payload: JSON.parse(payload)
    });
  } catch (error) {
    console.error('Send push error:', error);
    return res.status(500).json({ error: error.message });
  }
};
