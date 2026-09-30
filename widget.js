// =====================================================================
// SCRIPTABLE WIDGET: ĐỘNG LỰC 365 (MINDSET 365)
// Tự động xoay vòng câu trích dẫn ngẫu nhiên sau mỗi ~60 phút
// Tác giả: Động Lực 365 (dong-luc-365.vercel.app)
// Hỗ trợ: Màn hình chính (Small & Medium Widget) & Màn hình khóa
// =====================================================================

(async () => {
  const DEFAULT_MODE = "random-60m";
  const REPO_URL = "https://raw.githubusercontent.com/thang-vunam/mindset-calendar-365/main/quotes.json";
  const APP_URL = "https://dong-luc-365.vercel.app";
  const ROTATE_INTERVAL_MS = 60 * 60 * 1000; // 60 phút

  // 1. Tải danh sách 365 câu trích dẫn (Ưu tiên đọc đệm cục bộ 0.001s)
  async function loadQuotes() {
    const fm = FileManager.local();
    const cachePath = fm.joinPath(fm.documentsDirectory(), "mindset-quotes-cache.json");
    
    if (fm.fileExists(cachePath)) {
      try {
        const cached = JSON.parse(fm.readString(cachePath));
        if (Array.isArray(cached) && cached.length > 0) return cached;
      } catch (err) {}
    }

    try {
      const req = new Request(REPO_URL);
      req.timeoutInterval = 3;
      const data = await req.loadJSON();
      if (Array.isArray(data) && data.length > 0) {
        fm.writeString(cachePath, JSON.stringify(data));
        return data;
      }
    } catch (e) {}
    
    return [
      {
        id: 273,
        day: 273,
        headline: "ĐO LƯỜNG TỪNG CON SỐ",
        quote: "Không thể quản trị những gì bạn không đo lường. Hãy nhìn thẳng vào bảng thu chi thực tế mỗi ngày.",
        author: "Peter Drucker",
        category: "Kỷ luật tài chính"
      }
    ];
  }

  const quotes = await loadQuotes();

  // 2. Tính ngày tháng hiện tại (Hiển thị ngày thực tế tiếng Việt)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.min(365, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24))));
  
  const daysOfWeek = ["CHỦ NHẬT", "THỨ HAI", "THỨ BA", "THỨ TƯ", "THỨ NĂM", "THỨ SÁU", "THỨ BẢY"];
  const dayName = daysOfWeek[now.getDay()];
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;
  const currentDateText = `${dayName}, ${dayOfMonth}/${month}`;

  // 3. Cơ chế xoay vòng ngẫu nhiên mỗi 60 phút (Tránh trùng lặp gần nhau)
  const fm = FileManager.local();
  const historyPath = fm.joinPath(fm.documentsDirectory(), "mindset-widget-history.json");

  let history = { lastQuoteId: null, recentIds: [], lastUpdated: 0 };
  if (fm.fileExists(historyPath)) {
    try {
      history = JSON.parse(fm.readString(historyPath));
      if (!Array.isArray(history.recentIds)) history.recentIds = [];
    } catch (e) {}
  }

  const isRandom = true;
  const isExpired = !history.lastUpdated || (now.getTime() - history.lastUpdated >= ROTATE_INTERVAL_MS);
  const shouldPickNew = isExpired || !history.lastQuoteId || config.runsInApp;

  let selectedQuote = null;

  if (shouldPickNew) {
    // Lọc bỏ 25 câu đã hiển thị gần nhất để tránh lặp lại
    const recentSet = new Set(history.recentIds || []);
    let availableQuotes = quotes.filter(q => !recentSet.has(q.id));
    if (availableQuotes.length === 0) availableQuotes = quotes;

    const randomIndex = Math.floor(Math.random() * availableQuotes.length);
    selectedQuote = availableQuotes[randomIndex];

    // Lưu vào lịch sử
    const updatedRecent = [selectedQuote.id, ...(history.recentIds || [])].slice(0, 25);
    try {
      fm.writeString(historyPath, JSON.stringify({
        lastQuoteId: selectedQuote.id,
        recentIds: updatedRecent,
        lastUpdated: now.getTime()
      }));
    } catch (e) {}
  } else {
    // Trong khung giờ hiện tại: Giữ nguyên câu đang hiển thị
    selectedQuote = quotes.find(q => q.id === history.lastQuoteId) || quotes[dayOfYear - 1] || quotes[0];
  }

  if (!selectedQuote) {
    selectedQuote = quotes[dayOfYear - 1] || quotes[0];
  }

  // 4. Khởi tạo Widget
  const widget = new ListWidget();
  widget.url = `${APP_URL}?quoteId=${selectedQuote.id}`;

  const isLockScreen = config.runsInAccessory;
  const isSmall = config.widgetFamily === "small";

  if (isLockScreen) {
    widget.addSpacer(1);
    const headerTxt = widget.addText(currentDateText);
    headerTxt.font = Font.boldSystemFont(10);
    headerTxt.textColor = Color.white();
    
    widget.addSpacer(2);
    const quoteTxt = widget.addText(`"${selectedQuote.quote}" — ${selectedQuote.author}`);
    quoteTxt.font = Font.systemFont(11);
    quoteTxt.textColor = new Color("#e2e8f0");
    quoteTxt.lineLimit = 3;
  } else {
    // Canh chỉnh lề tối ưu cho cả Small và Medium widget
    widget.setPadding(isSmall ? 11 : 13, isSmall ? 12 : 16, isSmall ? 11 : 13, isSmall ? 12 : 16);
    
    const gradient = new LinearGradient();
    gradient.locations = [0, 0.5, 1];
    gradient.colors = [
      new Color("#0c2d64"),
      new Color("#051636"),
      new Color("#020817")
    ];
    widget.backgroundGradient = gradient;

    // Header: Chỉ hiển thị Ngày hiện tại
    const badge = widget.addText(currentDateText);
    badge.font = Font.boldSystemFont(isSmall ? 10.5 : 11);
    badge.textColor = new Color("#38bdf8");

    widget.addSpacer(isSmall ? 5 : 6);

    // Tiêu đề hành động
    const headlineTxt = widget.addText(selectedQuote.headline.toUpperCase());
    headlineTxt.font = Font.boldSystemFont(isSmall ? 11.5 : 12.5);
    headlineTxt.textColor = Color.white();
    headlineTxt.lineLimit = isSmall ? 2 : 1;

    widget.addSpacer(isSmall ? 3 : 4);

    // Nội dung câu trích dẫn
    const quoteTxt = widget.addText(`"${selectedQuote.quote}"`);
    quoteTxt.font = Font.italicSystemFont(isSmall ? 10.5 : 11.5);
    quoteTxt.textColor = new Color("#f1f5f9");
    quoteTxt.lineLimit = isSmall ? 4 : 4;

    widget.addSpacer();

    // Footer: Chỉ hiển thị Tác giả ở góc phải
    const footerStack = widget.addStack();
    footerStack.layoutHorizontally();
    footerStack.addSpacer();
    
    const authorLabel = footerStack.addText(`— ${selectedQuote.author}`);
    authorLabel.font = Font.boldSystemFont(isSmall ? 9.5 : 10.5);
    authorLabel.textColor = new Color("#38bdf8");
    authorLabel.lineLimit = 1;
  }

  // 5. Cài đặt hẹn giờ cho iOS WidgetKit tự động làm mới sau đúng 60 phút
  widget.refreshAfterDate = new Date(Date.now() + ROTATE_INTERVAL_MS);

  // Đăng ký Widget với iOS
  Script.setWidget(widget);
  Script.complete();

  if (!config.runsInWidget) {
    if (isSmall) {
      widget.presentSmall();
    } else {
      widget.presentMedium();
    }
  }
})();
