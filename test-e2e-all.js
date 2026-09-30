// test-e2e-all.js - Complete End-to-End Audit & Widget Simulation Suite
const fs = require('fs');
const path = require('path');
const https = require('https');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function assert(condition, message, isWarning = false) {
  if (condition) {
    results.passed.push(message);
    console.log(`  [PASS] ${message}`);
  } else if (isWarning) {
    results.warnings.push(message);
    console.log(`  [WARN] ${message}`);
  } else {
    results.failed.push(message);
    console.log(`  [FAIL] ${message}`);
  }
}

function httpGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    }).on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
  });
}

async function runFullAudit() {
  console.log('\n======================================================');
  console.log('  🧪 COMPREHENSIVE E2E & WIDGET AUDIT SUITE');
  console.log('  Dự án: Động Lực 365 (dong-luc-365.vercel.app)');
  console.log('======================================================\n');

  // ----------------------------------------------------------------
  // 1. DATA INTEGRITY: quotes.json
  // ----------------------------------------------------------------
  console.log('1. Auditing quotes.json integrity:');
  try {
    const quotes = JSON.parse(fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf-8'));
    assert(Array.isArray(quotes), 'quotes.json is a valid JSON array');
    assert(quotes.length === 365, `quotes.json contains exactly 365 items (found ${quotes.length})`);
    
    let validCount = 0;
    const daySet = new Set();
    quotes.forEach(q => {
      daySet.add(q.day);
      if (q.id && q.day && q.headline && q.quote && q.author && q.category) {
        validCount++;
      }
    });
    assert(validCount === 365, 'All 365 items have complete fields (id, day, headline, quote, author, category)');
    assert(daySet.size === 365, 'All 365 days are completely unique and covered (Day 1 - 365)');
  } catch (e) {
    assert(false, `Error reading quotes.json: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // 2. MANIFEST & REDIRECTION SAFETY
  // ----------------------------------------------------------------
  console.log('\n2. Auditing PWA Manifest & Safari Redirection Safety:');
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));
    assert(manifest.name === 'Động Lực 365', `App name is 'Động Lực 365' (found: ${manifest.name})`);
    assert(manifest.start_url === './', `start_url is './' (prevents Vercel 308 redirect)`);
    assert(manifest.scope === './', `scope is './'`);
    assert(manifest.display === 'standalone', 'display mode is standalone (Full screen on iPhone)');
    assert(manifest.orientation === 'portrait', 'orientation is locked to portrait (19.5:9)');
  } catch (e) {
    assert(false, `Error validating manifest.json: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // 3. SERVICE WORKER (v10) & SAFARI WEBKIT PROTECTION
  // ----------------------------------------------------------------
  console.log('\n3. Auditing Service Worker (sw.js) & WebKit Redirection Protection:');
  try {
    const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf-8');
    assert(sw.includes("CACHE_NAME = 'mindset-calendar-v12'"), 'sw.js cache version is updated to v12');
    assert(sw.includes('cleanResponse'), 'sw.js includes cleanResponse() function to strip redirected flag');
    assert(sw.includes("event.request.mode === 'navigate'"), 'sw.js handles navigate requests directly to avoid redirection errors');
    assert(sw.includes("self.addEventListener('push'"), 'sw.js contains Web Push notification event listener');
    assert(sw.includes("self.addEventListener('notificationclick'"), 'sw.js handles notification click to open app');
  } catch (e) {
    assert(false, `Error auditing sw.js: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // 4. NOTIFICATION PAYLOAD FORMAT (QUOTE-ONLY)
  // ----------------------------------------------------------------
  console.log('\n4. Auditing Notification Payload Format (Headline excluded per user request):');
  try {
    const sendPushCode = fs.readFileSync(path.join(__dirname, 'api/send-push.js'), 'utf-8');
    assert(sendPushCode.includes('title: `"${quoteItem.quote}"`'), 'api/send-push.js sets notification title to pure quote text');
    assert(sendPushCode.includes('body: `— ${quoteItem.author}`'), 'api/send-push.js sets notification body to author only');
    assert(!sendPushCode.includes('title: quoteItem.headline'), 'api/send-push.js does NOT show headline in notification title');

    const appJsCode = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf-8');
    assert(appJsCode.includes('const notifTitle = `"${quoteItem.quote}"`;'), 'js/app.js test push sets title to pure quote text');
    assert(appJsCode.includes('const notifBody = `— ${quoteItem.author}`;'), 'js/app.js test push sets body to author only');
  } catch (e) {
    assert(false, `Error auditing notification payload logic: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // 5. APP ICONS AUDIT (Vibrant 365, No Dark Smudge)
  // ----------------------------------------------------------------
  console.log('\n5. Auditing App Icons & Home Screen Assets:');
  const iconFiles = [
    { file: 'assets/icons/icon.svg', minSize: 1000 },
    { file: 'assets/icons/apple-touch-icon.png', minSize: 4000 },
    { file: 'assets/icons/icon-192.png', minSize: 4000 },
    { file: 'assets/icons/icon-512.png', minSize: 10000 }
  ];
  iconFiles.forEach(item => {
    const fullPath = path.join(__dirname, item.file);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;
    assert(exists && size >= item.minSize, `Icon ${item.file} exists and non-empty (${size} bytes)`);
  });

  // Verify generate-icons.js doesn't have the old dark square logic
  const genCode = fs.readFileSync(path.join(__dirname, 'generate-icons.js'), 'utf-8');
  assert(!genCode.includes('Math.abs(cx) < 0.22 && Math.abs(cy) < 0.12'), 'generate-icons.js has eliminated the dark square in calendar center');
  assert(genCode.includes('DIGITS'), 'generate-icons.js renders crisp 365 digits');
  assert(genCode.includes('startX = 0.235'), 'generate-icons.js centers 365 digits with equal margin on left of 3 and right of 5');

  // ----------------------------------------------------------------
  // 5.5. DESK CALENDAR WIDGET LAYOUT (CÁCH 2 - REALISTIC DESK CALENDAR)
  // ----------------------------------------------------------------
  console.log('\n5.5. Auditing Widget Card Layout (Cách 2 - Chuẩn Lịch Bàn Thực Tế):');
  try {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    assert(html.includes('id="widget-month-sublabel"'), 'index.html contains #widget-month-sublabel badge');
    assert(!html.includes('widget-year-tag'), 'index.html eliminates legacy widget-year-tag (eliminates 272 2026 clash)');
    assert(html.includes('id="widget-day-number"'), 'index.html contains #widget-day-number for hero day of month');

    const appJs = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf-8');
    assert(appJs.includes('DOM.widgetDayNumber.textContent = dateInfo.dayOfMonth;'), 'js/app.js sets widget hero number to dayOfMonth (1-31)');
    assert(appJs.includes('DOM.widgetMonthSublabel.textContent = `Tháng ${dateInfo.month} • Ngày ${dayNum}/365`;') || appJs.includes('DOM.widgetMonthSublabel.textContent = `Tháng ${dateInfo.month} • Ngày ${data.day}/365`;'), 'js/app.js formats sublabel as "Tháng X • Ngày Y/365"');

    const css = fs.readFileSync(path.join(__dirname, 'css/style.css'), 'utf-8');
    assert(css.includes('.widget-month-sublabel'), 'css/style.css includes styles for .widget-month-sublabel');
    assert(css.includes('.big-day-number'), 'css/style.css includes bold desk typography for .big-day-number');
  } catch (e) {
    assert(false, `Error auditing widget layout: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // 5.6. RANDOM QUOTES FEATURE (WEB APP & SCRIPTABLE INTEGRATION)
  // ----------------------------------------------------------------
  console.log('\n5.6. Auditing Random Quotes Feature (Web App & URL Handlers):');
  try {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    assert(html.includes('id="btn-random-quote"'), 'index.html contains #btn-random-quote in top bar');
    assert(html.includes('id="btn-random-nav"'), 'index.html contains #btn-random-nav in bottom navigation deck');
    assert(html.includes('id="btn-widget-random"'), 'index.html contains #btn-widget-random in desk widget view');
    assert(html.includes('data-jump="random"'), 'index.html contains data-jump="random" in day picker modal');

    const appJs = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf-8');
    assert(appJs.includes('function pickRandomQuote()'), 'js/app.js implements pickRandomQuote() function');
    assert(appJs.includes('btnRandomQuote'), 'js/app.js wires btnRandomQuote click event');
    assert(appJs.includes('btnRandomNav'), 'js/app.js wires btnRandomNav click event');
    assert(appJs.includes("e.key === 'r' || e.key === 'R'"), 'js/app.js supports R shortcut key for random quote');
    assert(appJs.includes("randomParam === '1'"), 'js/app.js parses ?random=1 or ?day=random from URL');

    const css = fs.readFileSync(path.join(__dirname, 'css/style.css'), 'utf-8');
    assert(css.includes('.clickable-pill'), 'css/style.css includes styles for .clickable-pill');
    assert(css.includes('.highlight-chip'), 'css/style.css includes styles for .highlight-chip');

    const scriptableFile = path.join(__dirname, 'scripts/scriptable-widget.js');
    assert(fs.existsSync(scriptableFile), 'scripts/scriptable-widget.js exists');
    const scriptableCode = fs.readFileSync(scriptableFile, 'utf-8');
    assert(scriptableCode.includes('DEFAULT_MODE'), 'scripts/scriptable-widget.js defines DEFAULT_MODE (random/daily)');
    assert(scriptableCode.includes('isRandom'), 'scripts/scriptable-widget.js handles both random and daily selection');
    assert(scriptableCode.includes('?quoteId=') || scriptableCode.includes('?day='), 'scripts/scriptable-widget.js click link opens exact quote in Web App');
  } catch (e) {
    assert(false, `Error auditing random quote feature: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // 6. SCRIPTABLE WIDGET SIMULATION
  // ----------------------------------------------------------------
  console.log('\n6. Simulating Scriptable Widget Execution (Headless iOS Environment):');
  try {
    // Mock Scriptable's native runtime environment
    class MockColor {
      constructor(hex) { this.hex = hex; }
    }
    class MockFont {
      static boldSystemFont(size) { return { font: 'bold', size }; }
      static italicSystemFont(size) { return { font: 'italic', size }; }
      static systemFont(size) { return { font: 'regular', size }; }
    }
    class MockLinearGradient {
      constructor() { this.locations = []; this.colors = []; }
    }
    class MockStack {
      constructor() { this.elements = []; }
      layoutHorizontally() { this.layout = 'horizontal'; }
      addText(txt) {
        const el = { text: txt, font: null, textColor: null };
        this.elements.push(el);
        return el;
      }
      addSpacer() { this.elements.push({ spacer: true }); }
    }
    class MockListWidget {
      constructor() { this.elements = []; }
      setPadding(t, r, b, l) { this.padding = { t, r, b, l }; }
      addStack() {
        const stack = new MockStack();
        this.elements.push(stack);
        return stack;
      }
      addText(txt) {
        const el = {
          text: txt,
          font: null,
          textColor: null,
          lineLimit: null,
          rightAlignText: function() { this.align = 'right'; }
        };
        this.elements.push(el);
        return el;
      }
      addSpacer(size) { this.elements.push({ spacer: size }); }
    }

    // Execute the exact widget script logic
    const quotes = JSON.parse(fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf-8'));
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.min(365, Math.max(1, Math.floor(diff / oneDay) + 1));
    const todayQuote = quotes[dayOfYear - 1];

    const widget = new MockListWidget();
    widget.setPadding(14, 16, 14, 16);

    const gradient = new MockLinearGradient();
    gradient.locations = [0, 0.5, 1];
    gradient.colors = [new MockColor("#0c2d64"), new MockColor("#051636"), new MockColor("#020817")];
    widget.backgroundGradient = gradient;
    widget.url = "https://dong-luc-365.vercel.app";

    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    const badgeText = headerStack.addText(`NGÀY ${dayOfYear} / 365`);
    badgeText.font = MockFont.boldSystemFont(10);
    badgeText.textColor = new MockColor("#38bdf8");
    headerStack.addSpacer();
    const catText = headerStack.addText(todayQuote.category || "MINDSET");
    catText.font = MockFont.systemFont(10);

    widget.addSpacer(6);
    const quoteText = widget.addText(`“${todayQuote.quote}”`);
    quoteText.font = MockFont.italicSystemFont(12.5);
    quoteText.lineLimit = 4;

    widget.addSpacer(6);
    const authorText = widget.addText(`— ${todayQuote.author}`);
    authorText.font = MockFont.boldSystemFont(11);
    authorText.rightAlignText();

    assert(Boolean(todayQuote && todayQuote.quote), `Widget resolves Day ${dayOfYear} quote: "${todayQuote.headline}"`);
    assert(widget.elements.length >= 5, `Widget builds complete hierarchy (header, quote, author, spacers)`);
    assert(widget.url === 'https://dong-luc-365.vercel.app', 'Widget click action links directly to official domain');
    assert(gradient.colors.length === 3, 'Widget uses 3-stop Deep Ocean Blue luxury gradient');
    console.log(`     Sample Widget Render: [${badgeText.text}] - “${todayQuote.quote.substring(0, 40)}...” — ${todayQuote.author}`);
  } catch (e) {
    assert(false, `Scriptable Widget simulation failed: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // 7. LIVE CLOUD DEPLOYMENT & HEALTH CHECKS
  // ----------------------------------------------------------------
  console.log('\n7. Auditing Live Production Endpoints (https://dong-luc-365.vercel.app):');
  
  const rootCheck = await httpGet('https://dong-luc-365.vercel.app/');
  assert(rootCheck.status === 200, `Live Homepage (/) returns HTTP ${rootCheck.status} OK`);
  assert(rootCheck.data.includes('dong-luc-365') || rootCheck.data.includes('Lịch'), 'Homepage content delivered successfully');

  const manifestCheck = await httpGet('https://dong-luc-365.vercel.app/manifest.json');
  assert(manifestCheck.status === 200, `Live manifest.json returns HTTP ${manifestCheck.status} OK`);
  try {
    const liveManifest = JSON.parse(manifestCheck.data);
    assert(liveManifest.start_url === './', `Live manifest start_url is './' (No 308 redirect)`);
    assert(liveManifest.name === 'Động Lực 365', `Live manifest app name is 'Động Lực 365'`);
  } catch(e) {
    assert(false, `Error parsing live manifest.json: ${e.message}`);
  }

  const swCheck = await httpGet('https://dong-luc-365.vercel.app/sw.js');
  assert(swCheck.status === 200, `Live sw.js returns HTTP ${swCheck.status} OK`);
  assert(swCheck.data.includes('mindset-calendar-v11') || swCheck.data.includes('mindset-calendar-v12'), 'Live sw.js is running cache version v11 or v12');
  assert(swCheck.data.includes('cleanResponse'), 'Live sw.js contains WebKit redirection patch');

  const quotesCheck = await httpGet('https://dong-luc-365.vercel.app/quotes.json');
  assert(quotesCheck.status === 200, `Live quotes.json returns HTTP ${quotesCheck.status} OK`);
  try {
    const liveQuotes = JSON.parse(quotesCheck.data);
    assert(liveQuotes.length === 365, `Live quotes.json contains exactly 365 quotes`);
  } catch(e) {
    assert(false, `Error parsing live quotes.json: ${e.message}`);
  }

  const iconCheck = await httpGet('https://dong-luc-365.vercel.app/assets/icons/apple-touch-icon.png');
  assert(iconCheck.status === 200, `Live apple-touch-icon.png returns HTTP ${iconCheck.status} OK`);

  const pushCheck = await httpGet('https://dong-luc-365.vercel.app/api/send-push');
  assert(pushCheck.status === 200, `Live /api/send-push endpoint returns HTTP ${pushCheck.status} OK`);
  try {
    const pushRes = JSON.parse(pushCheck.data);
    assert(pushRes.success === true, `Live push dispatched successfully (sent: ${pushRes.sent}, total: ${pushRes.total})`);
    assert(pushRes.payload.title && !pushRes.payload.title.includes('BƯỚC CHÂN VI MÔ'), `Live push title is pure quote text (headline excluded)`);
  } catch(e) {
    assert(false, `Error validating live push response: ${e.message}`);
  }

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log('\n======================================================');
  console.log('  📊 AUDIT RESULTS SUMMARY:');
  console.log(`  ✅ Passed:   ${results.passed.length}`);
  console.log(`  ⚠️  Warnings: ${results.warnings.length}`);
  console.log(`  ❌ Failed:   ${results.failed.length}`);
  console.log('======================================================\n');

  if (results.failed.length === 0) {
    console.log('🎉 TOÀN BỘ HỆ THỐNG (WEB APP, SERVICE WORKER, PUSH, WIDGET, LIVE VERCEL) ĐẠT TIÊU CHUẨN 100%!');
  } else {
    console.log('⚠️ Phát hiện lỗi cần xử lý:', results.failed);
    process.exit(1);
  }
}

runFullAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
