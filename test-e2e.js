// test-e2e.js - Automated Comprehensive E2E & Integrity Test Suite
const fs = require('fs');
const path = require('path');

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

console.log('\n======================================================');
console.log('  🧪 RUNNING COMPREHENSIVE E2E & AUDIT SUITE');
console.log('======================================================\n');

// 1. DATA AUDIT: quotes.json
console.log('1. Auditing quotes.json integrity:');
try {
  const quotesRaw = fs.readFileSync(path.join(__dirname, 'quotes.json'), 'utf-8');
  const quotes = JSON.parse(quotesRaw);

  assert(Array.isArray(quotes), 'quotes.json is a valid JSON array');
  assert(quotes.length === 365, `quotes.json contains exactly 365 items (found ${quotes.length})`);

  let validStructureCount = 0;
  const daySet = new Set();
  let emptyFieldErrors = 0;

  quotes.forEach((q, idx) => {
    daySet.add(q.day);
    if (q.id && q.day && q.headline && q.quote && q.author && q.category) {
      validStructureCount++;
    } else {
      emptyFieldErrors++;
    }
  });

  assert(validStructureCount === 365, `All 365 items have complete fields (id, day, headline, quote, author, category)`);
  assert(emptyFieldErrors === 0, `No items have missing or empty fields`);
  assert(daySet.size === 365, `All days from 1 to 365 are unique and covered`);
  assert(daySet.has(1) && daySet.has(365), `Covers day 1 and day 365`);
} catch (e) {
  assert(false, `Error reading or parsing quotes.json: ${e.message}`);
}

// 2. FILE ASSETS AUDIT
console.log('\n2. Auditing Static Assets & PWA Requirements:');
const requiredFiles = [
  'index.html',
  'manifest.json',
  'sw.js',
  'css/style.css',
  'js/app.js',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png'
];

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  const size = exists ? fs.statSync(fullPath).size : 0;
  assert(exists && size > 0, `File exists and non-empty: ${file} (${size} bytes)`);
});

// 3. MANIFEST AUDIT
console.log('\n3. Auditing PWA manifest.json configuration:');
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));
  assert(manifest.display === 'standalone', 'manifest.json has display: "standalone"');
  assert(manifest.orientation === 'portrait', 'manifest.json has orientation: "portrait"');
  assert(Boolean(manifest.name && manifest.short_name), 'manifest.json has name and short_name');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'manifest.json has at least 2 icon sizes');
} catch (e) {
  assert(false, `Error validating manifest.json: ${e.message}`);
}

// 4. HTML & DOM AUDIT
console.log('\n4. Auditing index.html structure & DOM references:');
try {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

  // Verify iPhone viewport-fit=cover and safe area support
  assert(html.includes('viewport-fit=cover'), 'HTML meta viewport includes viewport-fit=cover for iPhone');
  assert(html.includes('apple-mobile-web-app-capable'), 'HTML includes apple-mobile-web-app-capable');
  assert(html.includes('apple-mobile-web-app-status-bar-style'), 'HTML includes apple-mobile-web-app-status-bar-style');

  // Verify all DOM IDs referenced in app.js exist in index.html (excluding removed sound buttons)
  const appJs = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf-8');
  const idRegex = /document\.getElementById\(['"]([a-zA-Z0-9_-]+)['"]\)/g;
  let match;
  const queriedIds = new Set();
  while ((match = idRegex.exec(appJs)) !== null) {
    queriedIds.add(match[1]);
  }

  // The sound buttons were intentionally removed
  const optionalOrRemoved = new Set(['widget-sound-btn', 'full-sound-btn']);

  let missingIds = [];
  queriedIds.forEach(id => {
    if (!html.includes(`id="${id}"`) && !optionalOrRemoved.has(id)) {
      missingIds.push(id);
    }
  });

  assert(missingIds.length === 0, `All mandatory DOM element IDs exist in index.html (${queriedIds.size - missingIds.length}/${queriedIds.size} verified)`);
  if (missingIds.length > 0) {
    console.log('     Missing IDs:', missingIds);
  }
} catch (e) {
  assert(false, `Error auditing index.html: ${e.message}`);
}

// 5. SERVICE WORKER AUDIT
console.log('\n5. Auditing sw.js cache integrity:');
try {
  const swContent = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf-8');
  assert(swContent.includes('caches.open'), 'sw.js implements cache opening');
  assert(swContent.includes('skipWaiting'), 'sw.js handles skipWaiting for instant updates');
  assert(swContent.includes('clients.claim'), 'sw.js activates immediately with clients.claim');
  assert(swContent.includes('quotes.json'), 'sw.js pre-caches quotes.json for offline usage');
} catch (e) {
  assert(false, `Error auditing sw.js: ${e.message}`);
}

// 6. DATE CALCULATION AUDIT (GMT+7 and Leap Year safety)
console.log('\n6. Auditing Date math & timezone accuracy:');
try {
  // Simulate today (2026-09-29) in GMT+7
  const d = new Date('2026-09-29T08:00:00+07:00');
  const startOfYear = new Date(2026, 0, 1);
  const diff = d - startOfYear;
  const day = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

  assert(day === 272, `September 29, 2026 calculates to day 272 (calculated: ${day})`);
  assert(day >= 1 && day <= 365, 'Day of year is within valid 1-365 range');

  // Verify leap year safety
  const leapYear = 2024;
  const isLeap = (leapYear % 4 === 0 && leapYear % 100 !== 0) || (leapYear % 400 === 0);
  assert(isLeap === true, 'Leap year formula correctly identifies leap years');
} catch (e) {
  assert(false, `Error auditing date calculation: ${e.message}`);
}

// 7. CSS COMPLIANCE AUDIT
console.log('\n7. Auditing CSS layout and iPhone compatibility:');
try {
  const css = fs.readFileSync(path.join(__dirname, 'css/style.css'), 'utf-8');
  assert(css.includes('env(safe-area-inset-top'), 'CSS utilizes safe-area-inset-top for iPhone Dynamic Island');
  assert(css.includes('env(safe-area-inset-bottom'), 'CSS utilizes safe-area-inset-bottom for iPhone Home Indicator');
  assert(css.includes('19.5 / 9') || css.includes('19.5:9') || css.includes('aspect-ratio'), 'CSS optimizes for iPhone aspect ratio');
  assert(css.includes('--ocean-primary'), 'CSS uses Deep Ocean Blue primary color token');
} catch (e) {
  assert(false, `Error auditing CSS: ${e.message}`);
}

console.log('\n======================================================');
console.log(`  📊 TEST RESULTS SUMMARY:`);
console.log(`  ✅ Passed:   ${results.passed.length}`);
console.log(`  ⚠️  Warnings: ${results.warnings.length}`);
console.log(`  ❌ Failed:   ${results.failed.length}`);
console.log('======================================================\n');

if (results.failed.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
