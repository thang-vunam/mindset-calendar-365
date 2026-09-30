/**
 * Lịch Để Bàn 365 - Mindset Fuel
 * Progressive Web App logic
 */

(function () {
  'use strict';

  // Application State
  const state = {
    quotes: [],
    currentDay: 1,      // 1 to 365
    todayDayOfYear: 1,  // Real-time day of year
    currentYear: 2026,
    isExpanded: false,
    soundEnabled: false,
    favorites: new Set(),
    isAnimating: false,
    audioContext: null,
    customQuotes: {},   // Maps dayNum -> user selected quote for this day
    currentQuoteData: null
  };

  // DOM Elements
  const DOM = {
    deviceWrapper: document.getElementById('device-wrapper'),
    appContainer: document.getElementById('app-container'),
    toggleFrameBtn: document.getElementById('toggle-frame-btn'),
    frameToggleText: document.getElementById('frame-toggle-text'),
    
    // Widget View
    widgetView: document.getElementById('widget-view'),
    widgetCard: document.getElementById('widget-calendar-card'),
    widgetDayBadge: document.getElementById('widget-day-badge'),
    widgetDateText: document.getElementById('widget-date-text'),
    widgetDayNumber: document.getElementById('widget-day-number'),
    widgetMonthSublabel: document.getElementById('widget-month-sublabel'),
    widgetHeadline: document.getElementById('widget-headline-text'),
    widgetAuthor: document.getElementById('widget-author-text'),
    widgetProgressPercent: document.getElementById('widget-progress-percent'),
    widgetCategoryLabel: document.getElementById('widget-category-label'),
    btnWidgetRandom: document.getElementById('btn-widget-random'),

    // Full View
    fullView: document.getElementById('full-view'),
    btnCollapseView: document.getElementById('btn-collapse-view'),
    headerDayCounter: document.getElementById('header-day-counter'),
    btnRandomQuote: document.getElementById('btn-random-quote'),
    btnRandomNav: document.getElementById('btn-random-nav'),
    btnFavorite: document.getElementById('btn-favorite'),
    favoriteHeartIcon: document.getElementById('favorite-heart-icon'),
    btnShare: document.getElementById('btn-share'),
    btnNotifyToggle: document.getElementById('btn-notify-toggle'),
    bellBadgeDot: document.getElementById('bell-badge-dot'),
    
    calendarCardFlipper: document.getElementById('calendar-card-flipper'),
    fullCategoryTag: document.getElementById('full-category-tag'),
    fullActionHeadline: document.getElementById('full-action-headline'),
    mandalaBadge: document.getElementById('mandala-badge'),
    cardFormattedDate: document.getElementById('card-formatted-date'),
    cardDayIndicator: document.getElementById('card-day-indicator'),
    fullQuoteText: document.getElementById('full-quote-text'),
    fullAuthorName: document.getElementById('full-author-name'),
    fullCategoryPill: document.getElementById('full-category-pill'),
    progressPercentageLabel: document.getElementById('progress-percentage-label'),
    progressFillBar: document.getElementById('progress-fill-bar'),

    // Navigation
    btnPrevDay: document.getElementById('btn-prev-day'),
    btnNextDay: document.getElementById('btn-next-day'),
    btnToday: document.getElementById('btn-today'),
    btnOpenPicker: document.getElementById('btn-open-picker'),

    // Day Picker Modal
    dayPickerModal: document.getElementById('day-picker-modal'),
    btnClosePicker: document.getElementById('btn-close-picker'),
    tabBtnDayNum: document.getElementById('tab-btn-day-num'),
    tabBtnCalendar: document.getElementById('tab-btn-calendar'),
    tabContentDayNum: document.getElementById('tab-content-day-num'),
    tabContentCalendar: document.getElementById('tab-content-calendar'),
    daySliderInput: document.getElementById('day-slider-input'),
    sliderDayPreview: document.getElementById('slider-day-preview'),
    calendarDateInput: document.getElementById('calendar-date-input'),
    btnApplyDay: document.getElementById('btn-apply-day'),

    // Toast
    appToast: document.getElementById('app-toast'),
    toastMessage: document.getElementById('toast-message'),

    // Notify Modal
    notifyModal: document.getElementById('notify-modal'),
    btnCloseNotify: document.getElementById('btn-close-notify'),
    btnRequestPush: document.getElementById('btn-request-push'),
    btnTestPush: document.getElementById('btn-test-push'),
    notifyStatusDot: document.getElementById('notify-status-dot'),
    notifyStatusText: document.getElementById('notify-status-text'),
    notifySlot1Enable: document.getElementById('notify-slot1-enable'),
    notifyTime1: document.getElementById('notify-time-1'),
    notifySlot2Enable: document.getElementById('notify-slot2-enable'),
    notifyTime2: document.getElementById('notify-time-2'),
    iosPreviewHint: document.getElementById('ios-preview-hint')
  };

  /**
   * 1. Date & Timezone Utilities
   * Automatically calculates current day of year (1-365) in client's time (Vietnam GMT+7)
   */
  function calculateCurrentDayOfYear() {
    const now = new Date();
    // Offset for Vietnam (GMT+7)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vnTime = new Date(utc + (3600000 * 7));
    
    state.currentYear = vnTime.getFullYear();
    const startOfYear = new Date(state.currentYear, 0, 1);
    const diff = vnTime - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    let day = Math.floor(diff / oneDay) + 1;

    // Clamp between 1 and 365 (or 366 for leap years)
    const isLeap = (state.currentYear % 4 === 0 && state.currentYear % 100 !== 0) || (state.currentYear % 400 === 0);
    const maxDays = isLeap ? 366 : 365;
    day = Math.max(1, Math.min(day, maxDays));
    
    return { day, vnTime, maxDays };
  }

  /**
   * Format day of year into friendly Vietnamese date string
   * e.g., "Thứ Hai, 28 Tháng 9, 2026"
   */
  function getDateFromDayOfYear(dayOfYear, year = state.currentYear) {
    const date = new Date(year, 0, dayOfYear);
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysOfWeek[date.getDay()];
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    
    return {
      date,
      year,
      dayName,
      formattedShort: `${dayName}, ${dayOfMonth.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
      formattedLong: `${dayName}, ${dayOfMonth} Tháng ${month}, ${year}`,
      dayOfMonth,
      month,
      isoDate: `${year}-${month.toString().padStart(2, '0')}-${dayOfMonth.toString().padStart(2, '0')}`
    };
  }

  /**
   * Convert YYYY-MM-DD back to Day of Year
   */
  function getDayOfYearFromDate(isoDateStr) {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const start = new Date(y, 0, 1);
    const diff = target - start;
    const day = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(day, 365));
  }

  /**
   * 2. Web Audio API Synthetic Sound Generator
   * Generates paper turn and soft click without needing external audio files
   */
  function playPaperTurnSound() {
    if (!state.soundEnabled) return;

    try {
      if (!state.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          state.audioContext = new AudioCtx();
        }
      }

      if (state.audioContext && state.audioContext.state === 'suspended') {
        state.audioContext.resume();
      }

      if (!state.audioContext) return;

      const ctx = state.audioContext;
      const now = ctx.currentTime;

      // Create white noise buffer for crisp paper swoosh
      const bufferSize = ctx.sampleRate * 0.12; // 120ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      // Bandpass filter to give organic paper rustle
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.12);
      filter.Q.setValueAtTime(1.5, now);

      // Gain envelope
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * 3. Geometric / Mandala Minimalist SVG Generator
   * Dynamically generates intricate, elegant sacred geometry based on day number and category
   */
  function generateMandalaSVG(dayIndex, category) {
    const palette = [
      { primary: '#0284c7', secondary: '#38bdf8', accent: '#38bdf8' }, // Sapphire & Cyan
      { primary: '#0369a1', secondary: '#7dd3fc', accent: '#2dd4bf' }, // Deep Marine & Aquamarine
      { primary: '#1e3a8a', secondary: '#60a5fa', accent: '#38bdf8' }, // Royal Navy & Electric Cyan
      { primary: '#0c4a6e', secondary: '#0ea5e9', accent: '#67e8f9' }  // Deep Oceanic Teal & Sky
    ];

    const colors = palette[dayIndex % palette.length];
    const mandalaType = dayIndex % 4;

    let innerGraphic = '';

    if (mandalaType === 0) {
      // Style 1: Stoic Compass / Star of Purpose (8-fold geometric rays)
      innerGraphic = `
        <g class="mandala-rotor">
          <circle cx="100" cy="100" r="70" stroke="${colors.secondary}" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.6"/>
          <circle cx="100" cy="100" r="54" stroke="${colors.primary}" stroke-width="1.5" opacity="0.8"/>
          <circle cx="100" cy="100" r="38" stroke="${colors.accent}" stroke-width="1" opacity="0.9"/>
          
          <!-- 8 Compass Petals -->
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
            <g transform="rotate(${deg} 100 100)">
              <path d="M 100 24 L 108 80 L 100 100 L 92 80 Z" fill="${deg % 90 === 0 ? colors.primary : colors.secondary}" opacity="0.85"/>
              <line x1="100" y1="20" x2="100" y2="10" stroke="${colors.accent}" stroke-width="2" stroke-linecap="round"/>
              <circle cx="100" cy="8" r="2.5" fill="${colors.accent}"/>
            </g>
          `).join('')}

          <circle cx="100" cy="100" r="12" fill="${colors.primary}" />
          <circle cx="100" cy="100" r="6" fill="#ffffff" />
        </g>
      `;
    } else if (mandalaType === 1) {
      // Style 2: Sacred Flower of Life / Overlapping Circles
      innerGraphic = `
        <g class="mandala-rotor">
          <circle cx="100" cy="100" r="76" stroke="${colors.primary}" stroke-width="1.5" opacity="0.6" stroke-dasharray="6,4"/>
          <circle cx="100" cy="100" r="48" stroke="${colors.secondary}" stroke-width="1.2"/>
          
          <!-- 6 Overlapping Sacred Petals -->
          ${[0, 60, 120, 180, 240, 300].map(deg => `
            <g transform="rotate(${deg} 100 100)">
              <circle cx="100" cy="68" r="32" stroke="${colors.primary}" stroke-width="1.2" fill="none" opacity="0.75"/>
              <circle cx="100" cy="40" r="3" fill="${colors.accent}"/>
            </g>
          `).join('')}

          <polygon points="100,72 124,114 76,114" stroke="${colors.accent}" stroke-width="1.5" fill="none" opacity="0.8"/>
          <polygon points="100,128 124,86 76,86" stroke="${colors.accent}" stroke-width="1.5" fill="none" opacity="0.8"/>
          
          <circle cx="100" cy="100" r="8" fill="${colors.primary}"/>
          <circle cx="100" cy="100" r="3.5" fill="#ffffff"/>
        </g>
      `;
    } else if (mandalaType === 2) {
      // Style 3: Concentric Sunburst / Mindset Radiance
      innerGraphic = `
        <g class="mandala-rotor">
          <circle cx="100" cy="100" r="80" stroke="${colors.secondary}" stroke-width="1" opacity="0.4"/>
          <circle cx="100" cy="100" r="60" stroke="${colors.primary}" stroke-width="1.5" opacity="0.8"/>
          
          <!-- 12 Radiating Sun Ray Flares -->
          ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => `
            <g transform="rotate(${deg} 100 100)">
              <line x1="100" y1="36" x2="100" y2="18" stroke="${i % 2 === 0 ? colors.primary : colors.accent}" stroke-width="${i % 2 === 0 ? '2' : '1.2'}" stroke-linecap="round"/>
              <circle cx="100" cy="14" r="2" fill="${colors.secondary}"/>
              <path d="M 96 68 Q 100 48 104 68 Z" fill="${colors.primary}" opacity="0.7"/>
            </g>
          `).join('')}

          <circle cx="100" cy="100" r="28" stroke="${colors.accent}" stroke-width="1.8" fill="none"/>
          <circle cx="100" cy="100" r="14" fill="${colors.primary}"/>
          <circle cx="100" cy="100" r="5" fill="#ffffff"/>
        </g>
      `;
    } else {
      // Style 4: Minimalist Metatron Octagram / Diamond Matrix
      innerGraphic = `
        <g class="mandala-rotor">
          <circle cx="100" cy="100" r="74" stroke="${colors.primary}" stroke-width="1.2" opacity="0.7"/>
          
          <!-- Concentric Squares Rotated 45deg -->
          <rect x="52" y="52" width="96" height="96" stroke="${colors.primary}" stroke-width="1.5" fill="none" opacity="0.8"/>
          <rect x="52" y="52" width="96" height="96" stroke="${colors.secondary}" stroke-width="1.5" fill="none" transform="rotate(45 100 100)" opacity="0.8"/>
          <rect x="68" y="68" width="64" height="64" stroke="${colors.accent}" stroke-width="1" fill="none" transform="rotate(22.5 100 100)" opacity="0.9"/>
          
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
            <circle cx="${100 + 74 * Math.cos(deg * Math.PI / 180)}" cy="${100 + 74 * Math.sin(deg * Math.PI / 180)}" r="4" fill="${colors.primary}"/>
          `).join('')}

          <circle cx="100" cy="100" r="10" fill="${colors.accent}"/>
          <circle cx="100" cy="100" r="4" fill="#090d16"/>
        </g>
      `;
    }

    return `
      <svg class="mandala-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-${dayIndex}" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        ${innerGraphic}
      </svg>
    `;
  }

  /**
   * 4. UI Rendering: Update both Collapsed and Expanded States
   */
  function renderQuote(dayNum, animateDirection = null, quoteOverride = null) {
    if (!state.quotes || state.quotes.length === 0) return;

    // Day is 1-indexed (1 to 365) representing the real CALENDAR DATE
    const defaultIndex = Math.max(0, Math.min(dayNum - 1, state.quotes.length - 1));
    const defaultData = state.quotes[defaultIndex];
    if (!defaultData) return;

    // The quote content: either override, or custom quote for this day, or default
    const data = quoteOverride || (state.customQuotes && state.customQuotes[dayNum]) || defaultData;
    state.currentQuoteData = data;
    state.currentDay = dayNum;

    // The calendar date info is ALWAYS strictly calculated based on dayNum (e.g. today)!
    const dateInfo = getDateFromDayOfYear(dayNum, state.currentYear);
    const progressPercent = ((dayNum / 365) * 100).toFixed(1);

    // Apply animation classes to Expanded Card if requested
    if (animateDirection && DOM.calendarCardFlipper) {
      DOM.calendarCardFlipper.classList.remove('flip-left-out', 'flip-left-in', 'flip-right-out', 'flip-right-in');
      
      const outClass = animateDirection === 'next' ? 'flip-left-out' : 'flip-right-out';
      const inClass = animateDirection === 'next' ? 'flip-left-in' : 'flip-right-in';

      DOM.calendarCardFlipper.classList.add(outClass);

      setTimeout(() => {
        applyDataToDOM();
        DOM.calendarCardFlipper.classList.remove(outClass);
        DOM.calendarCardFlipper.classList.add(inClass);

        setTimeout(() => {
          DOM.calendarCardFlipper.classList.remove(inClass);
        }, 300);
      }, 150);
    } else {
      applyDataToDOM();
    }

    function applyDataToDOM() {
      // 1. Update Widget View (Date is strictly dayNum, quote content is data)
      DOM.widgetDayBadge.textContent = dateInfo.dayName ? dateInfo.dayName.toUpperCase() : `NGÀY ${dayNum} / 365`;
      DOM.widgetDateText.textContent = `NĂM ${dateInfo.year || state.currentYear}`;
      DOM.widgetDayNumber.textContent = dateInfo.dayOfMonth;
      if (DOM.widgetMonthSublabel) {
        DOM.widgetMonthSublabel.textContent = `Tháng ${dateInfo.month} • Ngày ${dayNum}/365`;
      }
      DOM.widgetHeadline.textContent = data.headline;
      DOM.widgetAuthor.textContent = data.author;
      DOM.widgetProgressPercent.textContent = `${progressPercent}%`;
      DOM.widgetCategoryLabel.textContent = data.category;

      // 2. Update Full Expanded View
      DOM.headerDayCounter.textContent = `NGÀY ${dayNum} / 365`;
      DOM.fullCategoryTag.textContent = data.category.toUpperCase();
      DOM.fullActionHeadline.textContent = data.headline;
      DOM.cardFormattedDate.textContent = dateInfo.formattedLong;
      DOM.cardDayIndicator.textContent = `Ngày ${dayNum} / 365`;
      DOM.fullQuoteText.textContent = data.quote;
      DOM.fullAuthorName.textContent = data.author;
      DOM.fullCategoryPill.textContent = data.category;
      DOM.progressPercentageLabel.textContent = `${progressPercent}%`;
      DOM.progressFillBar.style.width = `${progressPercent}%`;
      DOM.progressFillBar.parentElement.setAttribute('aria-valuenow', progressPercent);

      // 3. Render Mandala SVG
      DOM.mandalaBadge.innerHTML = generateMandalaSVG(data.id || dayNum, data.category);

      // 4. Update Favorite button state
      const isFav = state.favorites.has(data.id || dayNum);
      if (isFav) {
        DOM.btnFavorite.classList.add('active');
        DOM.favoriteHeartIcon.setAttribute('fill', '#38bdf8');
      } else {
        DOM.btnFavorite.classList.remove('active');
        DOM.favoriteHeartIcon.setAttribute('fill', 'none');
      }

      // 5. Update Today Button State (glowing if away from today)
      if (dayNum === state.todayDayOfYear) {
        DOM.btnToday.style.opacity = '0.9';
        DOM.btnToday.querySelector('.today-text').textContent = 'HÔM NAY';
      } else {
        DOM.btnToday.style.opacity = '1';
        DOM.btnToday.querySelector('.today-text').textContent = 'VỀ HÔM NAY';
      }

      // 6. Synchronize Modal input values
      DOM.daySliderInput.value = dayNum;
      DOM.sliderDayPreview.textContent = dayNum;
      DOM.calendarDateInput.value = dateInfo.isoDate;
    }
  }

  /**
   * 5. State Transitions: Collapsed <-> Expanded
   */
  function expandView() {
    if (state.isExpanded) return;
    playPaperTurnSound();
    state.isExpanded = true;
    DOM.appContainer.classList.remove('mode-collapsed');
    DOM.appContainer.classList.add('mode-expanded');
    DOM.fullView.classList.remove('hidden');

    // Trigger subtle entrance
    DOM.calendarCardFlipper.style.opacity = '0';
    DOM.calendarCardFlipper.style.transform = 'translateY(16px)';
    requestAnimationFrame(() => {
      DOM.calendarCardFlipper.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      DOM.calendarCardFlipper.style.opacity = '1';
      DOM.calendarCardFlipper.style.transform = 'translateY(0)';
    });
  }

  function collapseView() {
    if (!state.isExpanded) return;
    playPaperTurnSound();
    state.isExpanded = false;
    DOM.appContainer.classList.remove('mode-expanded');
    DOM.appContainer.classList.add('mode-collapsed');
    setTimeout(() => {
      DOM.fullView.classList.add('hidden');
    }, 400);
  }

  /**
   * 6. Day Navigation
   */
  function navigateDay(direction) {
    if (state.isAnimating) return;
    state.isAnimating = true;

    playPaperTurnSound();

    let targetDay = state.currentDay;
    if (direction === 'next') {
      targetDay = state.currentDay >= 365 ? 1 : state.currentDay + 1;
    } else if (direction === 'prev') {
      targetDay = state.currentDay <= 1 ? 365 : state.currentDay - 1;
    } else if (typeof direction === 'number') {
      targetDay = Math.max(1, Math.min(direction, 365));
    }

    renderQuote(targetDay, direction === 1 || direction === 'next' ? 'next' : 'prev');

    setTimeout(() => {
      state.isAnimating = false;
    }, 350);
  }

  function jumpToToday() {
    const hasCustom = state.customQuotes && state.customQuotes[state.todayDayOfYear];
    if (state.currentDay === state.todayDayOfYear) {
      if (hasCustom) {
        delete state.customQuotes[state.todayDayOfYear];
        try { localStorage.removeItem(`mindset_quote_choice_${state.todayDayOfYear}`); } catch(e) {}
        playPaperTurnSound();
        renderQuote(state.todayDayOfYear, 'prev');
        showToast('🔄 Đã khôi phục câu danh ngôn gốc của ngày hôm nay');
      } else {
        showToast('Đang ở ngày hôm nay');
      }
      return;
    }
    navigateDay(state.todayDayOfYear);
    showToast(`Đã trở về ngày hôm nay: ${getDateFromDayOfYear(state.todayDayOfYear).formattedShort}`);
  }

  /**
   * Random Quote Selector (Đổi câu khác hợp tâm trạng hôm nay - VẪN GIỮ NGUYÊN NGÀY):
   * Keeps currentDay strictly unchanged (e.g. today stays Sep 30, Day 273),
   * while shuffling the quote content to match the user's mood.
   */
  function pickRandomQuote() {
    if (state.isAnimating) return;
    const totalQuotes = (state.quotes && state.quotes.length > 0) ? state.quotes.length : 365;
    
    // Pick a quote different from the one currently shown
    const currentId = state.currentQuoteData ? state.currentQuoteData.id : state.currentDay;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * totalQuotes);
    } while (state.quotes[newIndex].id === currentId && totalQuotes > 1);

    const newQuote = state.quotes[newIndex];
    if (!state.customQuotes) state.customQuotes = {};
    state.customQuotes[state.currentDay] = newQuote;

    // Remember choice for this day in localStorage
    try {
      localStorage.setItem(`mindset_quote_choice_${state.currentDay}`, JSON.stringify(newQuote));
    } catch (e) {}

    playPaperTurnSound();
    // Render while KEEPING state.currentDay (e.g. today) unchanged!
    renderQuote(state.currentDay, 'next', newQuote);
    showToast(`🎲 Đã đổi câu khác hợp tâm trạng: "${newQuote.headline}"`);
  }

  /**
   * 7. Touch & Swipe Gestures (Smooth mobile flipping)
   */
  function initSwipeGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const threshold = 45; // Minimum px to trigger swipe

    const container = DOM.calendarCardFlipper;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });

    // Also support mouse drag on desktop for intuitive testing
    let isMouseDown = false;
    container.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      touchStartX = e.screenX;
      touchStartY = e.screenY;
    });

    window.addEventListener('mouseup', (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;
      touchEndX = e.screenX;
      touchEndY = e.screenY;
      handleSwipe();
    });

    function handleSwipe() {
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Ensure horizontal swipe is dominant over vertical scroll
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
        if (diffX < 0) {
          // Swiped Left -> Go Next Day
          navigateDay('next');
        } else {
          // Swiped Right -> Go Previous Day
          navigateDay('prev');
        }
      }
    }
  }

  /**
   * 8. Toast Feedback Helper
   */
  let toastTimer = null;
  function showToast(msg) {
    DOM.toastMessage.textContent = msg;
    DOM.appToast.classList.add('visible');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.appToast.classList.remove('visible');
    }, 2400);
  }

  /**
   * 9. Bookmark / Favorite Handling
   */
  function toggleFavorite() {
    const current = state.currentDay;
    if (state.favorites.has(current)) {
      state.favorites.delete(current);
      DOM.btnFavorite.classList.remove('active');
      DOM.favoriteHeartIcon.setAttribute('fill', 'none');
      showToast('Đã bỏ lưu khỏi danh sách yêu thích');
    } else {
      state.favorites.add(current);
      DOM.btnFavorite.classList.add('active');
      DOM.favoriteHeartIcon.setAttribute('fill', '#38bdf8');
      showToast('Đã lưu câu nói này vào mục yêu thích');
    }

    try {
      localStorage.setItem('mindset_favorites', JSON.stringify([...state.favorites]));
    } catch (e) {
      // LocalStorage access fallback
    }
  }

  function loadFavorites() {
    try {
      const saved = localStorage.getItem('mindset_favorites');
      if (saved) {
        state.favorites = new Set(JSON.parse(saved));
      }
    } catch (e) {}
  }

  /**
   * 10. Sound Toggle Handling
   */
  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    try {
      localStorage.setItem('mindset_sound', state.soundEnabled ? '1' : '0');
    } catch (e) {}

    updateSoundButtonIcons();
    if (state.soundEnabled) {
      playPaperTurnSound();
      showToast('Đã bật âm thanh lật trang');
    } else {
      showToast('Đã tắt âm thanh');
    }
  }

  function updateSoundButtonIcons() {
    const buttons = [DOM.widgetSoundBtn, DOM.fullSoundBtn];
    buttons.forEach(btn => {
      if (!btn) return;
      const onIcon = btn.querySelector('.sound-icon-on');
      const offIcon = btn.querySelector('.sound-icon-off');
      if (state.soundEnabled) {
        onIcon.classList.remove('hidden');
        offIcon.classList.add('hidden');
      } else {
        onIcon.classList.add('hidden');
        offIcon.classList.remove('hidden');
      }
    });
  }

  /**
   * 11. Share / Copy Quote
   */
  async function shareQuote() {
    const quote = state.quotes[state.currentDay - 1];
    if (!quote) return;

    const shareText = `"${quote.headline}"\n\n"${quote.quote}"\n— ${quote.author} (${quote.category})\n\n[Lịch để bàn 365 - Ngày ${quote.day}/365]`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lịch Để Bàn 365 - Ngày ${quote.day}`,
          text: shareText,
          url: window.location.href
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Đã sao chép câu trích dẫn vào bộ nhớ tạm!');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Đã sao chép câu trích dẫn!');
    } catch (e) {
      showToast('Không thể tự động sao chép');
    }
    document.body.removeChild(textarea);
  }

  /**
   * 12. Modal Day Picker Controls
   */
  function openDayPicker() {
    DOM.dayPickerModal.classList.remove('hidden');
    DOM.dayPickerModal.setAttribute('aria-hidden', 'false');
  }

  function closeDayPicker() {
    DOM.dayPickerModal.classList.add('hidden');
    DOM.dayPickerModal.setAttribute('aria-hidden', 'true');
  }

  /**
   * 13. Web Push Notification Logic (06:00 & 14:00)
   */
  const VAPID_PUBLIC_KEY = 'BJ6fr2VtgNn6m1N3pOXT0qgrL6fg-IxXI2AUbNcuiBuvhycdGESIA15DtpZ8Yc9Xh8r1TfOMZTB09jffUyJQOyM';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const NOTIFY_STORAGE_KEY = 'mindset_notify_settings';

  function getNotificationSettings() {
    try {
      const saved = localStorage.getItem(NOTIFY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      enabled1: true,
      time1: '06:00',
      enabled2: true,
      time2: '14:00'
    };
  }

  function saveNotificationSettings(settings) {
    try {
      localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function formatScheduleSummary(settings) {
    const times = [];
    if (settings.enabled1 && settings.time1) times.push(settings.time1);
    if (settings.enabled2 && settings.time2) times.push(settings.time2);
    if (times.length === 0) return 'Đã tắt các giờ nhắc';
    return `Đang bật nhắc: ${times.join(' & ')} hàng ngày`;
  }

  async function checkNotificationStatus() {
    if (!DOM.notifyStatusText) return;

    const settings = getNotificationSettings();
    if (DOM.notifySlot1Enable) DOM.notifySlot1Enable.checked = settings.enabled1;
    if (DOM.notifyTime1) DOM.notifyTime1.value = settings.time1 || '06:00';
    if (DOM.notifySlot2Enable) DOM.notifySlot2Enable.checked = settings.enabled2;
    if (DOM.notifyTime2) DOM.notifyTime2.value = settings.time2 || '14:00';

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      DOM.notifyStatusText.textContent = 'Mở từ Màn hình chính (PWA) để nhận thông báo iOS';
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          DOM.notifyStatusText.textContent = formatScheduleSummary(settings);
          DOM.notifyStatusDot.classList.add('active');
          DOM.btnRequestPush.textContent = '💾 Lưu cài đặt giờ nhắc';
          DOM.btnRequestPush.disabled = false;
          DOM.btnRequestPush.style.opacity = '1';
          DOM.btnTestPush.classList.remove('hidden');
          DOM.bellBadgeDot.classList.remove('hidden');
          return;
        }
      } catch (e) {}
    } else if (Notification.permission === 'denied') {
      DOM.notifyStatusText.textContent = 'Thông báo bị chặn (Mở Cài đặt > Mindset 365 để bật)';
      DOM.notifyStatusDot.classList.remove('active');
      DOM.btnRequestPush.textContent = 'Xem hướng dẫn mở Cài đặt';
      return;
    }

    DOM.notifyStatusText.textContent = 'Chưa kích hoạt thông báo';
    DOM.notifyStatusDot.classList.remove('active');
    DOM.btnRequestPush.textContent = '🔔 Lưu & Bật thông báo đẩy';
    DOM.btnRequestPush.disabled = false;
    DOM.btnRequestPush.style.opacity = '1';
    DOM.btnTestPush.classList.add('hidden');
    DOM.bellBadgeDot.classList.add('hidden');
  }

  async function subscribeUserToPush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast('Hãy thêm ứng dụng vào Màn hình chính (Add to Home Screen) để bật thông báo trên iPhone');
      return;
    }

    const currentSettings = {
      enabled1: DOM.notifySlot1Enable ? DOM.notifySlot1Enable.checked : true,
      time1: DOM.notifyTime1 ? (DOM.notifyTime1.value || '06:00') : '06:00',
      enabled2: DOM.notifySlot2Enable ? DOM.notifySlot2Enable.checked : true,
      time2: DOM.notifyTime2 ? (DOM.notifyTime2.value || '14:00') : '14:00'
    };
    saveNotificationSettings(currentSettings);

    try {
      DOM.btnRequestPush.textContent = 'Đang lưu cài đặt...';
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Bạn chưa cấp quyền nhận thông báo.');
        checkNotificationStatus();
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      }

      // Send to server with chosen times
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          settings: currentSettings
        })
      }).catch(() => {});

      const activeTimes = [];
      if (currentSettings.enabled1) activeTimes.push(currentSettings.time1);
      if (currentSettings.enabled2) activeTimes.push(currentSettings.time2);

      showToast(`🎉 Đã lưu lịch nhắc nhở (${activeTimes.join(' & ') || 'Tắt'}) thành công!`);
      checkNotificationStatus();
    } catch (err) {
      console.error('Subscription error:', err);
      showToast('Lỗi cài đặt thông báo: ' + err.message);
      checkNotificationStatus();
    }
  }

  async function sendTestPush() {
    showToast('Đang gửi câu quote hôm nay lên màn hình...');
    try {
      const { day } = calculateCurrentDayOfYear();
      let quoteItem = (state.quotes && state.quotes.length > 0) ? state.quotes[day - 1] : null;

      // Fallback: If quotes not yet cached in state, fetch quotes.json
      if (!quoteItem) {
        try {
          const res = await fetch('quotes.json');
          if (res.ok) {
            state.quotes = await res.json();
            quoteItem = state.quotes[day - 1];
          }
        } catch (e) {}
      }

      // Safe fallback quote if network unavailable
      if (!quoteItem) {
        quoteItem = {
          day: day,
          headline: 'BƯỚC CHÂN VI MÔ',
          quote: 'Đường xa vạn dặm không vượt qua bằng việc nhìn ngắm đỉnh núi, mà bằng việc kiên quyết đặt từng bước chân vững chãi lên mặt đất.',
          author: 'Lão Tử',
          category: 'Thúc đẩy hành động'
        };
      }

      // Show ONLY the quote content and author (no headline)
      const notifTitle = `"${quoteItem.quote}"`;
      const notifBody = `— ${quoteItem.author}`;

      // 1. Show instant notification on current device via Service Worker with full quote
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(notifTitle, {
          body: notifBody,
          icon: './assets/icons/icon-192.png',
          badge: './assets/icons/icon-192.png',
          tag: 'daily-mindset-reminder',
          renotify: true,
          data: {
            url: './index.html'
          }
        });
      }

      // 2. Also trigger backend send-push with exact quote payload
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifTitle,
          body: notifBody
        })
      }).catch(() => {});

      showToast('✅ Đã gửi trích dẫn hôm nay lên màn hình!');
      if (DOM.iosPreviewHint) {
        DOM.iosPreviewHint.classList.remove('hidden');
      }
    } catch (err) {
      showToast('Lỗi gửi thử nghiệm: ' + err.message);
    }
  }

  function openNotifyModal() {
    DOM.notifyModal.classList.remove('hidden');
    DOM.notifyModal.setAttribute('aria-hidden', 'false');
    checkNotificationStatus();
  }

  function closeNotifyModal() {
    DOM.notifyModal.classList.add('hidden');
    DOM.notifyModal.setAttribute('aria-hidden', 'true');
  }

  /**
   * 13. Desktop Mockup Frame Toggle
   */
  function toggleFrameMode() {
    const isIphoneMode = DOM.deviceWrapper.classList.contains('iphone-mode');
    if (isIphoneMode) {
      DOM.deviceWrapper.classList.remove('iphone-mode');
      DOM.deviceWrapper.classList.add('full-screen-mode');
      DOM.frameToggleText.textContent = 'Toàn màn hình';
    } else {
      DOM.deviceWrapper.classList.remove('full-screen-mode');
      DOM.deviceWrapper.classList.add('iphone-mode');
      DOM.frameToggleText.textContent = 'Khung iPhone';
    }
  }

  /**
   * 14. Event Listeners Registration
   */
  function registerEvents() {
    // Expand when clicking widget card
    DOM.widgetCard.addEventListener('click', expandView);
    DOM.widgetCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        expandView();
      }
    });

    // Collapse when clicking top-left icon
    DOM.btnCollapseView.addEventListener('click', collapseView);

    // Prev / Next / Today
    DOM.btnPrevDay.addEventListener('click', () => navigateDay('prev'));
    DOM.btnNextDay.addEventListener('click', () => navigateDay('next'));
    DOM.btnToday.addEventListener('click', jumpToToday);

    // Random Quote triggers
    if (DOM.btnRandomQuote) DOM.btnRandomQuote.addEventListener('click', pickRandomQuote);
    if (DOM.btnRandomNav) DOM.btnRandomNav.addEventListener('click', pickRandomQuote);
    if (DOM.btnWidgetRandom) {
      DOM.btnWidgetRandom.addEventListener('click', (e) => {
        e.stopPropagation();
        pickRandomQuote();
      });
    }

    // Sound Toggles (if present)
    if (DOM.widgetSoundBtn) {
      DOM.widgetSoundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSound();
      });
    }
    if (DOM.fullSoundBtn) {
      DOM.fullSoundBtn.addEventListener('click', toggleSound);
    }

    // Favorite & Share
    DOM.btnFavorite.addEventListener('click', toggleFavorite);
    DOM.btnShare.addEventListener('click', shareQuote);

    // Frame Toggle on Desktop
    DOM.toggleFrameBtn.addEventListener('click', toggleFrameMode);

    // Keyboard Arrow navigation & 'R' for random
    window.addEventListener('keydown', (e) => {
      if (DOM.dayPickerModal && !DOM.dayPickerModal.classList.contains('hidden')) return;
      if (DOM.notifyModal && !DOM.notifyModal.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight') navigateDay('next');
      if (e.key === 'ArrowLeft') navigateDay('prev');
      if (e.key === 'r' || e.key === 'R') pickRandomQuote();
      if (e.key === 'Escape' && state.isExpanded) collapseView();
    });

    // Day Picker Modal
    DOM.btnOpenPicker.addEventListener('click', openDayPicker);
    DOM.btnClosePicker.addEventListener('click', closeDayPicker);
    DOM.dayPickerModal.addEventListener('click', (e) => {
      if (e.target === DOM.dayPickerModal) closeDayPicker();
    });

    // Slider Input
    DOM.daySliderInput.addEventListener('input', (e) => {
      const val = e.target.value;
      DOM.sliderDayPreview.textContent = val;
    });

    // Modal Tabs
    DOM.tabBtnDayNum.addEventListener('click', () => {
      DOM.tabBtnDayNum.classList.add('active');
      DOM.tabBtnCalendar.classList.remove('active');
      DOM.tabContentDayNum.classList.remove('hidden');
      DOM.tabContentCalendar.classList.add('hidden');
    });

    DOM.tabBtnCalendar.addEventListener('click', () => {
      DOM.tabBtnCalendar.classList.add('active');
      DOM.tabBtnDayNum.classList.remove('active');
      DOM.tabContentCalendar.classList.remove('hidden');
      DOM.tabContentDayNum.classList.add('hidden');
    });

    // Quick Jump Chips
    document.querySelectorAll('.quick-jump-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const jump = chip.getAttribute('data-jump');
        if (jump === 'random') {
          closeDayPicker();
          pickRandomQuote();
          return;
        }
        if (jump === 'today') {
          DOM.daySliderInput.value = state.todayDayOfYear;
          DOM.sliderDayPreview.textContent = state.todayDayOfYear;
        } else {
          DOM.daySliderInput.value = jump;
          DOM.sliderDayPreview.textContent = jump;
        }
      });
    });

    // Apply Day Selection
    DOM.btnApplyDay.addEventListener('click', () => {
      let chosenDay = parseInt(DOM.daySliderInput.value, 10);
      if (DOM.tabBtnCalendar.classList.contains('active') && DOM.calendarDateInput.value) {
        chosenDay = getDayOfYearFromDate(DOM.calendarDateInput.value);
      }
      closeDayPicker();
      navigateDay(chosenDay);
      showToast(`Đã lật sang ngày thứ ${chosenDay}`);
    });

    // Notification Modal & Push Events
    if (DOM.btnNotifyToggle) {
      DOM.btnNotifyToggle.addEventListener('click', openNotifyModal);
    }
    if (DOM.btnCloseNotify) {
      DOM.btnCloseNotify.addEventListener('click', closeNotifyModal);
    }
    if (DOM.notifyModal) {
      DOM.notifyModal.addEventListener('click', (e) => {
        if (e.target === DOM.notifyModal) closeNotifyModal();
      });
    }
    if (DOM.btnRequestPush) {
      DOM.btnRequestPush.addEventListener('click', subscribeUserToPush);
    }
    if (DOM.btnTestPush) {
      DOM.btnTestPush.addEventListener('click', sendTestPush);
    }

    initSwipeGestures();
  }

  /**
   * 15. Fetch or Fallback Data Loading
   */
  async function loadQuotesData() {
    try {
      const res = await fetch('quotes.json');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      state.quotes = await res.json();
    } catch (err) {
      console.warn('Could not fetch quotes.json, using fallback quotes generator', err);
      // Fallback emergency seed
      state.quotes = generateFallbackQuotes();
    }

    // Set today and render
    const { day } = calculateCurrentDayOfYear();
    state.todayDayOfYear = day;
    state.currentDay = day;

    // Restore any saved quote choice for today from localStorage
    try {
      const savedChoice = localStorage.getItem(`mindset_quote_choice_${state.todayDayOfYear}`);
      if (savedChoice) {
        state.customQuotes[state.todayDayOfYear] = JSON.parse(savedChoice);
      }
    } catch (e) {}

    // Check URL parameters for day or quoteId (from Scriptable widget or shared link)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const quoteIdParam = urlParams.get('quoteId');
      const dayParam = urlParams.get('day');
      const randomParam = urlParams.get('random');
      
      if (quoteIdParam && !isNaN(parseInt(quoteIdParam, 10))) {
        const qId = parseInt(quoteIdParam, 10);
        const matched = state.quotes.find(q => q.id === qId);
        if (matched) {
          state.customQuotes[state.todayDayOfYear] = matched;
          try {
            localStorage.setItem(`mindset_quote_choice_${state.todayDayOfYear}`, JSON.stringify(matched));
          } catch (e) {}
        }
      } else if (randomParam === '1' || randomParam === 'true') {
        const total = (state.quotes && state.quotes.length > 0) ? state.quotes.length : 365;
        const picked = state.quotes[Math.floor(Math.random() * total)];
        state.customQuotes[state.todayDayOfYear] = picked;
        try {
          localStorage.setItem(`mindset_quote_choice_${state.todayDayOfYear}`, JSON.stringify(picked));
        } catch (e) {}
      } else if (dayParam && !isNaN(parseInt(dayParam, 10))) {
        const parsed = parseInt(dayParam, 10);
        if (parsed >= 1 && parsed <= 365) {
          state.currentDay = parsed;
        }
      }
    } catch (e) {}

    renderQuote(state.currentDay);
  }

  function generateFallbackQuotes() {
    const list = [];
    for (let i = 1; i <= 365; i++) {
      list.push({
        id: i,
        day: i,
        headline: i === 271 ? "LÀM CHỦ HIỆN TẠI, LÀM CHỦ CUỘC ĐỜI" : `BẢN LĨNH NGÀY THỨ ${i}`,
        quote: i === 271 
          ? "Hôm nay, hãy thôi chờ đợi một thời điểm hoàn hảo. Món quà duy nhất bạn thực sự nắm giữ là khoảnh khắc này: hãy sống trọn vẹn, hành động dứt khoát và giữ tâm hồn tĩnh tại trước mọi phong ba."
          : `Mỗi ngày mới là một trang sách trắng tinh khôi của cuộc đời. Hãy dùng hành động kiên định và phẩm hạnh chính trực để viết nên kiệt tác của riêng bạn.`,
        author: i === 271 ? "Marcus Aurelius" : "Khắc kỷ & Trí tuệ",
        category: "Tư duy Khắc kỷ"
      });
    }
    return list;
  }

  /**
   * 16. Service Worker Registration for PWA Offline Mode
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
  }

  /**
   * Initialize App
   */
  function init() {
    // Load preferences
    try {
      const savedSound = localStorage.getItem('mindset_sound');
      if (savedSound !== null) {
        state.soundEnabled = savedSound === '1';
      }
    } catch (e) {}

    loadFavorites();
    updateSoundButtonIcons();
    registerEvents();
    loadQuotesData();
    registerServiceWorker();
    checkNotificationStatus();
  }

  // Bootstrap when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
