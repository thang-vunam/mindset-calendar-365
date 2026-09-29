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

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { subscription } = body || {};
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Missing subscription endpoint' });
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
