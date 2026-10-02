// api/sync-quote.js - Cloud Sync Engine between Scriptable Widget, Safari & PWA
const https = require('https');
const path = require('path');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OWNER = 'thang-vunam';
const REPO = 'mindset-calendar-365';
const FILE_PATH = 'data/today-choice.json';

// In-memory cache for ultra-low latency across warm lambda invocations
let memCache = {
  day: null,
  quoteId: null,
  isCustom: false,
  updatedAt: 0,
  sha: null
};

function githubRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Mindset-Calendar-SyncEngine',
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
          resolve(null); // Fallback gracefully if file not found or rate limited
        }
      });
    });
    req.on('error', () => resolve(null));
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

function calculateCurrentDayOfYear() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const vnTime = new Date(utc + (3600000 * 7));
  const year = vnTime.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const day = Math.min(365, Math.max(1, Math.floor((vnTime - startOfYear) / (1000 * 60 * 60 * 24)) + 1));
  return { day, year };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { day: todayDay } = calculateCurrentDayOfYear();

  // Load quotes dataset
  let quotes = [];
  try {
    quotes = require('../quotes.json');
  } catch (e) {
    try {
      quotes = JSON.parse(fs.readFileSync(path.join(__dirname, '../quotes.json'), 'utf-8'));
    } catch (err) {}
  }

  // 1. GET: Fetch current active synced quote for today
  if (req.method === 'GET') {
    // If memCache has today's choice and is fresh (< 30s), return it immediately
    const now = Date.now();
    if (memCache.day === todayDay && (now - memCache.updatedAt < 30000) && memCache.quoteId) {
      const q = quotes.find(item => item.id === memCache.quoteId) || quotes[todayDay - 1];
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
      return res.status(200).json({
        day: todayDay,
        quoteId: memCache.quoteId,
        isCustom: memCache.isCustom,
        quote: q,
        source: 'cache'
      });
    }

    // Otherwise, check GitHub data/today-choice.json
    try {
      const remote = await githubRequest('GET', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`);
      if (remote && remote.content) {
        const parsed = JSON.parse(Buffer.from(remote.content, 'base64').toString('utf-8'));
        memCache.sha = remote.sha;
        if (parsed.day === todayDay && parsed.quoteId) {
          memCache.day = todayDay;
          memCache.quoteId = parsed.quoteId;
          memCache.isCustom = Boolean(parsed.isCustom);
          memCache.updatedAt = Date.now();

          const q = quotes.find(item => item.id === parsed.quoteId) || quotes[todayDay - 1];
          res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
          return res.status(200).json({
            day: todayDay,
            quoteId: parsed.quoteId,
            isCustom: parsed.isCustom,
            quote: q,
            source: 'cloud'
          });
        }
      }
    } catch (e) {}

    // Default: Return today's standard quote
    const defaultQuote = quotes[todayDay - 1] || quotes[0];
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
    return res.status(200).json({
      day: todayDay,
      quoteId: defaultQuote ? defaultQuote.id : todayDay,
      isCustom: false,
      quote: defaultQuote,
      source: 'default'
    });
  }

// Sliding window in-memory rate limiter against DDoS & token exhaustion
const ipRequests = new Map();
function isRateLimited(ip, maxPerMinute = 30) {
  const now = Date.now();
  const history = ipRequests.get(ip) || [];
  const recent = history.filter(t => now - t < 60000);
  if (recent.length >= maxPerMinute) return true;
  recent.push(now);
  ipRequests.set(ip, recent);
  return false;
}

  // 2. POST: Set active synced quote for today (from Scriptable, Safari or PWA)
  if (req.method === 'POST') {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp, 30)) {
      return res.status(429).json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút (Too many requests, rate limit exceeded)' });
    }

    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }
      body = body || {};

      const newQuoteId = parseInt(body.quoteId, 10);
      if (isNaN(newQuoteId) || newQuoteId < 1 || newQuoteId > 365) {
        return res.status(400).json({ error: 'Invalid quoteId (1-365)' });
      }

      const isCustom = body.isCustom !== undefined ? Boolean(body.isCustom) : true;
      const payload = {
        day: todayDay,
        quoteId: newQuoteId,
        isCustom: isCustom,
        updatedAt: new Date().toISOString()
      };

      // Update memory cache immediately
      memCache.day = todayDay;
      memCache.quoteId = newQuoteId;
      memCache.isCustom = isCustom;
      memCache.updatedAt = Date.now();

      // Persist to GitHub asynchronously
      try {
        let sha = memCache.sha;
        if (!sha) {
          const remote = await githubRequest('GET', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`);
          if (remote && remote.sha) sha = remote.sha;
        }

        const updateData = {
          message: `sync: update today quote to #${newQuoteId} (Day ${todayDay})`,
          content: Buffer.from(JSON.stringify(payload, null, 2)).toString('base64'),
          branch: 'main'
        };
        if (sha) updateData.sha = sha;

        const writeRes = await githubRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, updateData);
        if (writeRes && writeRes.content && writeRes.content.sha) {
          memCache.sha = writeRes.content.sha;
        }
      } catch (err) {
        console.warn('[SyncEngine] GitHub write fallback:', err.message);
      }

      const q = quotes.find(item => item.id === newQuoteId) || quotes[todayDay - 1];
      return res.status(200).json({
        success: true,
        synced: payload,
        quote: q
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
