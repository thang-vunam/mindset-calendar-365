// api/subscribe.js - Handles Web Push subscription registration
const fs = require('fs');
const path = require('path');
const https = require('https');

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

const ipRequests = new Map();
function isRateLimited(ip, maxPerMinute = 15) {
  const now = Date.now();
  const history = ipRequests.get(ip) || [];
  const recent = history.filter(t => now - t < 60000);
  if (recent.length >= maxPerMinute) return true;
  recent.push(now);
  ipRequests.set(ip, recent);
  return false;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp, 15)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { subscription, settings } = body || {};
    if (!subscription || !subscription.endpoint || typeof subscription.endpoint !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid subscription endpoint' });
    }

    // SSRF & Malformed payload protection
    if (!subscription.endpoint.startsWith('https://') || subscription.endpoint.length > 500) {
      return res.status(400).json({ error: 'Endpoint must be a valid secure HTTPS URL' });
    }

    // Try fetching existing subscriptions from GitHub repository
    let subscriptions = [];
    let fileSha = null;

    try {
      const fileData = await githubRequest('GET', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`);
      fileSha = fileData.sha;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      subscriptions = JSON.parse(content);
      if (!Array.isArray(subscriptions)) subscriptions = [];
    } catch (e) {
      console.warn('Could not read subscriptions from GitHub, trying local file fallback:', e.message);
      const localFile = path.join(__dirname, '..', 'data', 'subscriptions.json');
      if (fs.existsSync(localFile)) {
        try {
          subscriptions = JSON.parse(fs.readFileSync(localFile, 'utf-8'));
        } catch (err) {}
      }
    }

    // Deduplicate subscription by endpoint
    const existingIndex = subscriptions.findIndex(s => s.endpoint === subscription.endpoint);
    const subRecord = {
      ...subscription,
      settings: settings || { enabled1: true, time1: '06:00', enabled2: true, time2: '14:00' },
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      subscriptions[existingIndex] = subRecord;
    } else {
      subscriptions.push(subRecord);
    }

    // Save back to GitHub
    try {
      const updatedContentBase64 = Buffer.from(JSON.stringify(subscriptions, null, 2), 'utf-8').toString('base64');
      await githubRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
        message: 'Update push subscription',
        content: updatedContentBase64,
        sha: fileSha || undefined
      });
      console.log('Saved subscription to GitHub successfully.');
    } catch (err) {
      console.warn('Could not persist to GitHub:', err.message);
    }

    // Auto-update vercel.json on GitHub so Vercel crons match user's custom times!
    if (settings && GITHUB_TOKEN) {
      try {
        const vercelData = await githubRequest('GET', `/repos/${OWNER}/${REPO}/contents/vercel.json`);
        const vercelConfig = JSON.parse(Buffer.from(vercelData.content, 'base64').toString('utf-8'));

        function toUtcCron(timeStr) {
          const parts = (timeStr || '06:00').split(':').map(Number);
          const h = isNaN(parts[0]) ? 6 : parts[0];
          const m = isNaN(parts[1]) ? 0 : parts[1];
          const utcH = (h - 7 + 24) % 24;
          return `${m} ${utcH} * * *`;
        }

        const crons = [];
        if (settings.enabled1 !== false && settings.time1) {
          crons.push({
            path: '/api/send-push',
            schedule: toUtcCron(settings.time1)
          });
        }
        if (settings.enabled2 !== false && settings.time2) {
          crons.push({
            path: '/api/send-push',
            schedule: toUtcCron(settings.time2)
          });
        }

        if (crons.length > 0) {
          vercelConfig.crons = crons;
          const updatedVercelBase64 = Buffer.from(JSON.stringify(vercelConfig, null, 2), 'utf-8').toString('base64');
          await githubRequest('PUT', `/repos/${OWNER}/${REPO}/contents/vercel.json`, {
            message: `Update Vercel Crons to [${settings.time1 || '06:00'}, ${settings.time2 || '14:00'}] VN`,
            content: updatedVercelBase64,
            sha: vercelData.sha
          });
          console.log('Successfully updated vercel.json cron schedule on GitHub!');
        }
      } catch (cronErr) {
        console.warn('Could not auto-update vercel.json crons:', cronErr.message);
      }
    }

    // Also update local file if running locally
    try {
      const localFile = path.join(__dirname, '..', 'data', 'subscriptions.json');
      fs.writeFileSync(localFile, JSON.stringify(subscriptions, null, 2), 'utf-8');
    } catch (err) {}

    return res.status(200).json({
      success: true,
      message: 'Subscription saved successfully',
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: error.message });
  }
};
